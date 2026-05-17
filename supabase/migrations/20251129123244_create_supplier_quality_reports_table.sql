/*
  # Create Supplier Quality Reports Table

  1. New Tables
    - `supplier_quality_reports`
      - `id` (uuid, primary key)
      - `supply_id` (uuid, references supplier_commodity_supplies) - Link to supply record
      - `commodity` (text) - Commodity name
      - `quality_parameters` (jsonb) - Array of quality parameter measurements
      - `total_deduction` (numeric) - Total deduction amount calculated
      - `report_status` (text) - Status of the quality report
      - `notes` (text) - Additional notes
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Quality Parameters Structure (in jsonb):
    - s_no (integer)
    - parameter_name (text)
    - unit_of_measurement (text)
    - standard_quality (text) - Standard parameter range
    - actual_quality (text) - Actual value from WSP (highlighted in yellow)
    - remarks (text) - Acceptance/rejection remarks
    - deduction (numeric) - Deduction amount for this parameter
  
  3. Security
    - Enable RLS on `supplier_quality_reports` table
    - Add policies for admins to manage quality reports
*/

CREATE TABLE IF NOT EXISTS supplier_quality_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_id uuid REFERENCES supplier_commodity_supplies(id) ON DELETE CASCADE NOT NULL,
  commodity text NOT NULL,
  quality_parameters jsonb DEFAULT '[]'::jsonb,
  total_deduction numeric DEFAULT 0,
  report_status text DEFAULT 'Draft' CHECK (report_status IN ('Draft', 'Submitted', 'Approved', 'Rejected')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE supplier_quality_reports ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view all quality reports
CREATE POLICY "Admins can view all quality reports"
  ON supplier_quality_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy for admins to insert quality reports
CREATE POLICY "Admins can insert quality reports"
  ON supplier_quality_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy for admins to update quality reports
CREATE POLICY "Admins can update quality reports"
  ON supplier_quality_reports
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

-- Policy for admins to delete quality reports
CREATE POLICY "Admins can delete quality reports"
  ON supplier_quality_reports
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
CREATE INDEX IF NOT EXISTS idx_supplier_quality_reports_supply_id ON supplier_quality_reports(supply_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quality_reports_commodity ON supplier_quality_reports(commodity);
CREATE INDEX IF NOT EXISTS idx_supplier_quality_reports_status ON supplier_quality_reports(report_status);

-- Create updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_supplier_quality_reports_updated_at'
  ) THEN
    CREATE TRIGGER update_supplier_quality_reports_updated_at
      BEFORE UPDATE ON supplier_quality_reports
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
