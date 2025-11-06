-- Add onboarding_complete column to user_settings table
ALTER TABLE user_settings ADD COLUMN onboarding_complete INTEGER DEFAULT 0 NOT NULL;