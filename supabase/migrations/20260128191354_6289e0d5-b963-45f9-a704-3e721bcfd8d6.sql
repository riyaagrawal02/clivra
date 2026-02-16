-- Clivra Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  preferred_study_slot TEXT DEFAULT 'morning' CHECK (preferred_study_slot IN ('morning', 'afternoon', 'evening', 'night')),
  daily_study_hours NUMERIC(3,1) DEFAULT 3.0,
  pomodoro_work_minutes INTEGER DEFAULT 25,
  pomodoro_break_minutes INTEGER DEFAULT 5,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Exams table
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  strength TEXT DEFAULT 'average' CHECK (strength IN ('weak', 'average', 'strong')),
  color TEXT DEFAULT '#0d9488',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Topics table
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  confidence_level INTEGER DEFAULT 1 CHECK (confidence_level >= 1 AND confidence_level <= 5),
  priority_score INTEGER DEFAULT 50 CHECK (priority_score >= 0 AND priority_score <= 100),
  estimated_hours NUMERIC(4,1) DEFAULT 1.0,
  completed_hours NUMERIC(4,1) DEFAULT 0.0,
  last_studied_at TIMESTAMPTZ,
  next_revision_at TIMESTAMPTZ,
  revision_count INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Study sessions table
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  session_type TEXT DEFAULT 'learning' CHECK (session_type IN ('learning', 'revision', 'recall', 'practice')),
  planned_duration_minutes INTEGER NOT NULL,
  actual_duration_minutes INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'missed', 'skipped')),
  pomodoros_completed INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Daily progress table
CREATE TABLE public.daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  planned_minutes INTEGER DEFAULT 0,
  completed_minutes INTEGER DEFAULT 0,
  sessions_planned INTEGER DEFAULT 0,
  sessions_completed INTEGER DEFAULT 0,
  streak_maintained BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, date)
);

-- Weekly reports table
CREATE TABLE public.weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_planned_minutes INTEGER DEFAULT 0,
  total_completed_minutes INTEGER DEFAULT 0,
  sessions_planned INTEGER DEFAULT 0,
  sessions_completed INTEGER DEFAULT 0,
  subjects_studied JSONB DEFAULT '[]',
  confidence_changes JSONB DEFAULT '{}',
  exam_readiness TEXT DEFAULT 'not_ready' CHECK (exam_readiness IN ('not_ready', 'improving', 'almost_ready', 'exam_ready')),
  insights TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, week_start)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for exams
CREATE POLICY "Users can view their own exams" ON public.exams
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own exams" ON public.exams
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own exams" ON public.exams
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own exams" ON public.exams
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for subjects
CREATE POLICY "Users can view their own subjects" ON public.subjects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subjects" ON public.subjects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subjects" ON public.subjects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subjects" ON public.subjects
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for topics
CREATE POLICY "Users can view their own topics" ON public.topics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own topics" ON public.topics
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own topics" ON public.topics
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own topics" ON public.topics
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for study_sessions
CREATE POLICY "Users can view their own study sessions" ON public.study_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own study sessions" ON public.study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own study sessions" ON public.study_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own study sessions" ON public.study_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for daily_progress
CREATE POLICY "Users can view their own daily progress" ON public.daily_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own daily progress" ON public.daily_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own daily progress" ON public.daily_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for weekly_reports
CREATE POLICY "Users can view their own weekly reports" ON public.weekly_reports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own weekly reports" ON public.weekly_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own weekly reports" ON public.weekly_reports
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_study_sessions_updated_at BEFORE UPDATE ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for auto-creating profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();