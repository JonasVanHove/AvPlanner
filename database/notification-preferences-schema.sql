-- Notification Preferences Schema for AvPlanner
-- Run this in your Supabase SQL Editor

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Push notification settings
  push_enabled BOOLEAN DEFAULT false,
  push_reminder_time TIME DEFAULT '18:00:00', -- Default 6 PM
  
  -- Email digest settings
  email_digest_enabled BOOLEAN DEFAULT false,
  email_digest_day INTEGER DEFAULT 1, -- 0 = Sunday, 1 = Monday, etc.
  email_digest_time TIME DEFAULT '09:00:00', -- Default 9 AM
  
  -- Microsoft Teams integration
  teams_enabled BOOLEAN DEFAULT false,
  teams_webhook_url TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one preference per user per team
  UNIQUE(user_id, team_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_team 
  ON notification_preferences(user_id, team_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_push_enabled 
  ON notification_preferences(push_enabled) 
  WHERE push_enabled = true;

CREATE INDEX IF NOT EXISTS idx_notification_preferences_digest_enabled 
  ON notification_preferences(email_digest_enabled) 
  WHERE email_digest_enabled = true;

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can create own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own notification preferences"
  ON notification_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trigger_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Table for storing scheduled digest emails (for tracking what was sent)
CREATE TABLE IF NOT EXISTS digest_email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  email_subject TEXT,
  meeting_suggestions JSONB, -- Store the suggestions that were sent
  status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
  error_message TEXT
);

-- Index for digest log
CREATE INDEX IF NOT EXISTS idx_digest_email_log_user_team 
  ON digest_email_log(user_id, team_id, sent_at DESC);

-- RLS for digest log
ALTER TABLE digest_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digest logs"
  ON digest_email_log FOR SELECT
  USING (auth.uid() = user_id);

-- Teams notification log
CREATE TABLE IF NOT EXISTS teams_notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  message_type TEXT, -- 'availability_reminder', 'weekly_summary', 'member_update'
  message_content JSONB,
  status TEXT DEFAULT 'sent', -- 'sent', 'failed'
  error_message TEXT
);

-- Index for Teams log
CREATE INDEX IF NOT EXISTS idx_teams_notification_log_team 
  ON teams_notification_log(team_id, sent_at DESC);

COMMENT ON TABLE notification_preferences IS 'Stores user notification preferences per team';
COMMENT ON TABLE digest_email_log IS 'Logs sent weekly digest emails for tracking';
COMMENT ON TABLE teams_notification_log IS 'Logs Microsoft Teams webhook notifications';
