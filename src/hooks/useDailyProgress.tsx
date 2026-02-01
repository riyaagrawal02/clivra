import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/superbase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfWeek, endOfWeek, subDays } from "date-fns";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/superbase/types";

export type DailyProgress = Tables<"daily_progress">;
export type DailyProgressInsert = TablesInsert<"daily_progress">;
export type DailyProgressUpdate = TablesUpdate<"daily_progress">;

export function useTodayProgress() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["dailyProgress", "today", user?.id, today],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("daily_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data as DailyProgress | null;
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
      const { data, error } = await supabase
        .from("daily_progress")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"))
        .order("date", { ascending: true });
      
      if (error) throw error;
      return data as DailyProgress[];
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
      const { data, error } = await supabase
        .from("daily_progress")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", format(startDate, "yyyy-MM-dd"))
        .order("date", { ascending: true });
      
      if (error) throw error;
      return data as DailyProgress[];
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

      
      const { data: existing } = await supabase
        .from("daily_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", date)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from("daily_progress")
          .update(updates)
          .eq("user_id", user.id)
          .eq("date", date)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("daily_progress")
          .insert({
            user_id: user.id,
            date,
            ...updates,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
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

      const today = format(new Date(), "yyyy-MM-dd");

     
      const { data: existing } = await supabase
        .from("daily_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();

      const currentCompleted = existing?.completed_minutes ?? 0;
      const currentSessions = existing?.sessions_completed ?? 0;

      if (existing) {
        const { data, error } = await supabase
          .from("daily_progress")
          .update({
            completed_minutes: currentCompleted + completedMinutes,
            sessions_completed: currentSessions + sessionsCompleted,
            streak_maintained: true,
          })
          .eq("user_id", user.id)
          .eq("date", today)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("daily_progress")
          .insert({
            user_id: user.id,
            date: today,
            completed_minutes: completedMinutes,
            sessions_completed: sessionsCompleted,
            streak_maintained: true,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyProgress"] });
    },
  });
}
