import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import RevisionHistory from "../models/RevisionHistory";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const topicId = req.query.topicId as string | undefined;
    const query: Record<string, unknown> = { user_id: req.userId };
    if (topicId) {
      query.topic_id = topicId;
    }

    const revisions = await RevisionHistory.find(query).sort({ created_at: -1 }).limit(50);
    res.json({ revisions });
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const payload = req.body ?? {};
    const revision = await RevisionHistory.create({ ...payload, user_id: req.userId });
    res.json({ revision });
  })
);

router.get(
  "/weekly-stats",
  asyncHandler(async (req: AuthRequest, res) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const revisions = await RevisionHistory.find({
      user_id: req.userId,
      created_at: { $gte: oneWeekAgo },
    });

    const completed = revisions.filter((r) => r.completed).length;
    const skipped = revisions.filter((r) => r.skipped).length;
    const total = revisions.length;
    const avgConfidenceGain = total
      ? revisions.reduce((sum, r) => sum + (r.confidence_after - r.confidence_before), 0) / total
      : 0;

    res.json({
      stats: {
        completed,
        skipped,
        total,
        completionRate: total ? Math.round((completed / total) * 100) : 0,
        avgConfidenceGain: Math.round(avgConfidenceGain * 10) / 10,
      },
    });
  })
);

export default router;
