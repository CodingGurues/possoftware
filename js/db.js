const DB_KEY = 'pos-sqlite-db';

export class PosDatabase {
  constructor(SQL, notify) {
    this.SQL = SQL;
    this.notify = notify;
    this.db = null;
  }

  async init() {
    const saved = localStorage.getItem(DB_KEY);
    this.db = saved
      ? new this.SQL.Database(Uint8Array.from(atob(saved), c => c.charCodeAt(0)))
      : new this.SQL.Database();

    this.createSchema();
    this.migrateLegacyProductsIfNeeded();
    this.seedIfEmpty();
    this.persist();
  }

  createSchema() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_code TEXT UNIQUE NOT NULL,
        code_optional TEXT,
        product_name TEXT NOT NULL,
        category TEXT,
        company TEXT,
        keywords TEXT,
        purchase_price REAL,
        sale_price REAL,
        wholesale_price REAL,
        sale_default_qty INTEGER DEFAULT 0,
        sale_discount REAL,
        sale_tax REAL,
        max_order_qty INTEGER,
        box_purchase_price REAL,
        box_sale_price REAL,
        box_size INTEGER,
        min_stock_alert INTEGER,
        sale_margin REAL,
        description TEXT,
        location TEXT,
        image BLOB,
        in_stock INTEGER DEFAULT 0,
        check_recipe INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, phone TEXT, email TEXT,
        address TEXT, total_purchases REAL DEFAULT 0,
        due_amount REAL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS vendors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, phone TEXT, email TEXT,
        total_purchase_amount REAL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER, invoice_date TEXT,
        subtotal REAL, discount REAL, tax REAL,
        total REAL, profit REAL, items_json TEXT
      );
      CREATE TABLE IF NOT EXISTS vendor_purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id INTEGER, product_id INTEGER,
        quantity INTEGER, cost REAL, purchase_date TEXT
      );
      CREATE TABLE IF NOT EXISTS stock_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        change_qty INTEGER,
        date TEXT
      );
    `);
  }

  migrateLegacyProductsIfNeeded() {
    const cols = this.query(`PRAGMA table_info(products)`).map(c => c.name);
    if (!cols.length || cols.includes('product_code')) return;

    const hadRows = (this.queryOne('SELECT COUNT(*) c FROM products').c || 0) > 0;
    this.db.run('DROP TABLE IF EXISTS products');
    this.db.run(`
      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_code TEXT UNIQUE NOT NULL,
        code_optional TEXT,
        product_name TEXT NOT NULL,
        category TEXT,
        company TEXT,
        keywords TEXT,
        purchase_price REAL,
        sale_price REAL,
        wholesale_price REAL,
        sale_default_qty INTEGER DEFAULT 0,
        sale_discount REAL,
        sale_tax REAL,
        max_order_qty INTEGER,
        box_purchase_price REAL,
        box_sale_price REAL,
        box_size INTEGER,
        min_stock_alert INTEGER,
        sale_margin REAL,
        description TEXT,
        location TEXT,
        image BLOB,
        in_stock INTEGER DEFAULT 0,
        check_recipe INTEGER DEFAULT 0
      );
    `);
    if (hadRows) this.notify('Legacy product schema detected. Products were reset to apply new schema.');
  }

  seedIfEmpty() {
    if ((this.queryOne('SELECT COUNT(*) c FROM categories').c || 0) === 0) {
      this.run(`INSERT INTO categories (name) VALUES ('Chargers'),('Audio'),('Protection'),('Cables')`);
    }
    if ((this.queryOne('SELECT COUNT(*) c FROM companies').c || 0) === 0) {
      this.run(`INSERT INTO companies (name) VALUES ('Global Mobile'),('Prime Accessories'),('TechNova')`);
    }
    if ((this.queryOne('SELECT COUNT(*) c FROM vendors').c || 0) === 0) {
      this.run(`
        INSERT INTO vendors (name,phone,email,total_purchase_amount) VALUES
        ('Global Mobile Supply','01810000001','vendor1@example.com',12000),
        ('Prime Accessories Ltd','01810000002','vendor2@example.com',8300)
      `);
    }
    if ((this.queryOne('SELECT COUNT(*) c FROM customers').c || 0) === 0) {
      this.run(`
        INSERT INTO customers (name,phone,email,address,total_purchases,due_amount) VALUES
        ('Rahim Uddin','01710000001','rahim@example.com','Dhaka',4200,0),
        ('Nusrat Jahan','01710000002','nusrat@example.com','Chattogram',2750,200)
      `);
    }
    if ((this.queryOne('SELECT COUNT(*) c FROM products').c || 0) === 0) {
      this.run(`
        INSERT INTO products
        (product_code,product_name,category,company,purchase_price,sale_price,wholesale_price,sale_default_qty,min_stock_alert,sale_margin,location,in_stock)
        VALUES
        ('SKU-CHG-100','USB-C Fast Charger','Chargers','Global Mobile',350,550,520,0,10,57.14,'A-1',45),
        ('SKU-EAR-220','Wireless Earbuds','Audio','Prime Accessories',900,1450,1320,0,8,61.11,'A-2',22),
        ('SKU-GLS-310','Tempered Glass iPhone','Protection','TechNova',55,120,100,0,25,118.18,'B-1',140)
      `);
    }
  }

  run(sql, params = []) {
    this.db.run(sql, params);
    this.persist();
  }

  query(sql, params = []) {
    const res = this.db.exec(sql, params);
    if (!res[0]) return [];
    const { columns, values } = res[0];
    return values.map(v => Object.fromEntries(v.map((x, i) => [columns[i], x])));
  }

  queryOne(sql, params = []) { return this.query(sql, params)[0] || {}; }

  persist() {
    const bytes = this.db.export();
    const b64 = btoa(String.fromCharCode(...bytes));
    localStorage.setItem(DB_KEY, b64);
  }

  exportBinary() { return this.db.export(); }

  importBinary(buffer) {
    this.db = new this.SQL.Database(new Uint8Array(buffer));
    this.createSchema();
    this.persist();
    this.notify('Database imported successfully');
  }
}
