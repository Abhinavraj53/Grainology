/*
  # Add Missing Features Schema

  1. Changes
    - Extend role enum to include: FPO, Corporate, Miller/Processor, Financers
    - Create mandi_prices table for market prices (Mandi Bhaav)
    - Create logistics_shipments table for logistics management
    - Create weather_data table for weather forecasts
    - Add quality_deductions table for tracking quality-based deductions
  
  2. Security
    - Enable RLS on all new tables
    - Add appropriate policies for each user role
*/

-- Drop existing role check constraint and add new roles
DO $$
BEGIN
  -- Add new role options to profiles
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'farmer', 'trader', 'fpo', 'corporate', 'miller', 'financer'));
END $$;

-- Create mandi_prices table for market prices
CREATE TABLE IF NOT EXISTS mandi_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL,
  district text NOT NULL,
  market text NOT NULL,
  commodity text NOT NULL,
  variety text,
  min_price numeric NOT NULL,
  max_price numeric NOT NULL,
  modal_price numeric NOT NULL,
  price_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create logistics_shipments table
CREATE TABLE IF NOT EXISTS logistics_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  transporter_name text,
  vehicle_number text,
  driver_name text,
  driver_contact text,
  pickup_location text NOT NULL,
  delivery_location text NOT NULL,
  pickup_date date,
  expected_delivery_date date,
  actual_delivery_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'cancelled')),
  tracking_updates jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create weather_data table
CREATE TABLE IF NOT EXISTS weather_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location text NOT NULL,
  latitude numeric,
  longitude numeric,
  date date NOT NULL,
  temperature_min numeric,
  temperature_max numeric,
  humidity numeric,
  rainfall numeric,
  wind_speed numeric,
  weather_condition text,
  forecast_data jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(location, date)
);

-- Create quality_deductions table
CREATE TABLE IF NOT EXISTS quality_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  parameter_id uuid REFERENCES quality_parameters(id),
  measured_value numeric NOT NULL,
  standard_value numeric NOT NULL,
  deduction_percentage numeric NOT NULL DEFAULT 0,
  deduction_amount numeric NOT NULL DEFAULT 0,
  remarks text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE mandi_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_deductions ENABLE ROW LEVEL SECURITY;

-- Policies for mandi_prices (public read, admin write)
CREATE POLICY "Anyone can read mandi prices"
  ON mandi_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert mandi prices"
  ON mandi_prices FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update mandi prices"
  ON mandi_prices FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policies for logistics_shipments
CREATE POLICY "Users can read own shipments"
  ON logistics_shipments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = logistics_shipments.order_id
      AND (o.buyer_id = auth.uid() OR o.offer_id IN (
        SELECT id FROM offers WHERE seller_id = auth.uid()
      ))
    ) OR is_admin()
  );

CREATE POLICY "Admins can manage all shipments"
  ON logistics_shipments FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policies for weather_data (public read, admin write)
CREATE POLICY "Anyone can read weather data"
  ON weather_data FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage weather data"
  ON weather_data FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policies for quality_deductions
CREATE POLICY "Users can read own quality deductions"
  ON quality_deductions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = quality_deductions.order_id
      AND (o.buyer_id = auth.uid() OR o.offer_id IN (
        SELECT id FROM offers WHERE seller_id = auth.uid()
      ))
    ) OR is_admin()
  );

CREATE POLICY "Admins can manage quality deductions"
  ON quality_deductions FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mandi_prices_commodity ON mandi_prices(commodity, price_date DESC);
CREATE INDEX IF NOT EXISTS idx_mandi_prices_location ON mandi_prices(state, district, market);
CREATE INDEX IF NOT EXISTS idx_logistics_order ON logistics_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_weather_location_date ON weather_data(location, date DESC);
CREATE INDEX IF NOT EXISTS idx_quality_deductions_order ON quality_deductions(order_id);
