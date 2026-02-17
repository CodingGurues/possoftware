import { askConfirm } from './ui.js';

export function initInvoices(app) {
  const root = document.getElementById('invoices');
  let selectedItems = [];

  root.innerHTML = `
    <div class="panel">
      <h3>Create Invoice</h3>
      <form id="invoiceForm" class="form-grid">
        <select name="customer_id" id="invoiceCustomer"></select>
        <select name="product_id" id="invoiceProduct"></select>
        <input name="qty" type="number" min="1" placeholder="Quantity" value="1" required />
        <button class="btn-secondary" type="button" id="addItemBtn">Add Item</button>
        <input name="discount" type="number" step="0.01" placeholder="Discount" value="0" required />
        <input name="tax" type="number" step="0.01" placeholder="Tax" value="0" required />
        <button class="btn-primary" type="submit">Generate Invoice</button>
      </form>
      <div class="table-wrap"><table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody id="invoiceItems"></tbody></table></div>
      <div id="invoiceCalc"></div>
    </div>
    <div class="panel">
      <h3>Invoice History</h3>
      <div class="form-grid"><input type="date" id="invoiceFilterDate" /><button class="btn-secondary" id="clearFilter" type="button">Clear</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Date</th><th>Customer</th><th>Total</th><th>Profit</th><th>Actions</th></tr></thead>
        <tbody id="invoiceRows"></tbody>
      </table></div>
    </div>`;

  const calc = () => {
    const subtotal = selectedItems.reduce((s, x) => s + x.qty * x.sale_price, 0);
    const cost = selectedItems.reduce((s, x) => s + x.qty * x.purchase_price, 0);
    const discount = Number(root.querySelector('[name="discount"]').value || 0);
    const tax = Number(root.querySelector('[name="tax"]').value || 0);
    const total = subtotal - discount + tax;
    const profit = total - cost;
    root.querySelector('#invoiceCalc').innerHTML = `Subtotal: ৳${subtotal.toFixed(2)} | Total: ৳${total.toFixed(2)} | Profit: ৳${profit.toFixed(2)}`;
    return { subtotal, total, profit, discount, tax };
  };

  root.querySelector('#addItemBtn').addEventListener('click', () => {
    const productId = Number(root.querySelector('#invoiceProduct').value);
    const qty = Number(root.querySelector('[name="qty"]').value || 1);
    const p = app.db.queryOne('SELECT * FROM products WHERE id=?', [productId]);
    if (!p.id || qty > p.in_stock) return app.notify('Invalid qty or insufficient stock');
    selectedItems.push({ ...p, qty });
    root.querySelector('#invoiceItems').innerHTML = selectedItems.map(i => `<tr><td>${i.product_name}</td><td>${i.qty}</td><td>${i.sale_price}</td><td>${(i.qty * i.sale_price).toFixed(2)}</td></tr>`).join('');
    calc();
  });

  root.querySelector('#invoiceForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!selectedItems.length) return app.notify('Add at least one item');
    if (!(await askConfirm({ title: 'Create Invoice', text: 'Finalize this invoice and update stock?' }))) return;

    const customerId = Number(root.querySelector('#invoiceCustomer').value);
    const { subtotal, total, profit, discount, tax } = calc();

    for (const item of selectedItems) {
      app.db.run('UPDATE products SET in_stock = in_stock - ? WHERE id=?', [item.qty, item.id]);
      app.db.run('INSERT INTO stock_history (product_id,change_qty,date) VALUES (?,?,?)', [item.id, -item.qty, new Date().toISOString()]);
    }

    app.db.run('INSERT INTO invoices (customer_id,invoice_date,subtotal,discount,tax,total,profit,items_json) VALUES (?,?,?,?,?,?,?,?)', [
      customerId,
      new Date().toISOString().slice(0, 10),
      subtotal,
      discount,
      tax,
      total,
      profit,
      JSON.stringify(selectedItems.map(i => ({ id: i.id, name: i.product_name, qty: i.qty, rate: i.sale_price }))),
    ]);

    app.db.run('UPDATE customers SET total_purchases = total_purchases + ? WHERE id=?', [total, customerId]);
    selectedItems = [];
    root.querySelector('#invoiceItems').innerHTML = '';
    app.notify('Invoice created');
    app.refreshAll();
  });

  root.addEventListener('click', e => {
    const id = e.target.dataset.id;
    if (e.target.matches('.print-invoice')) {
      const inv = app.db.queryOne('SELECT * FROM invoices WHERE id=?', [id]);
      const items = JSON.parse(inv.items_json || '[]').map(i => `<li>${i.name} x${i.qty} = ৳${i.qty * i.rate}</li>`).join('');
      const w = window.open('', '_blank');
      w.document.write(`<h2>Invoice #${inv.id}</h2><p>Date: ${inv.invoice_date}</p><ul>${items}</ul><h3>Total: ৳${inv.total}</h3>`);
      w.print();
    }
  });

  root.querySelector('#invoiceFilterDate').addEventListener('change', () => refreshHistory());
  root.querySelector('#clearFilter').addEventListener('click', () => {
    root.querySelector('#invoiceFilterDate').value = '';
    refreshHistory();
  });

  const refreshHistory = () => {
    const date = root.querySelector('#invoiceFilterDate').value;
    const rows = date
      ? app.db.query(`SELECT i.*, c.name as customer FROM invoices i LEFT JOIN customers c ON c.id=i.customer_id WHERE i.invoice_date=? ORDER BY i.id DESC`, [date])
      : app.db.query(`SELECT i.*, c.name as customer FROM invoices i LEFT JOIN customers c ON c.id=i.customer_id ORDER BY i.id DESC`);

    root.querySelector('#invoiceRows').innerHTML = rows.map(i => `<tr>
      <td>#${i.id}</td><td>${i.invoice_date}</td><td>${i.customer || '-'}</td><td>৳${i.total}</td><td>৳${i.profit}</td>
      <td><button class="btn-secondary print-invoice" data-id="${i.id}">Print</button></td>
    </tr>`).join('');
  };

  return {
    refresh() {
      const customers = app.db.query('SELECT id,name FROM customers ORDER BY name');
      root.querySelector('#invoiceCustomer').innerHTML = customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      const products = app.db.query('SELECT id,product_name FROM products ORDER BY product_name');
      root.querySelector('#invoiceProduct').innerHTML = products.map(p => `<option value="${p.id}">${p.product_name}</option>`).join('');
      refreshHistory();
      calc();
    },
  };
}
