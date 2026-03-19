import { Router, Response } from "express";
import env from "../config/env";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import YoutubeCache from "../models/YoutubeCache";
import {
  filterVideos,
  formatDuration,
  parseDuration,
  type YouTubeVideo,
} from "../utils/youtube";

const router = Router();

router.use(requireAuth);

router.post(
  "/recommendations",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { topicId, topicName, subjectName, examContext } = req.body as {
      topicId?: string;
      topicName?: string;
      subjectName?: string;
      examContext?: string;
    };

    if (!topicId || !topicName || !subjectName) {
      res.status(400).json({ error: "Missing topic details" });
      return;
    }

    const cached = await YoutubeCache.findOne({
      user_id: req.userId,
      topic_id: topicId,
    });

    if (cached && new Date(cached.expires_at) > new Date()) {
      res.json({ videos: cached.videos, fromCache: true });
      return;
    }

    if (!env.YOUTUBE_API_KEY) {
      res.status(500).json({ error: "YouTube API key not configured" });
      return;
    }

    const searchQuery = examContext
      ? `${topicName} ${subjectName} explained for ${examContext}`
      : `${topicName} ${subjectName} full explanation for exams`;

    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("key", env.YOUTUBE_API_KEY);
    searchUrl.searchParams.set("q", searchQuery);
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", "10");
    searchUrl.searchParams.set("videoDuration", "medium");
    searchUrl.searchParams.set("order", "relevance");
    searchUrl.searchParams.set("safeSearch", "strict");

    const searchResponse = await fetch(searchUrl.toString());
    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      res.json({ videos: [], fromCache: false });
      return;
    }

    const videoIds = searchData.items
      .map((item: { id: { videoId: string } }) => item.id.videoId)
      .join(",");

    const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    detailsUrl.searchParams.set("key", env.YOUTUBE_API_KEY);
    detailsUrl.searchParams.set("id", videoIds);
    detailsUrl.searchParams.set("part", "contentDetails,statistics");

    const detailsResponse = await fetch(detailsUrl.toString());
    const detailsData = await detailsResponse.json();

    const videos: YouTubeVideo[] = searchData.items.map(
      (item: {
        id: { videoId: string };
        snippet: {
          title: string;
          channelTitle: string;
          publishedAt: string;
          thumbnails: { medium: { url: string } };
        };
      }) => {
        const details = detailsData.items?.find(
          (d: { id: string }) => d.id === item.id.videoId
        );

        const durationSeconds = details
          ? parseDuration(details.contentDetails.duration)
          : 0;

        return {
          id: item.id.videoId,
          title: item.snippet.title,
          channelName: item.snippet.channelTitle,
          duration: formatDuration(durationSeconds),
          durationSeconds,
          thumbnail: item.snippet.thumbnails.medium.url,
          viewCount: details?.statistics?.viewCount || "0",
          publishedAt: item.snippet.publishedAt,
        };
      }
    );

    const filteredVideos = filterVideos(videos).slice(0, 3);

    const payload = {
      user_id: req.userId,
      topic_id: topicId,
      search_query: searchQuery,
      videos: filteredVideos,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
    };

    if (cached) {
      await YoutubeCache.updateOne(
        { _id: cached._id },
        { $set: payload }
      );
    } else {
      await YoutubeCache.create(payload);
    }

    res.json({ videos: filteredVideos, fromCache: false });
  })
);

router.delete(
  "/cache/:topicId",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { topicId } = req.params;

    await YoutubeCache.deleteMany({
      user_id: req.userId,
      topic_id: topicId,
    });

    res.json({ ok: true });
  })
);

export default router;