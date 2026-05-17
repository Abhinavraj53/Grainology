/*
  # Create Supplier Commodity Supplies Table

  1. New Tables
    - `supplier_commodity_supplies`
      - `id` (uuid, primary key)
      - `supplier_id` (uuid, references profiles) - Supplier who provides the commodity
      - `date` (date) - Supply date
      - `commodity` (text) - Commodity name
      - `variety` (text) - Variety name
      - `invoice_no` (text) - Invoice number
      - `truck_number` (text) - Truck registration number
      - `weight_slip_no` (text) - Weight slip number (RRY)
      - `bag_count` (integer) - Number of bags
      - `net_weight_mt` (numeric) - Net weight in MT
      - `rate_per_mt` (numeric) - Rate auto-populated from purchase order
      - `gross_amount` (numeric) - Gross amount (Net MT x Rate)
      - `deduction_amount` (numeric) - Deduction amount (Refer below report)
      - `net_amount` (numeric) - Net amount (Gross - Deduction)
      - `quality_report_status` (text) - Quality report status
      - `delivery_location` (text) - Address of supply
      - `notes` (text) - Additional notes
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `supplier_commodity_supplies` table
    - Add policies for suppliers to view their own supplies
    - Add policies for admins to manage all supplies
*/

CREATE TABLE IF NOT EXISTS supplier_commodity_supplies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES profiles(id) NOT NULL,
  date date NOT NULL,
  commodity text NOT NULL,
  variety text NOT NULL,
  invoice_no text NOT NULL,
  truck_number text NOT NULL,
  weight_slip_no text NOT NULL,
  bag_count integer NOT NULL DEFAULT 0,
  net_weight_mt numeric NOT NULL DEFAULT 0,
  rate_per_mt numeric NOT NULL DEFAULT 0,
  gross_amount numeric GENERATED ALWAYS AS (net_weight_mt * rate_per_mt) STORED,
  deduction_amount numeric DEFAULT 0,
  net_amount numeric GENERATED ALWAYS AS (net_weight_mt * rate_per_mt - COALESCE(deduction_amount, 0)) STORED,
  quality_report_status text DEFAULT 'Pending' CHECK (quality_report_status IN ('Pending', 'Refer below report', 'Approved', 'Rejected')),
  delivery_location text NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE supplier_commodity_supplies ENABLE ROW LEVEL SECURITY;

-- Policy for suppliers to view their own supplies
CREATE POLICY "Suppliers can view own supplies"
  ON supplier_commodity_supplies
  FOR SELECT
  TO authenticated
  USING (auth.uid() = supplier_id);

-- Policy for admins to view all supplies
CREATE POLICY "Admins can view all supplies"
  ON supplier_commodity_supplies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy for admins to insert supplies
CREATE POLICY "Admins can insert supplies"
  ON supplier_commodity_supplies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy for admins to update supplies
CREATE POLICY "Admins can update supplies"
  ON supplier_commodity_supplies
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

-- Policy for admins to delete supplies
CREATE POLICY "Admins can delete supplies"
  ON supplier_commodity_supplies
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
CREATE INDEX IF NOT EXISTS idx_supplier_commodity_supplies_supplier_id ON supplier_commodity_supplies(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_commodity_supplies_date ON supplier_commodity_supplies(date);
CREATE INDEX IF NOT EXISTS idx_supplier_commodity_supplies_commodity ON supplier_commodity_supplies(commodity);
CREATE INDEX IF NOT EXISTS idx_supplier_commodity_supplies_invoice_no ON supplier_commodity_supplies(invoice_no);

-- Create updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_supplier_commodity_supplies_updated_at'
  ) THEN
    CREATE TRIGGER update_supplier_commodity_supplies_updated_at
      BEFORE UPDATE ON supplier_commodity_supplies
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
