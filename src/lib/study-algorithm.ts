/**
 * Clivra Study Priority Algorithm
 *
 * Calculates topic priority using:
 * - Subject strength (weak > average > strong)
 * - Days left until exam
 * - Topic confidence level
 * - Last revision date
 * - Completion rate
 *
 * Returns a priority score (0-100) for each topic.
 */

export interface Topic {
  id: string;
  name: string;
  confidence_level: number;
  priority_score: number;
  estimated_hours: number;
  completed_hours: number;
  last_studied_at: string | null;
  next_revision_at: string | null;
  revision_count: number;
  is_completed: boolean;
  last_revision_date?: string | null;
  revision_confidence_delta?: number;
}

interface Subject {
  id: string;
  name: string;
  strength: "weak" | "average" | "strong";
  color: string;
  topics?: Topic[];
}

interface ScheduleSession {
  topicId: string;
  topicName: string;
  subjectName: string;
  subjectColor: string;
  type: "learning" | "revision" | "recall";
  durationMinutes: number;
  priorityScore: number;
  reason: string;
}

// Weight constants for priority calculation
const WEIGHTS = {
  STRENGTH: 30, // Subject strength impact
  URGENCY: 25, // Days until exam impact
  CONFIDENCE: 25, // Current confidence level impact
  RECENCY: 15, // Time since last study impact
  COMPLETION: 5, // Completion rate impact
};

// Strength multipliers (weak subjects get higher priority)
const STRENGTH_SCORES: Record<string, number> = {
  weak: 100,
  average: 60,
  strong: 30,
};

/**
 * Calculate priority score for a topic
 * Higher score = higher priority (should study first)
 */
export function calculateTopicPriority(
  topic: Topic,
  subjectStrength: "weak" | "average" | "strong",
  daysUntilExam: number
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let totalScore = 0;

  // 1. Subject Strength Factor (weak subjects prioritized)
  const strengthScore = STRENGTH_SCORES[subjectStrength];
  const strengthContribution = (strengthScore / 100) * WEIGHTS.STRENGTH;
  totalScore += strengthContribution;
  if (subjectStrength === "weak") {
    reasons.push("Weak subject needs attention");
  }

  // 2. Urgency Factor (closer exam = higher priority)
  const urgencyScore =
    daysUntilExam <= 7
      ? 100
      : daysUntilExam <= 30
      ? 80
      : daysUntilExam <= 60
      ? 50
      : 30;
  const urgencyContribution = (urgencyScore / 100) * WEIGHTS.URGENCY;
  totalScore += urgencyContribution;
  if (daysUntilExam <= 7) {
    reasons.push("Exam is less than a week away!");
  } else if (daysUntilExam <= 30) {
    reasons.push("Exam approaching soon");
  }

  // 3. Confidence Factor (lower confidence = higher priority)
  const confidenceScore = ((5 - topic.confidence_level) / 4) * 100;
  const confidenceContribution = (confidenceScore / 100) * WEIGHTS.CONFIDENCE;
  totalScore += confidenceContribution;
  if (topic.confidence_level <= 2) {
    reasons.push("Low confidence - needs more practice");
  }

  // 4. Recency Factor (longer since last study = higher priority)
  let recencyScore = 50; // Default if never studied
  if (topic.last_studied_at) {
    const daysSinceStudy = Math.floor(
      (Date.now() - new Date(topic.last_studied_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    recencyScore =
      daysSinceStudy >= 14
        ? 100
        : daysSinceStudy >= 7
        ? 75
        : daysSinceStudy >= 3
        ? 50
        : 25;
    if (daysSinceStudy >= 7) {
      reasons.push("Due for revision");
    }
  } else {
    reasons.push("Never studied before");
    recencyScore = 100;
  }
  const recencyContribution = (recencyScore / 100) * WEIGHTS.RECENCY;
  totalScore += recencyContribution;

  // 5. Completion Factor (less complete = higher priority)
  const completionRate =
    topic.estimated_hours > 0
      ? topic.completed_hours / topic.estimated_hours
      : 0;
  const completionScore = (1 - completionRate) * 100;
  const completionContribution = (completionScore / 100) * WEIGHTS.COMPLETION;
  totalScore += completionContribution;

  // Ensure score is between 0-100
  const finalScore = Math.round(Math.min(100, Math.max(0, totalScore)));

  return { score: finalScore, reasons };
}

/**
 * Generate a daily study schedule based on available time and priorities
 */
export function generateDailySchedule(
  subjects: Subject[],
  availableMinutes: number,
  pomodoroWorkMinutes: number = 25,
  pomodoroBreakMinutes: number = 5,
  daysUntilExam: number
): ScheduleSession[] {
  const schedule: ScheduleSession[] = [];
  let remainingMinutes = availableMinutes;

  // Flatten topics with their priority scores
  const topicsWithPriority: Array<{
    topic: Topic;
    subject: Subject;
    priority: { score: number; reasons: string[] };
  }> = [];

  subjects.forEach((subject) => {
    (subject.topics || []).forEach((topic) => {
      if (!topic.is_completed) {
        const priority = calculateTopicPriority(
          topic,
          subject.strength,
          daysUntilExam
        );
        topicsWithPriority.push({ topic, subject, priority });
      }
    });
  });

  // Sort by priority (highest first)
  topicsWithPriority.sort((a, b) => b.priority.score - a.priority.score);

  // Session duration (one pomodoro = work + break)
  const sessionDuration = pomodoroWorkMinutes + pomodoroBreakMinutes;

  // Allocate study sessions
  // Strategy: Mix of new learning (60%), revision (30%), recall (10%)
  const targetLearning = availableMinutes * 0.6;
  const targetRevision = availableMinutes * 0.3;
  const targetRecall = availableMinutes * 0.1;

  let learningAllocated = 0;
  let revisionAllocated = 0;
  let recallAllocated = 0;

  for (const { topic, subject, priority } of topicsWithPriority) {
    if (remainingMinutes < sessionDuration) break;

    // Determine session type based on topic state and allocation
    let sessionType: "learning" | "revision" | "recall";
    let duration: number;

    if (!topic.last_studied_at && learningAllocated < targetLearning) {
      // New topic - learning session
      sessionType = "learning";
      duration = Math.min(sessionDuration * 2, remainingMinutes); // Two pomodoros for new topics
      learningAllocated += duration;
    } else if (topic.revision_count > 0 && recallAllocated < targetRecall) {
      // Previously revised - quick recall
      sessionType = "recall";
      duration = Math.min(pomodoroWorkMinutes, remainingMinutes); // Short recall sessions
      recallAllocated += duration;
    } else if (revisionAllocated < targetRevision) {
      // Needs revision
      sessionType = "revision";
      duration = Math.min(sessionDuration, remainingMinutes);
      revisionAllocated += duration;
    } else {
      // Default to learning
      sessionType = "learning";
      duration = Math.min(sessionDuration, remainingMinutes);
      learningAllocated += duration;
    }

    schedule.push({
      topicId: topic.id,
      topicName: topic.name,
      subjectName: subject.name,
      subjectColor: subject.color,
      type: sessionType,
      durationMinutes: duration,
      priorityScore: priority.score,
      reason: priority.reasons[0] || "Scheduled for today",
    });

    remainingMinutes -= duration;
  }

  return schedule;
}

/**
 * Calculate spaced repetition interval for next revision
 * Uses a simplified SM-2 algorithm approach
 */
export function calculateNextRevision(
  confidenceLevel: number,
  revisionCount: number
): number {
  // Base intervals in days
  const baseIntervals = [1, 3, 7, 14, 30, 60];

  // Adjust based on confidence
  const confidenceMultiplier = confidenceLevel / 3; // 0.33 to 1.67

  const intervalIndex = Math.min(revisionCount, baseIntervals.length - 1);
  const baseInterval = baseIntervals[intervalIndex];

  return Math.round(baseInterval * confidenceMultiplier);
}

export function calculatePostRevisionUpdates(
  confidenceBefore: number,
  revisionCount: number,
  completed: boolean,
  skipped: boolean
): {
  nextRevisionDays: number;
  confidenceDelta: number;
  newConfidence: number;
} {
  const baseConfidence = completed
    ? confidenceBefore + 1
    : confidenceBefore - 1;
  const adjustedConfidence = skipped ? confidenceBefore - 1 : baseConfidence;
  const newConfidence = Math.min(5, Math.max(1, adjustedConfidence));
  const confidenceDelta = newConfidence - confidenceBefore;

  const nextRevisionDays = skipped
    ? 1
    : calculateNextRevision(newConfidence, Math.max(0, revisionCount + 1));

  return {
    nextRevisionDays,
    confidenceDelta,
    newConfidence,
  };
}

export function getRevisionSummary(topics: Topic[]): {
  overdueTopics: Topic[];
  pendingRevisions: Topic[];
  completedThisWeek: Topic[];
  upcomingRevisions: Topic[];
} {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const upcomingWindowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const overdueTopics: Topic[] = [];
  const pendingRevisions: Topic[] = [];
  const completedThisWeek: Topic[] = [];
  const upcomingRevisions: Topic[] = [];

  topics.forEach((topic) => {
    if (topic.last_revision_date) {
      const revisionDate = new Date(topic.last_revision_date);
      if (revisionDate >= weekAgo && revisionDate <= now) {
        completedThisWeek.push(topic);
      }
    }

    if (topic.next_revision_at) {
      const revisionAt = new Date(topic.next_revision_at);
      if (revisionAt < startOfToday) {
        overdueTopics.push(topic);
      } else if (revisionAt >= startOfToday && revisionAt < endOfToday) {
        pendingRevisions.push(topic);
      } else if (revisionAt >= endOfToday && revisionAt <= upcomingWindowEnd) {
        upcomingRevisions.push(topic);
      }
    }
  });

  return {
    overdueTopics,
    pendingRevisions,
    completedThisWeek,
    upcomingRevisions,
  };
}

/**
 * Calculate exam readiness based on progress
 */
export function calculateExamReadiness(
  completionPercentage: number,
  averageConfidence: number,
  consistencyStreak: number,
  daysUntilExam: number
): {
  status: "not_ready" | "improving" | "almost_ready" | "exam_ready";
  percentage: number;
  message: string;
} {
  // Weighted factors
  const completionWeight = 0.4;
  const confidenceWeight = 0.35;
  const consistencyWeight = 0.15;
  const timeWeight = 0.1;

  // Normalize values
  const normalizedCompletion = completionPercentage / 100;
  const normalizedConfidence = averageConfidence / 5;
  const normalizedStreak = Math.min(consistencyStreak / 14, 1); // Cap at 14 days
  const normalizedTime =
    daysUntilExam > 0 ? Math.min(daysUntilExam / 30, 1) : 0;

  const readinessScore =
    normalizedCompletion * completionWeight +
    normalizedConfidence * confidenceWeight +
    normalizedStreak * consistencyWeight +
    normalizedTime * timeWeight;

  const percentage = Math.round(readinessScore * 100);

  let status: "not_ready" | "improving" | "almost_ready" | "exam_ready";
  let message: string;

  if (percentage >= 80) {
    status = "exam_ready";
    message = "You're well prepared! Keep up the consistency.";
  } else if (percentage >= 60) {
    status = "almost_ready";
    message = "Great progress! Focus on weak areas to get exam-ready.";
  } else if (percentage >= 35) {
    status = "improving";
    message = "You're making progress. Stay consistent with your schedule.";
  } else {
    status = "not_ready";
    message =
      "Let's build your study momentum. Start with high-priority topics.";
  }

  return { status, percentage, message };
}

/**
 * Rebalance schedule after missed sessions
 * Prevents overloading by capping extra study time
 */
export function rebalanceAfterMissed(
  missedMinutes: number,
  remainingDays: number,
  dailyStudyMinutes: number,
  maxOverloadPercentage: number = 25
): {
  extraMinutesPerDay: number;
  daysToRecover: number;
  message: string;
} {
  if (remainingDays <= 0) {
    return {
      extraMinutesPerDay: 0,
      daysToRecover: 0,
      message: "No time left to recover. Focus on key topics only.",
    };
  }

  const maxExtraPerDay = Math.round(
    dailyStudyMinutes * (maxOverloadPercentage / 100)
  );
  const idealRecoveryDays = Math.ceil(missedMinutes / maxExtraPerDay);
  const daysToRecover = Math.min(idealRecoveryDays, remainingDays);

  const extraMinutesPerDay = Math.round(missedMinutes / daysToRecover);
  const cappedExtra = Math.min(extraMinutesPerDay, maxExtraPerDay);

  return {
    extraMinutesPerDay: cappedExtra,
    daysToRecover,
    message: `Adding ${cappedExtra} extra minutes for ${daysToRecover} days to catch up.`,
  };
}
