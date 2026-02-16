-- Create youtube_cache table for caching video recommendations (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.youtube_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  videos JSONB NOT NULL DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(topic_id)
);

-- Enable RLS on youtube_cache
ALTER TABLE public.youtube_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies for youtube_cache (use IF NOT EXISTS pattern via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'youtube_cache' AND policyname = 'Users can view their own youtube cache'
  ) THEN
    CREATE POLICY "Users can view their own youtube cache"
    ON public.youtube_cache FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'youtube_cache' AND policyname = 'Users can insert their own youtube cache'
  ) THEN
    CREATE POLICY "Users can insert their own youtube cache"
    ON public.youtube_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'youtube_cache' AND policyname = 'Users can update their own youtube cache'
  ) THEN
    CREATE POLICY "Users can update their own youtube cache"
    ON public.youtube_cache FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'youtube_cache' AND policyname = 'Users can delete their own youtube cache'
  ) THEN
    CREATE POLICY "Users can delete their own youtube cache"
    ON public.youtube_cache FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;