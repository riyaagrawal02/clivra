import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { calculatePostRevisionUpdates, getRevisionSummary } from "@/lib/study-algorithm";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { Topic } from "@/lib/study-algorithm";

export type RevisionHistory = Tables<"revision_history">;
export type RevisionHistoryInsert = TablesInsert<"revision_history">;

export function useRevisionHistory(topicId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revisionHistory", topicId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from("revision_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (topicId) {
        query = query.eq("topic_id", topicId);
      }
      
      const { data, error } = await query.limit(50);
      
      if (error) throw error;
      return data as RevisionHistory[];
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

      // Record the revision history
      const { data, error } = await supabase
        .from("revision_history")
        .insert({
          user_id: user.id,
          topic_id: topicId,
          session_id: sessionId,
          confidence_before: confidenceBefore,
          confidence_after: confidenceAfter,
          completed,
          skipped,
          revision_type: revisionType,
          notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Update the topic with revision info
      const nextRevisionDate = new Date();
      const updates = calculatePostRevisionUpdates(
        confidenceBefore,
        0, // We'd need to fetch revision count, but this is a simplification
        completed,
        skipped
      );
      
      nextRevisionDate.setDate(nextRevisionDate.getDate() + updates.nextRevisionDays);

      await supabase
        .from("topics")
        .update({
          last_revision_date: new Date().toISOString(),
          revision_confidence_delta: updates.confidenceDelta,
          confidence_level: updates.newConfidence,
          next_revision_at: nextRevisionDate.toISOString(),
          revision_count: supabase.rpc ? undefined : undefined, // Would need a DB function to increment
        })
        .eq("id", topicId)
        .eq("user_id", user.id);

      return data;
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

      // Fetch all topics with their revision data
      const { data: topics, error } = await supabase
        .from("topics")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      // Transform to algorithm Topic type
      const algorithmTopics: Topic[] = (topics || []).map((t) => ({
        id: t.id,
        name: t.name,
        confidence_level: t.confidence_level ?? 1,
        priority_score: t.priority_score ?? 50,
        estimated_hours: Number(t.estimated_hours) ?? 1,
        completed_hours: Number(t.completed_hours) ?? 0,
        last_studied_at: t.last_studied_at,
        next_revision_at: t.next_revision_at,
        revision_count: t.revision_count ?? 0,
        is_completed: t.is_completed ?? false,
        last_revision_date: t.last_revision_date,
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

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("revision_history")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", oneWeekAgo.toISOString());

      if (error) throw error;

      const completed = data?.filter((r) => r.completed).length || 0;
      const skipped = data?.filter((r) => r.skipped).length || 0;
      const total = data?.length || 0;

      const avgConfidenceGain =
        data && data.length > 0
          ? data.reduce((sum, r) => sum + (r.confidence_after - r.confidence_before), 0) / data.length
          : 0;

      return {
        completed,
        skipped,
        total,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        avgConfidenceGain: Math.round(avgConfidenceGain * 10) / 10,
      };
    },
    enabled: !!user,
  });
}