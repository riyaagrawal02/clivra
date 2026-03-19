import mongoose from "mongoose";
import { toJsonTransform } from "../utils/model-json";

const WeeklyReportSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    week_start: { type: String, required: true },
    week_end: { type: String, required: true },
    total_planned_minutes: { type: Number, default: 0 },
    total_completed_minutes: { type: Number, default: 0 },
    sessions_planned: { type: Number, default: 0 },
    sessions_completed: { type: Number, default: 0 },
    subjects_studied: { type: Array, default: [] },
    confidence_changes: { type: Object, default: {} },
    exam_readiness: {
      type: String,
      enum: ["not_ready", "improving", "almost_ready", "exam_ready"],
      default: "not_ready",
    },
    insights: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

WeeklyReportSchema.index({ user_id: 1, week_start: 1 }, { unique: true });
WeeklyReportSchema.set("toJSON", { transform: toJsonTransform });

export default mongoose.model("WeeklyReport", WeeklyReportSchema);
