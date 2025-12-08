/*
  # Create Logistics Providers Table

  1. New Tables
    - `logistics_providers`
      - `id` (uuid, primary key)
      - `company_name` (text) - Logistics company name
      - `contact_person` (text) - Contact person name
      - `mobile_number` (text) - Contact mobile number
      - `email` (text) - Contact email
      - `pickup_city` (text) - Pickup city location (e.g., Patna, Bihar)
      - `delivery_city` (text) - Delivery city location (e.g., Bharalpur, Bihar)
      - `service_areas` (text[]) - Array of service areas
      - `vehicle_types` (text[]) - Types of vehicles available
      - `rate_per_km` (numeric) - Rate per kilometer
      - `kyc_verified` (boolean) - KYC verification status
      - `kyc_documents` (jsonb) - KYC document information
      - `pan_number` (text) - PAN number
      - `gst_number` (text) - GST number
      - `address` (text) - Complete address
      - `is_active` (boolean) - Active status
      - `notes` (text) - Additional notes
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `logistics_providers` table
    - Add policies for authenticated users to view providers
    - Add policies for admins to manage providers
*/

CREATE TABLE IF NOT EXISTS logistics_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_person text NOT NULL,
  mobile_number text NOT NULL,
  email text,
  pickup_city text NOT NULL,
  delivery_city text NOT NULL,
  service_areas text[] DEFAULT '{}',
  vehicle_types text[] DEFAULT ARRAY['Truck', 'Mini Truck', 'Tempo'],
  rate_per_km numeric DEFAULT 0,
  kyc_verified boolean DEFAULT false,
  kyc_documents jsonb DEFAULT '{}',
  pan_number text,
  gst_number text,
  address text NOT NULL,
  is_active boolean DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE logistics_providers ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view active providers
CREATE POLICY "Authenticated users can view active logistics providers"
  ON logistics_providers
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy for admins to view all providers
CREATE POLICY "Admins can view all logistics providers"
  ON logistics_providers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy for admins to insert providers
CREATE POLICY "Admins can insert logistics providers"
  ON logistics_providers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy for admins to update providers
CREATE POLICY "Admins can update logistics providers"
  ON logistics_providers
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

-- Policy for admins to delete providers
CREATE POLICY "Admins can delete logistics providers"
  ON logistics_providers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_logistics_providers_pickup_city ON logistics_providers(pickup_city);
CREATE INDEX IF NOT EXISTS idx_logistics_providers_delivery_city ON logistics_providers(delivery_city);
CREATE INDEX IF NOT EXISTS idx_logistics_providers_kyc_verified ON logistics_providers(kyc_verified);
CREATE INDEX IF NOT EXISTS idx_logistics_providers_is_active ON logistics_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_logistics_providers_company_name ON logistics_providers(company_name);

-- Create updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_logistics_providers_updated_at'
  ) THEN
    CREATE TRIGGER update_logistics_providers_updated_at
      BEFORE UPDATE ON logistics_providers
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Insert sample logistics providers
INSERT INTO logistics_providers (
  company_name,
  contact_person,
  mobile_number,
  email,
  pickup_city,
  delivery_city,
  service_areas,
  vehicle_types,
  rate_per_km,
  kyc_verified,
  pan_number,
  gst_number,
  address,
  is_active
) VALUES
(
  'Bihar Transport Services',
  'Rajesh Kumar',
  '+91 9876543210',
  'rajesh@bihartransport.com',
  'Patna, Bihar',
  'Bharalpur, Bihar',
  ARRAY['Patna', 'Bharalpur', 'Motihari', 'Muzaffarpur'],
  ARRAY['Truck', 'Mini Truck', 'Tempo'],
  15.50,
  true,
  'ABCDE1234F',
  '10ABCDE1234F1Z5',
  'Transport Nagar, Patna, Bihar - 800001',
  true
),
(
  'Express Logistics Bihar',
  'Suresh Singh',
  '+91 9876543211',
  'suresh@expresslogistics.com',
  'Patna, Bihar',
  'Bharalpur, Bihar',
  ARRAY['Patna', 'Bharalpur', 'Gaya', 'Bhagalpur'],
  ARRAY['Truck', 'Container'],
  16.00,
  true,
  'FGHIJ5678K',
  '10FGHIJ5678K1Z5',
  'Industrial Area, Patna, Bihar - 800002',
  true
),
(
  'Fast Track Transport',
  'Amit Sharma',
  '+91 9876543212',
  'amit@fasttrack.com',
  'Motihari, Bihar',
  'Patna, Bihar',
  ARRAY['Motihari', 'Patna', 'Raxaul'],
  ARRAY['Mini Truck', 'Tempo'],
  14.00,
  true,
  'LMNOP9012Q',
  '10LMNOP9012Q1Z5',
  'Main Road, Motihari, Bihar - 845401',
  true
);
