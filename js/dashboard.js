import { cardMetric, fmt } from './ui.js';

export function initDashboard(app) {
  const root = document.getElementById('dashboard');

  return {
    refresh() {
      const totalSales = app.db.queryOne('SELECT COUNT(*) c FROM invoices').c || 0;
      const revenue = app.db.queryOne('SELECT IFNULL(SUM(total),0) v FROM invoices').v || 0;
      const profit = app.db.queryOne('SELECT IFNULL(SUM(profit),0) v FROM invoices').v || 0;
      const stockItems = app.db.queryOne('SELECT IFNULL(SUM(in_stock),0) v FROM products').v || 0;
      const lowStock = app.db.queryOne('SELECT COUNT(*) c FROM products WHERE in_stock <= min_stock_alert').c || 0;
      const customers = app.db.queryOne('SELECT COUNT(*) c FROM customers').c || 0;
      const vendors = app.db.queryOne('SELECT COUNT(*) c FROM vendors').c || 0;
      const recent = app.db.query('SELECT id,invoice_date,total FROM invoices ORDER BY id DESC LIMIT 5');

      root.innerHTML = `
        <div class="grid-cards">
          ${cardMetric('Total Sales', totalSales)}
          ${cardMetric('Total Revenue', `৳${fmt(revenue)}`)}
          ${cardMetric('Total Profit', `৳${fmt(profit)}`)}
          ${cardMetric('Stock Items', fmt(stockItems))}
          ${cardMetric('Low Stock Alerts', lowStock)}
          ${cardMetric('Customers', customers)}
          ${cardMetric('Vendors', vendors)}
        </div>
        <div class="panel table-wrap">
          <h3>Recent Transactions</h3>
          <table><thead><tr><th>Invoice</th><th>Date</th><th>Total</th></tr></thead>
          <tbody>${recent.map(r => `<tr><td>#${r.id}</td><td>${r.invoice_date}</td><td>৳${fmt(r.total)}</td></tr>`).join('')}</tbody></table>
        </div>`;
    },
  };
}
