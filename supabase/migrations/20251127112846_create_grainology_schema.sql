/*
  # Grainology Digital Agri-Marketplace Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `name` (text)
      - `role` (text, 'admin', 'farmer', 'trader')
      - `created_at` (timestamptz)
    
    - `quality_parameters`
      - `id` (uuid, primary key)
      - `commodity` (text, 'Paddy', 'Maize', 'Wheat')
      - `param_name` (text, e.g., 'Moisture', 'Foreign Matter')
      - `unit` (text, e.g., '%', 'Count')
      - `standard` (text, defines MAX/MIN range)
      - `remarks` (text, deduction notes)
    
    - `offers`
      - `id` (uuid, primary key)
      - `seller_id` (uuid, references profiles)
      - `commodity` (text)
      - `variety` (text)
      - `quantity_mt` (numeric, available stock in Metric Tons)
      - `price_per_quintal` (numeric, price in ₹)
      - `location` (text)
      - `quality_report` (jsonb, stores quality metrics)
      - `status` (text, 'Active', 'Sold', 'Inactive')
      - `created_at` (timestamptz)
    
    - `orders`
      - `id` (uuid, primary key)
      - `offer_id` (uuid, references offers)
      - `buyer_id` (uuid, references profiles)
      - `quantity_mt` (numeric, purchased amount)
      - `status` (text, 'Pending Approval', 'Approved', 'Completed', 'Rejected')
      - `final_price_per_quintal` (numeric)
      - `deduction_amount` (numeric, default 0)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add admin-only policies for order management
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'farmer', 'trader')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create quality_parameters table
CREATE TABLE IF NOT EXISTS quality_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity text NOT NULL,
  param_name text NOT NULL,
  unit text NOT NULL,
  standard text NOT NULL,
  remarks text DEFAULT ''
);

ALTER TABLE quality_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read quality parameters"
  ON quality_parameters FOR SELECT
  TO authenticated
  USING (true);

-- Create offers table
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  commodity text NOT NULL,
  variety text NOT NULL,
  quantity_mt numeric NOT NULL,
  price_per_quintal numeric NOT NULL,
  location text NOT NULL,
  quality_report jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'Active' CHECK (status IN ('Active', 'Sold', 'Inactive')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active offers"
  ON offers FOR SELECT
  TO authenticated
  USING (status = 'Active' OR seller_id = auth.uid());

CREATE POLICY "Farmers can create offers"
  ON offers FOR INSERT
  TO authenticated
  WITH CHECK (
    seller_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'farmer')
  );

CREATE POLICY "Sellers can update own offers"
  ON offers FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quantity_mt numeric NOT NULL,
  status text DEFAULT 'Pending Approval' CHECK (status IN ('Pending Approval', 'Approved', 'Completed', 'Rejected')),
  final_price_per_quintal numeric NOT NULL,
  deduction_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    buyer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM offers WHERE offers.id = orders.offer_id AND offers.seller_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Traders can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    buyer_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'trader')
  );

CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Insert sample quality parameters
INSERT INTO quality_parameters (commodity, param_name, unit, standard, remarks) VALUES
('Paddy', 'Moisture', '%', 'MAX 16%-17%', 'Deduction for excess moisture'),
('Paddy', 'Foreign Matter', '%', 'MAX 1%-2%', 'Deduction for impurities'),
('Paddy', 'Broken Grains', '%', 'MAX 5%-10%', 'Affects milling quality'),
('Paddy', 'Damaged Grains', '%', 'MAX 2%-3%', 'Heat or pest damage'),
('Maize', 'Moisture', '%', 'MAX 14%-15%', 'Storage quality critical'),
('Maize', 'Foreign Matter', '%', 'MAX 1%-2%', 'Reduces feed quality'),
('Maize', 'Broken Kernels', '%', 'MAX 3%-5%', 'Processing loss'),
('Maize', 'Discolored Kernels', '%', 'MAX 2%-3%', 'Quality indicator'),
('Wheat', 'Moisture', '%', 'MAX 12%-13%', 'Milling moisture'),
('Wheat', 'Foreign Matter', '%', 'MAX 1%-2%', 'Cleanliness standard'),
('Wheat', 'Shriveled Grains', '%', 'MAX 3%-5%', 'Weight and quality'),
('Wheat', 'Damaged Grains', '%', 'MAX 2%-3%', 'Pest or weather damage')
ON CONFLICT DO NOTHING;