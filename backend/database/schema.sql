CREATE DATABASE IF NOT EXISTS inventory_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE inventory_management;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE businesses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  business_type VARCHAR(30) NOT NULL DEFAULT 'retail',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_by_id INT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT ck_businesses_business_type CHECK (business_type IN ('retail', 'wholesale', 'both')),
  CONSTRAINT ck_businesses_status CHECK (status IN ('active', 'suspended')),
  CONSTRAINT fk_businesses_created_by FOREIGN KEY (created_by_id) REFERENCES users(id)
);

CREATE TABLE business_memberships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  business_id INT NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'staff',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY ix_business_memberships_business_id (business_id),
  CONSTRAINT uq_membership_user_business UNIQUE (user_id, business_id),
  CONSTRAINT ck_business_memberships_role CHECK (role IN ('owner', 'manager', 'staff', 'viewer')),
  CONSTRAINT ck_business_memberships_status CHECK (status IN ('active', 'invited', 'suspended')),
  CONSTRAINT fk_business_memberships_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_business_memberships_business FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT uq_categories_business_name UNIQUE (business_id, name),
  CONSTRAINT fk_categories_business FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  name VARCHAR(160) NOT NULL,
  contact VARCHAR(80) NOT NULL,
  email VARCHAR(255) NOT NULL,
  products_supplied TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY ix_suppliers_business_id (business_id),
  CONSTRAINT fk_suppliers_business FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  supplier_id INT NULL,
  category_id INT NULL,
  name VARCHAR(160) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  category VARCHAR(120) NOT NULL DEFAULT '',
  purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 0,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 10,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT uq_products_business_sku UNIQUE (business_id, sku),
  KEY ix_products_business_id (business_id),
  KEY ix_products_sku (sku),
  CONSTRAINT fk_products_business FOREIGN KEY (business_id) REFERENCES businesses(id),
  CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE supplier_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  supplier_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY ix_supplier_transactions_business_id (business_id),
  CONSTRAINT fk_supplier_transactions_business FOREIGN KEY (business_id) REFERENCES businesses(id),
  CONSTRAINT fk_supplier_transactions_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_supplier_transactions_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(80) NOT NULL,
  email VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  portal_password_hash VARCHAR(255) NULL,
  portal_requires_password_reset BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY ix_customers_business_id (business_id),
  CONSTRAINT fk_customers_business FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  order_number VARCHAR(40) NOT NULL UNIQUE,
  customer_id INT NOT NULL,
  total_quantity INT NOT NULL DEFAULT 0,
  total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  date DATE NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY ix_orders_business_id (business_id),
  CONSTRAINT fk_orders_business FOREIGN KEY (business_id) REFERENCES businesses(id),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(160) NOT NULL,
  supplier_id INT NULL,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL,
  discount DECIMAL(5,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY ix_order_items_business_id (business_id),
  CONSTRAINT fk_order_items_business FOREIGN KEY (business_id) REFERENCES businesses(id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_order_items_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  order_id INT NULL UNIQUE,
  customer_id INT NULL,
  total_quantity INT NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY ix_sales_business_id (business_id),
  CONSTRAINT fk_sales_business FOREIGN KEY (business_id) REFERENCES businesses(id),
  CONSTRAINT fk_sales_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  sale_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(160) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY ix_sale_items_business_id (business_id),
  CONSTRAINT fk_sale_items_business FOREIGN KEY (business_id) REFERENCES businesses(id),
  CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  CONSTRAINT fk_sale_items_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE inventory_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  product_id INT NOT NULL,
  transaction_type VARCHAR(30) NOT NULL,
  quantity INT NOT NULL,
  reason VARCHAR(255) NOT NULL DEFAULT '',
  date DATE NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY ix_inventory_transactions_business_id (business_id),
  CONSTRAINT fk_inventory_transactions_business FOREIGN KEY (business_id) REFERENCES businesses(id),
  CONSTRAINT fk_inventory_transactions_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE profit_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  period VARCHAR(40) NOT NULL,
  revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  expenses DECIMAL(12,2) NOT NULL DEFAULT 0,
  profit DECIMAL(12,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY ix_profit_records_business_id (business_id),
  CONSTRAINT fk_profit_records_business FOREIGN KEY (business_id) REFERENCES businesses(id)
);
