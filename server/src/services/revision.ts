const REVISION_INTERVALS = [1, 3, 7, 14, 30, 60];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function getNextRevisionIntervalDays(
  confidenceLevel: number,
  revisionCount: number,
) {
  const index = Math.min(revisionCount, REVISION_INTERVALS.length - 1);
  const base = REVISION_INTERVALS[index];
  const multiplier = clamp(confidenceLevel / 3, 0.6, 1.6);
  return Math.max(1, Math.round(base * multiplier));
}

export function buildNextRevisionDate(
  completedAt: Date,
  confidenceLevel: number,
  revisionCount: number,
) {
  const interval = getNextRevisionIntervalDays(confidenceLevel, revisionCount);
  const next = new Date(completedAt);
  next.setDate(next.getDate() + interval);
  return { intervalDays: interval, nextRevisionAt: next.toISOString() };
}

export function isRevisionDue(
  nextRevisionAt?: string | null,
  targetDate?: Date,
) {
  if (!nextRevisionAt) return false;
  const comparison = targetDate ? targetDate.getTime() : Date.now();
  return new Date(nextRevisionAt).getTime() <= comparison;
}

export function getRevisionUrgency(daysLate: number, confidenceLevel: number) {
  const urgency = Math.min(100, daysLate * 5 + (5 - confidenceLevel) * 10);
  return Math.round(urgency);
}
