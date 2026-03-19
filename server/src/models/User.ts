import mongoose from "mongoose";
import { toJsonTransform } from "../utils/model-json";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    full_name: { type: String, default: "" },
    avatar_url: { type: String, default: "" },
    password_hash: { type: String, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

UserSchema.set("toJSON", { transform: toJsonTransform });

export default mongoose.model("User", UserSchema);
