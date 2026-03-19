import mongoose from "mongoose";
import { toJsonTransform } from "../utils/model-json";

const ExamSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    exam_date: { type: String, required: true },
    description: { type: String, default: null },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

ExamSchema.set("toJSON", { transform: toJsonTransform });

export default mongoose.model("Exam", ExamSchema);
