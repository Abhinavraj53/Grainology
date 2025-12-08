/*
  # Add Admin Policies for Profiles

  1. Changes
    - Add SELECT policy for admins to view all profiles
    - Add UPDATE policy for admins to update all profiles (for KYC verification and role changes)
  
  2. Security
    - Only users with role 'admin' can view and update all profiles
    - Existing user policies remain unchanged
*/

-- Allow admins to view all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to update all profiles (for KYC verification and role management)
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
