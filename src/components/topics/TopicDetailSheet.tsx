import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { YouTubeVideoCard } from "@/components/topics/YouTubeVideoCard";
import { useYouTubeRecommendations } from "@/hooks/useYouTubeRecommendations";
import { useRevisionHistory, useRecordRevision } from "@/hooks/useRevisions";
import { useUpdateTopicConfidence } from "@/hooks/useTopics";
import { BookOpen, Video, History, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import type { Topic } from "@/hooks/useTopics";
import type { Tables } from "@/integrations/supabase/types";

interface TopicDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: Topic | null;
  subject: Tables<"subjects"> | null;
  examName?: string;
}

export function TopicDetailSheet({
  open,
  onOpenChange,
  topic,
  subject,
  examName,
}: TopicDetailSheetProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [newConfidence, setNewConfidence] = useState<number>(topic?.confidence_level ?? 3);
  const [revisionNotes, setRevisionNotes] = useState("");

  const { data: videos, isLoading: videosLoading } = useYouTubeRecommendations({
    topicId: topic?.id || "",
    topicName: topic?.name || "",
    subjectName: subject?.name || "",
    examContext: examName,
    confidenceLevel: topic?.confidence_level ?? 3,
    enabled: !!topic && activeTab === "learn",
  });

  const { data: revisionHistory } = useRevisionHistory(topic?.id);
  const recordRevision = useRecordRevision();
  const updateConfidence = useUpdateTopicConfidence();

  if (!topic || !subject) return null;

  const handleRecordRevision = async (completed: boolean) => {
    await recordRevision.mutateAsync({
      topicId: topic.id,
      confidenceBefore: topic.confidence_level ?? 1,
      confidenceAfter: newConfidence,
      completed,
      skipped: !completed,
      notes: revisionNotes || undefined,
    });
    
    setRevisionNotes("");
    onOpenChange(false);
  };

  const handleUpdateConfidence = async () => {
    await updateConfidence.mutateAsync({
      id: topic.id,
      confidenceLevel: newConfidence,
      revisionCount: (topic.revision_count ?? 0) + 1,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: subject.color || "#0d9488" }}
            />
            <Badge variant="outline" className="text-xs">
              {subject.name}
            </Badge>
          </div>
          <SheetTitle className="text-xl">{topic.name}</SheetTitle>
          <SheetDescription className="flex items-center gap-3">
            <ConfidenceBadge level={topic.confidence_level ?? 1} />
            {topic.last_studied_at && (
              <span className="text-xs text-muted-foreground">
                Last studied: {format(new Date(topic.last_studied_at), "MMM d")}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="learn" className="flex items-center gap-1">
              <Video className="h-3.5 w-3.5" />
              Learn
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <History className="h-3.5 w-3.5" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Confidence Slider */}
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Confidence Level</span>
                  <span className="text-2xl font-bold text-primary">{newConfidence}/5</span>
                </div>
                <Slider
                  value={[newConfidence]}
                  onValueChange={([v]) => setNewConfidence(v)}
                  min={1}
                  max={5}
                  step={1}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Struggling</span>
                  <span>Mastered</span>
                </div>
                {newConfidence !== topic.confidence_level && (
                  <Button
                    onClick={handleUpdateConfidence}
                    disabled={updateConfidence.isPending}
                    className="w-full"
                  >
                    Update Confidence
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Study Stats */}
            <Card>
              <CardContent className="pt-4 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Estimated Time</div>
                  <div className="text-lg font-semibold flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {topic.estimated_hours ?? 1}h
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                  <div className="text-lg font-semibold">
                    {topic.completed_hours ?? 0}h
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Revisions</div>
                  <div className="text-lg font-semibold">{topic.revision_count ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Next Revision</div>
                  <div className="text-sm font-medium">
                    {topic.next_revision_at
                      ? format(new Date(topic.next_revision_at), "MMM d")
                      : "Not scheduled"}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Revision */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h4 className="font-medium text-sm">Quick Revision</h4>
                <Textarea
                  placeholder="Add notes about this revision..."
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => handleRecordRevision(true)}
                    disabled={recordRevision.isPending}
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Complete
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleRecordRevision(false)}
                    disabled={recordRevision.isPending}
                  >
                    <TrendingDown className="h-4 w-4 mr-1" />
                    Skip
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="learn" className="space-y-4 mt-4">
            {topic.confidence_level && topic.confidence_level > 3 ? (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground">
                  <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Good confidence level!</p>
                  <p className="text-sm">
                    Video recommendations appear when confidence is ≤3
                  </p>
                </CardContent>
              </Card>
            ) : videosLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 h-24" />
                  </Card>
                ))}
              </div>
            ) : videos && videos.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {videos.length} recommended video{videos.length !== 1 ? "s" : ""} for this topic
                </p>
                {videos.map((video) => (
                  <YouTubeVideoCard key={video.id} video={video} />
                ))}
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Watch → Study → Return to Schedule
                </p>
              </div>
            ) : (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground">
                  <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No videos found for this topic</p>
                  <p className="text-sm">Try searching manually on YouTube</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            {revisionHistory && revisionHistory.length > 0 ? (
              <div className="space-y-2">
                {revisionHistory.map((revision) => (
                  <Card key={revision.id}>
                    <CardContent className="py-3 px-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <Badge
                            variant={revision.completed ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {revision.completed ? "Completed" : "Skipped"}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(revision.created_at), "MMM d, yyyy h:mm a")}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm">
                            <span className="text-muted-foreground">
                              {revision.confidence_before}
                            </span>
                            <span>→</span>
                            <span
                              className={
                                revision.confidence_after > revision.confidence_before
                                  ? "text-green-600"
                                  : revision.confidence_after < revision.confidence_before
                                  ? "text-red-600"
                                  : ""
                              }
                            >
                              {revision.confidence_after}
                            </span>
                          </div>
                        </div>
                      </div>
                      {revision.notes && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {revision.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No revision history yet</p>
                  <p className="text-sm">Complete a revision to track your progress</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}