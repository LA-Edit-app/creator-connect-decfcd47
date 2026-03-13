-- Local PostgreSQL Schema (without Supabase auth dependency)
-- This version works with standard PostgreSQL without Supabase

-- Create creators table
CREATE TABLE IF NOT EXISTS public.creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE,
  avatar TEXT,
  email TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create platforms table
CREATE TABLE IF NOT EXISTS public.platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for creator platforms
CREATE TABLE IF NOT EXISTS public.creator_platforms (
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES public.platforms(id) ON DELETE CASCADE,
  platform_handle TEXT,
  follower_count INTEGER,
  engagement_rate DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (creator_id, platform_id)
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  launch_date TEXT,
  activity TEXT,
  live_date TEXT,
  ag_price DECIMAL(10,2),
  creator_fee DECIMAL(10,2),
  shot TEXT,
  complete BOOLEAN DEFAULT FALSE,
  invoice_no TEXT,
  paid_date TEXT,
  includes_vat TEXT,
  currency TEXT DEFAULT 'GBP',
  brand_pos TEXT,
  payment_terms TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content_items table
CREATE TABLE IF NOT EXISTS public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'reel', 'story', 'carousel')),
  title TEXT NOT NULL,
  url TEXT,
  thumbnail TEXT,
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'published')),
  due_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table (simplified for local development without auth.users dependency)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  password_hash TEXT,  -- For local auth
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'agency')),
  agency_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_creators_handle ON public.creators(handle);
CREATE INDEX IF NOT EXISTS idx_campaigns_creator_id ON public.campaigns(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_brand ON public.campaigns(brand);
CREATE INDEX IF NOT EXISTS idx_content_items_campaign_id ON public.content_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_content_items_status ON public.content_items(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Enable Row Level Security (RLS) - optional for local dev
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create simple policies for local development (allow all for authenticated context)
-- Note: In local PostgreSQL without Supabase, RLS policies won't enforce unless you set up custom auth

CREATE POLICY "Allow all operations for local dev" ON public.creators FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for local dev" ON public.platforms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for local dev" ON public.creator_platforms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for local dev" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for local dev" ON public.content_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for local dev" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at on all tables
DROP TRIGGER IF EXISTS update_creators_updated_at ON public.creators;
CREATE TRIGGER update_creators_updated_at
  BEFORE UPDATE ON public.creators
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_content_items_updated_at ON public.content_items;
CREATE TRIGGER update_content_items_updated_at
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Local PostgreSQL schema created successfully!';
  RAISE NOTICE 'All tables, indexes, and triggers have been set up.';
END $$;
