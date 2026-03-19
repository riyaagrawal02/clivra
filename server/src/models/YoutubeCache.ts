import mongoose from "mongoose";
import { toJsonTransform } from "../utils/model-json";

const YoutubeCacheSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    topic_id: { type: String, required: true, index: true },
    search_query: { type: String, required: true },
    videos: { type: Array, default: [] },
    fetched_at: { type: String, required: true },
    expires_at: { type: String, required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

YoutubeCacheSchema.index({ user_id: 1, topic_id: 1 }, { unique: true });
YoutubeCacheSchema.set("toJSON", { transform: toJsonTransform });

export default mongoose.model("YoutubeCache", YoutubeCacheSchema);
