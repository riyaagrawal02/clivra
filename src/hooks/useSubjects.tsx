import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useActiveExam } from "@/hooks/useExams";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import type { Subject as SubjectRecord, Topic as TopicRecord } from "@/types/backend";

export type Subject = SubjectRecord;
export type SubjectInsert = Omit<SubjectRecord, "id" | "user_id" | "created_at" | "updated_at">;
export type SubjectUpdate = Partial<SubjectInsert> & { id: string };

export function useSubjects() {
  const { user } = useAuth();
  const { data: activeExam } = useActiveExam();

  return useQuery({
    queryKey: ["subjects", user?.id, activeExam?.id],
    queryFn: async () => {
      if (!user || !activeExam) return [];
      const data = await apiFetch<{ subjects: Subject[] }>(
        `/subjects?examId=${activeExam.id}`
      );
      return data.subjects;
    },
    enabled: !!user && !!activeExam,
  });
}

export function useSubjectsWithTopics() {
  const { user } = useAuth();
  const { data: activeExam } = useActiveExam();

  return useQuery({
    queryKey: ["subjectsWithTopics", user?.id, activeExam?.id],
    queryFn: async () => {
      if (!user || !activeExam) return [];
      const data = await apiFetch<{ subjects: (Subject & { topics: TopicRecord[] })[] }>(
        `/subjects/with-topics?examId=${activeExam.id}`
      );
      return data.subjects;
    },
    enabled: !!user && !!activeExam,
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: activeExam } = useActiveExam();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (subject: Omit<SubjectInsert, "user_id" | "exam_id">) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeExam) throw new Error("No active exam selected");
      const data = await apiFetch<{ subject: Subject }>("/subjects", {
        method: "POST",
        body: JSON.stringify({ ...subject, exam_id: activeExam.id }),
      });
      return data.subject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["subjectsWithTopics"] });
      toast({ title: "Subject created", description: "Your subject has been added." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: SubjectUpdate) => {
      if (!user) throw new Error("Not authenticated");
      const data = await apiFetch<{ subject: Subject }>(`/subjects/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      return data.subject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["subjectsWithTopics"] });
      toast({ title: "Subject updated", description: "Your subject has been updated." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");
      await apiFetch(`/subjects/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["subjectsWithTopics"] });
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      toast({ title: "Subject deleted", description: "Your subject and its topics have been removed." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
