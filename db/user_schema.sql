-- Extended PostgreSQL schema for User Ordering System
-- This extends the existing schema with user accounts and order management

-- Update existing users table to support customer accounts
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions INTEGER DEFAULT 1; -- 1=user, 2=admin

-- User orders table
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

-- Order items table (for multiple items per order)
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

-- Stock reservations for handling concurrent orders
CREATE TABLE IF NOT EXISTS stock_reservations (
  reservation_id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES stock(item_id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES user_orders(order_id) ON DELETE CASCADE,
  quantity_reserved INTEGER NOT NULL,
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL, -- 10 minutes from reservation
  status VARCHAR(20) DEFAULT 'active', -- active, confirmed, expired, cancelled
  UNIQUE(item_id, order_id)
);

-- Shows table for managing show times
CREATE TABLE IF NOT EXISTS shows (
  show_id SERIAL PRIMARY KEY,
  theatre_name VARCHAR(50) NOT NULL,
  show_time VARCHAR(20) NOT NULL,
  show_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_orders_user_id ON user_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_orders_status ON user_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_user_orders_canteen_date ON user_orders(canteen_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_item ON stock_reservations(item_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires ON stock_reservations(expires_at);

-- Insert default shows
INSERT INTO shows (theatre_name, show_time, show_date) VALUES
('Prathap Deluxe', 'morning', CURRENT_DATE),
('Prathap Deluxe', 'matinee', CURRENT_DATE),
('Prathap Deluxe', 'first_show', CURRENT_DATE),
('Prathap Deluxe', 'second_show', CURRENT_DATE),
('Prathap Non-Delux', 'morning', CURRENT_DATE),
('Prathap Non-Delux', 'matinee', CURRENT_DATE),
('Prathap Non-Delux', 'first_show', CURRENT_DATE),
('Prathap Non-Delux', 'second_show', CURRENT_DATE),
('Mini Prathap', 'morning', CURRENT_DATE),
('Mini Prathap', 'matinee', CURRENT_DATE),
('Mini Prathap', 'first_show', CURRENT_DATE),
('Mini Prathap', 'second_show', CURRENT_DATE)
ON CONFLICT DO NOTHING;
