-- Migration: Add user profile fields
-- Date: 2025-10-04

ALTER TABLE users ADD COLUMN profile_picture_url TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN phone_number TEXT;
ALTER TABLE users ADD COLUMN date_of_birth TEXT; -- YYYY-MM-DD format
ALTER TABLE users ADD COLUMN address_line_1 TEXT;
ALTER TABLE users ADD COLUMN address_line_2 TEXT;
ALTER TABLE users ADD COLUMN city TEXT;
ALTER TABLE users ADD COLUMN state TEXT;
ALTER TABLE users ADD COLUMN postal_code TEXT;
ALTER TABLE users ADD COLUMN country TEXT;