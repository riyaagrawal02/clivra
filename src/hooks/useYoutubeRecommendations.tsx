import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface YouTubeVideo {
  id: string;
  title: string;
  channelName: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  viewCount: string;
  publishedAt: string;
}

interface UseYouTubeRecommendationsParams {
  topicId: string;
  topicName: string;
  subjectName: string;
  examContext?: string;
  confidenceLevel?: number;
  enabled?: boolean;
}

export function useYouTubeRecommendations({
  topicId,
  topicName,
  subjectName,
  examContext,
  confidenceLevel = 3,
  enabled = true,
}: UseYouTubeRecommendationsParams) {
  const { user } = useAuth();

  const shouldFetch = enabled && confidenceLevel <= 3;

  return useQuery({
    queryKey: ["youtubeRecommendations", topicId, user?.id],
    queryFn: async () => {
      if (!user) return [];

      
      const { data: cached } = await supabase
        .from("youtube_cache")
        .select("*")
        .eq("topic_id", topicId)
        .eq("user_id", user.id)
        .single();

      if (cached && new Date(cached.expires_at) > new Date()) {
        const videos = cached.videos;
        if (Array.isArray(videos)) {
          return videos as unknown as YouTubeVideo[];
        }
        return [];
      }

      const { data, error } = await supabase.functions.invoke("youtube-recommendations", {
        body: {
          topicId,
          topicName,
          subjectName,
          examContext,
        },
      });

      if (error) {
        console.error("YouTube API error:", error);
        return [];
      }

      return (data?.videos as YouTubeVideo[]) || [];
    },
    enabled: !!user && !!topicId && shouldFetch,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
}

export function useRefreshYouTubeCache() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ topicId }: { topicId: string }) => {
      if (!user) throw new Error("Not authenticated");

      await supabase
        .from("youtube_cache")
        .delete()
        .eq("topic_id", topicId)
        .eq("user_id", user.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["youtubeRecommendations", variables.topicId],
      });
    },
  });
}