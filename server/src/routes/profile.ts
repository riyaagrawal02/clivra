import { Router } from "express";
import Profile from "../models/Profile";
import { asyncHandler } from "../utils/async-handler";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const profile = await Profile.findOne({ user_id: req.userId });
    res.json({ profile });
  })
);

router.put(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const updates = req.body ?? {};

    const profile = await Profile.findOneAndUpdate(
      { user_id: req.userId },
      { $set: { ...updates, user_id: req.userId } },
      { upsert: true, new: true }
    );

    res.json({ profile });
  })
);

router.post(
  "/streak",
  asyncHandler(async (req: AuthRequest, res) => {
    const { increment } = req.body as { increment?: boolean };
    const profile = await Profile.findOne({ user_id: req.userId });

    const currentStreak = profile?.current_streak ?? 0;
    const longestStreak = profile?.longest_streak ?? 0;
    const newStreak = increment ? currentStreak + 1 : 0;
    const newLongest = Math.max(newStreak, longestStreak);

    const updated = await Profile.findOneAndUpdate(
      { user_id: req.userId },
      {
        $set: {
          current_streak: newStreak,
          longest_streak: newLongest,
        },
        $setOnInsert: { user_id: req.userId },
      },
      { upsert: true, new: true }
    );

    res.json({ profile: updated });
  })
);

export default router;
