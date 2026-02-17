import { fmt } from './ui.js';

export function initReports(app) {
  const root = document.getElementById('reports');
  let salesChart;

  root.innerHTML = `
    <div class="grid-cards">
      <div class="panel"><h3>Sales Report</h3><canvas id="salesChart" height="100"></canvas></div>
      <div class="panel"><h3>Product Performance</h3><div id="productPerformance"></div></div>
    </div>
    <div class="panel"><h3>Profit + Low Stock</h3><div id="profitLow"></div></div>
  `;

  return {
    refresh() {
      const salesData = app.db.query(`SELECT invoice_date d, SUM(total) total FROM invoices GROUP BY invoice_date ORDER BY d DESC LIMIT 7`).reverse();
      const ctx = root.querySelector('#salesChart');
      if (salesChart) salesChart.destroy();
      salesChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: salesData.map(x => x.d),
          datasets: [{ label: 'Daily Sales', data: salesData.map(x => x.total), borderColor: '#5b6cff', tension: .3 }],
        },
      });

      const perf = app.db.query(`SELECT json_extract(j.value,'$.name') name, SUM(json_extract(j.value,'$.qty')) qty
        FROM invoices, json_each(invoices.items_json) j GROUP BY name ORDER BY qty DESC LIMIT 5`);
      root.querySelector('#productPerformance').innerHTML = perf.length
        ? `<ul>${perf.map(p => `<li>${p.name}: ${p.qty} units</li>`).join('')}</ul>`
        : '<p>No sales yet</p>';

      const monthly = app.db.queryOne(`SELECT IFNULL(SUM(total),0) s, IFNULL(SUM(profit),0) p FROM invoices WHERE strftime('%Y-%m',invoice_date)=strftime('%Y-%m','now')`);
      const low = app.db.query('SELECT product_name,in_stock FROM products WHERE in_stock <= min_stock_alert ORDER BY in_stock ASC');
      root.querySelector('#profitLow').innerHTML = `
        <p>This month sales: <strong>৳${fmt(monthly.s)}</strong> | profit: <strong>৳${fmt(monthly.p)}</strong></p>
        <h4>Low Stock Report</h4>
        ${low.length ? `<ul>${low.map(i => `<li>${i.product_name}: ${i.in_stock}</li>`).join('')}</ul>` : '<p>All good ✅</p>'}
      `;
    },
  };
}
