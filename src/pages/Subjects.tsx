import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { PriorityIndicator } from "@/components/ui/PriorityIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ChevronDown, ChevronRight, Trash2, Edit, BookOpen, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSubjectsWithTopics, useCreateSubject, useDeleteSubject } from "@/hooks/useSubjects";
import { useCreateTopic, useUpdateTopic, useDeleteTopic } from "@/hooks/useTopics";
import { useActiveExam } from "@/hooks/useExams";

type SubjectsWithTopics = NonNullable<ReturnType<typeof useSubjectsWithTopics>["data"]>;
type SubjectWithTopics = SubjectsWithTopics[number];
type TopicWithDetails = SubjectWithTopics["topics"][number];

const strengthColors = {
  weak: "bg-priority-high/10 text-priority-high border-priority-high/30",
  average: "bg-priority-medium/10 text-priority-medium border-priority-medium/30",
  strong: "bg-priority-low/10 text-priority-low border-priority-low/30",
};

export default function Subjects() {
  const { user, loading } = useAuth();
  const { data: subjects, isLoading } = useSubjectsWithTopics();
  const { data: activeExam } = useActiveExam();
  const createSubject = useCreateSubject();
  const deleteSubject = useDeleteSubject();
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const deleteTopic = useDeleteTopic();

  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  const [isEditTopicOpen, setIsEditTopicOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicWithDetails | null>(null);

  // Form states
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectStrength, setNewSubjectStrength] = useState<"weak" | "average" | "strong">("average");
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicHours, setNewTopicHours] = useState("2");
  const [editTopicConfidence, setEditTopicConfidence] = useState(1);

  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSubjects(newExpanded);
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;

    const color = newSubjectStrength === "weak" ? "#dc2626" : newSubjectStrength === "average" ? "#f59e0b" : "#16a34a";

    await createSubject.mutateAsync({
      name: newSubjectName,
      strength: newSubjectStrength,
      color,
    });

    setNewSubjectName("");
    setNewSubjectStrength("average");
    setIsAddSubjectOpen(false);
  };

  const handleAddTopic = async () => {
    if (!newTopicName.trim() || !selectedSubjectId) return;

    await createTopic.mutateAsync({
      subject_id: selectedSubjectId,
      name: newTopicName,
      estimated_hours: parseFloat(newTopicHours) || 2,
      confidence_level: 1,
      priority_score: 75,
    });

    setNewTopicName("");
    setNewTopicHours("2");
    setIsAddTopicOpen(false);
    setSelectedSubjectId(null);
  };

  const handleEditTopic = async () => {
    if (!selectedTopic) return;

    await updateTopic.mutateAsync({
      id: selectedTopic.id,
      confidence_level: editTopicConfidence,
    });

    setIsEditTopicOpen(false);
    setSelectedTopic(null);
  };

  const openAddTopic = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setIsAddTopicOpen(true);
  };

  const openEditTopic = (topic: TopicWithDetails) => {
    setSelectedTopic(topic);
    setEditTopicConfidence(topic.confidence_level ?? 1);
    setIsEditTopicOpen(true);
  };

  const noActiveExam = !activeExam;

  return (
    <AppLayout title="Subjects & Topics">
      <div className="space-y-6">
        {/* No Exam Warning */}
        {noActiveExam && !isLoading && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-warning" />
              <p className="text-sm">
                Please set up an exam in Settings before adding subjects.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Manage your subjects and topics. Set strength levels and track confidence.
          </p>
          <Dialog open={isAddSubjectOpen} onOpenChange={setIsAddSubjectOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={noActiveExam}>
                <Plus className="h-4 w-4" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Subject</DialogTitle>
                <DialogDescription>
                  Create a new subject to organize your study topics.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="subject-name">Subject Name</Label>
                  <Input
                    id="subject-name"
                    placeholder="e.g., Mathematics"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Your Strength Level</Label>
                  <Select value={newSubjectStrength} onValueChange={(v: "weak" | "average" | "strong") => setNewSubjectStrength(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weak">Weak - Needs lots of work</SelectItem>
                      <SelectItem value="average">Average - Some gaps to fill</SelectItem>
                      <SelectItem value="strong">Strong - Mostly confident</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddSubjectOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddSubject} disabled={createSubject.isPending}>
                  {createSubject.isPending ? "Adding..." : "Add Subject"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && subjects?.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No subjects yet</h3>
              <p className="text-muted-foreground mb-4">
                {noActiveExam
                  ? "Set up an exam first, then add your subjects."
                  : "Add your first subject to start organizing your study plan."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Subjects List */}
        <div className="space-y-4">
          {subjects?.map((subject) => (
            <Card key={subject.id} className="overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleExpand(subject.id)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${subject.color}20` }}
                  >
                    <BookOpen className="h-5 w-5" style={{ color: subject.color ?? '#0d9488' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold font-display">{subject.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {subject.topics?.length ?? 0} topics
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-full border capitalize",
                    strengthColors[(subject.strength as "weak" | "average" | "strong") ?? "average"]
                  )}>
                    {subject.strength}
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {subject.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this subject and all its topics. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteSubject.mutate(subject.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  {expandedSubjects.has(subject.id) ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              <AnimatePresence>
                {expandedSubjects.has(subject.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="border-t border-border">
                      {(!subject.topics || subject.topics.length === 0) ? (
                        <div className="p-6 text-center">
                          <p className="text-muted-foreground mb-3">No topics yet</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); openAddTopic(subject.id); }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add First Topic
                          </Button>
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {subject.topics.map((topic) => (
                            <div
                              key={topic.id}
                              className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <PriorityIndicator score={topic.priority_score ?? 50} />
                                <div>
                                  <p className="font-medium">{topic.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {Number(topic.completed_hours ?? 0).toFixed(1)}/{Number(topic.estimated_hours ?? 1).toFixed(1)}h completed
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <ConfidenceBadge level={topic.confidence_level ?? 1} showLabel />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditTopic(topic)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete {topic.name}?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete this topic and all its study sessions.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteTopic.mutate(topic.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          ))}
                          <div className="p-3 bg-muted/30">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={(e) => { e.stopPropagation(); openAddTopic(subject.id); }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Topic
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}
        </div>

        {/* Add Topic Dialog */}
        <Dialog open={isAddTopicOpen} onOpenChange={setIsAddTopicOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Topic</DialogTitle>
              <DialogDescription>
                Add a topic to study within this subject.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="topic-name">Topic Name</Label>
                <Input
                  id="topic-name"
                  placeholder="e.g., Differential Equations"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-hours">Estimated Study Hours</Label>
                <Input
                  id="topic-hours"
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="2"
                  value={newTopicHours}
                  onChange={(e) => setNewTopicHours(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddTopicOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTopic} disabled={createTopic.isPending}>
                {createTopic.isPending ? "Adding..." : "Add Topic"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Topic Dialog */}
        <Dialog open={isEditTopicOpen} onOpenChange={setIsEditTopicOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Topic</DialogTitle>
              <DialogDescription>
                Update your confidence level for {selectedTopic?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Confidence Level</Label>
                <Select
                  value={editTopicConfidence.toString()}
                  onValueChange={(v) => setEditTopicConfidence(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Just started</SelectItem>
                    <SelectItem value="2">2 - Need more practice</SelectItem>
                    <SelectItem value="3">3 - Getting comfortable</SelectItem>
                    <SelectItem value="4">4 - Confident</SelectItem>
                    <SelectItem value="5">5 - Mastered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditTopicOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditTopic} disabled={updateTopic.isPending}>
                {updateTopic.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
