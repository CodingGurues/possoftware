import { askConfirm } from './ui.js';

export function initInventory(app) {
  const root = document.getElementById('inventory');

  root.innerHTML = `
    <div class="panel">
      <h3>Stock Management</h3>
      <form id="productForm" class="form-grid">
        <input name="name" placeholder="Product Name" required />
        <input name="sku" placeholder="SKU" required />
        <input name="category" placeholder="Category" required />
        <input name="cost_price" type="number" step="0.01" placeholder="Cost Price" required />
        <input name="sale_price" type="number" step="0.01" placeholder="Sale Price" required />
        <input name="quantity" type="number" placeholder="Quantity" required />
        <input name="vendor" placeholder="Vendor" required />
        <input name="low_stock_threshold" type="number" placeholder="Low Stock Threshold" required />
        <button class="btn-primary" type="submit">Add Product</button>
      </form>
    </div>
    <div class="panel table-wrap">
      <table>
        <thead><tr><th>Name</th><th>SKU</th><th>Qty</th><th>Prices</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody id="productRows"></tbody>
      </table>
    </div>
  `;

  root.querySelector('#productForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    app.db.run(
      `INSERT INTO products (name,sku,category,cost_price,sale_price,quantity,vendor,low_stock_threshold)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        f.get('name'), f.get('sku'), f.get('category'), Number(f.get('cost_price')), Number(f.get('sale_price')),
        Number(f.get('quantity')), f.get('vendor'), Number(f.get('low_stock_threshold')),
      ]
    );
    e.target.reset();
    app.notify('Product added');
    app.refreshAll();
  });

  root.addEventListener('click', async e => {
    const id = e.target.dataset.id;
    if (e.target.matches('.delete-product')) {
      const ok = await askConfirm({ title: 'Delete product', text: 'This action cannot be undone.' });
      if (!ok) return;
      app.db.run('DELETE FROM products WHERE id=?', [id]);
      app.notify('Product deleted');
      app.refreshAll();
    }
    if (e.target.matches('.edit-product')) {
      const qty = prompt('New quantity:');
      if (qty === null) return;
      app.db.run('UPDATE products SET quantity=? WHERE id=?', [Number(qty), id]);
      app.notify('Stock updated');
      app.refreshAll();
    }
  });

  return {
    refresh() {
      const rows = app.db.query('SELECT * FROM products ORDER BY id DESC');
      root.querySelector('#productRows').innerHTML = rows.map(p => {
        const cls = p.quantity <= 0 ? 'out-stock' : p.quantity <= p.low_stock_threshold ? 'low-stock' : 'in-stock';
        const txt = p.quantity <= 0 ? 'Out of stock' : p.quantity <= p.low_stock_threshold ? 'Low' : 'In stock';
        return `<tr>
          <td>${p.name}<br/><small>${p.category}</small></td>
          <td>${p.sku}</td>
          <td>${p.quantity}</td>
          <td>৳${p.cost_price} / ৳${p.sale_price}</td>
          <td><span class="badge ${cls}">${txt}</span></td>
          <td><button class="btn-secondary edit-product" data-id="${p.id}">Edit</button> <button class="btn-danger delete-product" data-id="${p.id}">Delete</button></td>
        </tr>`;
      }).join('');
    },
  };
}
