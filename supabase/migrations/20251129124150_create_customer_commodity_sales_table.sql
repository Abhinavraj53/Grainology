/*
  # Create Customer Commodity Sales Table

  1. New Tables
    - `customer_commodity_sales`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references profiles) - Customer who purchases the commodity
      - `date` (date) - Sale date
      - `commodity` (text) - Commodity name
      - `variety` (text) - Variety name
      - `invoice_no` (text) - Invoice number (Editable)
      - `weight_slip_no` (text) - Weight slip number (RRY)
      - `bag_count` (integer) - Number of bags
      - `net_weight_mt` (numeric) - Net weight in MT
      - `rate_per_mt` (numeric) - Rate per MT
      - `gross_amount` (numeric) - Gross amount (Net MT x Rate)
      - `deduction_amount` (numeric) - Deduction amount (refer below report)
      - `net_amount` (numeric) - Net amount (Gross - Deduction)
      - `quality_report_ref` (text) - Quality report reference
      - `delivery_location` (text) - Address of delivery
      - `notes` (text) - Additional notes
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `customer_commodity_sales` table
    - Add policies for customers to view their own sales
    - Add policies for admins to manage all sales
*/

CREATE TABLE IF NOT EXISTS customer_commodity_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES profiles(id) NOT NULL,
  date date NOT NULL,
  commodity text NOT NULL,
  variety text NOT NULL,
  invoice_no text NOT NULL,
  weight_slip_no text NOT NULL,
  bag_count integer NOT NULL DEFAULT 0,
  net_weight_mt numeric NOT NULL DEFAULT 0,
  rate_per_mt numeric NOT NULL DEFAULT 0,
  gross_amount numeric GENERATED ALWAYS AS (net_weight_mt * rate_per_mt) STORED,
  deduction_amount numeric DEFAULT 0,
  net_amount numeric GENERATED ALWAYS AS (net_weight_mt * rate_per_mt - COALESCE(deduction_amount, 0)) STORED,
  quality_report_ref text DEFAULT '',
  delivery_location text NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE customer_commodity_sales ENABLE ROW LEVEL SECURITY;

-- Policy for customers to view their own sales
CREATE POLICY "Customers can view own sales"
  ON customer_commodity_sales
  FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

-- Policy for admins to view all sales
CREATE POLICY "Admins can view all sales"
  ON customer_commodity_sales
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy for admins to insert sales
CREATE POLICY "Admins can insert sales"
  ON customer_commodity_sales
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy for admins to update sales
CREATE POLICY "Admins can update sales"
  ON customer_commodity_sales
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

-- Policy for admins to delete sales
CREATE POLICY "Admins can delete sales"
  ON customer_commodity_sales
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
CREATE INDEX IF NOT EXISTS idx_customer_commodity_sales_customer_id ON customer_commodity_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_commodity_sales_date ON customer_commodity_sales(date);
CREATE INDEX IF NOT EXISTS idx_customer_commodity_sales_commodity ON customer_commodity_sales(commodity);
CREATE INDEX IF NOT EXISTS idx_customer_commodity_sales_invoice_no ON customer_commodity_sales(invoice_no);

-- Create updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_customer_commodity_sales_updated_at'
  ) THEN
    CREATE TRIGGER update_customer_commodity_sales_updated_at
      BEFORE UPDATE ON customer_commodity_sales
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
