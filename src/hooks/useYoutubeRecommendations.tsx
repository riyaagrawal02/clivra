import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import type { YouTubeVideo } from "@/types/backend";

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
      const data = await apiFetch<{ videos: YouTubeVideo[]; fromCache: boolean }>(
        "/youtube/recommendations",
        {
          method: "POST",
          body: JSON.stringify({ topicId, topicName, subjectName, examContext }),
        }
      );

      return data.videos || [];
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
      await apiFetch(`/youtube/cache/${topicId}`, { method: "DELETE" });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["youtubeRecommendations", variables.topicId],
      });
    },
  });
}