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

export interface Subject {
  id: string;
  name: string;
  strength: "weak" | "average" | "strong";
  color: string;
  topics?: Topic[];
}

export interface ScheduleSession {
  topicId: string;
  topicName: string;
  subjectName: string;
  subjectColor: string;
  type: "learning" | "revision" | "recall";
  durationMinutes: number;
  priorityScore: number;
  reason: string;
  isRevisionScheduled?: boolean;
}

export interface RevisionEligibility {
  isEligible: boolean;
  reasons: string[];
  urgencyScore: number;
}

// Weight constants for priority calculation
const WEIGHTS = {
  STRENGTH: 30, // Subject strength impact
  URGENCY: 25, // Days until exam impact
  CONFIDENCE: 25, // Current confidence level impact
  RECENCY: 15, // Time since last study impact
  COMPLETION: 5, // Completion rate impact
};

// Revision-specific weights
const REVISION_WEIGHTS = {
  DAYS_SINCE_REVISION: 35,
  CONFIDENCE: 30,
  EXAM_PROXIMITY: 20,
  ORIGINAL_DIFFICULTY: 15,
};

// Strength multipliers (weak subjects get higher priority)
const STRENGTH_SCORES: Record<string, number> = {
  weak: 100,
  average: 60,
  strong: 30,
};

// Revision eligibility thresholds
const REVISION_CONFIG = {
  CONFIDENCE_THRESHOLD: 3, // Topics with confidence ≤ 3 need revision
  DAYS_SINCE_REVISION_THRESHOLD: 7, // Topics not revised in N days
  MAX_REVISION_PERCENTAGE: 40, // Max 40% of daily study time for revisions
  MIN_REVISION_PERCENTAGE: 30, // Aim for at least 30% revision time
};

/**
 * Check if a topic is eligible for revision
 */
export function checkRevisionEligibility(
  topic: Topic,
  daysUntilExam: number
): RevisionEligibility {
  const reasons: string[] = [];
  let urgencyScore = 0;

  // Condition 1: Topic has been completed at least once
  const hasBeenStudied =
    topic.last_studied_at !== null || topic.completed_hours > 0;

  // Condition 2: Confidence score is below threshold
  const lowConfidence =
    topic.confidence_level <= REVISION_CONFIG.CONFIDENCE_THRESHOLD;
  if (lowConfidence) {
    reasons.push(`Low confidence (${topic.confidence_level}/5)`);
    urgencyScore +=
      (REVISION_CONFIG.CONFIDENCE_THRESHOLD - topic.confidence_level + 1) * 20;
  }

  // Condition 3: Not revised in the last N days
  let daysSinceRevision = Infinity;
  if (topic.last_revision_date) {
    daysSinceRevision = Math.floor(
      (Date.now() - new Date(topic.last_revision_date).getTime()) /
        (1000 * 60 * 60 * 24)
    );
  } else if (topic.last_studied_at) {
    daysSinceRevision = Math.floor(
      (Date.now() - new Date(topic.last_studied_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }

  const needsRevisionByTime =
    daysSinceRevision >= REVISION_CONFIG.DAYS_SINCE_REVISION_THRESHOLD;
  if (needsRevisionByTime && hasBeenStudied) {
    reasons.push(`Not revised in ${daysSinceRevision} days`);
    urgencyScore += Math.min(daysSinceRevision * 5, 50);
  }

  // Add urgency based on exam proximity
  if (daysUntilExam <= 7) {
    urgencyScore += 30;
    reasons.push("Exam approaching - final revision needed");
  } else if (daysUntilExam <= 14) {
    urgencyScore += 20;
  }

  const isEligible = hasBeenStudied && (lowConfidence || needsRevisionByTime);

  return {
    isEligible,
    reasons,
    urgencyScore: Math.min(urgencyScore, 100),
  };
}

/**
 * Calculate revision priority score for a topic
 * Higher score = needs revision more urgently
 */
export function calculateRevisionPriority(
  topic: Topic,
  subjectStrength: "weak" | "average" | "strong",
  daysUntilExam: number
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let totalScore = 0;

  // 1. Days since last revision (longer = higher priority)
  let daysSinceRevision = 0;
  if (topic.last_revision_date) {
    daysSinceRevision = Math.floor(
      (Date.now() - new Date(topic.last_revision_date).getTime()) /
        (1000 * 60 * 60 * 24)
    );
  } else if (topic.last_studied_at) {
    daysSinceRevision = Math.floor(
      (Date.now() - new Date(topic.last_studied_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }

  const recencyScore = Math.min(daysSinceRevision * 5, 100);
  totalScore += (recencyScore / 100) * REVISION_WEIGHTS.DAYS_SINCE_REVISION;
  if (daysSinceRevision >= 14) {
    reasons.push("Overdue for revision");
  } else if (daysSinceRevision >= 7) {
    reasons.push("Due for scheduled revision");
  }

  // 2. Topic confidence score (lower = higher priority)
  const confidenceScore = ((5 - topic.confidence_level) / 4) * 100;
  totalScore += (confidenceScore / 100) * REVISION_WEIGHTS.CONFIDENCE;
  if (topic.confidence_level <= 2) {
    reasons.push("Low confidence - revision critical");
  } else if (topic.confidence_level <= 3) {
    reasons.push("Moderate confidence - revision recommended");
  }

  // 3. Exam proximity (closer = higher priority)
  const proximityScore =
    daysUntilExam <= 7
      ? 100
      : daysUntilExam <= 14
      ? 80
      : daysUntilExam <= 30
      ? 60
      : 30;
  totalScore += (proximityScore / 100) * REVISION_WEIGHTS.EXAM_PROXIMITY;

  // 4. Original topic difficulty (based on subject strength)
  const difficultyScore = STRENGTH_SCORES[subjectStrength];
  totalScore += (difficultyScore / 100) * REVISION_WEIGHTS.ORIGINAL_DIFFICULTY;
  if (subjectStrength === "weak") {
    reasons.push("Weak subject - extra attention needed");
  }

  return {
    score: Math.round(Math.min(100, Math.max(0, totalScore))),
    reasons,
  };
}

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
 * Now includes intelligent revision planning
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

  // Separate topics into learning and revision candidates
  const learningTopics: Array<{
    topic: Topic;
    subject: Subject;
    priority: { score: number; reasons: string[] };
  }> = [];

  const revisionTopics: Array<{
    topic: Topic;
    subject: Subject;
    revisionPriority: { score: number; reasons: string[] };
    eligibility: RevisionEligibility;
  }> = [];

  subjects.forEach((subject) => {
    (subject.topics || []).forEach((topic) => {
      if (topic.is_completed) return;

      // Check revision eligibility
      const eligibility = checkRevisionEligibility(topic, daysUntilExam);

      if (eligibility.isEligible) {
        const revisionPriority = calculateRevisionPriority(
          topic,
          subject.strength,
          daysUntilExam
        );
        revisionTopics.push({ topic, subject, revisionPriority, eligibility });
      } else {
        const priority = calculateTopicPriority(
          topic,
          subject.strength,
          daysUntilExam
        );
        learningTopics.push({ topic, subject, priority });
      }
    });
  });

  // Sort by priority
  learningTopics.sort((a, b) => b.priority.score - a.priority.score);
  revisionTopics.sort(
    (a, b) => b.revisionPriority.score - a.revisionPriority.score
  );

  // Session duration
  const sessionDuration = pomodoroWorkMinutes + pomodoroBreakMinutes;

  // Calculate revision budget (30-40% of available time)
  const revisionBudget = Math.floor(
    (availableMinutes * REVISION_CONFIG.MAX_REVISION_PERCENTAGE) / 100
  );
  let revisionAllocated = 0;

  // First, allocate revision sessions (30-40% cap)
  for (const {
    topic,
    subject,
    revisionPriority,
    eligibility,
  } of revisionTopics) {
    if (remainingMinutes < pomodoroWorkMinutes) break;
    if (revisionAllocated >= revisionBudget) break;

    // Use shorter sessions for recall, longer for full revision
    const isQuickRecall =
      topic.revision_count >= 3 && topic.confidence_level >= 3;
    const duration = isQuickRecall
      ? Math.min(pomodoroWorkMinutes, remainingMinutes)
      : Math.min(sessionDuration, remainingMinutes);

    const sessionType = isQuickRecall ? "recall" : "revision";
    const reason = eligibility.reasons[0] || "Scheduled due to revision cycle";

    schedule.push({
      topicId: topic.id,
      topicName: topic.name,
      subjectName: subject.name,
      subjectColor: subject.color,
      type: sessionType,
      durationMinutes: duration,
      priorityScore: revisionPriority.score,
      reason,
      isRevisionScheduled: true,
    });

    if (sessionType !== "recall") {
      revisionAllocated += duration;
    }
    remainingMinutes -= duration;
  }

  // Then, allocate learning sessions with remaining time
  for (const { topic, subject, priority } of learningTopics) {
    if (remainingMinutes < sessionDuration) break;

    // Determine duration based on topic state
    let duration: number;
    if (!topic.last_studied_at) {
      // New topic - two pomodoros
      duration = Math.min(sessionDuration * 2, remainingMinutes);
    } else {
      duration = Math.min(sessionDuration, remainingMinutes);
    }

    schedule.push({
      topicId: topic.id,
      topicName: topic.name,
      subjectName: subject.name,
      subjectColor: subject.color,
      type: "learning",
      durationMinutes: duration,
      priorityScore: priority.score,
      reason: priority.reasons[0] || "Scheduled for today",
      isRevisionScheduled: false,
    });

    remainingMinutes -= duration;
  }

  // Avoid consecutive heavy revisions - interleave sessions
  const interleavedSchedule: ScheduleSession[] = [];
  const revisionSessions = schedule.filter((s) => s.type === "revision");
  const otherSessions = schedule.filter((s) => s.type !== "revision");

  let revisionIdx = 0;
  let otherIdx = 0;

  while (
    revisionIdx < revisionSessions.length ||
    otherIdx < otherSessions.length
  ) {
    // Add 1-2 other sessions, then 1 revision
    if (otherIdx < otherSessions.length) {
      interleavedSchedule.push(otherSessions[otherIdx++]);
    }
    if (otherIdx < otherSessions.length) {
      interleavedSchedule.push(otherSessions[otherIdx++]);
    }
    if (revisionIdx < revisionSessions.length) {
      interleavedSchedule.push(revisionSessions[revisionIdx++]);
    }
  }

  return interleavedSchedule;
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

/**
 * Handle revision completion - increases confidence, reduces future frequency
 */
export function calculatePostRevisionUpdates(
  currentConfidence: number,
  revisionCount: number,
  completed: boolean,
  skipped: boolean
): {
  newConfidence: number;
  confidenceDelta: number;
  nextRevisionDays: number;
  urgencyMultiplier: number;
} {
  let newConfidence = currentConfidence;
  let confidenceDelta = 0;
  let urgencyMultiplier = 1;

  if (completed) {
    // Completing a revision increases confidence
    confidenceDelta = Math.min(1, 5 - currentConfidence);
    newConfidence = Math.min(5, currentConfidence + confidenceDelta);
    // Reduce urgency for future scheduling
    urgencyMultiplier = 0.8;
  } else if (skipped) {
    // Skipping a revision increases urgency but doesn't overload
    urgencyMultiplier = 1.3;
    // Slight confidence decrease
    confidenceDelta = -0.5;
    newConfidence = Math.max(1, currentConfidence - 0.5);
  }

  const nextRevisionDays = calculateNextRevision(
    newConfidence,
    revisionCount + (completed ? 1 : 0)
  );

  return {
    newConfidence: Math.round(newConfidence),
    confidenceDelta,
    nextRevisionDays,
    urgencyMultiplier,
  };
}

/**
 * Get weekly revision summary
 */
export function getRevisionSummary(topics: Topic[]): {
  pendingRevisions: Topic[];
  completedThisWeek: Topic[];
  overdueTopics: Topic[];
  upcomingRevisions: Topic[];
} {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const pendingRevisions: Topic[] = [];
  const completedThisWeek: Topic[] = [];
  const overdueTopics: Topic[] = [];
  const upcomingRevisions: Topic[] = [];

  for (const topic of topics) {
    // Check if revised this week
    if (topic.last_revision_date) {
      const lastRevision = new Date(topic.last_revision_date);
      if (lastRevision >= oneWeekAgo) {
        completedThisWeek.push(topic);
        continue;
      }
    }

    // Check if overdue
    if (topic.next_revision_at) {
      const nextRevision = new Date(topic.next_revision_at);
      if (nextRevision < now) {
        overdueTopics.push(topic);
      } else if (nextRevision <= oneWeekFromNow) {
        upcomingRevisions.push(topic);
      }
    } else if (topic.confidence_level <= 3 && topic.last_studied_at) {
      // No scheduled revision but low confidence
      pendingRevisions.push(topic);
    }
  }

  return {
    pendingRevisions,
    completedThisWeek,
    overdueTopics,
    upcomingRevisions,
  };
}
