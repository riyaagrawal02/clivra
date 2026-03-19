import { Router, Response } from "express";
import Topic from "../models/Topic";
import Subject from "../models/Subject";
import StudySession from "../models/StudySession";
import { asyncHandler } from "../utils/async-handler";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const subjectId = req.query.subjectId as string | undefined;
    const includeSubject = req.query.includeSubject === "1";

    const query: Record<string, unknown> = { user_id: req.userId };
    if (subjectId) {
      query.subject_id = subjectId;
    }

    const topics = await Topic.find(query).sort({ priority_score: -1 });

    if (!includeSubject) {
      res.json({ topics });
      return;
    }

    const subjectIds = Array.from(new Set(topics.map((t) => t.subject_id)));

    const subjects = await Subject.find({
      user_id: req.userId,
      _id: { $in: subjectIds },
    });

    const subjectMap = new Map(
      subjects.map((s) => [String(s._id), s.toJSON()])
    );

    const withSubjects = topics.map((topic) => ({
      ...topic.toJSON(),
      subjects: subjectMap.get(String(topic.subject_id)) ?? null,
    }));

    res.json({ topics: withSubjects });
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const payload = req.body ?? {};

    const topic = await Topic.create({
      ...payload,
      user_id: req.userId,
    });

    res.json({ topic });
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const updates = req.body ?? {};

    const topic = await Topic.findOneAndUpdate(
      { _id: id, user_id: req.userId },
      { $set: updates },
      { new: true }
    );

    if (!topic) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }

    res.json({ topic });
  })
);

router.put(
  "/:id/confidence",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const updates = req.body ?? {};

    const topic = await Topic.findOneAndUpdate(
      { _id: id, user_id: req.userId },
      { $set: updates },
      { new: true }
    );

    if (!topic) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }

    res.json({ topic });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;

    await StudySession.deleteMany({
      topic_id: id,
      user_id: req.userId,
    });

    const result = await Topic.deleteOne({
      _id: id,
      user_id: req.userId,
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }

    res.json({ ok: true });
  })
);

export default router;