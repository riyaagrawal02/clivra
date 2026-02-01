import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/superbase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveExam } from "@/hooks/useExams";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/superbase/types";

export type Subject = Tables<"subjects">;
export type SubjectInsert = TablesInsert<"subjects">;
export type SubjectUpdate = TablesUpdate<"subjects">;

export function useSubjects() {
  const { user } = useAuth();
  const { data: activeExam } = useActiveExam();

  return useQuery({
    queryKey: ["subjects", user?.id, activeExam?.id],
    queryFn: async () => {
      if (!user || !activeExam) return [];
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("user_id", user.id)
        .eq("exam_id", activeExam.id)
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data as Subject[];
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
      
      const { data: subjects, error: subjectsError } = await supabase
        .from("subjects")
        .select("*")
        .eq("user_id", user.id)
        .eq("exam_id", activeExam.id)
        .order("name", { ascending: true });
      
      if (subjectsError) throw subjectsError;

      const { data: topics, error: topicsError } = await supabase
        .from("topics")
        .select("*")
        .eq("user_id", user.id)
        .order("priority_score", { ascending: false });
      
      if (topicsError) throw topicsError;

      // Join topics to subjects
      return subjects.map(subject => ({
        ...subject,
        topics: topics.filter(t => t.subject_id === subject.id),
      }));
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

      const { data, error } = await supabase
        .from("subjects")
        .insert({ ...subject, user_id: user.id, exam_id: activeExam.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
    mutationFn: async ({ id, ...updates }: SubjectUpdate & { id: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("subjects")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      
      // First delete all topics under this subject
      await supabase
        .from("topics")
        .delete()
        .eq("subject_id", id)
        .eq("user_id", user.id);

      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      
      if (error) throw error;
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
