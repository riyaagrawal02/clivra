import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import type { Profile } from "@/types/backend";

export type ProfileUpdate = Partial<Omit<Profile, "id" | "user_id" | "created_at" | "updated_at">>;

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const data = await apiFetch<{ profile: Profile | null }>("/profile");
      return data.profile ?? null;
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
      const data = await apiFetch<{ profile: Profile }>("/profile", {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      return data.profile;
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
      const data = await apiFetch<{ profile: Profile }>("/profile/streak", {
        method: "POST",
        body: JSON.stringify({ increment }),
      });
      return data.profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
