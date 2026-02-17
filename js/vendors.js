import { askConfirm } from './ui.js';

export function initVendors(app) {
  const root = document.getElementById('vendors');
  root.innerHTML = `
    <div class="panel">
      <h3>Vendor Management + Purchase Entry</h3>
      <form id="vendorForm" class="form-grid">
        <input name="name" placeholder="Vendor Name" required />
        <input name="phone" placeholder="Phone" required />
        <input name="email" placeholder="Email" required />
        <button class="btn-primary" type="submit">Add Vendor</button>
      </form>
      <hr />
      <form id="purchaseForm" class="form-grid">
        <select name="vendor_id" id="purchaseVendor" required></select>
        <select name="product_id" id="purchaseProduct" required></select>
        <input name="quantity" type="number" placeholder="Quantity" required />
        <input name="cost" type="number" step="0.01" placeholder="Total Cost" required />
        <button class="btn-primary" type="submit">Record Purchase</button>
      </form>
    </div>
    <div class="panel table-wrap">
      <table>
        <thead><tr><th>Vendor</th><th>Contact</th><th>Total Purchase</th><th>History</th><th>Actions</th></tr></thead>
        <tbody id="vendorRows"></tbody>
      </table>
    </div>`;

  root.querySelector('#vendorForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    app.db.run('INSERT INTO vendors (name,phone,email) VALUES (?,?,?)', [f.get('name'), f.get('phone'), f.get('email')]);
    e.target.reset();
    app.notify('Vendor added');
    app.refreshAll();
  });

  root.querySelector('#purchaseForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const vendorId = Number(f.get('vendor_id'));
    const productId = Number(f.get('product_id'));
    const qty = Number(f.get('quantity'));
    const cost = Number(f.get('cost'));

    app.db.run('UPDATE products SET quantity = quantity + ? WHERE id=?', [qty, productId]);
    app.db.run('UPDATE vendors SET total_purchase_amount = total_purchase_amount + ? WHERE id=?', [cost, vendorId]);
    app.db.run('INSERT INTO vendor_purchases (vendor_id,product_id,quantity,cost,purchase_date) VALUES (?,?,?,?,?)', [vendorId, productId, qty, cost, new Date().toISOString().slice(0, 10)]);
    e.target.reset();
    app.notify('Purchase recorded and stock updated');
    app.refreshAll();
  });

  root.addEventListener('click', async e => {
    const id = e.target.dataset.id;
    if (e.target.matches('.vendor-history')) {
      const data = app.db.query(`SELECT vp.purchase_date,p.name as product,vp.quantity,vp.cost
                                 FROM vendor_purchases vp JOIN products p ON vp.product_id=p.id
                                 WHERE vp.vendor_id=? ORDER BY vp.id DESC`, [id]);
      alert(data.length ? data.map(x => `${x.purchase_date}: ${x.product} x${x.quantity} (৳${x.cost})`).join('\n') : 'No vendor purchases yet');
    }
    if (e.target.matches('.delete-vendor')) {
      if (!(await askConfirm({ title: 'Delete vendor', text: 'Delete this vendor?' }))) return;
      app.db.run('DELETE FROM vendors WHERE id=?', [id]);
      app.notify('Vendor deleted');
      app.refreshAll();
    }
  });

  return {
    refresh() {
      const vendors = app.db.query('SELECT * FROM vendors ORDER BY id DESC');
      root.querySelector('#vendorRows').innerHTML = vendors.map(v => `<tr>
          <td>${v.name}</td>
          <td>${v.phone}<br/><small>${v.email}</small></td>
          <td>৳${v.total_purchase_amount}</td>
          <td><button class="btn-secondary vendor-history" data-id="${v.id}">View</button></td>
          <td><button class="btn-danger delete-vendor" data-id="${v.id}">Delete</button></td>
        </tr>`).join('');

      root.querySelector('#purchaseVendor').innerHTML = vendors.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
      const products = app.db.query('SELECT id,name FROM products ORDER BY name');
      root.querySelector('#purchaseProduct').innerHTML = products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    },
  };
}
