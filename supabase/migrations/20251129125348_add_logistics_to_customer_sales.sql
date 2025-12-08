/*
  # Add Logistics Provider to Customer Sales

  1. Changes
    - Add `logistics_provider_id` column to customer_commodity_sales
    - Add foreign key relationship to logistics_providers
    - Add index for faster queries
  
  2. Security
    - No RLS changes needed (inherits from table policies)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_commodity_sales' AND column_name = 'logistics_provider_id'
  ) THEN
    ALTER TABLE customer_commodity_sales
    ADD COLUMN logistics_provider_id uuid REFERENCES logistics_providers(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customer_commodity_sales_logistics_provider_id
ON customer_commodity_sales(logistics_provider_id);
