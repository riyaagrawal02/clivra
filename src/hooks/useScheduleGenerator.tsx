import { useAuth } from "@/hooks/useAuth";
import { useSubjectsWithTopics } from "@/hooks/useSubjects";
import { useBulkCreateSessions } from "@/hooks/useStudySessions";
import { useActiveExam, useDaysUntilExam } from "@/hooks/useExams";
import { useProfile } from "@/hooks/useProfile";
import { useUpdateDailyProgress } from "@/hooks/useDailyProgress";
import { generateDailySchedule } from "@/lib/study-algorithm";
import { format, addMinutes, startOfDay, setHours, setMinutes } from "date-fns";
import type { TablesInsert } from "@/integrations/supabase/types";

type SubjectsWithTopics = NonNullable<ReturnType<typeof useSubjectsWithTopics>["data"]>;
type SubjectWithTopics = SubjectsWithTopics[number];
type TopicWithDetails = SubjectWithTopics["topics"][number];

export function useScheduleGenerator() {
  const { user } = useAuth();
  const { data: subjectsWithTopics } = useSubjectsWithTopics();
  const { data: profile } = useProfile();
  const { data: activeExam } = useActiveExam();
  const daysUntilExam = useDaysUntilExam();
  const bulkCreate = useBulkCreateSessions();
  const updateDailyProgress = useUpdateDailyProgress();

  const generateScheduleForDate = async (date: Date) => {
    if (!user || !subjectsWithTopics || !activeExam) {
      throw new Error("Missing required data");
    }

    const dailyStudyMinutes = (profile?.daily_study_hours ?? 3) * 60;
    const pomodoroWork = profile?.pomodoro_work_minutes ?? 25;
    const pomodoroBreak = profile?.pomodoro_break_minutes ?? 5;
    const preferredSlot = profile?.preferred_study_slot ?? "morning";

    // Convert subjects to algorithm format
    const subjects = subjectsWithTopics.map((subject: SubjectWithTopics) => ({
      id: subject.id,
      name: subject.name,
      strength: (subject.strength as 'weak' | 'average' | 'strong') ?? 'average',
      color: subject.color ?? '#0d9488',
      topics: subject.topics.map((topic: TopicWithDetails) => ({
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
      })),
    }));

    // Generate schedule using the algorithm
    const scheduleSessions = generateDailySchedule(
      subjects,
      dailyStudyMinutes,
      pomodoroWork,
      pomodoroBreak,
      daysUntilExam ?? 30
    );

    if (scheduleSessions.length === 0) {
      throw new Error("No topics available to schedule. Add subjects and topics first.");
    }

    // Determine start time based on preferred slot
    let startHour = 9;
    switch (preferredSlot) {
      case "morning": startHour = 9; break;
      case "afternoon": startHour = 14; break;
      case "evening": startHour = 18; break;
      case "night": startHour = 21; break;
    }

    // Convert to study_sessions format
    let currentTime = setMinutes(setHours(startOfDay(date), startHour), 0);
    const sessions: Omit<TablesInsert<"study_sessions">, "user_id">[] = [];
    let totalPlannedMinutes = 0;

    for (const session of scheduleSessions) {
      sessions.push({
        topic_id: session.topicId,
        scheduled_at: currentTime.toISOString(),
        planned_duration_minutes: session.durationMinutes,
        session_type: session.type,
        status: "scheduled",
      });

      totalPlannedMinutes += session.durationMinutes;
      // Add duration + 15 min break between sessions
      currentTime = addMinutes(currentTime, session.durationMinutes + 15);
    }

    // Create the sessions
    await bulkCreate.mutateAsync(sessions);

    // Update daily progress with planned minutes
    await updateDailyProgress.mutateAsync({
      date: format(date, "yyyy-MM-dd"),
      updates: {
        planned_minutes: totalPlannedMinutes,
        sessions_planned: sessions.length,
      },
    });

    return sessions;
  };

  return {
    generateScheduleForDate,
    isLoading: bulkCreate.isPending,
    hasTopics: (subjectsWithTopics?.flatMap((s: SubjectWithTopics) => s.topics)?.length ?? 0) > 0,
  };
}
