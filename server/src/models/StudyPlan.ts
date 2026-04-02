import mongoose from "mongoose";
import { toJsonTransform } from "../utils/model-json";

const StudyPlanSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    date: { type: String, required: true },
    total_minutes: { type: Number, default: 0 },
    max_subjects: { type: Number, default: 4 },
    pomodoro_work_minutes: { type: Number, default: 25 },
    pomodoro_break_minutes: { type: Number, default: 5 },
    generated_at: { type: String, required: true },
    session_ids: { type: [String], default: [] },
    recovery_minutes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["generated", "updated"],
      default: "generated",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

StudyPlanSchema.index({ user_id: 1, date: 1 }, { unique: true });
StudyPlanSchema.set("toJSON", { transform: toJsonTransform });

export default mongoose.model("StudyPlan", StudyPlanSchema);
