import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { calculateTopicPriority, calculateNextRevision } from "@/lib/study-algorithm";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Topic = Tables<"topics">;
export type TopicInsert = TablesInsert<"topics">;
export type TopicUpdate = TablesUpdate<"topics">;

export function useTopics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["topics", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("topics")
        .select("*, subjects(*)")
        .eq("user_id", user.id)
        .order("priority_score", { ascending: false });

      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("user_id", user.id)
        .eq("subject_id", subjectId)
        .order("priority_score", { ascending: false });

      if (error) throw error;
      return data as Topic[];
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

      const { data, error } = await supabase
        .from("topics")
        .insert({ ...topic, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
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
    mutationFn: async ({ id, ...updates }: TopicUpdate & { id: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("topics")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
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

      // First delete all study sessions for this topic
      await supabase
        .from("study_sessions")
        .delete()
        .eq("topic_id", id)
        .eq("user_id", user.id);

      const { error } = await supabase
        .from("topics")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
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

      const { data, error } = await supabase
        .from("topics")
        .update({
          confidence_level: confidenceLevel,
          revision_count: revisionCount,
          last_studied_at: new Date().toISOString(),
          next_revision_at: nextRevisionDate.toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
            last_studied_at: topic.last_studied_at,
            next_revision_at: topic.next_revision_at,
            revision_count: topic.revision_count ?? 0,
            is_completed: topic.is_completed ?? false,
          },
          subjectStrength,
          daysUntilExam
        );
        return { id: topic.id, priority_score: score };
      });

      for (const update of updates) {
        await supabase
          .from("topics")
          .update({ priority_score: update.priority_score })
          .eq("id", update.id)
          .eq("user_id", user.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["subjectsWithTopics"] });
    },
  });
}
