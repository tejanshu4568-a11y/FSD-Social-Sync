-- =========================================================
-- Social Sync Pro (Broadcast) — Complete Supabase Schema
-- Dedicated to: LinkedIn and Instagram
-- Safe to run on clean databases or existing projects
-- =========================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  CREATE TYPE public.social_platform AS ENUM ('linkedin', 'instagram');
  CREATE TYPE public.post_status AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED');
  CREATE TYPE public.platform_result_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  display_name TEXT,
  access_token_ciphertext TEXT,
  connected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  target_platforms public.social_platform[] NOT NULL DEFAULT '{}',
  status public.post_status NOT NULL DEFAULT 'DRAFT',
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  status public.platform_result_status NOT NULL DEFAULT 'PENDING',
  external_id TEXT,
  error TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_platform public.social_platform,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own profiles" ON public.profiles;
CREATE POLICY "Users access own profiles" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users manage own accounts" ON public.connected_accounts;
CREATE POLICY "Users manage own accounts" ON public.connected_accounts FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own posts" ON public.posts;
CREATE POLICY "Users manage own posts" ON public.posts FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own results" ON public.post_results;
CREATE POLICY "Users manage own results" ON public.post_results FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own templates" ON public.post_templates;
CREATE POLICY "Users manage own templates" ON public.post_templates FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for media uploads (LinkedIn and Instagram Graph API require accessible URLs)
INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public read and authenticated media uploads" ON storage.objects;
CREATE POLICY "Allow public read and authenticated media uploads" ON storage.objects FOR ALL USING (bucket_id = 'post-media');
