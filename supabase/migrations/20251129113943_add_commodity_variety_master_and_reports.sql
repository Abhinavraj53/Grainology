/*
  # Add Commodity/Variety Master Data and Reporting Tables

  1. New Tables
    - `commodity_master` - Master list of commodities
    - `variety_master` - Master list of varieties for each commodity
    - `reports` - Generated reports storage
  
  2. Data
    - Populate commodity and variety master data
  
  3. Security
    - Enable RLS on all tables
    - Public read access for master data
    - Admin-only write access
*/

-- Create commodity_master table
CREATE TABLE IF NOT EXISTS commodity_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create variety_master table
CREATE TABLE IF NOT EXISTS variety_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_name text NOT NULL,
  variety_name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(commodity_name, variety_name)
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL CHECK (report_type IN ('supplier', 'vendor', 'order_tracking', 'transaction', 'performance', 'delivery_status')),
  report_title text NOT NULL,
  generated_by uuid REFERENCES profiles(id),
  report_data jsonb NOT NULL,
  date_from date,
  date_to date,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE commodity_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE variety_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policies for commodity_master
CREATE POLICY "Anyone can read commodity master"
  ON commodity_master FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage commodity master"
  ON commodity_master FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policies for variety_master
CREATE POLICY "Anyone can read variety master"
  ON variety_master FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage variety master"
  ON variety_master FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policies for reports
CREATE POLICY "Admins can read all reports"
  ON reports FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Insert commodity master data
INSERT INTO commodity_master (name, description, category) VALUES
('Paddy', 'Rice in husk form', 'Cereal'),
('Wheat', 'Wheat grain', 'Cereal'),
('Maize', 'Corn/Maize', 'Cereal')
ON CONFLICT (name) DO NOTHING;

-- Insert variety master data
INSERT INTO variety_master (commodity_name, variety_name, description) VALUES
('Paddy', 'Katarni', 'Aromatic short grain rice'),
('Paddy', 'Sonam', 'High yielding variety'),
('Paddy', 'Sarju 52', 'Popular variety in UP'),
('Paddy', 'Seema Mansoori', 'Long grain variety'),
('Paddy', 'Nati Mansoori', 'Traditional variety'),
('Paddy', 'Hybrid Long Grain', 'Hybrid long grain variety'),
('Paddy', 'Gutraj', 'Short grain variety'),
('Paddy', 'BB11', 'Bold grain variety'),
('Paddy', 'PR-126', 'Punjab variety'),
('Paddy', 'Basmati-1509', 'Premium basmati'),
('Paddy', 'BPT-5204', 'Popular in South India'),
('Wheat', 'Milling Quality', 'High quality milling wheat'),
('Wheat', 'PBW-343', 'Punjab wheat variety'),
('Wheat', 'HD-2967', 'High yielding variety'),
('Wheat', 'HD-3086', 'Disease resistant variety'),
('Maize', 'Feed Grade Yellow', 'Animal feed grade'),
('Maize', 'Hybrid', 'Hybrid maize'),
('Maize', 'Yellow', 'Yellow corn')
ON CONFLICT (commodity_name, variety_name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_variety_commodity ON variety_master(commodity_name);
CREATE INDEX IF NOT EXISTS idx_reports_type_date ON reports(report_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commodity_active ON commodity_master(is_active, name);
CREATE INDEX IF NOT EXISTS idx_variety_active ON variety_master(is_active, commodity_name, variety_name);
