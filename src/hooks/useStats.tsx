import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveExam, useDaysUntilExam } from "@/hooks/useExams";
import { useProfile } from "@/hooks/useProfile";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { calculateExamReadiness } from "@/lib/study-algorithm";

export function useDashboardStats() {
  const { user } = useAuth();
  const { data: activeExam } = useActiveExam();
  const { data: profile } = useProfile();
  const daysUntilExam = useDaysUntilExam();

  return useQuery({
    queryKey: ["dashboardStats", user?.id, activeExam?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get total topics
      const { data: topics, error: topicsError } = await supabase
        .from("topics")
        .select("id, is_completed, confidence_level")
        .eq("user_id", user.id);

      if (topicsError) throw topicsError;

      const totalTopics = topics?.length ?? 0;
      const completedTopics = topics?.filter(t => t.is_completed)?.length ?? 0;
      const avgConfidence = topics?.length
        ? topics.reduce((sum, t) => sum + (t.confidence_level ?? 1), 0) / topics.length
        : 0;

      // Get this week's study time
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      const { data: weekSessions, error: sessionsError } = await supabase
        .from("study_sessions")
        .select("actual_duration_minutes, status")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("completed_at", weekStart.toISOString())
        .lte("completed_at", weekEnd.toISOString());

      if (sessionsError) throw sessionsError;

      const weeklyMinutes = weekSessions?.reduce(
        (sum, s) => sum + (s.actual_duration_minutes ?? 0), 0
      ) ?? 0;

      // Get today's progress
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: todayProgress } = await supabase
        .from("daily_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();

      // Calculate completion percentage
      const completionPercentage = totalTopics > 0
        ? Math.round((completedTopics / totalTopics) * 100)
        : 0;

      // Calculate exam readiness
      const readiness = calculateExamReadiness(
        completionPercentage,
        avgConfidence,
        profile?.current_streak ?? 0,
        daysUntilExam ?? 30
      );

      return {
        streak: profile?.current_streak ?? 0,
        longestStreak: profile?.longest_streak ?? 0,
        weeklyHours: Math.round((weeklyMinutes / 60) * 10) / 10,
        topicsTotal: totalTopics,
        topicsCompleted: completedTopics,
        completionPercentage,
        avgConfidence: Math.round(avgConfidence * 10) / 10,
        daysUntilExam,
        examName: activeExam?.name ?? null,
        todayCompleted: todayProgress?.completed_minutes ?? 0,
        todayPlanned: todayProgress?.planned_minutes ?? 180,
        todaySessions: todayProgress?.sessions_completed ?? 0,
        readiness,
      };
    },
    enabled: !!user,
  });
}

export function useNextStudySession() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["nextSession", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const now = new Date();

      // Get the next scheduled or in-progress session
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
        .in("status", ["scheduled", "in_progress"])
        .gte("scheduled_at", now.toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (!data) {
        // Try getting the most recent in-progress session
        const { data: inProgress, error: ipError } = await supabase
          .from("study_sessions")
          .select(`
            *,
            topics (
              *,
              subjects (*)
            )
          `)
          .eq("user_id", user.id)
          .eq("status", "in_progress")
          .order("started_at", { ascending: false })
          .limit(1)
          .single();

        if (ipError && ipError.code !== "PGRST116") throw ipError;
        return inProgress ?? null;
      }

      return data;
    },
    enabled: !!user,
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useWeeklyAnalytics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["weeklyAnalytics", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      const result = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = format(date, "yyyy-MM-dd");

        // Get daily progress
        const { data: progress } = await supabase
          .from("daily_progress")
          .select("planned_minutes, completed_minutes")
          .eq("user_id", user.id)
          .eq("date", dateStr)
          .single();

        result.push({
          day: days[i],
          date: dateStr,
          planned: progress?.planned_minutes ?? 180,
          completed: progress?.completed_minutes ?? 0,
        });
      }

      return result;
    },
    enabled: !!user,
  });
}

export function useSubjectProgress() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["subjectProgress", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: subjects, error: subjectsError } = await supabase
        .from("subjects")
        .select("id, name, color")
        .eq("user_id", user.id);

      if (subjectsError) throw subjectsError;

      const result = [];

      for (const subject of subjects ?? []) {
        const { data: topics } = await supabase
          .from("topics")
          .select("is_completed, confidence_level")
          .eq("subject_id", subject.id)
          .eq("user_id", user.id);

        const totalTopics = topics?.length ?? 0;
        const completedTopics = topics?.filter(t => t.is_completed)?.length ?? 0;
        const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
        const avgConfidence = topics?.length
          ? topics.reduce((sum, t) => sum + (t.confidence_level ?? 1), 0) / topics.length
          : 0;

        result.push({
          name: subject.name,
          color: subject.color,
          progress,
          topics: totalTopics,
          completed: completedTopics,
          avgConfidence: Math.round(avgConfidence * 10) / 10,
        });
      }

      return result;
    },
    enabled: !!user,
  });
}
