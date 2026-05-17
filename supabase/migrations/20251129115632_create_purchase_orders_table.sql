/*
  # Create Purchase Orders Table

  1. New Tables
    - `purchase_orders`
      - `id` (uuid, primary key)
      - `buyer_id` (uuid, references profiles)
      - `customer_name` (text) - Name of the customer/buyer entity
      - `sauda_confirmation_date` (date) - Date of Sauda confirmation
      - `commodity` (text) - Selected commodity
      - `variety` (text) - Selected variety from variety master
      - `unit_of_measurement` (text) - MT/Quintal/KG
      - `rate_per_unit` (numeric) - Price per unit
      - `quantity` (numeric) - Quantity in selected unit
      - `remarks` (text) - Additional remarks/notes
      - `payment_terms` (text) - Payment terms provided by customer
      - `delivery_period` (text) - Delivery period provided by customer
      - `quality_parameters` (jsonb) - Quality parameters provided by customer
      - `status` (text) - Status of the purchase order
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `purchase_orders` table
    - Add policies for buyers to create and view their own purchase orders
    - Add policies for admins to view and manage all purchase orders
*/

CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid REFERENCES profiles(id) NOT NULL,
  customer_name text NOT NULL,
  sauda_confirmation_date date NOT NULL,
  commodity text NOT NULL,
  variety text NOT NULL,
  unit_of_measurement text NOT NULL DEFAULT 'MT' CHECK (unit_of_measurement IN ('MT', 'Quintal', 'KG')),
  rate_per_unit numeric NOT NULL,
  quantity numeric NOT NULL,
  remarks text DEFAULT '',
  payment_terms text NOT NULL,
  delivery_period text NOT NULL,
  quality_parameters jsonb DEFAULT '{}',
  status text DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Confirmed', 'In Progress', 'Completed', 'Cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- Policy for buyers to view their own purchase orders
CREATE POLICY "Buyers can view own purchase orders"
  ON purchase_orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

-- Policy for buyers to create purchase orders
CREATE POLICY "Buyers can create purchase orders"
  ON purchase_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- Policy for buyers to update their own purchase orders
CREATE POLICY "Buyers can update own purchase orders"
  ON purchase_orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- Policy for admins to view all purchase orders
CREATE POLICY "Admins can view all purchase orders"
  ON purchase_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy for admins to update all purchase orders
CREATE POLICY "Admins can update all purchase orders"
  ON purchase_orders
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_purchase_orders_buyer_id ON purchase_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_commodity ON purchase_orders(commodity);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_purchase_orders_updated_at'
  ) THEN
    CREATE TRIGGER update_purchase_orders_updated_at
      BEFORE UPDATE ON purchase_orders
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
