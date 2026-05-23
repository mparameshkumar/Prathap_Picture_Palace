-- Complete Database Migration Script
-- This script updates the existing database with all new features
-- Run this script to update your database schema

-- ========================================
-- 1. USERS TABLE UPDATES
-- ========================================

-- Add new columns to users table for enhanced user management
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions INTEGER DEFAULT 1; -- 1=user, 2=admin

-- Update existing users to have proper permissions
UPDATE users SET permissions = 2 WHERE username = 'admin';
UPDATE users SET permissions = 1 WHERE username != 'admin' AND permissions IS NULL;

-- Add index for permissions column for performance
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users(permissions);

-- ========================================
-- 2. UPDATE SALE MODEL
-- ========================================

-- Add show_type column to existing sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS show_type VARCHAR(20) NOT NULL DEFAULT 'morning';

-- Create index for show_type
CREATE INDEX IF NOT EXISTS idx_sales_show_type ON sales(show_type);

-- ========================================
-- 3. USER ORDERS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS user_orders (
  order_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  canteen_id INTEGER NOT NULL REFERENCES canteens(canteen_id) ON DELETE CASCADE,
  seat_number VARCHAR(10) NOT NULL,
  show_time VARCHAR(20) NOT NULL, -- morning, matinee, first_show, second_show, special
  theatre_name VARCHAR(50) NOT NULL, -- Prathap Deluxe, Mini Prathap, Prathap Non-Delux
  order_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, confirmed, preparing, ready, completed, cancelled
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(20), -- cash, upi, card
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed, refunded
  special_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 4. ORDER ITEMS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES user_orders(order_id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES stock(item_id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_per_item NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  item_status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, preparing, ready
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 5. STOCK RESERVATIONS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS stock_reservations (
  reservation_id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES stock(item_id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES user_orders(order_id) ON DELETE CASCADE,
  quantity_reserved INTEGER NOT NULL,
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- active, confirmed, expired, cancelled
  UNIQUE(item_id, order_id)
);

-- ========================================
-- 6. SHOWS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS shows (
  show_id SERIAL PRIMARY KEY,
  theatre_name VARCHAR(50) NOT NULL,
  show_time VARCHAR(20) NOT NULL,
  show_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 7. INDEXES FOR PERFORMANCE
-- ========================================

-- User orders indexes
CREATE INDEX IF NOT EXISTS idx_user_orders_user_id ON user_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_orders_status ON user_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_user_orders_canteen_date ON user_orders(canteen_id, created_at);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item_id ON order_items(item_id);

-- Stock reservations indexes
CREATE INDEX IF NOT EXISTS idx_stock_reservations_item ON stock_reservations(item_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires ON stock_reservations(expires_at, status);

-- Shows indexes
CREATE INDEX IF NOT EXISTS idx_shows_date ON shows(show_date);
CREATE INDEX IF NOT EXISTS idx_shows_theatre_show ON shows(theatre_name, show_time);

-- ========================================
-- 8. SEED DATA
-- ========================================

-- Insert default shows for today
INSERT INTO shows (theatre_name, show_time, show_date) VALUES
('Prathap Deluxe', 'morning', CURRENT_DATE),
('Prathap Deluxe', 'matinee', CURRENT_DATE),
('Prathap Deluxe', 'first_show', CURRENT_DATE),
('Prathap Deluxe', 'second_show', CURRENT_DATE),
('Prathap Deluxe', 'special', CURRENT_DATE),
('Prathap Non-Delux', 'morning', CURRENT_DATE),
('Prathap Non-Delux', 'matinee', CURRENT_DATE),
('Prathap Non-Delux', 'first_show', CURRENT_DATE),
('Prathap Non-Delux', 'second_show', CURRENT_DATE),
('Prathap Non-Delux', 'special', CURRENT_DATE),
('Mini Prathap', 'morning', CURRENT_DATE),
('Mini Prathap', 'matinee', CURRENT_DATE),
('Mini Prathap', 'first_show', CURRENT_DATE),
('Mini Prathap', 'second_show', CURRENT_DATE),
('Mini Prathap', 'special', CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- ========================================
-- 9. CLEANUP AND MAINTENANCE
-- ========================================

-- Create a function to clean up expired reservations
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS void AS $$
BEGIN
    UPDATE stock_reservations 
    SET status = 'expired' 
    WHERE status = 'active' AND expires_at < NOW();
    
    -- Return stock to items that had expired reservations
    UPDATE stock 
    SET quantity = quantity + (
        SELECT COALESCE(SUM(quantity_reserved), 0) 
        FROM stock_reservations 
        WHERE item_id = stock.item_id 
        AND status = 'expired'
        AND expires_at < NOW()
    )
    WHERE item_id IN (
        SELECT item_id FROM stock_reservations 
        WHERE status = 'expired' 
        AND expires_at < NOW()
    );
    
    DELETE FROM stock_reservations 
    WHERE status = 'expired' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically clean up expired reservations every hour
-- This would require setting up a cron job or scheduled task
-- For now, manual cleanup can be run with: SELECT cleanup_expired_reservations();

-- ========================================
-- 10. VIEWS FOR COMMON QUERIES
-- ========================================

-- View for active orders with user details
CREATE OR REPLACE VIEW active_orders_view AS
SELECT 
    uo.order_id,
    uo.user_id,
    u.username,
    u.full_name,
    uo.canteen_id,
    c.name as canteen_name,
    uo.seat_number,
    uo.show_time,
    uo.theatre_name,
    uo.order_status,
    uo.total_amount,
    uo.payment_method,
    uo.payment_status,
    uo.created_at,
    uo.updated_at
FROM user_orders uo
JOIN users u ON uo.user_id = u.user_id
JOIN canteens c ON uo.canteen_id = c.canteen_id
WHERE uo.order_status IN ('pending', 'confirmed', 'preparing');

-- View for stock availability with reservations
CREATE OR REPLACE VIEW stock_availability_view AS
SELECT 
    s.item_id,
    s.item_name,
    s.price,
    s.quantity as total_quantity,
    COALESCE(SUM(sr.quantity_reserved), 0) as reserved_quantity,
    (s.quantity - COALESCE(SUM(sr.quantity_reserved), 0)) as available_quantity
FROM stock s
LEFT JOIN stock_reservations sr ON s.item_id = sr.item_id 
    AND sr.status = 'active' 
    AND sr.expires_at > NOW()
GROUP BY s.item_id, s.item_name, s.price, s.quantity;

-- ========================================
-- 11. FINAL VERIFICATION
-- ========================================

-- Verify all tables were created successfully
DO $$
BEGIN
    -- Check if all required tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE 'Table users exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_orders') THEN
        RAISE NOTICE 'Table user_orders exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
        RAISE NOTICE 'Table order_items exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_reservations') THEN
        RAISE NOTICE 'Table stock_reservations exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shows') THEN
        RAISE NOTICE 'Table shows exists';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Migration complete message
SELECT 'Database migration completed successfully!' as status;
