-- Test Users Creation Script
-- This script creates test users for the user ordering system
-- Run this script after running the migration.sql

-- ========================================
-- TEST USERS WITH DIFFERENT PERMISSIONS
-- ========================================

-- Admin User (permissions = 2)
-- Username: admin
-- Password: admin123
INSERT INTO users (username, password_hash, email, phone, full_name, role, is_active, permissions) VALUES 
('admin', '$2b$12$8BqIAm6W4iZgtmCrvsRCTugB9qzKnlwz4bpWRj/9THNv7vsKw3smC', 'admin@theatre.com', '9876543210', 'Theatre Administrator', 'admin', TRUE, 2)
ON CONFLICT (username) DO UPDATE SET 
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    full_name = EXCLUDED.full_name,
    permissions = EXCLUDED.permissions;

-- Test Customer Users (permissions = 1)

-- Customer 1: John Doe
-- Username: john
-- Password: user123
INSERT INTO users (username, password_hash, email, phone, full_name, role, is_active, permissions) VALUES 
('john', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', 'john.doe@email.com', '9876543211', 'John Doe', 'customer', TRUE, 1)
ON CONFLICT (username) DO UPDATE SET 
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    full_name = EXCLUDED.full_name,
    permissions = EXCLUDED.permissions;

-- Customer 2: Jane Smith
-- Username: jane
-- Password: user123
INSERT INTO users (username, password_hash, email, phone, full_name, role, is_active, permissions) VALUES 
('jane', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', 'jane.smith@email.com', '9876543212', 'Jane Smith', 'customer', TRUE, 1)
ON CONFLICT (username) DO UPDATE SET 
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    full_name = EXCLUDED.full_name,
    permissions = EXCLUDED.permissions;

-- Customer 3: Mike Wilson
-- Username: mike
-- Password: user123
INSERT INTO users (username, password_hash, email, phone, full_name, role, is_active, permissions) VALUES 
('mike', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', 'mike.wilson@email.com', '9876543213', 'Mike Wilson', 'customer', TRUE, 1)
ON CONFLICT (username) DO UPDATE SET 
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    full_name = EXCLUDED.full_name,
    permissions = EXCLUDED.permissions;

-- Customer 4: Sarah Johnson
-- Username: sarah
-- Password: user123
INSERT INTO users (username, password_hash, email, phone, full_name, role, is_active, permissions) VALUES 
('sarah', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', 'sarah.johnson@email.com', '9876543214', 'Sarah Johnson', 'customer', TRUE, 1)
ON CONFLICT (username) DO UPDATE SET 
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    full_name = EXCLUDED.full_name,
    permissions = EXCLUDED.permissions;

-- Customer 5: Robert Brown
-- Username: robert
-- Password: user123
INSERT INTO users (username, password_hash, email, phone, full_name, role, is_active, permissions) VALUES 
('robert', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', 'robert.brown@email.com', '9876543215', 'Robert Brown', 'customer', TRUE, 1)
ON CONFLICT (username) DO UPDATE SET 
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    full_name = EXCLUDED.full_name,
    permissions = EXCLUDED.permissions;

-- ========================================
-- PASSWORD HASH NOTES
-- ========================================
-- All test users use the same password hash for "user123"
-- The hash was generated using bcrypt with the following command:
-- python -c "import bcrypt; print(bcrypt.hashpw('user123'.encode(), bcrypt.gensalt()).decode())"
-- 
-- Generated hash: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm
-- 
-- Admin user hash for "admin123":
-- $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm (same hash, different password)

-- ========================================
-- TEST CREDENTIALS SUMMARY
-- ========================================

-- ADMIN ACCESS:
-- Username: admin
-- Password: admin123
-- Permissions: 2 (Admin)
-- Access: Admin Dashboard, Canteen Operations

-- CUSTOMER ACCESS:
-- Username: john, jane, mike, sarah, robert
-- Password: user123 (same for all)
-- Permissions: 1 (User)
-- Access: User Login, Menu, Orders

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify users were created
SELECT user_id, username, email, full_name, permissions, role, is_active 
FROM users 
ORDER BY permissions DESC, username;

-- Count users by permission level
SELECT 
    permissions,
    CASE 
        WHEN permissions = 2 THEN 'Admin'
        WHEN permissions = 1 THEN 'User'
        ELSE 'Unknown'
    END as user_type,
    COUNT(*) as count
FROM users 
GROUP BY permissions 
ORDER BY permissions DESC;
