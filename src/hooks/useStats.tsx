import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useActiveExam } from "@/hooks/useExams";
import { apiFetch } from "@/lib/api";
import type { StudySessionWithTopic } from "@/hooks/useStudySessions";

export function useDashboardStats() {
  const { user } = useAuth();
  const { data: activeExam } = useActiveExam();

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
          revisionCoverage: number;
          consistencyScore: number;
          confidenceTrendScore: number;
          readiness: { status: string; percentage: number };
          daysUntilExam: number | null;
          examName: string | null;
          todayCompleted: number;
          todayPlanned: number;
          todaySessions: number;
        }
      }>("/stats/dashboard");

      return data.stats;
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

export function useWeeklyReport() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["weeklyReport", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const data = await apiFetch<{
        report: {
          plannedMinutes: number;
          completedMinutes: number;
          missedSessions: number;
          recoveredSessions: number;
          confidenceTrendScore: number;
          subjectEffort: { name: string; color: string; minutes: number }[];
        };
      }>("/stats/weekly-report");
      return data.report;
    },
    enabled: !!user,
  });
}
