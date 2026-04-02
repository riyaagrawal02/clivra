import { Router, Response } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import { startOfDay, endOfDay, toDateString } from "../utils/date";
import Profile from "../models/Profile";
import Subject from "../models/Subject";
import Topic from "../models/Topic";
import StudySession from "../models/StudySession";
import StudyPlan from "../models/StudyPlan";
import Exam from "../models/Exam";
import DailyProgress from "../models/DailyProgress";
import { buildSchedulePlan } from "../services/schedule";

const router = Router();

router.use(requireAuth);

const getDaysUntilExam = (examDate: string | null, date: Date) => {
  if (!examDate) return 30;
  const exam = new Date(examDate);
  const today = new Date(date);
  exam.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.max(
    0,
    Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  );
};

router.post(
  "/generate",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const targetDate = req.body?.date ? new Date(req.body.date) : new Date();
    const replaceExisting = req.body?.replaceExisting ?? true;

    const profile = await Profile.findOne({ user_id: req.userId });
    const activeExams = await Exam.find({
      user_id: req.userId,
      is_active: true,
    });

    const availableMinutes =
      req.body?.availableMinutes ??
      Math.round((profile?.daily_study_hours ?? 3) * 60);
    const pomodoroWorkMinutes =
      req.body?.pomodoroWorkMinutes ?? profile?.pomodoro_work_minutes ?? 25;
    const pomodoroBreakMinutes =
      req.body?.pomodoroBreakMinutes ?? profile?.pomodoro_break_minutes ?? 5;
    const maxSubjects = req.body?.maxSubjects ?? 4;
    const preferredSlot = profile?.preferred_study_slot ?? "morning";

    const examDays = activeExams
      .map((exam) => ({
        id: String(exam._id),
        daysUntilExam: getDaysUntilExam(exam.exam_date ?? null, targetDate),
      }))
      .filter((exam) => Number.isFinite(exam.daysUntilExam));

    const daysUntilExam = examDays.length
      ? Math.min(...examDays.map((exam) => exam.daysUntilExam))
      : 30;

    const subjectQuery: Record<string, unknown> = { user_id: req.userId };
    if (activeExams.length > 0) {
      subjectQuery.exam_id = { $in: activeExams.map((exam) => exam._id) };
    }

    const subjects = await Subject.find(subjectQuery);
    const subjectIds = subjects.map((subject) => subject._id);

    const topics = await Topic.find({
      user_id: req.userId,
      subject_id: { $in: subjectIds },
    });

    if (replaceExisting) {
      const dayStart = startOfDay(targetDate).toISOString();
      const dayEnd = endOfDay(targetDate).toISOString();
      await StudySession.deleteMany({
        user_id: req.userId,
        status: "scheduled",
        scheduled_at: {
          $gte: dayStart,
          $lte: dayEnd,
        },
      });
    }

    const recoveryLookbackDays = req.body?.recoveryLookbackDays ?? 7;
    const recoveryLimitSessions = req.body?.recoverySessionCap ?? 2;
    const recoveryMinutesCap = Math.min(
      Math.round(availableMinutes * 0.25),
      req.body?.recoveryMinutesCap ?? Math.round(availableMinutes * 0.25),
    );

    const recoveryStart = new Date(targetDate);
    recoveryStart.setDate(recoveryStart.getDate() - recoveryLookbackDays);

    const missedSessions = await StudySession.find({
      user_id: req.userId,
      status: "missed",
      scheduled_at: {
        $gte: recoveryStart.toISOString(),
        $lt: targetDate.toISOString(),
      },
    }).sort({ scheduled_at: 1 });

    const recoverySessions = [] as {
      topicId: string;
      sessionType: "learning" | "revision" | "recall" | "practice";
      durationMinutes: number;
      reason: string;
      priorityScore: number;
    }[];

    let recoveryMinutes = 0;
    for (const missed of missedSessions) {
      if (recoverySessions.length >= recoveryLimitSessions) break;
      if (recoveryMinutes >= recoveryMinutesCap) break;
      const duration = Math.min(
        missed.planned_duration_minutes ?? 25,
        recoveryMinutesCap - recoveryMinutes,
      );
      recoverySessions.push({
        topicId: String(missed.topic_id),
        sessionType:
          (missed.session_type as
            | "learning"
            | "revision"
            | "recall"
            | "practice") ?? "learning",
        durationMinutes: duration,
        reason: `Recovery from ${missed.scheduled_at.slice(0, 10)}`,
        priorityScore: 90,
      });
      recoveryMinutes += duration;
    }

    const subjectDaysUntilExam: Record<string, number> = {};
    const examDaysMap = new Map(
      examDays.map((exam) => [exam.id, exam.daysUntilExam]),
    );
    for (const subject of subjects) {
      const subjectExamId = String(subject.exam_id);
      subjectDaysUntilExam[String(subject._id)] =
        examDaysMap.get(subjectExamId) ?? daysUntilExam;
    }

    const startAt =
      toDateString(targetDate) === toDateString(new Date()) ? new Date() : null;

    const schedule = buildSchedulePlan({
      date: targetDate,
      availableMinutes,
      pomodoroWorkMinutes,
      pomodoroBreakMinutes,
      maxSubjects,
      preferredSlot,
      daysUntilExam,
      subjectDaysUntilExam,
      startAt,
      topics: topics.map((topic) => ({
        id: String(topic._id),
        name: topic.name,
        subjectId: String(topic.subject_id),
        confidenceLevel: topic.confidence_level ?? 1,
        priorityScore: topic.priority_score ?? 50,
        estimatedHours: topic.estimated_hours ?? 1,
        completedHours: topic.completed_hours ?? 0,
        lastStudiedAt: topic.last_studied_at ?? null,
        nextRevisionAt: topic.next_revision_at ?? null,
        lastRevisionDate: topic.last_revision_date ?? null,
        revisionCount: topic.revision_count ?? 0,
        isCompleted: topic.is_completed ?? false,
      })),
      subjects: subjects.map((subject) => ({
        id: String(subject._id),
        name: subject.name,
        strength:
          (subject.strength as "weak" | "average" | "strong") ?? "average",
        color: subject.color ?? "#0d9488",
      })),
      recoverySessions,
    });

    const sessionsPayload = schedule.scheduledSessions.map((session) => ({
      user_id: req.userId,
      topic_id: session.topicId,
      session_type: session.sessionType,
      planned_duration_minutes: session.durationMinutes,
      scheduled_at: session.scheduledAt,
      status: "scheduled",
      notes: session.reason,
    }));

    const created = await StudySession.insertMany(sessionsPayload);

    const plan = await StudyPlan.findOneAndUpdate(
      { user_id: req.userId, date: schedule.date },
      {
        $set: {
          user_id: req.userId,
          date: schedule.date,
          total_minutes: schedule.totalMinutes,
          max_subjects: maxSubjects,
          pomodoro_work_minutes: pomodoroWorkMinutes,
          pomodoro_break_minutes: pomodoroBreakMinutes,
          generated_at: new Date().toISOString(),
          session_ids: created.map((session) => String(session._id)),
          recovery_minutes: schedule.recoveryMinutes,
          status: "generated",
        },
      },
      { upsert: true, new: true },
    );

    await DailyProgress.findOneAndUpdate(
      { user_id: req.userId, date: schedule.date },
      {
        $set: {
          user_id: req.userId,
          date: schedule.date,
          planned_minutes: schedule.totalMinutes,
          sessions_planned: created.length,
        },
      },
      { upsert: true, new: true },
    );

    res.json({ plan, sessions: created });
  }),
);

router.post(
  "/rebalance",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const targetDate = req.body?.date ? new Date(req.body.date) : new Date();
    const availableMinutes = req.body?.availableMinutes ?? 120;
    const sessionCap = req.body?.sessionCap ?? 2;
    const lookbackDays = req.body?.lookbackDays ?? 7;

    const windowStart = new Date(targetDate);
    windowStart.setDate(windowStart.getDate() - lookbackDays);

    const missedSessions = await StudySession.find({
      user_id: req.userId,
      status: "missed",
      scheduled_at: {
        $gte: windowStart.toISOString(),
        $lt: targetDate.toISOString(),
      },
    }).sort({ scheduled_at: 1 });

    let usedMinutes = 0;
    const rescheduledPayload: Record<string, unknown>[] = [];

    for (const session of missedSessions) {
      if (rescheduledPayload.length >= sessionCap) break;
      if (usedMinutes >= availableMinutes) break;

      const duration = Math.min(
        session.planned_duration_minutes ?? 25,
        availableMinutes - usedMinutes,
      );

      rescheduledPayload.push({
        user_id: req.userId,
        topic_id: session.topic_id,
        session_type: session.session_type ?? "learning",
        planned_duration_minutes: duration,
        scheduled_at: new Date(targetDate).toISOString(),
        status: "scheduled",
        notes: `Recovery from ${String(session.scheduled_at).slice(0, 10)}`,
      });

      usedMinutes += duration;
    }

    const created = rescheduledPayload.length
      ? await StudySession.insertMany(rescheduledPayload)
      : [];

    res.json({ sessions: created, recoveredMinutes: usedMinutes });
  }),
);

export default router;
