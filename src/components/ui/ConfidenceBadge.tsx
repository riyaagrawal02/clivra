import { cn } from "../../lib/utils";

interface ConfidenceBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const confidenceLabels = ['Beginner', 'Learning', 'Developing', 'Proficient', 'Mastered'];
const confidenceColors = [
  'bg-confidence-1/15 text-confidence-1 border-confidence-1/30',
  'bg-confidence-2/15 text-confidence-2 border-confidence-2/30',
  'bg-confidence-3/15 text-confidence-3 border-confidence-3/30',
  'bg-confidence-4/15 text-confidence-4 border-confidence-4/30',
  'bg-confidence-5/15 text-confidence-5 border-confidence-5/30',
];

export function ConfidenceBadge({ level, size = 'md', showLabel = false }: ConfidenceBadgeProps) {
  const index = Math.max(0, Math.min(4, level - 1));
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        confidenceColors[index],
        sizeClasses[size]
      )}
    >
      <span className="font-semibold">{level}/5</span>
      {showLabel && <span className="opacity-90">{confidenceLabels[index]}</span>}
    </span>
  );
}
