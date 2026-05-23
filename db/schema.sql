-- PostgreSQL schema for Theatre Canteen Management System
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(256) NOT NULL,
  role VARCHAR(20) DEFAULT 'staff'
);

CREATE TABLE IF NOT EXISTS canteens (
  canteen_id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS stock (
  item_id SERIAL PRIMARY KEY,
  item_name VARCHAR(100) NOT NULL,
  canteen_id INTEGER NOT NULL REFERENCES canteens(canteen_id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales (
  sale_id SERIAL PRIMARY KEY,
  canteen_id INTEGER NOT NULL REFERENCES canteens(canteen_id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES stock(item_id) ON DELETE CASCADE,
  quantity_sold INTEGER NOT NULL,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

