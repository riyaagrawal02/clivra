import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/superbase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesUpdate } from "@/integrations/superbase/types";

export type Profile = Tables<"profiles">;
export type ProfileUpdate = TablesUpdate<"profiles">;

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      if (!user) throw new Error("Not authenticated");

      // Try to update first
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("user_id", user.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert if doesn't exist
        const { data, error } = await supabase
          .from("profiles")
          .insert({ ...updates, user_id: user.id })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profile updated", description: "Your settings have been saved." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateStreak() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ increment }: { increment: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("current_streak, longest_streak")
        .eq("user_id", user.id)
        .single();

      const currentStreak = profile?.current_streak ?? 0;
      const longestStreak = profile?.longest_streak ?? 0;

      const newStreak = increment ? currentStreak + 1 : 0;
      const newLongest = Math.max(newStreak, longestStreak);

      const { data, error } = await supabase
        .from("profiles")
        .update({
          current_streak: newStreak,
          longest_streak: newLongest,
        })
        .eq("user_id", user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
