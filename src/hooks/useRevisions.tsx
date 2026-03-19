import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { calculatePostRevisionUpdates, getRevisionSummary } from "@/lib/study-algorithm";
import type { RevisionHistory as RevisionHistoryType, Topic as TopicRecord } from "@/types/backend";
import type { Topic } from "@/lib/study-algorithm";

export type RevisionHistory = RevisionHistoryType;
export type RevisionHistoryInsert = Omit<RevisionHistoryType, "id" | "user_id" | "created_at">;

export function useRevisionHistory(topicId?: string) {
  const { user } = useAuth();

  return useQuery<RevisionHistory[]>({
    queryKey: ["revisionHistory", topicId, user?.id],
    queryFn: async (): Promise<RevisionHistory[]> => {
      if (!user) return [];
      const query = topicId ? `?topicId=${topicId}` : "";
      const data = await apiFetch<{ revisions: RevisionHistory[] }>(`/revisions${query}`);
      return data.revisions;
    },
    enabled: !!user,
  });
}

export function useRecordRevision() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      topicId,
      sessionId,
      confidenceBefore,
      confidenceAfter,
      completed,
      skipped,
      revisionType = "scheduled",
      notes,
    }: {
      topicId: string;
      sessionId?: string;
      confidenceBefore: number;
      confidenceAfter: number;
      completed: boolean;
      skipped: boolean;
      revisionType?: string;
      notes?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const data = await apiFetch<{ revision: RevisionHistory }>("/revisions", {
        method: "POST",
        body: JSON.stringify({
          topic_id: topicId,
          session_id: sessionId,
          confidence_before: confidenceBefore,
          confidence_after: confidenceAfter,
          completed,
          skipped,
          revision_type: revisionType,
          notes,
        }),
      });

      const nextRevisionDate = new Date();
      const updates = calculatePostRevisionUpdates(
        confidenceBefore,
        0,
        completed,
        skipped
      );

      nextRevisionDate.setDate(nextRevisionDate.getDate() + updates.nextRevisionDays);

      await apiFetch<{ topic: TopicRecord }>(`/topics/${topicId}`, {
        method: "PUT",
        body: JSON.stringify({
          last_revision_date: new Date().toISOString(),
          revision_confidence_delta: updates.confidenceDelta,
          confidence_level: updates.newConfidence,
          next_revision_at: nextRevisionDate.toISOString(),
        }),
      });

      return data.revision;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["revisionHistory"] });
      queryClient.invalidateQueries({ queryKey: ["topics"] });

      if (variables.completed) {
        toast({
          title: "Revision completed!",
          description: "Your progress has been saved.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useRevisionSummary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revisionSummary", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const topicsData = await apiFetch<{ topics: TopicRecord[] }>("/topics");
      const algorithmTopics: Topic[] = (topicsData.topics || []).map((t) => ({
        id: t.id,
        name: t.name,
        confidence_level: t.confidence_level ?? 1,
        priority_score: t.priority_score ?? 50,
        estimated_hours: t.estimated_hours ?? 1,
        completed_hours: t.completed_hours ?? 0,
        last_studied_at: t.last_studied_at ?? null,
        next_revision_at: t.next_revision_at ?? null,
        revision_count: t.revision_count ?? 0,
        is_completed: t.is_completed ?? false,
        last_revision_date: t.last_revision_date ?? null,
        revision_confidence_delta: t.revision_confidence_delta ?? 0,
      }));

      return getRevisionSummary(algorithmTopics);
    },
    enabled: !!user,
  });
}

export function useWeeklyRevisionStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["weeklyRevisionStats", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const statsData = await apiFetch<{ stats: { completed: number; skipped: number; total: number; completionRate: number; avgConfidenceGain: number } }>(
        "/revisions/weekly-stats"
      );

      return statsData.stats;
    },
    enabled: !!user,
  });
}