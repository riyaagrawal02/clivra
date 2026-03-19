import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import env from "../config/env";
import User from "../models/User";
import Profile from "../models/Profile";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const buildUserResponse = (user: { _id: unknown; email: string; full_name?: string; avatar_url?: string }) => ({
  id: String(user._id),
  email: user.email,
  full_name: user.full_name ?? "",
  avatar_url: user.avatar_url ?? "",
});

const signToken = (userId: string) =>
  jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: "7d" });

router.post(
  "/register",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, fullName } = req.body as {
      email?: string;
      password?: string;
      fullName?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      full_name: fullName?.trim() ?? "",
      avatar_url: "",
      password_hash: passwordHash,
    });

    await Profile.findOneAndUpdate(
      { user_id: user._id },
      {
        $setOnInsert: {
          user_id: user._id,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
        },
      },
      { upsert: true, new: true }
    );

    const token = signToken(user._id.toString());
    res.json({ token, user: buildUserResponse(user) });
  })
);

router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.password_hash) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = signToken(user._id.toString());
    res.json({ token, user: buildUserResponse(user) });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await User.findById(req.userId);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user: buildUserResponse(user) });
  })
);

export default router;