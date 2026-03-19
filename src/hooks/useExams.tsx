import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import type { Exam } from "@/types/backend";

export type ExamInsert = Omit<Exam, "id" | "user_id" | "created_at" | "updated_at">;
export type ExamUpdate = Partial<ExamInsert> & { id: string };

export function useExams() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["exams", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const data = await apiFetch<{ exams: Exam[] }>("/exams");
      return data.exams;
    },
    enabled: !!user,
  });
}

export function useActiveExam() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["activeExam", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const data = await apiFetch<{ exam: Exam | null }>("/exams/active");
      return data.exam ?? null;
    },
    enabled: !!user,
  });
}

export function useCreateExam() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (exam: Omit<ExamInsert, "user_id">) => {
      if (!user) throw new Error("Not authenticated");

      const data = await apiFetch<{ exam: Exam }>("/exams", {
        method: "POST",
        body: JSON.stringify(exam),
      });
      return data.exam;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["activeExam"] });
      toast({ title: "Exam created", description: "Your exam has been added successfully." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateExam() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ExamUpdate) => {
      if (!user) throw new Error("Not authenticated");

      const data = await apiFetch<{ exam: Exam }>(`/exams/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      return data.exam;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["activeExam"] });
      toast({ title: "Exam updated", description: "Your exam has been updated." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteExam() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");
      await apiFetch(`/exams/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["activeExam"] });
      toast({ title: "Exam deleted", description: "Your exam has been removed." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDaysUntilExam() {
  const { data: exam } = useActiveExam();

  if (!exam) return null;

  const examDate = new Date(exam.exam_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  examDate.setHours(0, 0, 0, 0);

  const diffTime = examDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
