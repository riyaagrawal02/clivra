import { Router, Response } from "express";
import StudySession from "../models/StudySession";
import Topic from "../models/Topic";
import Subject from "../models/Subject";
import DailyProgress from "../models/DailyProgress";
import RevisionHistory from "../models/RevisionHistory";
import RevisionSchedule from "../models/RevisionSchedule";
import { asyncHandler } from "../utils/async-handler";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { startOfDay, endOfDay, toDateString } from "../utils/date";
import { buildNextRevisionDate } from "../services/revision";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const date = req.query.date as string | undefined;
    const query: Record<string, unknown> = { user_id: req.userId };

    if (date) {
      const day = new Date(date);
      query.scheduled_at = {
        $gte: startOfDay(day).toISOString(),
        $lte: endOfDay(day).toISOString(),
      };
    }

    const sessions = await StudySession.find(query).sort({ scheduled_at: 1 });

    const topicIds = Array.from(new Set(sessions.map((s) => s.topic_id)));
    const topics = await Topic.find({
      _id: { $in: topicIds },
      user_id: req.userId,
    });

    const subjectIds = Array.from(new Set(topics.map((t) => t.subject_id)));
    const subjects = await Subject.find({
      _id: { $in: subjectIds },
      user_id: req.userId,
    });

    const subjectMap = new Map(
      subjects.map((s) => [String(s._id), s.toJSON()]),
    );
    const topicMap = new Map(
      topics.map((topic) => [
        String(topic._id),
        {
          ...topic.toJSON(),
          subjects: subjectMap.get(String(topic.subject_id)) ?? null,
        },
      ]),
    );

    const withTopics = sessions.map((session) => ({
      ...session.toJSON(),
      topics: topicMap.get(String(session.topic_id)) ?? null,
    }));

    res.json({ study_sessions: withTopics });
  }),
);

router.get(
  "/week",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;

    if (!start || !end) {
      res.status(400).json({ error: "start and end are required" });
      return;
    }

    const sessions = await StudySession.find({
      user_id: req.userId,
      scheduled_at: {
        $gte: new Date(start).toISOString(),
        $lte: new Date(end).toISOString(),
      },
    }).sort({ scheduled_at: 1 });

    const topicIds = Array.from(new Set(sessions.map((s) => s.topic_id)));
    const topics = await Topic.find({
      _id: { $in: topicIds },
      user_id: req.userId,
    });

    const subjectIds = Array.from(new Set(topics.map((t) => t.subject_id)));
    const subjects = await Subject.find({
      _id: { $in: subjectIds },
      user_id: req.userId,
    });

    const subjectMap = new Map(
      subjects.map((s) => [String(s._id), s.toJSON()]),
    );
    const topicMap = new Map(
      topics.map((topic) => [
        String(topic._id),
        {
          ...topic.toJSON(),
          subjects: subjectMap.get(String(topic.subject_id)) ?? null,
        },
      ]),
    );

    const withTopics = sessions.map((session) => ({
      ...session.toJSON(),
      topics: topicMap.get(String(session.topic_id)) ?? null,
    }));

    res.json({ study_sessions: withTopics });
  }),
);

router.get(
  "/next",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const now = new Date().toISOString();

    let session = await StudySession.findOne({
      user_id: req.userId,
      status: { $in: ["scheduled", "in_progress"] },
      scheduled_at: { $gte: now },
    }).sort({ scheduled_at: 1 });

    if (!session) {
      session = await StudySession.findOne({
        user_id: req.userId,
        status: "in_progress",
      }).sort({ started_at: -1 });
    }

    if (!session) {
      res.json({ session: null });
      return;
    }

    const topic = await Topic.findOne({
      _id: session.topic_id,
      user_id: req.userId,
    });

    const subject = topic
      ? await Subject.findOne({
          _id: topic.subject_id,
          user_id: req.userId,
        })
      : null;

    res.json({
      session: {
        ...session.toJSON(),
        topics: topic
          ? {
              ...topic.toJSON(),
              subjects: subject ? subject.toJSON() : null,
            }
          : null,
      },
    });
  }),
);

router.post(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const payload = req.body ?? {};
    const session = await StudySession.create({
      ...payload,
      user_id: req.userId,
    });

    res.json({ study_session: session });
  }),
);

router.post(
  "/bulk",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const sessions = (req.body?.sessions ?? req.body) as Record<
      string,
      unknown
    >[];
    const withUser = sessions.map((session) => ({
      ...session,
      user_id: req.userId,
    }));

    const created = await StudySession.insertMany(withUser);
    res.json({ study_sessions: created });
  }),
);

router.put(
  "/:id/start",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;

    const session = await StudySession.findOneAndUpdate(
      { _id: id, user_id: req.userId },
      {
        $set: {
          status: "in_progress",
          started_at: new Date().toISOString(),
        },
      },
      { new: true },
    );

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json({ study_session: session });
  }),
);

router.put(
  "/:id/complete",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const updates = req.body ?? {};

    const session = await StudySession.findOneAndUpdate(
      { _id: id, user_id: req.userId },
      {
        $set: {
          status: "completed",
          completed_at: new Date().toISOString(),
          ...updates,
        },
      },
      { new: true },
    );

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const topic = await Topic.findOne({
      _id: session.topic_id,
      user_id: req.userId,
    });

    if (topic) {
      const actualMinutes =
        updates.actual_duration_minutes ?? session.actual_duration_minutes ?? 0;
      const sessionType = session.session_type ?? "learning";
      const completedAt = session.completed_at
        ? new Date(session.completed_at)
        : new Date();

      if (sessionType === "learning" || sessionType === "practice") {
        const addedHours = actualMinutes / 60;
        const completedHours = (topic.completed_hours ?? 0) + addedHours;
        const estimatedHours = topic.estimated_hours ?? 1;
        const isCompleted = completedHours >= estimatedHours;

        await Topic.updateOne(
          { _id: topic._id },
          {
            $set: {
              completed_hours: completedHours,
              last_studied_at: completedAt.toISOString(),
              is_completed: isCompleted,
            },
          },
        );
      }

      if (sessionType === "revision" || sessionType === "recall") {
        const confidenceBefore = topic.confidence_level ?? 1;
        const providedConfidence = updates.confidence_after ?? confidenceBefore;
        const confidenceAfter = Math.min(
          5,
          Math.max(1, Number(providedConfidence)),
        );
        const revisionCount = (topic.revision_count ?? 0) + 1;
        const { intervalDays, nextRevisionAt } = buildNextRevisionDate(
          completedAt,
          confidenceAfter,
          revisionCount,
        );

        await Topic.updateOne(
          { _id: topic._id },
          {
            $set: {
              last_revision_date: completedAt.toISOString(),
              next_revision_at: nextRevisionAt,
              revision_count: revisionCount,
              confidence_level: confidenceAfter,
              revision_confidence_delta: confidenceAfter - confidenceBefore,
            },
          },
        );

        await RevisionHistory.create({
          user_id: req.userId,
          topic_id: topic._id,
          session_id: session._id,
          confidence_before: confidenceBefore,
          confidence_after: confidenceAfter,
          completed: true,
          skipped: false,
          revision_type: sessionType,
        });

        await RevisionSchedule.findOneAndUpdate(
          { user_id: req.userId, topic_id: topic._id },
          {
            $set: {
              user_id: req.userId,
              topic_id: topic._id,
              next_revision_at: nextRevisionAt,
              interval_days: intervalDays,
              interval_index: revisionCount,
              status: "scheduled",
              last_revision_at: completedAt.toISOString(),
              last_session_id: session._id,
            },
          },
          { upsert: true, new: true },
        );
      }
    }

    const today = toDateString(new Date());
    await DailyProgress.findOneAndUpdate(
      { user_id: req.userId, date: today },
      {
        $inc: {
          completed_minutes: updates.actual_duration_minutes ?? 0,
          sessions_completed: 1,
        },
        $set: {
          user_id: req.userId,
          date: today,
          streak_maintained: true,
        },
      },
      { upsert: true, new: true },
    );

    res.json({ study_session: session });
  }),
);

router.put(
  "/:id/skip",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;

    const session = await StudySession.findOneAndUpdate(
      { _id: id, user_id: req.userId },
      { $set: { status: "missed" } },
      { new: true },
    );

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const sessionType = session.session_type ?? "learning";
    if (sessionType === "revision" || sessionType === "recall") {
      const topic = await Topic.findOne({
        _id: session.topic_id,
        user_id: req.userId,
      });
      if (topic) {
        const confidenceLevel = topic.confidence_level ?? 1;
        await RevisionHistory.create({
          user_id: req.userId,
          topic_id: topic._id,
          session_id: session._id,
          confidence_before: confidenceLevel,
          confidence_after: confidenceLevel,
          completed: false,
          skipped: true,
          revision_type: sessionType,
        });

        await RevisionSchedule.findOneAndUpdate(
          { user_id: req.userId, topic_id: topic._id },
          { $set: { status: "missed" } },
          { upsert: true, new: true },
        );
      }
    }

    res.json({ study_session: session });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;

    const result = await StudySession.deleteOne({
      _id: id,
      user_id: req.userId,
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json({ ok: true });
  }),
);

export default router;
