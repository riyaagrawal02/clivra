import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import { endOfWeek, startOfWeek, toDateString } from "../utils/date";
import Topic from "../models/Topic";
import StudySession from "../models/StudySession";
import DailyProgress from "../models/DailyProgress";
import Profile from "../models/Profile";
import Exam from "../models/Exam";
import Subject from "../models/Subject";
import RevisionHistory from "../models/RevisionHistory";

const router = Router();

router.use(requireAuth);

router.get(
  "/dashboard",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;

    const topics = await Topic.find({ user_id: userId });
    const totalTopics = topics.length;
    const completedTopics = topics.filter((t) => t.is_completed).length;
    const avgConfidence = totalTopics
      ? topics.reduce((sum, t) => sum + (t.confidence_level ?? 1), 0) /
        totalTopics
      : 0;

    const revisionCoverage = totalTopics
      ? Math.round(
          (topics.filter((t) => (t.revision_count ?? 0) > 0).length /
            totalTopics) *
            100,
        )
      : 0;

    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());

    const weekSessions = await StudySession.find({
      user_id: userId,
      status: "completed",
      completed_at: {
        $gte: weekStart.toISOString(),
        $lte: weekEnd.toISOString(),
      },
    });

    const weeklyMinutes = weekSessions.reduce(
      (sum, s) => sum + (s.actual_duration_minutes ?? 0),
      0,
    );

    const today = toDateString(new Date());
    const todayProgress = await DailyProgress.findOne({
      user_id: userId,
      date: today,
    });
    const profile = await Profile.findOne({ user_id: userId });
    const activeExam = await Exam.findOne({ user_id: userId, is_active: true });

    let daysUntilExam: number | null = null;
    if (activeExam?.exam_date) {
      const examDate = new Date(activeExam.exam_date);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      examDate.setHours(0, 0, 0, 0);
      const diff = examDate.getTime() - todayDate.getTime();
      daysUntilExam = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    const completionPercentage = totalTopics
      ? Math.round((completedTopics / totalTopics) * 100)
      : 0;

    const consistencyScore = await getConsistencyScore(userId);
    const confidenceTrendScore = await getConfidenceTrendScore(userId);
    const readiness = buildReadinessScore({
      completionPercentage,
      revisionCoverage,
      consistencyScore,
      confidenceTrendScore,
    });

    res.json({
      stats: {
        streak: profile?.current_streak ?? 0,
        longestStreak: profile?.longest_streak ?? 0,
        weeklyHours: Math.round((weeklyMinutes / 60) * 10) / 10,
        topicsTotal: totalTopics,
        topicsCompleted: completedTopics,
        completionPercentage,
        avgConfidence: Math.round(avgConfidence * 10) / 10,
        revisionCoverage,
        consistencyScore,
        confidenceTrendScore,
        readiness,
        daysUntilExam,
        examName: activeExam?.name ?? null,
        todayCompleted: todayProgress?.completed_minutes ?? 0,
        todayPlanned: todayProgress?.planned_minutes ?? 180,
        todaySessions: todayProgress?.sessions_completed ?? 0,
      },
    });
  }),
);

router.get(
  "/weekly-analytics",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());

    const progress = await DailyProgress.find({
      user_id: userId,
      date: { $gte: toDateString(weekStart), $lte: toDateString(weekEnd) },
    });

    const progressMap = new Map(progress.map((p) => [p.date, p]));
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const result = [] as {
      day: string;
      date: string;
      planned: number;
      completed: number;
    }[];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = toDateString(date);
      const item = progressMap.get(dateStr);
      result.push({
        day: days[i],
        date: dateStr,
        planned: item?.planned_minutes ?? 180,
        completed: item?.completed_minutes ?? 0,
      });
    }

    res.json({ analytics: result });
  }),
);

router.get(
  "/subject-progress",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const subjects = await Subject.find({ user_id: userId });
    const topics = await Topic.find({ user_id: userId });

    const result = subjects.map((subject) => {
      const subjectTopics = topics.filter((t) => t.subject_id === subject.id);
      const totalTopics = subjectTopics.length;
      const completedTopics = subjectTopics.filter(
        (t) => t.is_completed,
      ).length;
      const progress = totalTopics
        ? Math.round((completedTopics / totalTopics) * 100)
        : 0;
      const avgConfidence = totalTopics
        ? subjectTopics.reduce((sum, t) => sum + (t.confidence_level ?? 1), 0) /
          totalTopics
        : 0;

      return {
        name: subject.name,
        color: subject.color,
        progress,
        topics: totalTopics,
        completed: completedTopics,
        avgConfidence: Math.round(avgConfidence * 10) / 10,
      };
    });

    res.json({ subjects: result });
  }),
);

router.get(
  "/readiness",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const topics = await Topic.find({ user_id: userId });
    const totalTopics = topics.length;
    const completedTopics = topics.filter((t) => t.is_completed).length;

    const completionPercentage = totalTopics
      ? Math.round((completedTopics / totalTopics) * 100)
      : 0;

    const revisionCoverage = totalTopics
      ? Math.round(
          (topics.filter((t) => (t.revision_count ?? 0) > 0).length /
            totalTopics) *
            100,
        )
      : 0;

    const consistencyScore = await getConsistencyScore(userId);
    const confidenceTrendScore = await getConfidenceTrendScore(userId);

    const readiness = buildReadinessScore({
      completionPercentage,
      revisionCoverage,
      consistencyScore,
      confidenceTrendScore,
    });

    res.json({ readiness });
  }),
);

router.get(
  "/weekly-report",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());

    const progress = await DailyProgress.find({
      user_id: userId,
      date: { $gte: toDateString(weekStart), $lte: toDateString(weekEnd) },
    });

    const sessions = await StudySession.find({
      user_id: userId,
      completed_at: {
        $gte: weekStart.toISOString(),
        $lte: weekEnd.toISOString(),
      },
    });

    const topicIds = Array.from(new Set(sessions.map((s) => s.topic_id)));
    const topics = await Topic.find({
      _id: { $in: topicIds },
      user_id: userId,
    });
    const subjectIds = Array.from(new Set(topics.map((t) => t.subject_id)));
    const subjects = await Subject.find({
      _id: { $in: subjectIds },
      user_id: userId,
    });
    const topicMap = new Map(topics.map((topic) => [String(topic._id), topic]));
    const subjectMap = new Map(
      subjects.map((subject) => [String(subject._id), subject]),
    );

    const subjectEffort = new Map<
      string,
      { name: string; color: string; minutes: number }
    >();
    for (const session of sessions) {
      const topic = topicMap.get(String(session.topic_id));
      if (!topic) continue;
      const subject = subjectMap.get(String(topic.subject_id));
      if (!subject) continue;
      const current = subjectEffort.get(String(subject._id)) ?? {
        name: subject.name,
        color: subject.color,
        minutes: 0,
      };
      current.minutes += session.actual_duration_minutes ?? 0;
      subjectEffort.set(String(subject._id), current);
    }

    const plannedMinutes = progress.reduce(
      (sum, p) => sum + (p.planned_minutes ?? 0),
      0,
    );
    const completedMinutes = progress.reduce(
      (sum, p) => sum + (p.completed_minutes ?? 0),
      0,
    );

    const missedSessions = await StudySession.countDocuments({
      user_id: userId,
      status: "missed",
      scheduled_at: {
        $gte: weekStart.toISOString(),
        $lte: weekEnd.toISOString(),
      },
    });

    const recoveredSessions = await StudySession.countDocuments({
      user_id: userId,
      notes: { $regex: /^Recovery/ },
      scheduled_at: {
        $gte: weekStart.toISOString(),
        $lte: weekEnd.toISOString(),
      },
    });

    const confidenceTrendScore = await getConfidenceTrendScore(userId);

    res.json({
      report: {
        plannedMinutes,
        completedMinutes,
        missedSessions,
        recoveredSessions,
        confidenceTrendScore,
        subjectEffort: Array.from(subjectEffort.values()),
      },
    });
  }),
);

function buildReadinessScore({
  completionPercentage,
  revisionCoverage,
  consistencyScore,
  confidenceTrendScore,
}: {
  completionPercentage: number;
  revisionCoverage: number;
  consistencyScore: number;
  confidenceTrendScore: number;
}) {
  const readinessScore =
    completionPercentage * 0.35 +
    revisionCoverage * 0.25 +
    consistencyScore * 0.25 +
    confidenceTrendScore * 0.15;

  const percentage = Math.round(readinessScore);
  let status: "not_ready" | "improving" | "almost_ready" | "exam_ready" =
    "not_ready";
  if (percentage >= 80) status = "exam_ready";
  else if (percentage >= 60) status = "almost_ready";
  else if (percentage >= 40) status = "improving";

  return { status, percentage };
}

async function getConsistencyScore(userId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 13);
  const progress = await DailyProgress.find({
    user_id: userId,
    date: { $gte: toDateString(since), $lte: toDateString(new Date()) },
  });

  if (progress.length === 0) return 0;

  let completedDays = 0;
  let totalRate = 0;
  for (const day of progress) {
    const planned = day.planned_minutes ?? 0;
    const completed = day.completed_minutes ?? 0;
    const rate = planned > 0 ? completed / planned : 0;
    totalRate += rate;
    if (rate >= 0.6) completedDays += 1;
  }

  const avgRate = totalRate / progress.length;
  const score = completedDays / progress.length;
  return Math.round(score * 70 + avgRate * 30);
}

async function getConfidenceTrendScore(userId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 13);
  const revisions = await RevisionHistory.find({
    user_id: userId,
    created_at: { $gte: since },
  });

  if (revisions.length === 0) return 0;

  const avgDelta =
    revisions.reduce(
      (sum, r) => sum + (r.confidence_after - r.confidence_before),
      0,
    ) / revisions.length;
  const clamped = Math.min(1, Math.max(-1, avgDelta));
  return Math.round(((clamped + 1) / 2) * 100);
}

export default router;
