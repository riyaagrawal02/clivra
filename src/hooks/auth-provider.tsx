import { useEffect, useState, type ReactNode } from "react";
import { AuthContext } from "@/hooks/auth-context";
import { apiFetch, clearAuthToken, getAuthToken, setAuthToken } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(() => Boolean(getAuthToken()));

    useEffect(() => {
        const token = getAuthToken();
        if (!token) {
            return;
        }

        apiFetch<{ user: AuthUser }>("/auth/me")
            .then((data) => setUser(data.user))
            .catch(() => {
                clearAuthToken();
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const signInWithPassword = async (email: string, password: string) => {
        const data = await apiFetch<{ token: string; user: AuthUser }>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });

        setAuthToken(data.token);
        setUser(data.user);
    };

    const signUpWithPassword = async (email: string, password: string, fullName?: string) => {
        const data = await apiFetch<{ token: string; user: AuthUser }>("/auth/register", {
            method: "POST",
            body: JSON.stringify({ email, password, fullName }),
        });

        setAuthToken(data.token);
        setUser(data.user);
    };

    const signOut = async () => {
        clearAuthToken();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{ user, loading, signInWithPassword, signUpWithPassword, signOut }}
        >
            {children}
        </AuthContext.Provider>
    );
}
