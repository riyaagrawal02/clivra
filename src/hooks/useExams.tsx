import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/superbase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/superbase/types";

export type Exam = Tables<"exams">;
export type ExamInsert = TablesInsert<"exams">;
export type ExamUpdate = TablesUpdate<"exams">;

export function useExams() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["exams", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("user_id", user.id)
        .order("exam_date", { ascending: true });
      
      if (error) throw error;
      return data as Exam[];
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
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data as Exam | null;
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
      
      // If this exam is active, deactivate others first
      if (exam.is_active) {
        await supabase
          .from("exams")
          .update({ is_active: false })
          .eq("user_id", user.id);
      }

      const { data, error } = await supabase
        .from("exams")
        .insert({ ...exam, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
    mutationFn: async ({ id, ...updates }: ExamUpdate & { id: string }) => {
      if (!user) throw new Error("Not authenticated");
      
      // If setting this exam as active, deactivate others first
      if (updates.is_active) {
        await supabase
          .from("exams")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .neq("id", id);
      }

      const { data, error } = await supabase
        .from("exams")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from("exams")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      
      if (error) throw error;
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
