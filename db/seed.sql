-- Seed initial canteens and sample stock/items/prices
INSERT INTO canteens (name) VALUES
  ('Prathap Delux'),
  ('Prathap Non-Delux'),
  ('Mini Prathap')
ON CONFLICT (name) DO NOTHING;

-- Canteen 1 & 3 items
WITH items AS (
  SELECT 1 AS canteen_id, 'Popcorn' AS item_name, 50 AS price UNION ALL
  SELECT 1, 'Cold Drinks', 50 UNION ALL
  SELECT 1, 'Samosa', 30 UNION ALL
  SELECT 1, 'Egg Puff', 40 UNION ALL
  SELECT 1, 'Chips', 30 UNION ALL
  SELECT 1, 'Rings', 30 UNION ALL
  SELECT 1, 'Water Bottle', 10 UNION ALL
  SELECT 1, 'Coffee', 20 UNION ALL
  SELECT 1, 'Corn Flakes', 30 UNION ALL
  SELECT 1, 'Wheels', 30 UNION ALL
  SELECT 1, 'Peanuts', 10 UNION ALL
  SELECT 1, 'Nuts', 10
)
INSERT INTO stock (item_name, canteen_id, price, quantity)
SELECT item_name, canteen_id, price, 100 FROM items
UNION ALL
SELECT item_name, 3 AS canteen_id, price, 100 FROM items
ON CONFLICT DO NOTHING;

-- Canteen 2 items
INSERT INTO stock (item_name, canteen_id, price, quantity) VALUES
  ('Cold Drinks', 2, 30, 100),
  ('Chips', 2, 30, 100),
  ('Rings', 2, 30, 100),
  ('Water Bottle', 2, 10, 100),
  ('Coffee', 2, 20, 100),
  ('Corn Flakes', 2, 30, 100),
  ('Wheels', 2, 30, 100),
  ('Peanuts', 2, 10, 100),
  ('Nuts', 2, 10, 100)
ON CONFLICT DO NOTHING;

-- Parking default row
INSERT INTO parking (total_slots, available_slots, revenue)
VALUES (200, 200, 0)
ON CONFLICT DO NOTHING;
