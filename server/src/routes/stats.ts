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
      ? topics.reduce((sum, t) => sum + (t.confidence_level ?? 1), 0) / totalTopics
      : 0;

    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());

    const weekSessions = await StudySession.find({
      user_id: userId,
      status: "completed",
      completed_at: { $gte: weekStart.toISOString(), $lte: weekEnd.toISOString() },
    });

    const weeklyMinutes = weekSessions.reduce(
      (sum, s) => sum + (s.actual_duration_minutes ?? 0),
      0
    );

    const today = toDateString(new Date());
    const todayProgress = await DailyProgress.findOne({ user_id: userId, date: today });
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

    res.json({
      stats: {
        streak: profile?.current_streak ?? 0,
        longestStreak: profile?.longest_streak ?? 0,
        weeklyHours: Math.round((weeklyMinutes / 60) * 10) / 10,
        topicsTotal: totalTopics,
        topicsCompleted: completedTopics,
        completionPercentage,
        avgConfidence: Math.round(avgConfidence * 10) / 10,
        daysUntilExam,
        examName: activeExam?.name ?? null,
        todayCompleted: todayProgress?.completed_minutes ?? 0,
        todayPlanned: todayProgress?.planned_minutes ?? 180,
        todaySessions: todayProgress?.sessions_completed ?? 0,
      },
    });
  })
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
    const result = [] as { day: string; date: string; planned: number; completed: number }[];

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
  })
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
      const completedTopics = subjectTopics.filter((t) => t.is_completed).length;
      const progress = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0;
      const avgConfidence = totalTopics
        ? subjectTopics.reduce((sum, t) => sum + (t.confidence_level ?? 1), 0) / totalTopics
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
  })
);

export default router;
