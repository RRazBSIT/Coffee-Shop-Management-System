CREATE DATABASE IF NOT EXISTS mr_cafe_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE mr_cafe_db;

-- Staff accounts are separate from customer accounts.
CREATE TABLE IF NOT EXISTS roles (
  role_id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employees (
  employee_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  phone VARCHAR(25) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNSIGNED NULL UNIQUE,
  role_id TINYINT UNSIGNED NOT NULL,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customers (
  customer_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NULL UNIQUE,
  phone VARCHAR(25) NULL,
  password_hash VARCHAR(255) NULL,
  is_registered BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(80) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  product_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED NOT NULL,
  product_name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  image_url VARCHAR(500) NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(category_id),
  INDEX idx_products_category (category_id),
  INDEX idx_products_available (is_available)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_sizes (
  size_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  size_name VARCHAR(40) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_sizes_product FOREIGN KEY (product_id) REFERENCES products(product_id),
  CONSTRAINT uq_product_size UNIQUE (product_id, size_name),
  CONSTRAINT chk_size_price CHECK (price >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS add_ons (
  addon_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  addon_name VARCHAR(100) NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT chk_addon_price CHECK (price >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_addons (
  product_id INT UNSIGNED NOT NULL,
  addon_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (product_id, addon_id),
  CONSTRAINT fk_product_addons_product FOREIGN KEY (product_id) REFERENCES products(product_id),
  CONSTRAINT fk_product_addons_addon FOREIGN KEY (addon_id) REFERENCES add_ons(addon_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ingredients (
  ingredient_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ingredient_name VARCHAR(120) NOT NULL UNIQUE,
  unit VARCHAR(20) NOT NULL,
  current_stock DECIMAL(12,3) NOT NULL DEFAULT 0,
  reorder_level DECIMAL(12,3) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT chk_ingredient_stock CHECK (current_stock >= 0),
  CONSTRAINT chk_ingredient_reorder CHECK (reorder_level >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS recipes (
  recipe_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  size_id INT UNSIGNED NOT NULL,
  ingredient_id INT UNSIGNED NOT NULL,
  quantity_required DECIMAL(12,3) NOT NULL,
  CONSTRAINT fk_recipes_size FOREIGN KEY (size_id) REFERENCES product_sizes(size_id),
  CONSTRAINT fk_recipes_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id),
  CONSTRAINT uq_recipe_size_ingredient UNIQUE (size_id, ingredient_id),
  CONSTRAINT chk_recipe_quantity CHECK (quantity_required > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  order_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(30) NOT NULL UNIQUE,
  order_source ENUM('pos','online') NOT NULL,
  order_type ENUM('dine_in','takeaway') NOT NULL,
  customer_id INT UNSIGNED NULL,
  created_by INT UNSIGNED NULL,
  customer_name VARCHAR(150) NULL,
  customer_phone VARCHAR(25) NULL,
  customer_notes TEXT NULL,
  status ENUM('pending','preparing','ready','completed','cancelled') NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  inventory_deducted BOOLEAN NOT NULL DEFAULT FALSE,
  points_awarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  CONSTRAINT fk_orders_user FOREIGN KEY (created_by) REFERENCES users(user_id),
  INDEX idx_orders_status_created (status, created_at),
  INDEX idx_orders_source (order_source),
  CONSTRAINT chk_order_amounts CHECK (subtotal >= 0 AND discount_amount >= 0 AND total_amount >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NULL,
  size_id INT UNSIGNED NULL,
  product_name_snapshot VARCHAR(120) NOT NULL,
  size_name_snapshot VARCHAR(40) NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL,
  CONSTRAINT fk_order_items_size FOREIGN KEY (size_id) REFERENCES product_sizes(size_id) ON DELETE SET NULL,
  CONSTRAINT chk_order_item_qty CHECK (quantity > 0),
  INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_item_addons (
  order_item_addon_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_item_id BIGINT UNSIGNED NOT NULL,
  addon_id INT UNSIGNED NULL,
  addon_name_snapshot VARCHAR(100) NOT NULL,
  addon_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_order_item_addons_item FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id),
  CONSTRAINT fk_order_item_addons_addon FOREIGN KEY (addon_id) REFERENCES add_ons(addon_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  payment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  payment_method ENUM('cash','gcash') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_status ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
  reference_number VARCHAR(100) NULL,
  received_by INT UNSIGNED NULL,
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_payments_user FOREIGN KEY (received_by) REFERENCES users(user_id),
  CONSTRAINT chk_payment_amount CHECK (amount >= 0),
  INDEX idx_payments_order (order_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_status_history (
  history_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  old_status VARCHAR(30) NULL,
  new_status VARCHAR(30) NOT NULL,
  changed_by INT UNSIGNED NULL,
  note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_history_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_order_history_user FOREIGN KEY (changed_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_movements (
  movement_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ingredient_id INT UNSIGNED NOT NULL,
  movement_type ENUM('stock_in','sale_deduction','adjustment','wastage') NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  reference_order_id BIGINT UNSIGNED NULL,
  notes VARCHAR(255) NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_movements_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id),
  CONSTRAINT fk_movements_order FOREIGN KEY (reference_order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_movements_user FOREIGN KEY (created_by) REFERENCES users(user_id),
  INDEX idx_movements_ingredient_date (ingredient_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  loyalty_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL UNIQUE,
  points_balance INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_loyalty_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  CONSTRAINT chk_loyalty_balance CHECK (points_balance >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  transaction_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  loyalty_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NULL,
  points INT NOT NULL,
  transaction_type ENUM('earned','redeemed','adjustment') NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_loyalty_tx_account FOREIGN KEY (loyalty_id) REFERENCES loyalty_accounts(loyalty_id),
  CONSTRAINT fk_loyalty_tx_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  INDEX idx_loyalty_tx_account (loyalty_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rewards (
  reward_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reward_name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NULL,
  points_required INT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reward_redemptions (
  redemption_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  loyalty_id BIGINT UNSIGNED NOT NULL,
  reward_id INT UNSIGNED NOT NULL,
  points_used INT UNSIGNED NOT NULL,
  redeemed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_redemptions_loyalty FOREIGN KEY (loyalty_id) REFERENCES loyalty_accounts(loyalty_id),
  CONSTRAINT fk_redemptions_reward FOREIGN KEY (reward_id) REFERENCES rewards(reward_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS expenses (
  expense_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  expense_category VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_expenses_user FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT chk_expense_amount CHECK (amount >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_logs (
  log_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NULL,
  entity_id BIGINT UNSIGNED NULL,
  details TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  INDEX idx_activity_created (created_at)
) ENGINE=InnoDB;
