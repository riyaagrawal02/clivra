import { Router, Response } from "express";
import Exam from "../models/Exam";
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

    const exams = await Exam.find({ user_id: req.userId }).sort({
      exam_date: 1,
    });

    res.json({ exams });
  })
);

router.get(
  "/active",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const exam = await Exam.findOne({
      user_id: req.userId,
      is_active: true,
    });

    res.json({ exam: exam ?? null });
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

    if (payload.is_active) {
      await Exam.updateMany(
        { user_id: req.userId },
        { $set: { is_active: false } }
      );
    }

    const exam = await Exam.create({
      ...payload,
      user_id: req.userId,
    });

    res.json({ exam });
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

    if (updates.is_active) {
      await Exam.updateMany(
        { user_id: req.userId, _id: { $ne: id } },
        { $set: { is_active: false } }
      );
    }

    const exam = await Exam.findOneAndUpdate(
      { _id: id, user_id: req.userId },
      { $set: updates },
      { new: true }
    );

    if (!exam) {
      res.status(404).json({ error: "Exam not found" });
      return;
    }

    res.json({ exam });
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

    const subjects = await Subject.find({
      exam_id: id,
      user_id: req.userId,
    });

    
    const subjectIds = subjects.map((s) => s._id);

    const topics = await Topic.find({
      subject_id: { $in: subjectIds },
      user_id: req.userId,
    });

   
    const topicIds = topics.map((t) => t._id);

    await StudySession.deleteMany({
      topic_id: { $in: topicIds },
      user_id: req.userId,
    });

    await Topic.deleteMany({
      subject_id: { $in: subjectIds },
      user_id: req.userId,
    });

    await Subject.deleteMany({
      exam_id: id,
      user_id: req.userId,
    });

    const result = await Exam.deleteOne({
      _id: id,
      user_id: req.userId,
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ error: "Exam not found" });
      return;
    }

    res.json({ ok: true });
  })
);

export default router;