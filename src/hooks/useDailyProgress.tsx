import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { format, startOfWeek, endOfWeek, subDays } from "date-fns";
import type { DailyProgress } from "@/types/backend";

export type DailyProgressInsert = Omit<DailyProgress, "id" | "user_id" | "created_at">;
export type DailyProgressUpdate = Partial<DailyProgressInsert>;

export function useTodayProgress() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["dailyProgress", "today", user?.id, today],
    queryFn: async () => {
      if (!user) return null;
      const data = await apiFetch<{ progress: DailyProgress | null }>(
        `/daily-progress/today?date=${today}`
      );
      return data.progress ?? null;
    },
    enabled: !!user,
  });
}

export function useWeeklyProgress() {
  const { user } = useAuth();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  return useQuery({
    queryKey: ["dailyProgress", "week", user?.id, format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user) return [];
      const data = await apiFetch<{ progress: DailyProgress[] }>(
        `/daily-progress/week?start=${format(weekStart, "yyyy-MM-dd")}&end=${format(weekEnd, "yyyy-MM-dd")}`
      );
      return data.progress;
    },
    enabled: !!user,
  });
}

export function useRecentProgress(days: number = 30) {
  const { user } = useAuth();
  const startDate = subDays(new Date(), days);

  return useQuery({
    queryKey: ["dailyProgress", "recent", user?.id, days],
    queryFn: async () => {
      if (!user) return [];
      const data = await apiFetch<{ progress: DailyProgress[] }>(
        `/daily-progress/recent?start=${format(startDate, "yyyy-MM-dd")}`
      );
      return data.progress;
    },
    enabled: !!user,
  });
}

export function useUpdateDailyProgress() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      date,
      updates
    }: {
      date: string;
      updates: Partial<DailyProgressUpdate>;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const data = await apiFetch<{ progress: DailyProgress }>(
        `/daily-progress/${date}`,
        {
          method: "PUT",
          body: JSON.stringify({ updates }),
        }
      );
      return data.progress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyProgress"] });
    },
  });
}

export function useIncrementDailyProgress() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      completedMinutes,
      sessionsCompleted = 1
    }: {
      completedMinutes: number;
      sessionsCompleted?: number;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const data = await apiFetch<{ progress: DailyProgress }>(
        "/daily-progress/increment",
        {
          method: "POST",
          body: JSON.stringify({ completedMinutes, sessionsCompleted }),
        }
      );
      return data.progress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyProgress"] });
    },
  });
}
