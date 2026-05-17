/*
  # Create Quality Parameters Master Table

  1. New Tables
    - `quality_parameters_master`
      - `id` (uuid, primary key)
      - `commodity` (text) - Commodity name
      - `s_no` (integer) - Serial number
      - `parameter_name` (text) - Name of quality parameter
      - `unit_of_measurement` (text) - Unit (%, Count, etc.)
      - `standard_value` (text) - Standard quality parameter example
      - `remarks` (text) - Remarks for parameter
      - `is_active` (boolean) - Active status
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `quality_parameters_master` table
    - Add policies for all authenticated users to read
    - Add policies for admins to manage
*/

CREATE TABLE IF NOT EXISTS quality_parameters_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity text NOT NULL,
  s_no integer NOT NULL,
  parameter_name text NOT NULL,
  unit_of_measurement text NOT NULL,
  standard_value text NOT NULL,
  remarks text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quality_parameters_master ENABLE ROW LEVEL SECURITY;

-- Policy for all authenticated users to read quality parameters
CREATE POLICY "All users can view quality parameters"
  ON quality_parameters_master
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy for admins to insert quality parameters
CREATE POLICY "Admins can insert quality parameters"
  ON quality_parameters_master
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy for admins to update quality parameters
CREATE POLICY "Admins can update quality parameters"
  ON quality_parameters_master
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
CREATE INDEX IF NOT EXISTS idx_quality_parameters_commodity ON quality_parameters_master(commodity, s_no);

-- Insert default quality parameters for Paddy
INSERT INTO quality_parameters_master (commodity, s_no, parameter_name, unit_of_measurement, standard_value, remarks) VALUES
('Paddy', 1, 'Moisture', '%', 'MAX 16%-17%', 'Accept upto 16%, 1% deduction upto 17%, Above 17% - Reject'),
('Paddy', 2, 'Foreign Matter', '%', 'MAX 2%', ''),
('Paddy', 3, 'Dammage & Discolour', '%', 'MAX 6%-8%', 'Accept upto 6%, .5% deduction upto 7%, 1% deduction upto 8%, Above 8% - Reject'),
('Paddy', 4, 'Admixture', '%', 'MAX 1%-2%', ''),
('Paddy', 5, 'Green Paddy', '%', 'MAX 1%-2%', ''),
('Paddy', 6, 'Dead Paddy', '%', 'MAX 1%-2%', ''),
('Paddy', 7, 'Live Insect', 'Count', '0-5', 'Accept upto 5 pieces, Above 5 pieces - Reject')
ON CONFLICT DO NOTHING;

-- Insert default quality parameters for Wheat
INSERT INTO quality_parameters_master (commodity, s_no, parameter_name, unit_of_measurement, standard_value, remarks) VALUES
('Wheat', 1, 'Moisture', '%', 'MAX 12%', 'Accept upto 12%, 1% deduction above 12%, Above 14% - Reject'),
('Wheat', 2, 'Foreign Matter', '%', 'MAX 2%', ''),
('Wheat', 3, 'Damaged Grain', '%', 'MAX 4%', 'Accept upto 4%, 0.5% deduction above 4%, Above 6% - Reject'),
('Wheat', 4, 'Broken Grain', '%', 'MAX 4%', ''),
('Wheat', 5, 'Shrivelled Grain', '%', 'MAX 6%', ''),
('Wheat', 6, 'Weevilled Grain', '%', 'MAX 2%', ''),
('Wheat', 7, 'Live Insect', 'Count', '0-3', 'Accept upto 3 pieces, Above 3 pieces - Reject')
ON CONFLICT DO NOTHING;

-- Insert default quality parameters for Maize
INSERT INTO quality_parameters_master (commodity, s_no, parameter_name, unit_of_measurement, standard_value, remarks) VALUES
('Maize', 1, 'Moisture', '%', 'MAX 14%', 'Accept upto 14%, 1% deduction above 14%, Above 16% - Reject'),
('Maize', 2, 'Foreign Matter', '%', 'MAX 2%', ''),
('Maize', 3, 'Damaged Grain', '%', 'MAX 5%', 'Accept upto 5%, 0.5% deduction above 5%, Above 7% - Reject'),
('Maize', 4, 'Broken Grain', '%', 'MAX 3%', ''),
('Maize', 5, 'Discoloured Grain', '%', 'MAX 3%', ''),
('Maize', 6, 'Weevilled Grain', '%', 'MAX 2%', ''),
('Maize', 7, 'Live Insect', 'Count', '0-5', 'Accept upto 5 pieces, Above 5 pieces - Reject')
ON CONFLICT DO NOTHING;
