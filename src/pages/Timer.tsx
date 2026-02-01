import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw, Coffee, BookOpen, SkipForward, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import { useCompleteSession, useTodaySessions } from "@/hooks/useStudySessions";
import { useUpdateTopicConfidence } from "@/hooks/useTopics";
import { useIncrementDailyProgress } from "@/hooks/useDailyProgress";
import { useUpdateStreak } from "@/hooks/useProfile";

type TimerMode = "work" | "break" | "longBreak";

const modeConfig: Record<TimerMode, { label: string; color: string; icon: typeof BookOpen }> = {
  work: { label: "Focus Time", color: "text-primary", icon: BookOpen },
  break: { label: "Short Break", color: "text-success", icon: Coffee },
  longBreak: { label: "Long Break", color: "text-info", icon: Coffee },
};

export default function Timer() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { data: profile } = useProfile();
  const { data: todaySessions } = useTodaySessions();
  const completeSession = useCompleteSession();
  const updateTopicConfidence = useUpdateTopicConfidence();
  const incrementProgress = useIncrementDailyProgress();
  const updateStreak = useUpdateStreak();

  // Get session from state or find in-progress session
  const sessionId = location.state?.sessionId;
  const activeSession = todaySessions?.find(
    s => s.id === sessionId || s.status === "in_progress"
  );

  const [mode, setMode] = useState<TimerMode>("work");
  const workMinutes = profile?.pomodoro_work_minutes ?? 25;
  const breakMinutes = profile?.pomodoro_break_minutes ?? 5;

  const getModeSeconds = useCallback(
    (nextMode: TimerMode) => {
      if (nextMode === "work") return workMinutes * 60;
      if (nextMode === "break") return breakMinutes * 60;
      return 15 * 60;
    },
    [workMinutes, breakMinutes],
  );

  const [timeLeft, setTimeLeft] = useState(() => getModeSeconds("work"));
  const [isRunning, setIsRunning] = useState(false);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const [totalMinutesStudied, setTotalMinutesStudied] = useState(0);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [newConfidence, setNewConfidence] = useState(3);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const setModeAndReset = useCallback(
    (nextMode: TimerMode) => {
      setMode(nextMode);
      setTimeLeft(getModeSeconds(nextMode));
    },
    [getModeSeconds],
  );

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      if (!startTimeRef.current) {
        startTimeRef.current = new Date();
      }
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (mode === "work") {
              setPomodorosCompleted((prevCount) => {
                const nextCount = prevCount + 1;
                const nextMode = nextCount % 4 === 0 ? "longBreak" : "break";
                setModeAndReset(nextMode);
                return nextCount;
              });
              setTotalMinutesStudied((prevMinutes) => prevMinutes + workMinutes);
            } else {
              setModeAndReset("work");
            }
            setIsRunning(false);
            startTimeRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, mode, pomodorosCompleted, workMinutes, setModeAndReset]);

  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalSeconds = getModeSeconds(mode);
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    startTimeRef.current = null;
    setTimeLeft(getModeSeconds(mode));
  };

  const skipToNext = () => {
    // Add partial time if in work mode
    if (mode === "work" && startTimeRef.current) {
      const elapsedMinutes = Math.floor((Date.now() - startTimeRef.current.getTime()) / 60000);
      if (elapsedMinutes > 0) {
        setTotalMinutesStudied(prev => prev + elapsedMinutes);
      }
    }

    setIsRunning(false);
    startTimeRef.current = null;

    if (mode === "work") {
      if ((pomodorosCompleted + 1) % 4 === 0) {
        setModeAndReset("longBreak");
      } else {
        setModeAndReset("break");
      }
    } else {
      setModeAndReset("work");
    }
  };

  const handleFinishSession = () => {
    setIsRunning(false);
    if (startTimeRef.current) {
      const elapsedMinutes = Math.floor((Date.now() - startTimeRef.current.getTime()) / 60000);
      setTotalMinutesStudied(prev => prev + elapsedMinutes);
    }
    setNewConfidence(activeSession?.topics?.confidence_level ?? 3);
    setShowCompleteDialog(true);
  };

  const handleCompleteSession = async () => {
    if (!activeSession) {
      setShowCompleteDialog(false);
      return;
    }

    const finalMinutes = totalMinutesStudied > 0 ? totalMinutesStudied : workMinutes;

    try {
      // Complete the session
      await completeSession.mutateAsync({
        id: activeSession.id,
        actualMinutes: finalMinutes,
        pomodorosCompleted,
      });

      // Update topic confidence
      await updateTopicConfidence.mutateAsync({
        id: activeSession.topic_id,
        confidenceLevel: newConfidence,
        revisionCount: (activeSession.topics?.revision_count ?? 0) + 1,
      });

      // Increment daily progress
      await incrementProgress.mutateAsync({
        completedMinutes: finalMinutes,
        sessionsCompleted: 1,
      });

      // Update streak
      await updateStreak.mutateAsync({ increment: true });

      // Reset timer state
      setPomodorosCompleted(0);
      setTotalMinutesStudied(0);
      setModeAndReset("work");
      setShowCompleteDialog(false);
    } catch (error) {
      console.error("Failed to complete session:", error);
    }
  };

  const ModeIcon = modeConfig[mode].icon;

  return (
    <AppLayout title="Pomodoro Timer">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Timer Display */}
        <Card className="overflow-hidden">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center">
              {/* Mode indicator */}
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex items-center gap-2 mb-6", modeConfig[mode].color)}
              >
                <ModeIcon className="h-5 w-5" />
                <span className="font-semibold font-display">{modeConfig[mode].label}</span>
              </motion.div>

              {/* Circular progress */}
              <div className="relative w-64 h-64 mb-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted"
                  />
                  <motion.circle
                    cx="128"
                    cy="128"
                    r="120"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className={modeConfig[mode].color}
                    strokeDasharray={2 * Math.PI * 120}
                    initial={{ strokeDashoffset: 2 * Math.PI * 120 }}
                    animate={{
                      strokeDashoffset: 2 * Math.PI * 120 * (1 - progress / 100)
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={timeLeft}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="text-6xl font-bold font-display tabular-nums"
                    >
                      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-muted-foreground text-sm mt-1">
                    {mode === "work" ? "Stay focused" : "Take a break"}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={resetTimer}
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  className={cn(
                    "h-16 w-16 rounded-full shadow-lg",
                    isRunning && "shadow-glow"
                  )}
                  onClick={toggleTimer}
                >
                  {isRunning ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 ml-0.5" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={skipToNext}
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>

              {/* Pomodoro counter */}
              <div className="mt-6 flex items-center gap-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-3 w-3 rounded-full transition-colors",
                      i < pomodorosCompleted % 4 ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  {pomodorosCompleted} pomodoros today
                </span>
              </div>

              {/* Finish Session Button */}
              {activeSession && (pomodorosCompleted > 0 || totalMinutesStudied > 0) && (
                <Button
                  className="mt-6 gap-2"
                  variant="outline"
                  onClick={handleFinishSession}
                >
                  <CheckCircle className="h-4 w-4" />
                  Finish Session
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Task */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Current Task</CardTitle>
          </CardHeader>
          <CardContent>
            {activeSession ? (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-accent">
                <div
                  className="h-12 w-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${activeSession.topics?.subjects?.color ?? '#0d9488'}20` }}
                >
                  <BookOpen
                    className="h-6 w-6"
                    style={{ color: activeSession.topics?.subjects?.color ?? '#0d9488' }}
                  />
                </div>
                <div>
                  <p className="font-medium">{activeSession.topics?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {activeSession.topics?.subjects?.name} • {activeSession.session_type} session
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">No active session</p>
                  <p className="text-sm text-muted-foreground">
                    Start a session from the Schedule or Dashboard
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Stats */}
        {(pomodorosCompleted > 0 || totalMinutesStudied > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Session Progress</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{pomodorosCompleted}</p>
                <p className="text-sm text-muted-foreground">Pomodoros</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{totalMinutesStudied}</p>
                <p className="text-sm text-muted-foreground">Minutes Studied</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complete Session Dialog */}
        <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Session</DialogTitle>
              <DialogDescription>
                Great work! How confident do you feel about this topic now?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-center mb-4">
                <p className="text-2xl font-bold">{totalMinutesStudied} min</p>
                <p className="text-muted-foreground">studied • {pomodorosCompleted} pomodoros</p>
              </div>
              <div className="space-y-2">
                <Label>Confidence Level</Label>
                <Select
                  value={newConfidence.toString()}
                  onValueChange={(v) => setNewConfidence(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Still confused</SelectItem>
                    <SelectItem value="2">2 - Need more practice</SelectItem>
                    <SelectItem value="3">3 - Getting comfortable</SelectItem>
                    <SelectItem value="4">4 - Confident</SelectItem>
                    <SelectItem value="5">5 - Mastered it!</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCompleteSession} disabled={completeSession.isPending}>
                {completeSession.isPending ? "Saving..." : "Complete Session"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
