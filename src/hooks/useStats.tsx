import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useActiveExam, useDaysUntilExam } from "@/hooks/useExams";
import { useProfile } from "@/hooks/useProfile";
import { calculateExamReadiness } from "@/lib/study-algorithm";
import { apiFetch } from "@/lib/api";
import type { StudySessionWithTopic } from "@/hooks/useStudySessions";

export function useDashboardStats() {
  const { user } = useAuth();
  const { data: activeExam } = useActiveExam();
  const { data: profile } = useProfile();
  const daysUntilExam = useDaysUntilExam();

  return useQuery({
    queryKey: ["dashboardStats", user?.id, activeExam?.id],
    queryFn: async () => {
      if (!user) return null;
      const data = await apiFetch<{
        stats: {
          streak: number;
          longestStreak: number;
          weeklyHours: number;
          topicsTotal: number;
          topicsCompleted: number;
          completionPercentage: number;
          avgConfidence: number;
          daysUntilExam: number | null;
          examName: string | null;
          todayCompleted: number;
          todayPlanned: number;
          todaySessions: number;
        }
      }>("/stats/dashboard");

      const readiness = calculateExamReadiness(
        data.stats.completionPercentage,
        data.stats.avgConfidence,
        profile?.current_streak ?? 0,
        daysUntilExam ?? 30
      );

      return { ...data.stats, readiness };
    },
    enabled: !!user,
  });
}

export function useNextStudySession() {
  const { user } = useAuth();

  return useQuery<StudySessionWithTopic | null>({
    queryKey: ["nextSession", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const data = await apiFetch<{ session: StudySessionWithTopic | null }>("/study-sessions/next");
      return data.session ?? null;
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
      const data = await apiFetch<{ analytics: { day: string; date: string; planned: number; completed: number }[] }>(
        "/stats/weekly-analytics"
      );
      return data.analytics;
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
      const data = await apiFetch<{ subjects: { name: string; color: string; progress: number; topics: number; completed: number; avgConfidence: number }[] }>(
        "/stats/subject-progress"
      );
      return data.subjects;
    },
    enabled: !!user,
  });
}
