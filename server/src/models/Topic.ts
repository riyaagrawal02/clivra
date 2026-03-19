import mongoose from "mongoose";
import { toJsonTransform } from "../utils/model-json";

const TopicSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    subject_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    confidence_level: { type: Number, default: 1 },
    priority_score: { type: Number, default: 50 },
    estimated_hours: { type: Number, default: 1 },
    completed_hours: { type: Number, default: 0 },
    last_studied_at: { type: String, default: null },
    next_revision_at: { type: String, default: null },
    revision_count: { type: Number, default: 0 },
    is_completed: { type: Boolean, default: false },
    notes: { type: String, default: null },
    last_revision_date: { type: String, default: null },
    revision_confidence_delta: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

TopicSchema.set("toJSON", { transform: toJsonTransform });

export default mongoose.model("Topic", TopicSchema);
