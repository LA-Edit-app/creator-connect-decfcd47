-- Add notification preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS campaign_alerts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS weekly_reports BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS creator_updates BOOLEAN DEFAULT true;

-- Update existing profiles to have default notification preferences
UPDATE public.profiles 
SET 
  email_notifications = true,
  campaign_alerts = true,
  weekly_reports = false,
  creator_updates = true
WHERE email_notifications IS NULL 
   OR campaign_alerts IS NULL 
   OR weekly_reports IS NULL 
   OR creator_updates IS NULL;