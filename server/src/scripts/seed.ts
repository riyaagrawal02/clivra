import env from "../config/env";
import { connectDb } from "../config/db";
import User from "../models/User";
import Profile from "../models/Profile";
import Exam from "../models/Exam";
import Subject from "../models/Subject";
import Topic from "../models/Topic";
import StudySession from "../models/StudySession";
import DailyProgress from "../models/DailyProgress";
import RevisionHistory from "../models/RevisionHistory";
import YoutubeCache from "../models/YoutubeCache";

async function seed() {
  await connectDb();

  // Clear existing data for a clean seed.
  await Promise.all([
    User.deleteMany({}),
    Profile.deleteMany({}),
    Exam.deleteMany({}),
    Subject.deleteMany({}),
    Topic.deleteMany({}),
    StudySession.deleteMany({}),
    DailyProgress.deleteMany({}),
    RevisionHistory.deleteMany({}),
    YoutubeCache.deleteMany({}),
  ]);

  const user = await User.create({
    email: "student@example.com",
    full_name: "Aarav Sharma",
    avatar_url: "",
  });

  await Profile.create({
    user_id: user.id,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    preferred_study_slot: "morning",
    daily_study_hours: 3.5,
    pomodoro_work_minutes: 25,
    pomodoro_break_minutes: 5,
    current_streak: 4,
    longest_streak: 7,
  });

  const exam = await Exam.create({
    user_id: user.id,
    name: "JEE Advanced 2026",
    exam_date: "2026-05-14",
    description: "Engineering entrance exam",
    is_active: true,
  });

  const subjects = await Subject.insertMany([
    {
      user_id: user.id,
      exam_id: exam.id,
      name: "Physics",
      strength: "average",
      color: "#0ea5e9",
    },
    {
      user_id: user.id,
      exam_id: exam.id,
      name: "Chemistry",
      strength: "weak",
      color: "#f59e0b",
    },
    {
      user_id: user.id,
      exam_id: exam.id,
      name: "Mathematics",
      strength: "strong",
      color: "#22c55e",
    },
  ]);

  const [physics, chemistry, math] = subjects;

  const topics = await Topic.insertMany([
    {
      user_id: user.id,
      subject_id: physics.id,
      name: "Electrostatics",
      confidence_level: 2,
      priority_score: 78,
      estimated_hours: 4,
      completed_hours: 1.5,
      revision_count: 1,
      next_revision_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      user_id: user.id,
      subject_id: chemistry.id,
      name: "Chemical Bonding",
      confidence_level: 1,
      priority_score: 86,
      estimated_hours: 3,
      completed_hours: 0.5,
      revision_count: 0,
      next_revision_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      user_id: user.id,
      subject_id: math.id,
      name: "Integral Calculus",
      confidence_level: 4,
      priority_score: 52,
      estimated_hours: 5,
      completed_hours: 2.5,
      revision_count: 2,
      next_revision_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]);

  const [topic1, topic2, topic3] = topics;

  await StudySession.insertMany([
    {
      user_id: user.id,
      topic_id: topic1.id,
      session_type: "learning",
      planned_duration_minutes: 45,
      actual_duration_minutes: 40,
      scheduled_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      status: "completed",
      pomodoros_completed: 1,
    },
    {
      user_id: user.id,
      topic_id: topic2.id,
      session_type: "learning",
      planned_duration_minutes: 50,
      scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      status: "scheduled",
    },
    {
      user_id: user.id,
      topic_id: topic3.id,
      session_type: "revision",
      planned_duration_minutes: 40,
      scheduled_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      status: "scheduled",
    },
  ]);

  const today = new Date().toISOString().slice(0, 10);
  await DailyProgress.create({
    user_id: user.id,
    date: today,
    planned_minutes: 180,
    completed_minutes: 40,
    sessions_planned: 3,
    sessions_completed: 1,
    streak_maintained: true,
  });

  await RevisionHistory.create({
    user_id: user.id,
    topic_id: topic1.id,
    confidence_before: 2,
    confidence_after: 3,
    completed: true,
    skipped: false,
    revision_type: "revision",
    notes: "Reviewed key formulas and solved 5 problems",
  });

  await YoutubeCache.create({
    user_id: user.id,
    topic_id: topic2.id,
    search_query: "Chemical Bonding explained for JEE",
    videos: [
      {
        id: "dQw4w9WgXcQ",
        title: "Chemical Bonding - Complete Concept",
        channelName: "StudyWithMe",
        duration: "18:42",
        durationSeconds: 1122,
        thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
        viewCount: "152340",
        publishedAt: "2024-08-14T00:00:00Z",
      },
    ],
    fetched_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  console.log("Seed complete for", env.MONGODB_URI);
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
