import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { endOfWeek, format } from "date-fns";
import type { StudySession as StudySessionRecord, Topic, Subject } from "@/types/backend";

export type StudySession = StudySessionRecord;
export type StudySessionInsert = Omit<StudySessionRecord, "id" | "user_id" | "created_at" | "updated_at">;
export type StudySessionUpdate = Partial<StudySessionInsert> & { id: string };

export interface StudySessionWithTopic extends StudySession {
  topics: (Topic & {
    subjects: Subject | null;
  }) | null;
}

export function useTodaySessions() {
  const { user } = useAuth();
  const today = new Date();

  return useQuery({
    queryKey: ["studySessions", "today", user?.id, format(today, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user) return [];
      const data = await apiFetch<{ study_sessions: StudySessionWithTopic[] }>(
        `/study-sessions?date=${format(today, "yyyy-MM-dd")}`
      );
      return data.study_sessions;
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
      const data = await apiFetch<{ study_sessions: StudySessionWithTopic[] }>(
        `/study-sessions?date=${format(date, "yyyy-MM-dd")}`
      );
      return data.study_sessions;
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
      const data = await apiFetch<{ study_sessions: StudySessionWithTopic[] }>(
        `/study-sessions/week?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`
      );
      return data.study_sessions;
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
      const data = await apiFetch<{ study_session: StudySession }>("/study-sessions", {
        method: "POST",
        body: JSON.stringify(session),
      });
      return data.study_session;
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
      const data = await apiFetch<{ study_session: StudySession }>(
        `/study-sessions/${id}/start`,
        { method: "PUT" }
      );
      return data.study_session;
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
      const data = await apiFetch<{ study_session: StudySession }>(
        `/study-sessions/${id}/complete`,
        {
          method: "PUT",
          body: JSON.stringify({
            actual_duration_minutes: actualMinutes,
            pomodoros_completed: pomodorosCompleted,
            notes,
          }),
        }
      );
      return data.study_session;
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
      const data = await apiFetch<{ study_session: StudySession }>(
        `/study-sessions/${id}/skip`,
        { method: "PUT" }
      );
      return data.study_session;
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
      await apiFetch(`/study-sessions/${id}`, { method: "DELETE" });
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
      const data = await apiFetch<{ study_sessions: StudySession[] }>("/study-sessions/bulk", {
        method: "POST",
        body: JSON.stringify({ sessions }),
      });
      return data.study_sessions;
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
