import mongoose from "mongoose";
import { toJsonTransform } from "../utils/model-json";

const RevisionScheduleSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    topic_id: { type: String, required: true, index: true },
    next_revision_at: { type: String, required: true },
    interval_days: { type: Number, required: true },
    interval_index: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["scheduled", "completed", "missed"],
      default: "scheduled",
    },
    last_revision_at: { type: String, default: null },
    last_session_id: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

RevisionScheduleSchema.index({ user_id: 1, topic_id: 1 }, { unique: true });
RevisionScheduleSchema.set("toJSON", { transform: toJsonTransform });

export default mongoose.model("RevisionSchedule", RevisionScheduleSchema);
