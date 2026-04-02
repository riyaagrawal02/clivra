import { useAuth } from "@/hooks/useAuth";
import { useActiveExam } from "@/hooks/useExams";
import { useSubjectsWithTopics } from "@/hooks/useSubjects";
import { useProfile } from "@/hooks/useProfile";
import { apiFetch } from "@/lib/api";
import { format } from "date-fns";
import { useState } from "react";
import type { StudySession } from "@/types/backend";

type StudySessionInsert = StudySession;

export function useScheduleGenerator() {
  const { user } = useAuth();
  const { data: subjectsWithTopics } = useSubjectsWithTopics();
  const { data: profile } = useProfile();
  const { data: activeExam } = useActiveExam();
  const [isLoading, setIsLoading] = useState(false);

  const generateScheduleForDate = async (date: Date) => {
    setIsLoading(true);
    if (!user || !activeExam) {
      setIsLoading(false);
      throw new Error("Missing required data");
    }

    const dailyStudyMinutes = (profile?.daily_study_hours ?? 3) * 60;
    const pomodoroWork = profile?.pomodoro_work_minutes ?? 25;
    const pomodoroBreak = profile?.pomodoro_break_minutes ?? 5;
    try {
      const data = await apiFetch<{ plan: unknown; sessions: StudySessionInsert[] }>(
        "/schedule/generate",
        {
          method: "POST",
          body: JSON.stringify({
            date: format(date, "yyyy-MM-dd"),
            availableMinutes: dailyStudyMinutes,
            pomodoroWorkMinutes: pomodoroWork,
            pomodoroBreakMinutes: pomodoroBreak,
          }),
        }
      );

      if (!data.sessions?.length) {
        throw new Error("No topics available to schedule. Add subjects and topics first.");
      }

      return data.sessions;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateScheduleForDate,
    isLoading,
    hasTopics: (subjectsWithTopics?.flatMap((s) => s.topics)?.length ?? 0) > 0,
  };
}
