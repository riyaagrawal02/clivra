import { createContext } from "react";
import type { AuthUser } from "@/types/auth";

export interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    signInWithPassword: (email: string, password: string) => Promise<void>;
    signUpWithPassword: (email: string, password: string, fullName?: string) => Promise<void>;
    signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
