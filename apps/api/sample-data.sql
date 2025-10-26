-- Insert sample tenant data for testing the global admin dashboard
INSERT INTO tenants (id, name, subdomain, created_at, updated_at) VALUES 
    ('tenant-1', 'Acme Corp', 'acme', strftime('%s', 'now') - 86400*5, strftime('%s', 'now')),
    ('tenant-2', 'TechStart Inc', 'techstart', strftime('%s', 'now') - 86400*2, strftime('%s', 'now')),
    ('tenant-3', 'Global Solutions', 'globalsolutions', strftime('%s', 'now') - 86400*10, strftime('%s', 'now'));

-- Insert sample users for these tenants
INSERT INTO users (id, tenant_id, email, name, password_hash, role, is_global_admin, created_at, updated_at) VALUES 
    ('user-1', 'tenant-1', 'admin@acme.com', 'John Smith', '$2b$10$tInTXd11PapMPAEWkAALW.Nckp0uTaVbeDA./E1veOGP9T2NGUZB2', 'admin', 0, strftime('%s', 'now') - 86400*5, strftime('%s', 'now')),
    ('user-2', 'tenant-1', 'user@acme.com', 'Jane Doe', '$2b$10$tInTXd11PapMPAEWkAALW.Nckp0uTaVbeDA./E1veOGP9T2NGUZB2', 'user', 0, strftime('%s', 'now') - 86400*4, strftime('%s', 'now')),
    ('user-3', 'tenant-2', 'admin@techstart.com', 'Mike Johnson', '$2b$10$tInTXd11PapMPAEWkAALW.Nckp0uTaVbeDA./E1veOGP9T2NGUZB2', 'admin', 0, strftime('%s', 'now') - 86400*2, strftime('%s', 'now')),
    ('user-4', 'tenant-3', 'admin@globalsolutions.com', 'Sarah Wilson', '$2b$10$tInTXd11PapMPAEWkAALW.Nckp0uTaVbeDA./E1veOGP9T2NGUZB2', 'admin', 0, strftime('%s', 'now') - 86400*10, strftime('%s', 'now'));