export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      daily_progress: {
        Row: {
          completed_minutes: number | null;
          created_at: string;
          date: string;
          id: string;
          notes: string | null;
          planned_minutes: number | null;
          sessions_completed: number | null;
          sessions_planned: number | null;
          streak_maintained: boolean | null;
          user_id: string;
        };
        Insert: {
          completed_minutes?: number | null;
          created_at?: string;
          date: string;
          id?: string;
          notes?: string | null;
          planned_minutes?: number | null;
          sessions_completed?: number | null;
          sessions_planned?: number | null;
          streak_maintained?: boolean | null;
          user_id: string;
        };
        Update: {
          completed_minutes?: number | null;
          created_at?: string;
          date?: string;
          id?: string;
          notes?: string | null;
          planned_minutes?: number | null;
          sessions_completed?: number | null;
          sessions_planned?: number | null;
          streak_maintained?: boolean | null;
          user_id?: string;
        };
        Relationships: [];
      };
      exams: {
        Row: {
          created_at: string;
          description: string | null;
          exam_date: string;
          id: string;
          is_active: boolean | null;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          exam_date: string;
          id?: string;
          is_active?: boolean | null;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          exam_date?: string;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          current_streak: number | null;
          daily_study_hours: number | null;
          full_name: string | null;
          id: string;
          longest_streak: number | null;
          pomodoro_break_minutes: number | null;
          pomodoro_work_minutes: number | null;
          preferred_study_slot: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          current_streak?: number | null;
          daily_study_hours?: number | null;
          full_name?: string | null;
          id?: string;
          longest_streak?: number | null;
          pomodoro_break_minutes?: number | null;
          pomodoro_work_minutes?: number | null;
          preferred_study_slot?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          current_streak?: number | null;
          daily_study_hours?: number | null;
          full_name?: string | null;
          id?: string;
          longest_streak?: number | null;
          pomodoro_break_minutes?: number | null;
          pomodoro_work_minutes?: number | null;
          preferred_study_slot?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      study_sessions: {
        Row: {
          actual_duration_minutes: number | null;
          completed_at: string | null;
          created_at: string;
          id: string;
          notes: string | null;
          planned_duration_minutes: number;
          pomodoros_completed: number | null;
          scheduled_at: string;
          session_type: string | null;
          started_at: string | null;
          status: string | null;
          topic_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          actual_duration_minutes?: number | null;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          planned_duration_minutes: number;
          pomodoros_completed?: number | null;
          scheduled_at: string;
          session_type?: string | null;
          started_at?: string | null;
          status?: string | null;
          topic_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          actual_duration_minutes?: number | null;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          planned_duration_minutes?: number;
          pomodoros_completed?: number | null;
          scheduled_at?: string;
          session_type?: string | null;
          started_at?: string | null;
          status?: string | null;
          topic_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_sessions_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          }
        ];
      };
      subjects: {
        Row: {
          color: string | null;
          created_at: string;
          exam_id: string;
          id: string;
          name: string;
          strength: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          exam_id: string;
          id?: string;
          name: string;
          strength?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          exam_id?: string;
          id?: string;
          name?: string;
          strength?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subjects_exam_id_fkey";
            columns: ["exam_id"];
            isOneToOne: false;
            referencedRelation: "exams";
            referencedColumns: ["id"];
          }
        ];
      };
      revision_history: {
        Row: {
          completed: boolean;
          confidence_after: number;
          confidence_before: number;
          created_at: string;
          id: string;
          notes: string | null;
          revision_type: string | null;
          session_id: string | null;
          skipped: boolean;
          topic_id: string;
          user_id: string;
        };
        Insert: {
          completed: boolean;
          confidence_after: number;
          confidence_before: number;
          created_at?: string;
          id?: string;
          notes?: string | null;
          revision_type?: string | null;
          session_id?: string | null;
          skipped: boolean;
          topic_id: string;
          user_id: string;
        };
        Update: {
          completed?: boolean;
          confidence_after?: number;
          confidence_before?: number;
          created_at?: string;
          id?: string;
          notes?: string | null;
          revision_type?: string | null;
          session_id?: string | null;
          skipped?: boolean;
          topic_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "revision_history_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          }
        ];
      };
      youtube_cache: {
        Row: {
          created_at: string;
          expires_at: string;
          fetched_at: string;
          id: string;
          search_query: string | null;
          topic_id: string;
          user_id: string;
          videos: Json;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          fetched_at: string;
          id?: string;
          search_query?: string | null;
          topic_id: string;
          user_id: string;
          videos: Json;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          fetched_at?: string;
          id?: string;
          search_query?: string | null;
          topic_id?: string;
          user_id?: string;
          videos?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "youtube_cache_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          }
        ];
      };
      topics: {
        Row: {
          completed_hours: number | null;
          confidence_level: number | null;
          created_at: string;
          estimated_hours: number | null;
          id: string;
          is_completed: boolean | null;
          last_revision_date: string | null;
          last_studied_at: string | null;
          name: string;
          next_revision_at: string | null;
          notes: string | null;
          priority_score: number | null;
          revision_confidence_delta: number | null;
          revision_count: number | null;
          subject_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_hours?: number | null;
          confidence_level?: number | null;
          created_at?: string;
          estimated_hours?: number | null;
          id?: string;
          is_completed?: boolean | null;
          last_revision_date?: string | null;
          last_studied_at?: string | null;
          name: string;
          next_revision_at?: string | null;
          notes?: string | null;
          priority_score?: number | null;
          revision_confidence_delta?: number | null;
          revision_count?: number | null;
          subject_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_hours?: number | null;
          confidence_level?: number | null;
          created_at?: string;
          estimated_hours?: number | null;
          id?: string;
          is_completed?: boolean | null;
          last_revision_date?: string | null;
          last_studied_at?: string | null;
          name?: string;
          next_revision_at?: string | null;
          notes?: string | null;
          priority_score?: number | null;
          revision_confidence_delta?: number | null;
          revision_count?: number | null;
          subject_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      weekly_reports: {
        Row: {
          confidence_changes: Json | null;
          created_at: string;
          exam_readiness: string | null;
          id: string;
          insights: string | null;
          sessions_completed: number | null;
          sessions_planned: number | null;
          subjects_studied: Json | null;
          total_completed_minutes: number | null;
          total_planned_minutes: number | null;
          user_id: string;
          week_end: string;
          week_start: string;
        };
        Insert: {
          confidence_changes?: Json | null;
          created_at?: string;
          exam_readiness?: string | null;
          id?: string;
          insights?: string | null;
          sessions_completed?: number | null;
          sessions_planned?: number | null;
          subjects_studied?: Json | null;
          total_completed_minutes?: number | null;
          total_planned_minutes?: number | null;
          user_id: string;
          week_end: string;
          week_start: string;
        };
        Update: {
          confidence_changes?: Json | null;
          created_at?: string;
          exam_readiness?: string | null;
          id?: string;
          insights?: string | null;
          sessions_completed?: number | null;
          sessions_planned?: number | null;
          subjects_studied?: Json | null;
          total_completed_minutes?: number | null;
          total_planned_minutes?: number | null;
          user_id?: string;
          week_end?: string;
          week_start?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
