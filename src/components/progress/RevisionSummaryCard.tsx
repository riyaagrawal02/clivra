import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRevisionSummary, useWeeklyRevisionStats } from "@/hooks/useRevisions";
import { RefreshCw, CheckCircle, AlertTriangle, Clock, TrendingUp } from "lucide-react";

export function RevisionSummaryCard() {
  const { data: summary, isLoading: summaryLoading } = useRevisionSummary();
  const { data: weeklyStats, isLoading: statsLoading } = useWeeklyRevisionStats();

  const isLoading = summaryLoading || statsLoading;

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Revision Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <RefreshCw className="h-5 w-5 text-primary" />
          Weekly Revision Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weekly Stats */}
        {weeklyStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">
                {weeklyStats.completed}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {weeklyStats.skipped}
              </div>
              <div className="text-xs text-muted-foreground">Skipped</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">
                {weeklyStats.completionRate}%
              </div>
              <div className="text-xs text-muted-foreground">Rate</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">
                +{weeklyStats.avgConfidenceGain}
              </div>
              <div className="text-xs text-muted-foreground">Avg Gain</div>
            </div>
          </div>
        )}

        {/* Completion Rate Bar */}
        {weeklyStats && weeklyStats.total > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completion Rate</span>
              <span className="font-medium">{weeklyStats.completionRate}%</span>
            </div>
            <Progress value={weeklyStats.completionRate} className="h-2" />
          </div>
        )}

        {/* Topic Status */}
        {summary && (
          <div className="space-y-3 pt-2 border-t">
            {/* Overdue Topics */}
            {summary.overdueTopics.length > 0 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-red-600">
                    {summary.overdueTopics.length} Overdue
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {summary.overdueTopics.slice(0, 3).map((topic) => (
                      <Badge key={topic.id} variant="destructive" className="text-xs">
                        {topic.name}
                      </Badge>
                    ))}
                    {summary.overdueTopics.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{summary.overdueTopics.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pending Topics */}
            {summary.pendingRevisions.length > 0 && (
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-yellow-600">
                    {summary.pendingRevisions.length} Pending
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {summary.pendingRevisions.slice(0, 3).map((topic) => (
                      <Badge key={topic.id} variant="outline" className="text-xs">
                        {topic.name}
                      </Badge>
                    ))}
                    {summary.pendingRevisions.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{summary.pendingRevisions.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Completed This Week */}
            {summary.completedThisWeek.length > 0 && (
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-green-600">
                    {summary.completedThisWeek.length} Revised This Week
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {summary.completedThisWeek.slice(0, 3).map((topic) => (
                      <Badge key={topic.id} variant="secondary" className="text-xs bg-green-50 text-green-700">
                        {topic.name}
                      </Badge>
                    ))}
                    {summary.completedThisWeek.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{summary.completedThisWeek.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming */}
            {summary.upcomingRevisions.length > 0 && (
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-blue-600">
                    {summary.upcomingRevisions.length} Coming Up
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {summary.upcomingRevisions.slice(0, 3).map((topic) => (
                      <Badge key={topic.id} variant="outline" className="text-xs border-blue-200">
                        {topic.name}
                      </Badge>
                    ))}
                    {summary.upcomingRevisions.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{summary.upcomingRevisions.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* All caught up */}
            {summary.overdueTopics.length === 0 &&
              summary.pendingRevisions.length === 0 &&
              summary.completedThisWeek.length === 0 &&
              summary.upcomingRevisions.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">No revisions pending!</p>
                  <p className="text-xs">Keep studying to build up your revision schedule.</p>
                </div>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}