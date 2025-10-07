-- Email Preferences and Tracking System Migration
-- Created: 2025-08-28
-- Purpose: Add email preferences management and email send tracking

-- Create email_preferences table
CREATE TABLE IF NOT EXISTS email_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    weekly_progress_summaries BOOLEAN DEFAULT TRUE NOT NULL,
    meal_plan_updates BOOLEAN DEFAULT TRUE NOT NULL,
    recipe_recommendations BOOLEAN DEFAULT TRUE NOT NULL,
    system_notifications BOOLEAN DEFAULT TRUE NOT NULL,
    marketing_emails BOOLEAN DEFAULT FALSE NOT NULL,
    frequency TEXT DEFAULT 'weekly' NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create email_send_log table for tracking and analytics
CREATE TABLE IF NOT EXISTS email_send_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email_type VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'sent' NOT NULL,
    message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX email_preferences_user_id_idx ON email_preferences(user_id);
CREATE INDEX email_send_log_user_id_idx ON email_send_log(user_id);
CREATE INDEX email_send_log_email_type_idx ON email_send_log(email_type);
CREATE INDEX email_send_log_status_idx ON email_send_log(status);
CREATE INDEX email_send_log_sent_at_idx ON email_send_log(sent_at);
CREATE INDEX email_send_log_recipient_email_idx ON email_send_log(recipient_email);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_preferences_updated_at() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for email_preferences
CREATE TRIGGER email_preferences_updated_at
    BEFORE UPDATE ON email_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_email_preferences_updated_at();

-- Insert default email preferences for existing users
INSERT INTO email_preferences (
    user_id,
    weekly_progress_summaries,
    meal_plan_updates,
    recipe_recommendations,
    system_notifications,
    marketing_emails,
    frequency
)
SELECT 
    id,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    'weekly'
FROM users 
WHERE NOT EXISTS (
    SELECT 1 FROM email_preferences WHERE email_preferences.user_id = users.id
);

-- Add comments for documentation
COMMENT ON TABLE email_preferences IS 'Stores user preferences for email communications and notifications';
COMMENT ON COLUMN email_preferences.weekly_progress_summaries IS 'Enable/disable weekly progress summary emails';
COMMENT ON COLUMN email_preferences.meal_plan_updates IS 'Enable/disable meal plan update notifications';
COMMENT ON COLUMN email_preferences.recipe_recommendations IS 'Enable/disable recipe recommendation emails';
COMMENT ON COLUMN email_preferences.system_notifications IS 'Enable/disable system notification emails';
COMMENT ON COLUMN email_preferences.marketing_emails IS 'Enable/disable marketing emails';
COMMENT ON COLUMN email_preferences.frequency IS 'Email frequency preference: daily, weekly, or monthly';

COMMENT ON TABLE email_send_log IS 'Tracks all emails sent to users for analytics and debugging';
COMMENT ON COLUMN email_send_log.email_type IS 'Type of email sent (progress_summary, invitation, notification, etc.)';
COMMENT ON COLUMN email_send_log.status IS 'Delivery status (sent, failed, delivered, bounced)';
COMMENT ON COLUMN email_send_log.message_id IS 'External email service message ID for tracking';