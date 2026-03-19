import mongoose from "mongoose";
import { toJsonTransform } from "../utils/model-json";

const RevisionHistorySchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    topic_id: { type: String, required: true, index: true },
    session_id: { type: String, default: null },
    confidence_before: { type: Number, required: true },
    confidence_after: { type: Number, required: true },
    completed: { type: Boolean, default: false },
    skipped: { type: Boolean, default: false },
    revision_type: { type: String, default: "scheduled" },
    notes: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

RevisionHistorySchema.set("toJSON", { transform: toJsonTransform });

export default mongoose.model("RevisionHistory", RevisionHistorySchema);
