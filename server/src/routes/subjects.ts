import { Router, Response } from "express";
import Subject from "../models/Subject";
import Topic from "../models/Topic";
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

    const examId = req.query.examId as string | undefined;
    const query: Record<string, unknown> = { user_id: req.userId };

    if (examId) {
      query.exam_id = examId;
    }

    const subjects = await Subject.find(query).sort({ name: 1 });
    res.json({ subjects });
  })
);

router.get(
  "/with-topics",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const examId = req.query.examId as string | undefined;

    if (!examId) {
      res.status(400).json({ error: "examId is required" });
      return;
    }

    const subjects = await Subject.find({
      user_id: req.userId,
      exam_id: examId,
    }).sort({ name: 1 });

    const subjectIds = subjects.map((s) => s._id);

    const topics = await Topic.find({
      user_id: req.userId,
      subject_id: { $in: subjectIds },
    }).sort({ priority_score: -1 });

    const joined = subjects.map((subject) => ({
      ...subject.toJSON(),
      topics: topics.filter(
        (t) => String(t.subject_id) === String(subject._id)
      ),
    }));

    res.json({ subjects: joined });
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

    const subject = await Subject.create({
      ...payload,
      user_id: req.userId,
    });

    res.json({ subject });
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

    const subject = await Subject.findOneAndUpdate(
      { _id: id, user_id: req.userId },
      { $set: updates },
      { new: true }
    );

    if (!subject) {
      res.status(404).json({ error: "Subject not found" });
      return;
    }

    res.json({ subject });
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

    const topics = await Topic.find({
      subject_id: id,
      user_id: req.userId,
    });

    const topicIds = topics.map((t) => t._id);

    await StudySession.deleteMany({
      topic_id: { $in: topicIds },
      user_id: req.userId,
    });

    await Topic.deleteMany({
      subject_id: id,
      user_id: req.userId,
    });

    const result = await Subject.deleteOne({
      _id: id,
      user_id: req.userId,
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ error: "Subject not found" });
      return;
    }

    res.json({ ok: true });
  })
);

export default router;