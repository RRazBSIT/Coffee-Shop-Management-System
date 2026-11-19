USE mr_cafe_db;

INSERT IGNORE INTO roles (role_id, role_name)
VALUES (1, 'admin'), (2, 'cashier');

INSERT IGNORE INTO categories (category_name, description) VALUES
('Coffee', 'Espresso-based and brewed coffee'),
('Non-Coffee', 'Non-coffee beverages'),
('Food', 'Pastries and light meals');

-- No default admin account is inserted here.
-- Create the first admin using a secure one-time seed script that hashes
-- the password with bcrypt. Never store a plaintext password in this file.
