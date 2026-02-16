import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReadinessGauge } from "@/components/ui/ReadinessGauge";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RevisionSummaryCard } from "@/components/progress/RevisionSummaryCard";
import {
  Clock,
  TrendingUp,
  Flame,
  Target,
  BookOpen,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { motion } from "framer-motion";
import { useDashboardStats, useWeeklyAnalytics, useSubjectProgress } from "@/hooks/useStats";
import { useActiveExam, useDaysUntilExam } from "@/hooks/useExams";
import { useProfile } from "@/hooks/useProfile";

export default function ProgressPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("weekly");

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: weeklyData, isLoading: weeklyLoading } = useWeeklyAnalytics();
  const { data: subjectProgress, isLoading: subjectsLoading } = useSubjectProgress();
  const { data: activeExam } = useActiveExam();
  const { data: profile } = useProfile();
  const daysUntilExam = useDaysUntilExam();

  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const totalPlanned = weeklyData?.reduce((sum, d) => sum + d.planned, 0) ?? 0;
  const totalCompleted = weeklyData?.reduce((sum, d) => sum + d.completed, 0) ?? 0;
  const completionRate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;

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

  return (
    <AppLayout title="Progress">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Exam Readiness Hero */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-xl">
                    {activeExam?.name ?? "Exam"} Readiness
                  </CardTitle>
                  <CardDescription>
                    {daysUntilExam !== null ? `${daysUntilExam} days remaining` : "No exam date set"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-warning">
                  <Flame className="h-5 w-5" />
                  <span className="font-semibold">{stats?.streak ?? 0} day streak</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <ReadinessGauge
                  status={stats?.readiness?.status ?? "not_ready"}
                  percentage={stats?.readiness?.percentage ?? 0}
                  message={stats?.readiness?.message ?? "Start adding topics to track your progress."}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  {statsLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <p className="text-xl font-bold font-display">
                      {Math.round(totalCompleted / 60)}h {totalCompleted % 60}m
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completion</p>
                  {statsLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className="text-xl font-bold font-display">{completionRate}%</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Topics Done</p>
                  {statsLoading ? (
                    <Skeleton className="h-7 w-8" />
                  ) : (
                    <p className="text-xl font-bold font-display">{stats?.topicsCompleted ?? 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Confidence</p>
                  {statsLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <p className="text-xl font-bold font-display">{stats?.avgConfidence ?? 0} / 5</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display">Study Analytics</CardTitle>
                  <TabsList>
                    <TabsTrigger value="weekly">Weekly</TabsTrigger>
                    <TabsTrigger value="subjects">By Subject</TabsTrigger>
                  </TabsList>
                </div>
              </Tabs>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="weekly" className="mt-0">
                  {weeklyLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : weeklyData && weeklyData.length > 0 ? (
                    <>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="day" className="text-muted-foreground" />
                            <YAxis className="text-muted-foreground" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                              formatter={(value) => [`${value ?? 0} min`, ""]}
                            />
                            <Bar dataKey="planned" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name="Planned" />
                            <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Completed" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded bg-muted" />
                          <span className="text-sm text-muted-foreground">Planned</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded bg-primary" />
                          <span className="text-sm text-muted-foreground">Completed</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No data available yet. Complete some study sessions to see your analytics.
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="subjects" className="mt-0">
                  {subjectsLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : subjectProgress && subjectProgress.length > 0 ? (
                    <div className="space-y-4">
                      {subjectProgress.map((subject) => (
                        <div key={subject.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: subject.color ?? '#0d9488' }}
                              />
                              <span className="font-medium">{subject.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {subject.completed}/{subject.topics} topics
                              </span>
                              <ConfidenceBadge level={Math.round(subject.avgConfidence)} size="sm" />
                            </div>
                          </div>
                          <Progress value={subject.progress} className="h-2" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      Add subjects and topics to see your progress breakdown.
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* Revision Summary */}
        <motion.div variants={itemVariants}>
          <RevisionSummaryCard />
        </motion.div>

        {/* Streaks & Goals */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Consistency</CardTitle>
              <CardDescription>Your study streaks and goals</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-warning" />
                  <span className="font-medium">Current Streak</span>
                </div>
                {statsLoading ? (
                  <Skeleton className="h-10 w-20" />
                ) : (
                  <p className="text-3xl font-bold font-display">{stats?.streak ?? 0} days</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-success" />
                  <span className="font-medium">Longest Streak</span>
                </div>
                {statsLoading ? (
                  <Skeleton className="h-10 w-20" />
                ) : (
                  <p className="text-3xl font-bold font-display">{profile?.longest_streak ?? stats?.longestStreak ?? 0} days</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
