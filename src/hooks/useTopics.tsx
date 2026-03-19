import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { calculateTopicPriority, calculateNextRevision } from "@/lib/study-algorithm";
import type { Topic as TopicRecord, Subject } from "@/types/backend";

export type Topic = TopicRecord;
export type TopicInsert = Omit<TopicRecord, "id" | "user_id" | "created_at" | "updated_at">;
export type TopicUpdate = Partial<TopicInsert> & { id: string };

export function useTopics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["topics", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const data = await apiFetch<{ topics: (Topic & { subjects: Subject | null })[] }>(
        "/topics?includeSubject=1"
      );
      return data.topics;
    },
    enabled: !!user,
  });
}

export function useTopicsBySubject(subjectId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["topics", "bySubject", subjectId, user?.id],
    queryFn: async () => {
      if (!user || !subjectId) return [];
      const data = await apiFetch<{ topics: Topic[] }>(
        `/topics?subjectId=${subjectId}`
      );
      return data.topics;
    },
    enabled: !!user && !!subjectId,
  });
}

export function useCreateTopic() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (topic: Omit<TopicInsert, "user_id">) => {
      if (!user) throw new Error("Not authenticated");
      const data = await apiFetch<{ topic: Topic }>("/topics", {
        method: "POST",
        body: JSON.stringify(topic),
      });
      return data.topic;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["subjectsWithTopics"] });
      toast({ title: "Topic created", description: "Your topic has been added." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateTopic() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TopicUpdate) => {
      if (!user) throw new Error("Not authenticated");
      const data = await apiFetch<{ topic: Topic }>(`/topics/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      return data.topic;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["subjectsWithTopics"] });
      toast({ title: "Topic updated", description: "Your topic has been updated." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteTopic() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");
      await apiFetch(`/topics/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["subjectsWithTopics"] });
      queryClient.invalidateQueries({ queryKey: ["studySessions"] });
      toast({ title: "Topic deleted", description: "Your topic has been removed." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateTopicConfidence() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      confidenceLevel,
      revisionCount
    }: {
      id: string;
      confidenceLevel: number;
      revisionCount: number;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const nextRevisionDays = calculateNextRevision(confidenceLevel, revisionCount);
      const nextRevisionDate = new Date();
      nextRevisionDate.setDate(nextRevisionDate.getDate() + nextRevisionDays);

      const data = await apiFetch<{ topic: Topic }>(`/topics/${id}/confidence`, {
        method: "PUT",
        body: JSON.stringify({
          confidence_level: confidenceLevel,
          revision_count: revisionCount,
          last_studied_at: new Date().toISOString(),
          next_revision_at: nextRevisionDate.toISOString(),
        }),
      });
      return data.topic;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["subjectsWithTopics"] });
    },
  });
}

export function useRecalculateTopicPriorities() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      topics,
      subjectStrength,
      daysUntilExam
    }: {
      topics: Topic[];
      subjectStrength: 'weak' | 'average' | 'strong';
      daysUntilExam: number;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const updates = topics.map(topic => {
        const { score } = calculateTopicPriority(
          {
            id: topic.id,
            name: topic.name,
            confidence_level: topic.confidence_level ?? 1,
            priority_score: topic.priority_score ?? 50,
            estimated_hours: Number(topic.estimated_hours ?? 1),
            completed_hours: Number(topic.completed_hours ?? 0),
            last_studied_at: topic.last_studied_at ?? null,
            next_revision_at: topic.next_revision_at ?? null,
            revision_count: topic.revision_count ?? 0,
            is_completed: topic.is_completed ?? false,
          },
          subjectStrength,
          daysUntilExam
        );
        return { id: topic.id, priority_score: score };
      });

      for (const update of updates) {
        await apiFetch(`/topics/${update.id}`, {
          method: "PUT",
          body: JSON.stringify({ priority_score: update.priority_score }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["subjectsWithTopics"] });
    },
  });
}
