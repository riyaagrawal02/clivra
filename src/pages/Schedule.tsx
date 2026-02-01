import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityIndicator } from "@/components/ui/PriorityIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Clock, 
  BookOpen,
  TrendingUp,
  Target,
  Sparkles,
  Calendar as CalendarIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { format, addDays, startOfWeek, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { useSessionsByDate, useStartSession } from "@/hooks/useStudySessions";
import { useScheduleGenerator } from "@/hooks/useScheduleGenerator";

const typeConfig = {
  learning: { icon: BookOpen, color: "text-primary", bgColor: "bg-primary/10", label: "Learning" },
  revision: { icon: TrendingUp, color: "text-warning", bgColor: "bg-warning/10", label: "Revision" },
  recall: { icon: Target, color: "text-info", bgColor: "bg-info/10", label: "Recall" },
};

export default function Schedule() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const { data: sessions, isLoading } = useSessionsByDate(selectedDate);
  const startSession = useStartSession();
  const { generateScheduleForDate, isLoading: generating, hasTopics } = useScheduleGenerator();

  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPreviousWeek = () => setWeekStart(addDays(weekStart, -7));
  const goToNextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToToday = () => {
    setSelectedDate(new Date());
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const handleStartSession = async (sessionId: string) => {
    await startSession.mutateAsync(sessionId);
    navigate("/timer", { state: { sessionId } });
  };

  const handleGenerateSchedule = async () => {
    try {
      await generateScheduleForDate(selectedDate);
    } catch (error) {
      console.error("Failed to generate schedule:", error);
    }
  };

  const totalMinutes = sessions?.reduce((sum, s) => sum + s.planned_duration_minutes, 0) ?? 0;
  const completedMinutes = sessions
    ?.filter(s => s.status === "completed")
    .reduce((sum, s) => sum + (s.actual_duration_minutes ?? s.planned_duration_minutes), 0) ?? 0;

  return (
    <AppLayout title="Schedule">
      <div className="space-y-6">
        {/* Calendar Header */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="font-semibold ml-2">
                  {format(weekStart, "MMMM yyyy")}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>

            {/* Week Days */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "flex flex-col items-center p-3 rounded-lg transition-colors",
                    isSameDay(day, selectedDate)
                      ? "bg-primary text-primary-foreground"
                      : isToday(day)
                      ? "bg-accent"
                      : "hover:bg-muted"
                  )}
                >
                  <span className={cn(
                    "text-xs font-medium",
                    isSameDay(day, selectedDate) ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {format(day, "EEE")}
                  </span>
                  <span className="text-lg font-bold">
                    {format(day, "d")}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Day Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sessions</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-8" />
                ) : (
                  <p className="text-xl font-bold">{sessions?.length ?? 0}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Study Time</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="text-xl font-bold">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <p className="text-xl font-bold">
                    {totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0}%
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display">
                {isToday(selectedDate) ? "Today's Schedule" : format(selectedDate, "EEEE, MMMM d")}
              </CardTitle>
              <CardDescription>
                {isLoading ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  `${sessions?.length ?? 0} sessions • ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m total`
                )}
              </CardDescription>
            </div>
            {hasTopics && (
              <Button size="sm" className="gap-2" onClick={handleGenerateSchedule} disabled={generating}>
                <Sparkles className="h-4 w-4" />
                {generating ? "Generating..." : "Generate Schedule"}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : !sessions || sessions.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No sessions scheduled</h3>
                <p className="text-muted-foreground mb-4">
                  {hasTopics 
                    ? "Generate a study schedule for this day" 
                    : "Add subjects and topics first to schedule sessions"}
                </p>
                {hasTopics && (
                  <Button onClick={handleGenerateSchedule} disabled={generating}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {generating ? "Generating..." : "Generate Schedule"}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session, idx) => {
                  const sessionType = (session.session_type as "learning" | "revision" | "recall") ?? "learning";
                  const config = typeConfig[sessionType];
                  const Icon = config.icon;
                  
                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border transition-colors",
                        session.status === "in_progress" && "bg-accent border-primary/30",
                        session.status === "completed" && "bg-muted/50 opacity-75",
                        session.status === "missed" && "bg-destructive/5 border-destructive/20",
                        session.status === "scheduled" && "bg-card hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center w-16">
                          <p className="font-semibold">{format(new Date(session.scheduled_at), "h:mm")}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(session.scheduled_at), "a")}</p>
                        </div>
                        
                        <div
                          className="h-12 w-1 rounded-full"
                          style={{ backgroundColor: session.topics?.subjects?.color ?? '#0d9488' }}
                        />
                        
                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", config.bgColor)}>
                          <Icon className={cn("h-5 w-5", config.color)} />
                        </div>
                        
                        <div>
                          <p className="font-medium">{session.topics?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {session.topics?.subjects?.name} • {session.planned_duration_minutes} min {config.label.toLowerCase()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <PriorityIndicator score={session.topics?.priority_score ?? 50} showScore />
                        
                        {session.status === "scheduled" && (
                          <Button 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleStartSession(session.id)}
                            disabled={startSession.isPending}
                          >
                            <Play className="h-4 w-4" />
                            Start
                          </Button>
                        )}
                        {session.status === "in_progress" && (
                          <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm font-medium animate-pulse-soft">
                            In Progress
                          </span>
                        )}
                        {session.status === "completed" && (
                          <span className="px-3 py-1 bg-success/10 text-success rounded-full text-sm font-medium">
                            Completed
                          </span>
                        )}
                        {session.status === "missed" && (
                          <span className="px-3 py-1 bg-destructive/10 text-destructive rounded-full text-sm font-medium">
                            Missed
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
