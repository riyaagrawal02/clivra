import { startOfDay, toDateString } from "../utils/date";
import {
  getNextRevisionIntervalDays,
  getRevisionUrgency,
  isRevisionDue,
} from "./revision";

export type ScheduleTopic = {
  id: string;
  name: string;
  subjectId: string;
  confidenceLevel: number;
  priorityScore: number;
  estimatedHours: number;
  completedHours: number;
  lastStudiedAt?: string | null;
  nextRevisionAt?: string | null;
  lastRevisionDate?: string | null;
  revisionCount: number;
  isCompleted: boolean;
};

export type ScheduleSubject = {
  id: string;
  name: string;
  strength: "weak" | "average" | "strong";
  color: string;
};

export type ScheduleSessionDraft = {
  topicId: string;
  sessionType: "learning" | "revision" | "recall" | "practice";
  durationMinutes: number;
  reason: string;
  priorityScore: number;
};

export type BuildScheduleInput = {
  date: Date;
  availableMinutes: number;
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;
  maxSubjects: number;
  preferredSlot: "morning" | "afternoon" | "evening" | "night";
  daysUntilExam: number;
  subjectDaysUntilExam?: Record<string, number>;
  startAt?: Date | null;
  topics: ScheduleTopic[];
  subjects: ScheduleSubject[];
  recoverySessions: ScheduleSessionDraft[];
};

const STRENGTH_SCORES: Record<ScheduleSubject["strength"], number> = {
  weak: 100,
  average: 60,
  strong: 30,
};

const WEIGHTS = {
  STRENGTH: 30,
  URGENCY: 25,
  CONFIDENCE: 25,
  RECENCY: 15,
  COMPLETION: 5,
};

const REVISION_WEIGHTS = {
  DAYS_SINCE_REVISION: 35,
  CONFIDENCE: 30,
  EXAM_PROXIMITY: 20,
  ORIGINAL_DIFFICULTY: 15,
};

const DEFAULT_BREAK_BETWEEN = 10;

const getSlotStartHour = (slot: BuildScheduleInput["preferredSlot"]) => {
  switch (slot) {
    case "afternoon":
      return 14;
    case "evening":
      return 18;
    case "night":
      return 21;
    case "morning":
    default:
      return 9;
  }
};

const daysBetween = (dateA: Date, dateB: Date) => {
  const diff = dateA.getTime() - dateB.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const roundUpToMinutes = (date: Date, intervalMinutes: number) => {
  const ms = intervalMinutes * 60 * 1000;
  const rounded = new Date(Math.ceil(date.getTime() / ms) * ms);
  return rounded;
};

const calcTopicPriority = (
  topic: ScheduleTopic,
  subjectStrength: ScheduleSubject["strength"],
  daysUntilExam: number,
) => {
  const reasons: string[] = [];
  let score = 0;

  const strengthScore = STRENGTH_SCORES[subjectStrength];
  score += (strengthScore / 100) * WEIGHTS.STRENGTH;
  if (subjectStrength === "weak") reasons.push("Weak subject focus");

  const urgencyScore =
    daysUntilExam <= 7
      ? 100
      : daysUntilExam <= 30
        ? 80
        : daysUntilExam <= 60
          ? 50
          : 30;
  score += (urgencyScore / 100) * WEIGHTS.URGENCY;
  if (daysUntilExam <= 7) reasons.push("Exam approaching");

  const confidenceScore = ((5 - topic.confidenceLevel) / 4) * 100;
  score += (confidenceScore / 100) * WEIGHTS.CONFIDENCE;
  if (topic.confidenceLevel <= 2) reasons.push("Low confidence");

  let recencyScore = 50;
  if (topic.lastStudiedAt) {
    const daysSince = daysBetween(new Date(), new Date(topic.lastStudiedAt));
    recencyScore =
      daysSince >= 14 ? 100 : daysSince >= 7 ? 75 : daysSince >= 3 ? 50 : 25;
    if (daysSince >= 7) reasons.push("Due for revisit");
  } else {
    recencyScore = 100;
    reasons.push("New topic");
  }
  score += (recencyScore / 100) * WEIGHTS.RECENCY;

  const completionRate =
    topic.estimatedHours > 0 ? topic.completedHours / topic.estimatedHours : 0;
  const completionScore = (1 - completionRate) * 100;
  score += (completionScore / 100) * WEIGHTS.COMPLETION;

  return { score: Math.round(Math.min(100, Math.max(0, score))), reasons };
};

const calcRevisionPriority = (
  topic: ScheduleTopic,
  subjectStrength: ScheduleSubject["strength"],
  daysUntilExam: number,
) => {
  const reasons: string[] = [];
  let score = 0;

  let daysSinceRevision = 0;
  if (topic.nextRevisionAt) {
    daysSinceRevision = Math.max(
      0,
      daysBetween(new Date(), new Date(topic.nextRevisionAt)),
    );
  }

  const recencyScore = Math.min(daysSinceRevision * 5, 100);
  score += (recencyScore / 100) * REVISION_WEIGHTS.DAYS_SINCE_REVISION;
  if (daysSinceRevision >= 7) reasons.push("Revision due");

  const confidenceScore = ((5 - topic.confidenceLevel) / 4) * 100;
  score += (confidenceScore / 100) * REVISION_WEIGHTS.CONFIDENCE;
  if (topic.confidenceLevel <= 2) reasons.push("Low confidence");

  const proximityScore =
    daysUntilExam <= 7
      ? 100
      : daysUntilExam <= 14
        ? 80
        : daysUntilExam <= 30
          ? 60
          : 30;
  score += (proximityScore / 100) * REVISION_WEIGHTS.EXAM_PROXIMITY;

  const difficultyScore = STRENGTH_SCORES[subjectStrength];
  score += (difficultyScore / 100) * REVISION_WEIGHTS.ORIGINAL_DIFFICULTY;

  return { score: Math.round(Math.min(100, Math.max(0, score))), reasons };
};

const resolveNextRevisionAt = (topic: ScheduleTopic) => {
  if (topic.nextRevisionAt) return topic.nextRevisionAt;
  if (!topic.lastRevisionDate) return null;
  const interval = getNextRevisionIntervalDays(
    topic.confidenceLevel,
    topic.revisionCount,
  );
  const next = new Date(topic.lastRevisionDate);
  next.setDate(next.getDate() + interval);
  return next.toISOString();
};

const interleaveSessions = (
  sessions: ScheduleSessionDraft[],
): ScheduleSessionDraft[] => {
  const revisions = sessions.filter((s) => s.sessionType === "revision");
  const others = sessions.filter((s) => s.sessionType !== "revision");
  const result: ScheduleSessionDraft[] = [];
  let i = 0;
  let j = 0;

  while (i < others.length || j < revisions.length) {
    if (i < others.length) result.push(others[i++]);
    if (i < others.length) result.push(others[i++]);
    if (j < revisions.length) result.push(revisions[j++]);
  }

  return result;
};

export function buildSchedulePlan(input: BuildScheduleInput) {
  const {
    date,
    availableMinutes,
    pomodoroWorkMinutes,
    pomodoroBreakMinutes,
    maxSubjects,
    preferredSlot,
    daysUntilExam,
    subjectDaysUntilExam,
    startAt,
    topics,
    subjects,
    recoverySessions,
  } = input;

  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));

  const learningCandidates = [] as {
    topic: ScheduleTopic;
    subject: ScheduleSubject;
    priority: { score: number; reasons: string[] };
  }[];

  const revisionCandidates = [] as {
    topic: ScheduleTopic;
    subject: ScheduleSubject;
    priority: { score: number; reasons: string[] };
    urgency: number;
  }[];

  for (const topic of topics) {
    if (topic.isCompleted) continue;
    const subject = subjectMap.get(topic.subjectId);
    if (!subject) continue;

    const resolvedNextRevisionAt = resolveNextRevisionAt(topic);
    const subjectDays = subjectDaysUntilExam?.[subject.id] ?? daysUntilExam;
    const revisionDue = isRevisionDue(resolvedNextRevisionAt, date);
    if (revisionDue) {
      const topicWithNext = {
        ...topic,
        nextRevisionAt: resolvedNextRevisionAt,
      };
      const priority = calcRevisionPriority(
        topicWithNext,
        subject.strength,
        subjectDays,
      );
      const urgency = getRevisionUrgency(
        Math.max(
          0,
          daysBetween(date, new Date(resolvedNextRevisionAt ?? date)),
        ),
        topic.confidenceLevel,
      );
      revisionCandidates.push({
        topic: topicWithNext,
        subject,
        priority,
        urgency,
      });
    } else {
      const priority = calcTopicPriority(topic, subject.strength, subjectDays);
      learningCandidates.push({ topic, subject, priority });
    }
  }

  learningCandidates.sort((a, b) => b.priority.score - a.priority.score);
  revisionCandidates.sort((a, b) => b.priority.score - a.priority.score);

  const subjectScores = new Map<string, number>();
  for (const item of [...learningCandidates, ...revisionCandidates]) {
    const current = subjectScores.get(item.subject.id) ?? 0;
    subjectScores.set(item.subject.id, Math.max(current, item.priority.score));
  }

  const allowedSubjects = new Set(
    Array.from(subjectScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.max(1, maxSubjects))
      .map(([subjectId]) => subjectId),
  );

  const filteredLearning = learningCandidates.filter((item) =>
    allowedSubjects.has(item.subject.id),
  );
  const filteredRevision = revisionCandidates.filter((item) =>
    allowedSubjects.has(item.subject.id),
  );

  const sessionDuration = pomodoroWorkMinutes + pomodoroBreakMinutes;
  let remainingMinutes = availableMinutes;
  const sessions: ScheduleSessionDraft[] = [];

  const recoveryMinutes = recoverySessions.reduce(
    (sum, session) => sum + session.durationMinutes,
    0,
  );
  remainingMinutes = Math.max(0, remainingMinutes - recoveryMinutes);

  for (const session of recoverySessions) {
    sessions.push(session);
  }

  const revisionBudget = Math.floor(availableMinutes * 0.35);
  let revisionAllocated = 0;

  for (const { topic, priority } of filteredRevision) {
    if (remainingMinutes < pomodoroWorkMinutes) break;
    if (revisionAllocated >= revisionBudget) break;

    const quickRecall = topic.revisionCount >= 3 && topic.confidenceLevel >= 3;
    const duration = quickRecall
      ? Math.min(pomodoroWorkMinutes, remainingMinutes)
      : Math.min(sessionDuration, remainingMinutes);

    const sessionType = quickRecall ? "recall" : "revision";
    const reason = priority.reasons[0] ?? "Scheduled revision";

    sessions.push({
      topicId: topic.id,
      sessionType,
      durationMinutes: duration,
      priorityScore: priority.score,
      reason,
    });

    if (sessionType !== "recall") {
      revisionAllocated += duration;
    }
    remainingMinutes -= duration;
  }

  for (const { topic, priority } of filteredLearning) {
    if (remainingMinutes < sessionDuration) break;

    const isNew = !topic.lastStudiedAt;
    const duration = isNew
      ? Math.min(sessionDuration * 2, remainingMinutes)
      : Math.min(sessionDuration, remainingMinutes);

    sessions.push({
      topicId: topic.id,
      sessionType: "learning",
      durationMinutes: duration,
      priorityScore: priority.score,
      reason: priority.reasons[0] ?? "Scheduled learning",
    });

    remainingMinutes -= duration;
  }

  const finalSessions = interleaveSessions(sessions);

  const slotHour = getSlotStartHour(preferredSlot);
  const startTime = startOfDay(date);
  startTime.setHours(slotHour, 0, 0, 0);

  let effectiveStart = startTime;
  if (startAt) {
    const roundedStart = roundUpToMinutes(startAt, 5);
    if (roundedStart.toDateString() === startTime.toDateString()) {
      if (roundedStart > startTime) {
        effectiveStart = roundedStart;
      }
    }
  }

  let cursor = new Date(effectiveStart);
  const scheduled = finalSessions.map((session) => {
    const scheduledAt = cursor.toISOString();
    const totalMinutes = session.durationMinutes + DEFAULT_BREAK_BETWEEN;
    cursor = new Date(cursor.getTime() + totalMinutes * 60000);
    return {
      ...session,
      scheduledAt,
    };
  });

  return {
    date: toDateString(date),
    totalMinutes: availableMinutes - remainingMinutes,
    recoveryMinutes,
    scheduledSessions: scheduled,
  };
}
