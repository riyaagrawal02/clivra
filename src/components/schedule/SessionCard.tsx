import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { Play, Check, SkipForward, Clock, RefreshCw, BookOpen, Brain, Info } from "lucide-react";
import { format } from "date-fns";
import type { StudySessionWithTopic } from "@/hooks/useStudySessions";

interface SessionCardProps {
  session: StudySessionWithTopic;
  onStart?: () => void;
  onComplete?: () => void;
  onSkip?: () => void;
  onTopicClick?: () => void;
  isStarting?: boolean;
}

const sessionTypeConfig = {
  learning: {
    icon: BookOpen,
    label: "Learning",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  revision: {
    icon: RefreshCw,
    label: "Revision",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  recall: {
    icon: Brain,
    label: "Recall",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
};

export function SessionCard({
  session,
  onStart,
  onComplete,
  onSkip,
  onTopicClick,
  isStarting,
}: SessionCardProps) {
  const topic = session.topics;
  const subject = topic?.subjects;
  const sessionType = (session.session_type as keyof typeof sessionTypeConfig) || "learning";
  const config = sessionTypeConfig[sessionType] || sessionTypeConfig.learning;
  const TypeIcon = config.icon;

  const isCompleted = session.status === "completed";
  const isInProgress = session.status === "in_progress";
  const isMissed = session.status === "missed";

  // Determine if this is a revision-scheduled session
  const isRevisionScheduled = sessionType === "revision" || sessionType === "recall";

  return (
    <Card
      className={`transition-all ${
        isCompleted
          ? "opacity-60 bg-muted/30"
          : isMissed
          ? "opacity-50 border-destructive/30"
          : isInProgress
          ? "ring-2 ring-primary shadow-md"
          : "hover:shadow-md"
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: Session Info */}
          <div className="flex-1 min-w-0">
            {/* Subject & Type */}
            <div className="flex items-center gap-2 mb-1">
              {subject && (
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: subject.color || "#0d9488" }}
                  />
                  <span className="text-xs text-muted-foreground">{subject.name}</span>
                </div>
              )}
              <Badge variant="outline" className={`text-xs ${config.color} ${config.bgColor} border-0`}>
                <TypeIcon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
              {isRevisionScheduled && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Scheduled due to revision cycle</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Topic Name */}
            <button
              onClick={onTopicClick}
              className="text-left hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded"
            >
              <h4 className="font-medium text-base truncate">{topic?.name}</h4>
            </button>

            {/* Meta info */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {session.planned_duration_minutes} min
              </span>
              <span>{format(new Date(session.scheduled_at), "h:mm a")}</span>
              {topic && <ConfidenceBadge level={topic.confidence_level ?? 1} size="sm" />}
            </div>

            {/* Status indicators */}
            {isCompleted && session.actual_duration_minutes && (
              <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Completed in {session.actual_duration_minutes} min
                {session.pomodoros_completed && session.pomodoros_completed > 0 && (
                  <span className="ml-1">• {session.pomodoros_completed} 🍅</span>
                )}
              </div>
            )}
            {isMissed && (
              <div className="mt-2 text-xs text-destructive flex items-center gap-1">
                <SkipForward className="h-3 w-3" />
                Missed
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col gap-1.5">
            {!isCompleted && !isMissed && (
              <>
                {!isInProgress ? (
                  <Button
                    size="sm"
                    onClick={onStart}
                    disabled={isStarting}
                    className="h-8"
                  >
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Start
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={onComplete}
                    className="h-8"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Done
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onSkip}
                  className="h-8 text-muted-foreground hover:text-destructive"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}