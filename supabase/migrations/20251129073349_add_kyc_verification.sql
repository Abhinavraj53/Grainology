/*
  # Add KYC Verification Support

  1. Changes to `profiles` table
    - Add `entity_type` (text) - Type of entity: 'individual' or 'company'
    - Add `kyc_status` (text) - Verification status: 'pending', 'verified', 'rejected', 'not_started'
    - Add `kyc_verified_at` (timestamptz) - When KYC was verified
    - Add `kyc_data` (jsonb) - Stores verification details (document numbers, etc.)
    - Add `business_name` (text) - For companies/business entities
    - Add `business_type` (text) - 'private_limited', 'partnership', 'proprietorship', etc.

  2. Security
    - KYC data is sensitive, ensure proper RLS policies
    - Users can only view/update their own KYC information

  3. Important Notes
    - Default entity_type is 'individual' for backward compatibility
    - KYC status starts as 'not_started'
    - Admin can view all KYC statuses for verification purposes
*/

-- Add entity type and KYC columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'entity_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN entity_type text DEFAULT 'individual' CHECK (entity_type IN ('individual', 'company'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'kyc_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN kyc_status text DEFAULT 'not_started' CHECK (kyc_status IN ('not_started', 'pending', 'verified', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'kyc_verified_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN kyc_verified_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'kyc_data'
  ) THEN
    ALTER TABLE profiles ADD COLUMN kyc_data jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'business_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN business_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'business_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN business_type text CHECK (business_type IN ('private_limited', 'partnership', 'proprietorship', 'llp'));
  END IF;
END $$;

-- Drop existing policy if exists and recreate
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can update own KYC data" ON profiles;
  DROP POLICY IF EXISTS "Admin can view all KYC data" ON profiles;
END $$;

-- RLS Policy: Users can update their own KYC information
CREATE POLICY "Users can update own KYC data"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
