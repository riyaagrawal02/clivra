import mongoose from "mongoose";
import { toJsonTransform } from "../utils/model-json";

const DailyProgressSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    date: { type: String, required: true },
    planned_minutes: { type: Number, default: 0 },
    completed_minutes: { type: Number, default: 0 },
    sessions_planned: { type: Number, default: 0 },
    sessions_completed: { type: Number, default: 0 },
    streak_maintained: { type: Boolean, default: false },
    notes: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

DailyProgressSchema.index({ user_id: 1, date: 1 }, { unique: true });
DailyProgressSchema.set("toJSON", { transform: toJsonTransform });

export default mongoose.model("DailyProgress", DailyProgressSchema);
