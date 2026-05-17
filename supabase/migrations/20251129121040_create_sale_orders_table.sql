/*
  # Create Sale Orders Table

  1. New Tables
    - `sale_orders`
      - `id` (uuid, primary key)
      - `seller_id` (uuid, references profiles)
      - `commodity` (text) - Selected commodity
      - `variety` (text) - Selected variety
      - `quantity_mt` (numeric) - Quantity in MT
      - `rate_per_mt` (numeric) - Rate per MT
      - `supply_address` (text) - Address of supply location
      - `quality_parameters` (jsonb) - Quality parameters
      - `packaging_bag` (text) - Jute/Plastic Paper (PP)
      - `payment_terms` (text) - Payment terms (e.g., 3rd day)
      - `sauda_expiry_date` (date) - Sauda expiry date
      - `status` (text) - Status of the sale order
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `sale_orders` table
    - Add policies for sellers to create and view their own sale orders
    - Add policies for admins to view and manage all sale orders
*/

CREATE TABLE IF NOT EXISTS sale_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES profiles(id) NOT NULL,
  commodity text NOT NULL,
  variety text NOT NULL,
  quantity_mt numeric NOT NULL,
  rate_per_mt numeric NOT NULL,
  supply_address text NOT NULL,
  quality_parameters jsonb DEFAULT '{}',
  packaging_bag text NOT NULL DEFAULT 'Jute' CHECK (packaging_bag IN ('Jute', 'Plastic Paper (PP)')),
  payment_terms text NOT NULL,
  sauda_expiry_date date NOT NULL,
  status text DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'Expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sale_orders ENABLE ROW LEVEL SECURITY;

-- Policy for sellers to view their own sale orders
CREATE POLICY "Sellers can view own sale orders"
  ON sale_orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id);

-- Policy for sellers to create sale orders
CREATE POLICY "Sellers can create sale orders"
  ON sale_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

-- Policy for sellers to update their own sale orders
CREATE POLICY "Sellers can update own sale orders"
  ON sale_orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Policy for admins to view all sale orders
CREATE POLICY "Admins can view all sale orders"
  ON sale_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy for admins to update all sale orders
CREATE POLICY "Admins can update all sale orders"
  ON sale_orders
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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_sale_orders_seller_id ON sale_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_sale_orders_status ON sale_orders(status);
CREATE INDEX IF NOT EXISTS idx_sale_orders_commodity ON sale_orders(commodity);
CREATE INDEX IF NOT EXISTS idx_sale_orders_expiry_date ON sale_orders(sauda_expiry_date);

-- Create updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_sale_orders_updated_at'
  ) THEN
    CREATE TRIGGER update_sale_orders_updated_at
      BEFORE UPDATE ON sale_orders
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
