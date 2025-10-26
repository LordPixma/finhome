-- Update global admin password hash (Admin123!@#)
UPDATE users SET password_hash = '$2b$10$Ybgtx.BOwDfkCALP/mLtUe31XzRSbf0o/YQzJA1SUjSOef59M3vHi' WHERE email = 'admin@finhome360.com';