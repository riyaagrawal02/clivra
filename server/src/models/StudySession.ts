import mongoose from "mongoose";
import { toJsonTransform } from "../utils/model-json";

const StudySessionSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    topic_id: { type: String, required: true, index: true },
    session_type: {
      type: String,
      enum: ["learning", "revision", "recall", "practice"],
      default: "learning",
    },
    planned_duration_minutes: { type: Number, required: true },
    actual_duration_minutes: { type: Number, default: 0 },
    scheduled_at: { type: String, required: true },
    started_at: { type: String, default: null },
    completed_at: { type: String, default: null },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "missed", "skipped"],
      default: "scheduled",
    },
    pomodoros_completed: { type: Number, default: 0 },
    notes: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

StudySessionSchema.set("toJSON", { transform: toJsonTransform });

export default mongoose.model("StudySession", StudySessionSchema);
