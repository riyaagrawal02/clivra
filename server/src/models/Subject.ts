import mongoose from "mongoose";
import { toJsonTransform } from "../utils/model-json";

const SubjectSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    exam_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    strength: { type: String, enum: ["weak", "average", "strong"], default: "average" },
    color: { type: String, default: "#0d9488" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

SubjectSchema.set("toJSON", { transform: toJsonTransform });

export default mongoose.model("Subject", SubjectSchema);
