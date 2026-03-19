import mongoose from "mongoose";
import { toJsonTransform } from "../utils/model-json";

const ProfileSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, unique: true },
    full_name: { type: String, default: "" },
    avatar_url: { type: String, default: "" },
    preferred_study_slot: {
      type: String,
      enum: ["morning", "afternoon", "evening", "night"],
      default: "morning",
    },
    daily_study_hours: { type: Number, default: 3 },
    pomodoro_work_minutes: { type: Number, default: 25 },
    pomodoro_break_minutes: { type: Number, default: 5 },
    current_streak: { type: Number, default: 0 },
    longest_streak: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

ProfileSchema.set("toJSON", { transform: toJsonTransform });

export default mongoose.model("Profile", ProfileSchema);
