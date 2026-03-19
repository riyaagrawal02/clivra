export type Profile = {
  id: string;
  user_id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  preferred_study_slot?: string | null;
  daily_study_hours?: number | null;
  pomodoro_work_minutes?: number | null;
  pomodoro_break_minutes?: number | null;
  current_streak?: number | null;
  longest_streak?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type Exam = {
  id: string;
  user_id: string;
  name: string;
  exam_date: string;
  description?: string | null;
  is_active?: boolean | null;
  created_at?: string;
  updated_at?: string;
};

export type Subject = {
  id: string;
  user_id: string;
  exam_id: string;
  name: string;
  strength?: "weak" | "average" | "strong" | null;
  color?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Topic = {
  id: string;
  user_id: string;
  subject_id: string;
  name: string;
  confidence_level?: number | null;
  priority_score?: number | null;
  estimated_hours?: number | null;
  completed_hours?: number | null;
  last_studied_at?: string | null;
  next_revision_at?: string | null;
  revision_count?: number | null;
  is_completed?: boolean | null;
  notes?: string | null;
  last_revision_date?: string | null;
  revision_confidence_delta?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type StudySession = {
  id: string;
  user_id: string;
  topic_id: string;
  session_type?: string | null;
  planned_duration_minutes: number;
  actual_duration_minutes?: number | null;
  scheduled_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  status?: string | null;
  pomodoros_completed?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type DailyProgress = {
  id: string;
  user_id: string;
  date: string;
  planned_minutes?: number | null;
  completed_minutes?: number | null;
  sessions_planned?: number | null;
  sessions_completed?: number | null;
  streak_maintained?: boolean | null;
  notes?: string | null;
  created_at?: string;
};

export type RevisionHistory = {
  id: string;
  user_id: string;
  topic_id: string;
  session_id?: string | null;
  confidence_before: number;
  confidence_after: number;
  completed: boolean;
  skipped: boolean;
  revision_type?: string | null;
  notes?: string | null;
  created_at?: string;
};

export type YouTubeVideo = {
  id: string;
  title: string;
  channelName: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  viewCount: string;
  publishedAt: string;
};
