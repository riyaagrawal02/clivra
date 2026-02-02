import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { startOfDay, endOfDay, endOfWeek, format } from "date-fns";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type StudySession = Tables<"study_sessions">;
export type StudySessionInsert = TablesInsert<"study_sessions">;
export type StudySessionUpdate = TablesUpdate<"study_sessions">;

export interface StudySessionWithTopic extends StudySession {
  topics: Tables<"topics"> & {
    subjects: Tables<"subjects">;
  };
}

export function useTodaySessions() {
  const { user } = useAuth();
  const today = new Date();

  return useQuery({
    queryKey: ["studySessions", "today", user?.id, format(today, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("study_sessions")
        .select(`
          *,
          topics (
            *,
            subjects (*)
          )
        `)
        .eq("user_id", user.id)
        .gte("scheduled_at", startOfDay(today).toISOString())
        .lte("scheduled_at", endOfDay(today).toISOString())
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data as StudySessionWithTopic[];
    },
    enabled: !!user,
  });
}

export function useSessionsByDate(date: Date) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["studySessions", "byDate", user?.id, format(date, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("study_sessions")
        .select(`
          *,
          topics (
            *,
            subjects (*)
          )
        `)
        .eq("user_id", user.id)
        .gte("scheduled_at", startOfDay(date).toISOString())
        .lte("scheduled_at", endOfDay(date).toISOString())
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data as StudySessionWithTopic[];
    },
    enabled: !!user,
  });
}

export function useWeekSessions(weekStart: Date) {
  const { user } = useAuth();
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  return useQuery({
    queryKey: ["studySessions", "week", user?.id, format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("study_sessions")
        .select(`
          *,
          topics (
            *,
            subjects (*)
          )
        `)
        .eq("user_id", user.id)
        .gte("scheduled_at", weekStart.toISOString())
        .lte("scheduled_at", weekEnd.toISOString())
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data as StudySessionWithTopic[];
    },
    enabled: !!user,
  });
}

export function useCreateStudySession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (session: Omit<StudySessionInsert, "user_id">) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("study_sessions")
        .insert({ ...session, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studySessions"] });
      toast({ title: "Session scheduled", description: "Your study session has been added." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useStartSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("study_sessions")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studySessions"] });
    },
  });
}

export function useCompleteSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      actualMinutes,
      pomodorosCompleted,
      notes
    }: {
      id: string;
      actualMinutes: number;
      pomodorosCompleted: number;
      notes?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("study_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          actual_duration_minutes: actualMinutes,
          pomodoros_completed: pomodorosCompleted,
          notes,
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studySessions"] });
      queryClient.invalidateQueries({ queryKey: ["dailyProgress"] });
      toast({ title: "Session completed!", description: "Great work! Keep up the momentum." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useSkipSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("study_sessions")
        .update({ status: "missed" })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studySessions"] });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("study_sessions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studySessions"] });
    },
  });
}

export function useBulkCreateSessions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (sessions: Omit<StudySessionInsert, "user_id">[]) => {
      if (!user) throw new Error("Not authenticated");

      const sessionsWithUserId = sessions.map(s => ({ ...s, user_id: user.id }));

      const { data, error } = await supabase
        .from("study_sessions")
        .insert(sessionsWithUserId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["studySessions"] });
      toast({
        title: "Schedule generated",
        description: `${data.length} sessions have been scheduled.`
      });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
