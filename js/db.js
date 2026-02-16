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
    this.seedIfEmpty();
    this.persist();
  }

  createSchema() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, sku TEXT, category TEXT,
        cost_price REAL, sale_price REAL,
        quantity INTEGER, vendor TEXT,
        low_stock_threshold INTEGER
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
    `);
  }

  seedIfEmpty() {
    const count = this.queryOne('SELECT COUNT(*) as c FROM products').c;
    if (count > 0) return;
    this.run(`
      INSERT INTO vendors (name,phone,email,total_purchase_amount) VALUES
      ('Global Mobile Supply','01810000001','vendor1@example.com',12000),
      ('Prime Accessories Ltd','01810000002','vendor2@example.com',8300);
      INSERT INTO products (name,sku,category,cost_price,sale_price,quantity,vendor,low_stock_threshold) VALUES
      ('USB-C Fast Charger','CHG-100','Chargers',350,550,45,'Global Mobile Supply',10),
      ('Wireless Earbuds','EAR-220','Audio',900,1450,22,'Prime Accessories Ltd',8),
      ('Tempered Glass iPhone','GLS-310','Protection',55,120,140,'Global Mobile Supply',25);
      INSERT INTO customers (name,phone,email,address,total_purchases,due_amount) VALUES
      ('Rahim Uddin','01710000001','rahim@example.com','Dhaka',4200,0),
      ('Nusrat Jahan','01710000002','nusrat@example.com','Chattogram',2750,200);
    `);
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
    this.persist();
    this.notify('Database imported successfully');
  }
}
