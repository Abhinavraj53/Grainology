/*
  # Add Trade Terms and Logistics Terms to Offers

  1. Changes to `offers` table
    - Add `min_trade_quantity_mt` (numeric) - Minimum quantity required for trade
    - Add `payment_terms` (text) - Payment method: 'Advance', 'T+3 Days', 'Against Delivery'
    - Add `offer_validity_days` (integer) - Number of days the offer is valid
    - Add `delivery_location` (text) - Specific delivery location details
    - Add `logistics_option` (text) - Who arranges logistics: 'Seller Arranged', 'Buyer Arranged', 'Platform Arranged'
    - Add `delivery_timeline_days` (integer) - Expected delivery time in days

  2. Changes to `orders` table
    - Add new status option: 'Approved - Awaiting Logistics'
    - Update CHECK constraint to include new status

  3. Important Notes
    - All new fields have sensible defaults for backward compatibility
    - Trade terms help establish clear expectations for transactions
    - Logistics terms clarify delivery responsibilities
*/

-- Add trade terms columns to offers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'min_trade_quantity_mt'
  ) THEN
    ALTER TABLE offers ADD COLUMN min_trade_quantity_mt numeric DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'payment_terms'
  ) THEN
    ALTER TABLE offers ADD COLUMN payment_terms text DEFAULT 'Against Delivery' CHECK (payment_terms IN ('Advance', 'T+3 Days', 'Against Delivery'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'offer_validity_days'
  ) THEN
    ALTER TABLE offers ADD COLUMN offer_validity_days integer DEFAULT 30;
  END IF;
END $$;

-- Add logistics terms columns to offers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'delivery_location'
  ) THEN
    ALTER TABLE offers ADD COLUMN delivery_location text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'logistics_option'
  ) THEN
    ALTER TABLE offers ADD COLUMN logistics_option text DEFAULT 'Buyer Arranged' CHECK (logistics_option IN ('Seller Arranged', 'Buyer Arranged', 'Platform Arranged'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'offers' AND column_name = 'delivery_timeline_days'
  ) THEN
    ALTER TABLE offers ADD COLUMN delivery_timeline_days integer DEFAULT 7;
  END IF;
END $$;

-- Update orders table status constraint to include 'Approved - Awaiting Logistics'
DO $$
BEGIN
  -- Drop the old constraint
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
  
  -- Add the new constraint with the additional status
  ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('Pending Approval', 'Approved', 'Approved - Awaiting Logistics', 'Completed', 'Rejected'));
END $$;
