import { useAuth } from "../hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { ReadinessGauge } from "../components/ui/ReadinessGauge";
import { PriorityIndicator } from "../components/ui/PriorityIndicator";
import { ConfidenceBadge } from "../components/ui/ConfidenceBadge";
import { Skeleton } from "../components/ui/skeleton";
import {
  Play,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  Flame,
  BookOpen,
  ArrowRight,
  Plus,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import { useDashboardStats, useNextStudySession } from "../hooks/useStats";
import { useTodaySessions, useStartSession } from "../hooks/useStudySessions";
import { useActiveExam } from "../hooks/useExams";
import { useScheduleGenerator } from "../hooks/useScheduleGenerator";
import { format } from "date-fns";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: nextSession, isLoading: nextLoading } = useNextStudySession();
  const { data: todaySessions, isLoading: sessionsLoading } = useTodaySessions();
  const { data: activeExam } = useActiveExam();
  const startSession = useStartSession();
  const { generateScheduleForDate, isLoading: generating, hasTopics } = useScheduleGenerator();

  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const handleStartSession = async () => {
    if (nextSession) {
      await startSession.mutateAsync(nextSession.id);
      navigate("/timer", { state: { sessionId: nextSession.id } });
    }
  };

  const handleGenerateTodaySchedule = async () => {
    try {
      await generateScheduleForDate(new Date());
    } catch (error) {
      console.error("Failed to generate schedule:", error);
    }
  };

  const todayProgress = stats
    ? Math.round((stats.todayCompleted / Math.max(stats.todayPlanned, 1)) * 100)
    : 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const noActiveExam = !activeExam;
  const noSessions = !todaySessions || todaySessions.length === 0;

  return (
    <AppLayout title="Dashboard">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* No Exam Warning */}
        {noActiveExam && !statsLoading && (
          <motion.div variants={itemVariants}>
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold font-display text-lg">Get Started with Clivra</h3>
                    <p className="text-muted-foreground mt-1">
                      Set up your exam and add subjects to start your personalized study plan.
                    </p>
                  </div>
                  <Button onClick={() => navigate("/settings")} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Set Up Exam
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Hero: What to study now */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-primary/20 shadow-glow">
            <div className="gradient-primary p-6 text-primary-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-foreground/80 text-sm font-medium mb-1">
                    What should I study now?
                  </p>
                  {nextLoading ? (
                    <Skeleton className="h-8 w-48 bg-primary-foreground/20" />
                  ) : nextSession ? (
                    <>
                      <h2 className="text-2xl font-bold font-display mb-1">
                        {nextSession.topics?.name}
                      </h2>
                      <p className="text-primary-foreground/90 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        {nextSession.topics?.subjects?.name} • {nextSession.planned_duration_minutes} min {nextSession.session_type}
                      </p>
                    </>
                  ) : hasTopics ? (
                    <>
                      <h2 className="text-2xl font-bold font-display mb-1">
                        No sessions scheduled
                      </h2>
                      <p className="text-primary-foreground/90">
                        Generate today's study schedule to get started
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold font-display mb-1">
                        Add your study topics
                      </h2>
                      <p className="text-primary-foreground/90">
                        Add subjects and topics to generate your personalized schedule
                      </p>
                    </>
                  )}
                </div>
                <div className="flex flex-col items-end gap-3">
                  {nextSession && (
                    <div className="flex items-center gap-2 bg-primary-foreground/10 rounded-full px-3 py-1">
                      <PriorityIndicator score={nextSession.topics?.priority_score ?? 50} size="sm" />
                      <span className="text-sm font-medium">Priority {nextSession.topics?.priority_score}</span>
                    </div>
                  )}
                  {nextSession ? (
                    <Button
                      size="lg"
                      variant="secondary"
                      className="gap-2 shadow-lg"
                      onClick={handleStartSession}
                      disabled={startSession.isPending}
                    >
                      <Play className="h-5 w-5" />
                      Start Session
                    </Button>
                  ) : hasTopics && noSessions ? (
                    <Button
                      size="lg"
                      variant="secondary"
                      className="gap-2 shadow-lg"
                      onClick={handleGenerateTodaySchedule}
                      disabled={generating}
                    >
                      <Sparkles className="h-5 w-5" />
                      {generating ? "Generating..." : "Generate Schedule"}
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      variant="secondary"
                      className="gap-2 shadow-lg"
                      onClick={() => navigate("/subjects")}
                    >
                      <Plus className="h-5 w-5" />
                      Add Subjects
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Stats Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <Flame className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Study Streak</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold font-display">{stats?.streak ?? 0} days</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold font-display">{stats?.weeklyHours ?? 0}h</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <Target className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Topics Done</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold font-display">{stats?.topicsCompleted ?? 0}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info/10">
                <Calendar className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stats?.examName ?? "Exam"}</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold font-display">
                    {stats?.daysUntilExam !== null ? `${stats?.daysUntilExam} days` : "—"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Today's Schedule */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-display">Today's Schedule</CardTitle>
                  <CardDescription>
                    {sessionsLoading ? (
                      <Skeleton className="h-4 w-32" />
                    ) : (
                      `${todaySessions?.length ?? 0} sessions planned • ${todayProgress}% complete`
                    )}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/schedule")}>
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <Progress value={todayProgress} className="mb-4 h-2" />
                {sessionsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : noSessions ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No sessions scheduled for today</p>
                    {hasTopics && (
                      <Button onClick={handleGenerateTodaySchedule} disabled={generating}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        {generating ? "Generating..." : "Generate Today's Schedule"}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todaySessions?.slice(0, 4).map((session) => (
                      <div
                        key={session.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${session.status === "in_progress" ? "bg-accent border-primary/20" :
                            session.status === "completed" ? "bg-muted/50 opacity-75" :
                              "bg-card"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${session.session_type === "learning" ? "bg-primary/10" :
                              session.session_type === "revision" ? "bg-warning/10" : "bg-info/10"
                            }`}>
                            {session.session_type === "learning" ? (
                              <BookOpen className="h-5 w-5 text-primary" />
                            ) : session.session_type === "revision" ? (
                              <TrendingUp className="h-5 w-5 text-warning" />
                            ) : (
                              <Target className="h-5 w-5 text-info" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{session.topics?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {session.topics?.subjects?.name} • {session.planned_duration_minutes} min
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {format(new Date(session.scheduled_at), "h:mm a")}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">{session.session_type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Exam Readiness */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Exam Readiness</CardTitle>
                <CardDescription>{stats?.examName ?? "Your exam"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {statsLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : (
                  <ReadinessGauge
                    status={stats?.readiness?.status ?? "not_ready"}
                    percentage={stats?.readiness?.percentage ?? 0}
                    message={stats?.readiness?.message ?? "Start adding topics to track your progress."}
                  />
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-medium">{stats?.completionPercentage ?? 0}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Avg. Confidence</span>
                    <ConfidenceBadge level={Math.round(stats?.avgConfidence ?? 1)} size="sm" />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Consistency</span>
                    <span className="font-medium flex items-center gap-1">
                      <Flame className="h-4 w-4 text-warning" />
                      {stats?.streak ?? 0} days
                    </span>
                  </div>
                </div>

                <Button className="w-full" variant="outline" onClick={() => navigate("/progress")}>
                  View Full Report
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button variant="outline" className="gap-2" onClick={() => navigate("/subjects")}>
                <Plus className="h-4 w-4" />
                Add Subject
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => navigate("/schedule")}>
                <Calendar className="h-4 w-4" />
                Plan Tomorrow
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => navigate("/timer")}>
                <Clock className="h-4 w-4" />
                Quick Pomodoro
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
