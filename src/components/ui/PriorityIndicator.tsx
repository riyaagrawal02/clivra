import { cn } from "../../lib/utils";
import { Flame, TrendingUp, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface PriorityIndicatorProps {
  score: number;
  showScore?: boolean;
  size?: "sm" | "md" | "lg";
}

type PriorityLevel = {
  label: string;
  color: string;
  bg: string;
  Icon: LucideIcon;
};

function getPriorityLevel(score: number): PriorityLevel {
  if (score >= 70) {
    return {
      label: "High",
      color: "text-priority-high",
      bg: "bg-priority-high/10",
      Icon: Flame,
    };
  }

  if (score >= 40) {
    return {
      label: "Medium",
      color: "text-priority-medium",
      bg: "bg-priority-medium/10",
      Icon: TrendingUp,
    };
  }

  return {
    label: "Low",
    color: "text-priority-low",
    bg: "bg-priority-low/10",
    Icon: Minus,
  };
}

export function PriorityIndicator({
  score,
  showScore = false,
  size = "md",
}: PriorityIndicatorProps) {
  const { color, bg, Icon } = getPriorityLevel(score);

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const containerSizes = {
    sm: "text-xs gap-1",
    md: "text-sm gap-1.5",
    lg: "text-base gap-2",
  };

  return (
    <div className={cn("inline-flex items-center", containerSizes[size])}>
      <div className={cn("rounded-full p-1", bg)}>
        <Icon className={cn(sizeClasses[size], color)} />
      </div>

      {showScore && (
        <span className={cn("font-medium", color)}>
          {score}
        </span>
      )}
    </div>
  );
}
