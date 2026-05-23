-- Update Admin User Password Hash
-- This script updates only the admin user to use bcrypt hash

UPDATE users 
SET password_hash = '$2b$12$8BqIAm6W4iZgtmCrvsRCTugB9qzKnlwz4bpWRj/9THNv7vsKw3smC'
WHERE username = 'admin';
