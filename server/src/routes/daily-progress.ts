import { Router, Response } from "express";
import DailyProgress from "../models/DailyProgress";
import { asyncHandler } from "../utils/async-handler";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { toDateString } from "../utils/date";

const router = Router();

router.use(requireAuth);

router.get(
  "/today",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const date =
      (req.query.date as string | undefined) ??
      toDateString(new Date());

    const progress = await DailyProgress.findOne({
      user_id: req.userId,
      date,
    });

    res.json({ progress: progress ?? null });
  })
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

    const progress = await DailyProgress.find({
      user_id: req.userId,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    res.json({ progress });
  })
);

router.get(
  "/recent",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const start = req.query.start as string | undefined;

    if (!start) {
      res.status(400).json({ error: "start is required" });
      return;
    }

    const progress = await DailyProgress.find({
      user_id: req.userId,
      date: { $gte: start },
    }).sort({ date: 1 });

    res.json({ progress });
  })
);

router.put(
  "/:date",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { date } = req.params;
    const updates = req.body?.updates ?? req.body ?? {};

    const progress = await DailyProgress.findOneAndUpdate(
      { user_id: req.userId, date },
      {
        $set: {
          ...updates,
          user_id: req.userId,
          date,
        },
      },
      { upsert: true, new: true }
    );

    res.json({ progress });
  })
);

router.post(
  "/increment",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const {
      completedMinutes = 0,
      sessionsCompleted = 1,
    } = req.body ?? {};

    const today = toDateString(new Date());

    const existing = await DailyProgress.findOne({
      user_id: req.userId,
      date: today,
    });

    const currentCompleted = existing?.completed_minutes ?? 0;
    const currentSessions = existing?.sessions_completed ?? 0;

    const progress = await DailyProgress.findOneAndUpdate(
      { user_id: req.userId, date: today },
      {
        $set: {
          completed_minutes: currentCompleted + completedMinutes,
          sessions_completed: currentSessions + sessionsCompleted,
          streak_maintained: true,
          user_id: req.userId,
          date: today,
        },
      },
      { upsert: true, new: true }
    );

    res.json({ progress });
  })
);

export default router;