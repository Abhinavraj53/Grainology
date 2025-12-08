/*
  # Add email field to profiles table

  1. Changes
    - Add email column to profiles table
    - Populate existing profiles with email from auth.users
  
  2. Security
    - Email is read-only from user's perspective
    - Only populated on profile creation via trigger
*/

-- Add email column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text;
  END IF;
END $$;

-- Update existing profiles with email from auth.users
UPDATE profiles
SET email = auth.users.email
FROM auth.users
WHERE profiles.id = auth.users.id
AND profiles.email IS NULL;

-- Create or replace function to automatically set email on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_email()
RETURNS trigger AS $$
BEGIN
  NEW.email := (SELECT email FROM auth.users WHERE id = NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to set email on insert if not already set
DROP TRIGGER IF EXISTS set_profile_email ON profiles;
CREATE TRIGGER set_profile_email
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.email IS NULL)
  EXECUTE FUNCTION handle_new_user_email();
