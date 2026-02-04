import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface YouTubeVideo {
  id: string;
  title: string;
  channelName: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  viewCount: string;
  publishedAt: string;
}

interface RequestBody {
  topicId: string;
  topicName: string;
  subjectName: string;
  examContext?: string;
}

// Parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Format seconds to human-readable duration
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// Filter videos for quality (10-40 minutes, no shorts, no playlists)
function filterVideos(videos: YouTubeVideo[]): YouTubeVideo[] {
  return videos.filter((video) => {
    // Filter by duration: 10-40 minutes (600-2400 seconds)
    if (video.durationSeconds < 600 || video.durationSeconds > 2400) {
      return false;
    }
    // Filter out potential clickbait titles
    const title = video.title.toLowerCase();
    if (title.includes("#shorts") || title.includes("short")) {
      return false;
    }
    return true;
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
    if (!YOUTUBE_API_KEY) {
      throw new Error("YouTube API key not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { topicId, topicName, subjectName, examContext }: RequestBody =
      await req.json();

    // Check cache first
    const { data: cached } = await supabase
      .from("youtube_cache")
      .select("*")
      .eq("topic_id", topicId)
      .eq("user_id", user.id)
      .single();

    if (cached && new Date(cached.expires_at) > new Date()) {
      return new Response(
        JSON.stringify({ videos: cached.videos, fromCache: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate search query
    const searchQuery = examContext
      ? `${topicName} ${subjectName} explained for ${examContext}`
      : `${topicName} ${subjectName} full explanation for exams`;

    // Search YouTube
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("key", YOUTUBE_API_KEY);
    searchUrl.searchParams.set("q", searchQuery);
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", "10");
    searchUrl.searchParams.set("videoDuration", "medium"); // 4-20 minutes
    searchUrl.searchParams.set("order", "relevance");
    searchUrl.searchParams.set("safeSearch", "strict");

    const searchResponse = await fetch(searchUrl.toString());
    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      return new Response(JSON.stringify({ videos: [], fromCache: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get video details (duration, view count)
    const videoIds = searchData.items
      .map((item: { id: { videoId: string } }) => item.id.videoId)
      .join(",");
    const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    detailsUrl.searchParams.set("key", YOUTUBE_API_KEY);
    detailsUrl.searchParams.set("id", videoIds);
    detailsUrl.searchParams.set("part", "contentDetails,statistics");

    const detailsResponse = await fetch(detailsUrl.toString());
    const detailsData = await detailsResponse.json();

    // Combine data
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

    // Filter and limit to 2-3 high-quality videos
    const filteredVideos = filterVideos(videos).slice(0, 3);

    // Cache results
    if (cached) {
      await supabase
        .from("youtube_cache")
        .update({
          videos: filteredVideos,
          search_query: searchQuery,
          fetched_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .eq("topic_id", topicId)
        .eq("user_id", user.id);
    } else {
      await supabase.from("youtube_cache").insert({
        user_id: user.id,
        topic_id: topicId,
        search_query: searchQuery,
        videos: filteredVideos,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ videos: filteredVideos, fromCache: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage, videos: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
