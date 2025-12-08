/*
  # Add Mobile Number, Language, and Address Fields

  1. Schema Changes
    - Add `mobile_number` to profiles (unique, indexed)
    - Add `preferred_language` to profiles
    - Add `address_line1` to profiles
    - Add `address_line2` to profiles (optional)
    - Add `district` to profiles
    - Add `state` to profiles
    - Add `country` to profiles (default 'India')
    - Add `pincode` to profiles
  
  2. Notes
    - Mobile number will be unique and can be used for login
    - Language selection for multi-lingual support
    - Address fields with dropdowns for standardization
    - All new fields are nullable to support existing users
*/

-- Add new columns to profiles table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'mobile_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN mobile_number text;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_mobile_number ON profiles(mobile_number) WHERE mobile_number IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferred_language text DEFAULT 'English';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'address_line1'
  ) THEN
    ALTER TABLE profiles ADD COLUMN address_line1 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'address_line2'
  ) THEN
    ALTER TABLE profiles ADD COLUMN address_line2 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'district'
  ) THEN
    ALTER TABLE profiles ADD COLUMN district text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'state'
  ) THEN
    ALTER TABLE profiles ADD COLUMN state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'country'
  ) THEN
    ALTER TABLE profiles ADD COLUMN country text DEFAULT 'India';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'pincode'
  ) THEN
    ALTER TABLE profiles ADD COLUMN pincode text;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_state_district ON profiles(state, district) WHERE state IS NOT NULL;
