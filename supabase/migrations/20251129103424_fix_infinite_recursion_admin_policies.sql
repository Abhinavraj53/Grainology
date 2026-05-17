/*
  # Fix Infinite Recursion in Admin Policies

  1. Changes
    - Drop the problematic admin policies that cause infinite recursion
    - Create new admin policies using a function that caches the role check
  
  2. Security
    - Admins can view and update all profiles without causing recursion
    - Regular users can still only access their own profiles
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create a function to check if user is admin (with security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create policies using the function
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = id) OR is_admin()
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = id) OR is_admin()
  )
  WITH CHECK (
    (auth.uid() = id) OR is_admin()
  );

-- Drop old user policies that conflict
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
