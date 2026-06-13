-- Pandora Garments v2 Schema Extension
-- Extends existing employees + evaluations tables

-- ─── COMPANY SETTINGS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT NOT NULL DEFAULT 'Pandora Garments',
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  order_prefix TEXT DEFAULT 'ORD',
  invoice_prefix TEXT DEFAULT 'INV',
  quotation_prefix TEXT DEFAULT 'QUO',
  order_seq INTEGER DEFAULT 1,
  invoice_seq INTEGER DEFAULT 1,
  quotation_seq INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO company_settings (id, name) VALUES (1, 'Pandora Garments');

-- ─── DEPARTMENTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO departments (name) VALUES
  ('Cutting'),('Sewing'),('Finishing'),('Quality Control'),
  ('Warehouse'),('Administration'),('HR'),('Production'),('Maintenance');

-- ─── TEAMS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  created_at TEXT DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO teams (name) VALUES
  ('Cutting Team'),('Printing Team'),('Sewing Team'),('Finishing Team');

-- ─── STAFF (extends employees) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  team_id INTEGER REFERENCES teams(id),
  position TEXT,
  mobile TEXT,
  email TEXT,
  address TEXT,
  salary REAL DEFAULT 0,
  joined_date TEXT,
  status TEXT DEFAULT 'Active',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ─── CUSTOMERS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  company_name TEXT,
  contact_person TEXT,
  mobile TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  notes TEXT,
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT (datetime('now'))
);

-- ─── SUPPLIERS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_person TEXT,
  mobile TEXT,
  email TEXT,
  address TEXT,
  category TEXT,
  notes TEXT,
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT (datetime('now'))
);

-- ─── INVENTORY ITEMS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT DEFAULT 'pcs',
  cost_price REAL DEFAULT 0,
  selling_price REAL DEFAULT 0,
  manage_stock INTEGER DEFAULT 1,
  stock_qty REAL DEFAULT 0,
  reorder_level REAL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT (datetime('now'))
);

-- ─── PURCHASES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_no TEXT NOT NULL UNIQUE,
  supplier_id INTEGER REFERENCES suppliers(id),
  purchase_date TEXT NOT NULL,
  total_amount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  payment_status TEXT DEFAULT 'Unpaid',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id),
  qty REAL NOT NULL,
  unit_price REAL NOT NULL,
  total REAL NOT NULL
);

-- ─── QUOTATIONS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quotation_no TEXT NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customers(id),
  quotation_date TEXT NOT NULL,
  expiry_date TEXT,
  status TEXT DEFAULT 'Draft',
  total_amount REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES items(id),
  description TEXT,
  qty REAL NOT NULL,
  unit_price REAL NOT NULL,
  total REAL NOT NULL
);

-- ─── SALES / INVOICES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customers(id),
  sale_date TEXT NOT NULL,
  total_amount REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  payment_type TEXT DEFAULT 'Cash',
  payment_status TEXT DEFAULT 'Unpaid',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES items(id),
  description TEXT,
  qty REAL NOT NULL,
  unit_price REAL NOT NULL,
  discount REAL DEFAULT 0,
  total REAL NOT NULL
);

-- ─── ORDERS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customers(id),
  order_date TEXT NOT NULL,
  delivery_date TEXT,
  status TEXT DEFAULT 'New',
  production_status TEXT DEFAULT 'Pending',
  progress INTEGER DEFAULT 0,
  product TEXT,
  design_reference TEXT,
  fabric_details TEXT,
  printing_details TEXT,
  embroidery_details TEXT,
  accessories TEXT,
  production_notes TEXT,
  total_qty INTEGER DEFAULT 0,
  total_amount REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_sizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0
);

-- ─── EXPENSES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_date TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
