import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

import { Skeleton } from "@/components/ui/skeleton";
import { User, Clock, GraduationCap, Save, Plus, Trash2, Check } from "lucide-react";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useExams, useCreateExam, useUpdateExam, useDeleteExam } from "@/hooks/useExams";
import { format } from "date-fns";

export default function Settings() {
  const { user, loading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: exams, isLoading: examsLoading } = useExams();
  const updateProfile = useUpdateProfile();
  const createExam = useCreateExam();
  const updateExam = useUpdateExam();
  const deleteExam = useDeleteExam();

  const [fullName, setFullName] = useState<string | null>(null);
  const [dailyHours, setDailyHours] = useState<number | null>(null);
  const [preferredSlot, setPreferredSlot] = useState<"morning" | "afternoon" | "evening" | "night" | null>(null);
  const [pomodoroWork, setPomodoroWork] = useState<number | null>(null);
  const [pomodoroBreak, setPomodoroBreak] = useState<number | null>(null);

  // New exam form
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [newExamName, setNewExamName] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [newExamDescription, setNewExamDescription] = useState("");

  const fullNameValue = fullName ?? profile?.full_name ?? "";
  const dailyHoursValue = dailyHours ?? Number(profile?.daily_study_hours ?? 3);
  const preferredSlotValue = preferredSlot ?? profile?.preferred_study_slot ?? "morning";
  const pomodoroWorkValue = pomodoroWork ?? profile?.pomodoro_work_minutes ?? 25;
  const pomodoroBreakValue = pomodoroBreak ?? profile?.pomodoro_break_minutes ?? 5;

  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      full_name: fullNameValue,
      daily_study_hours: dailyHoursValue,
      preferred_study_slot: preferredSlotValue,
      pomodoro_work_minutes: pomodoroWorkValue,
      pomodoro_break_minutes: pomodoroBreakValue,
    });
  };

  const handleAddExam = async () => {
    if (!newExamName.trim() || !newExamDate) return;

    await createExam.mutateAsync({
      name: newExamName,
      exam_date: newExamDate,
      description: newExamDescription || null,
      is_active: true,
    });

    setNewExamName("");
    setNewExamDate("");
    setNewExamDescription("");
    setIsAddExamOpen(false);
  };

  const handleSetActiveExam = async (examId: string) => {
    await updateExam.mutateAsync({
      id: examId,
      is_active: true,
    });
  };

  return (
    <AppLayout title="Settings">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Exams Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="font-display">Your Exams</CardTitle>
                <CardDescription>Manage your target exams</CardDescription>
              </div>
              <Dialog open={isAddExamOpen} onOpenChange={setIsAddExamOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Exam
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Exam</DialogTitle>
                    <DialogDescription>
                      Set up your target exam to start planning your study schedule.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="exam-name">Exam Name</Label>
                      <Input
                        id="exam-name"
                        placeholder="e.g., JEE Advanced, NEET, Board Exams"
                        value={newExamName}
                        onChange={(e) => setNewExamName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exam-date">Exam Date</Label>
                      <Input
                        id="exam-date"
                        type="date"
                        value={newExamDate}
                        onChange={(e) => setNewExamDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exam-desc">Description (Optional)</Label>
                      <Input
                        id="exam-desc"
                        placeholder="Any notes about this exam"
                        value={newExamDescription}
                        onChange={(e) => setNewExamDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddExamOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddExam} disabled={createExam.isPending}>
                      {createExam.isPending ? "Adding..." : "Add Exam"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {examsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : !exams || exams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No exams added yet</p>
                <p className="text-sm">Add an exam to start planning your study schedule</p>
              </div>
            ) : (
              <div className="space-y-3">
                {exams.map((exam) => (
                  <div
                    key={exam.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${exam.is_active ? "bg-accent border-primary/30" : "bg-card"
                      }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{exam.name}</p>
                        {exam.is_active && (
                          <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(exam.exam_date), "MMMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!exam.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetActiveExam(exam.id)}
                          disabled={updateExam.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Set Active
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteExam.mutate(exam.id)}
                        disabled={deleteExam.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">Profile</CardTitle>
                <CardDescription>Your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={fullNameValue}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Study Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">Study Preferences</CardTitle>
                <CardDescription>Configure your study schedule</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {profileLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Daily Study Hours</Label>
                    <span className="text-sm text-muted-foreground">{dailyHoursValue} hours</span>
                  </div>
                  <Slider
                    value={[dailyHoursValue]}
                    onValueChange={([value]) => setDailyHours(value)}
                    min={1}
                    max={10}
                    step={0.5}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Preferred Study Slot</Label>
                  <Select
                    value={preferredSlotValue}
                    onValueChange={(value) =>
                      setPreferredSlot(value as "morning" | "afternoon" | "evening" | "night")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning (6 AM - 12 PM)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12 PM - 6 PM)</SelectItem>
                      <SelectItem value="evening">Evening (6 PM - 10 PM)</SelectItem>
                      <SelectItem value="night">Night (10 PM - 2 AM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Pomodoro Work</Label>
                      <span className="text-sm text-muted-foreground">{pomodoroWorkValue} min</span>
                    </div>
                    <Slider
                      value={[pomodoroWorkValue]}
                      onValueChange={([value]) => setPomodoroWork(value)}
                      min={15}
                      max={60}
                      step={5}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Pomodoro Break</Label>
                      <span className="text-sm text-muted-foreground">{pomodoroBreakValue} min</span>
                    </div>
                    <Slider
                      value={[pomodoroBreakValue]}
                      onValueChange={([value]) => setPomodoroBreak(value)}
                      min={3}
                      max={15}
                      step={1}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="w-full gap-2"
          disabled={updateProfile.isPending}
        >
          <Save className="h-4 w-4" />
          {updateProfile.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </AppLayout>
  );
}
