-- Fix Stock Reservations Table
-- This script makes order_id nullable in stock_reservations table
-- Run this script to fix the NOT NULL constraint issue

-- ========================================
-- FIX STOCK RESERVATIONS TABLE
-- ========================================

-- Make order_id column nullable to allow reservations before order creation
ALTER TABLE stock_reservations ALTER COLUMN order_id DROP NOT NULL;

-- Verify the change
SELECT 
    column_name, 
    is_nullable, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'stock_reservations' 
AND column_name = 'order_id';

-- ========================================
-- CLEANUP ANY EXPIRED RESERVATIONS
-- ========================================

-- Clean up any existing expired reservations
UPDATE stock_reservations 
SET status = 'expired' 
WHERE status = 'active' AND expires_at < NOW();

-- Delete expired reservations to free up stock
DELETE FROM stock_reservations 
WHERE status = 'expired' AND expires_at < NOW();

-- ========================================
-- VERIFICATION
-- ========================================

-- Check current reservations
SELECT 
    reservation_id,
    item_id,
    order_id,
    quantity_reserved,
    status,
    expires_at,
    reserved_at
FROM stock_reservations 
ORDER BY reserved_at DESC;

-- Test the constraint is removed by trying to insert a test reservation
-- (This will be rolled back, just to test)
BEGIN;
INSERT INTO stock_reservations (item_id, order_id, quantity_reserved, expires_at, status) 
VALUES (1, NULL, 1, NOW() + INTERVAL '10 minutes', 'active');
ROLLBACK;

SELECT 'Stock reservations table fixed successfully!' as status;
