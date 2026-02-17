import { askConfirm } from './ui.js';

const skuRand = () => `SKU-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;

export function initInventory(app) {
  const root = document.getElementById('inventory');
  let imageBase64 = '';

  root.innerHTML = `
    <div class="panel">
      <h3>Full Product Management</h3>
      <form id="productForm" class="product-form">
        <div class="field-grid">
          <div class="field-group">
            <label>Product Code / Bar Code / SKU / IMEI *</label>
            <div class="inline-actions">
              <input name="product_code" placeholder="Enter product code / SKU / IMEI" required />
              <button type="button" id="generateSku" class="btn-secondary">⚙ Generate</button>
            </div>
          </div>
          <div class="field-group"><label>Code (Optional)</label><input name="code_optional" placeholder="Enter optional internal code" /></div>
          <div class="field-group"><label>Product Name / Item Name *</label><input name="product_name" placeholder="Enter product name" required /></div>

          <div class="field-group">
            <label>Category</label>
            <div class="inline-actions">
              <select name="category" id="categorySelect"></select>
              <button type="button" id="addCategory" class="btn-secondary">+ Category</button>
            </div>
          </div>
          <div class="field-group">
            <label>Company Name</label>
            <div class="inline-actions">
              <select name="company" id="companySelect"></select>
              <button type="button" id="addCompany" class="btn-secondary">+ Company</button>
            </div>
          </div>
          <div class="field-group"><label>Keywords / Formula</label><input name="keywords" placeholder="Type keywords / formula" /></div>

          <div class="field-group"><label>Purchase Price *</label><input name="purchase_price" type="number" step="0.01" min="0" placeholder="0.00" required /></div>
          <div class="field-group"><label>Sale Price *</label><input name="sale_price" type="number" step="0.01" min="0" placeholder="0.00" required /></div>
          <div class="field-group"><label>Wholesale Sale Price</label><input name="wholesale_price" type="number" step="0.01" min="0" placeholder="0.00" /></div>

          <div class="field-group"><label>Sale Default Quantities</label><input name="sale_default_qty" type="number" min="0" placeholder="0" value="0" /></div>
          <div class="field-group"><label>Sale Discount (% or Rs)</label><input name="sale_discount" type="number" step="0.01" min="0" placeholder="0" /></div>
          <div class="field-group"><label>Sales Tax (% or Rs)</label><input name="sale_tax" type="number" step="0.01" min="0" placeholder="0" /></div>

          <div class="field-group"><label>Max Order Quantities</label><input name="max_order_qty" type="number" min="0" placeholder="0" /></div>
          <div class="field-group"><label>Box Purchase Price</label><input name="box_purchase_price" type="number" step="0.01" min="0" placeholder="0.00" /></div>
          <div class="field-group"><label>Box Sale Price</label><input name="box_sale_price" type="number" step="0.01" min="0" placeholder="0.00" /></div>

          <div class="field-group"><label>Box Size</label><input name="box_size" type="number" min="0" placeholder="0" /></div>
          <div class="field-group"><label>Minimum Stock Low Notification</label><input name="min_stock_alert" type="number" min="0" placeholder="0" /></div>
          <div class="field-group"><label>Sale Margin %</label><input name="sale_margin" id="saleMarginInput" type="number" step="0.01" min="0" placeholder="Auto calculated" readonly /></div>

          <div class="field-group full"><label>Description</label><textarea name="description" placeholder="Write product description"></textarea></div>
          <div class="field-group"><label>Product Location</label><input name="location" placeholder="e.g. Shelf A-4" /></div>
          <div class="field-group"><label>Product Image Upload</label><input name="image" id="imageInput" type="file" accept="image/*" /></div>
          <div class="field-group"><label>In-Stock Quantity</label><input name="in_stock_display" id="inStockDisplay" value="0" readonly /></div>

          <div class="field-group"><label>Add New Stock</label><input name="add_stock" type="number" min="0" value="0" placeholder="0" /></div>
          <div class="field-group checkbox-wrap"><label><input name="check_recipe" type="checkbox" /> Check Recipe</label></div>
          <div class="field-group"><img id="imagePreview" class="image-preview hidden" alt="Product preview" /></div>
        </div>
        <button class="btn-primary" type="submit">💾 Save Product</button>
      </form>
    </div>

    <div class="panel table-wrap">
      <table>
        <thead><tr><th>Product</th><th>Code</th><th>Category/Company</th><th>Prices</th><th>Stock</th><th>Actions</th></tr></thead>
        <tbody id="productRows"></tbody>
      </table>
    </div>
  `;

  const form = root.querySelector('#productForm');
  const purchaseInput = form.querySelector('[name="purchase_price"]');
  const saleInput = form.querySelector('[name="sale_price"]');

  const recalcMargin = () => {
    const purchase = Number(purchaseInput.value || 0);
    const sale = Number(saleInput.value || 0);
    const margin = purchase > 0 ? ((sale - purchase) / purchase) * 100 : 0;
    form.querySelector('#saleMarginInput').value = margin ? margin.toFixed(2) : '0';
  };

  purchaseInput.addEventListener('input', recalcMargin);
  saleInput.addEventListener('input', recalcMargin);

  form.querySelector('#generateSku').addEventListener('click', () => {
    let code = skuRand();
    while (app.db.queryOne('SELECT id FROM products WHERE product_code=?', [code]).id) code = skuRand();
    form.querySelector('[name="product_code"]').value = code;
    app.notify('Unique product code generated');
  });

  form.querySelector('#addCategory').addEventListener('click', () => {
    const name = prompt('Enter new category name');
    if (!name) return;
    app.db.run('INSERT OR IGNORE INTO categories(name) VALUES(?)', [name.trim()]);
    app.notify('Category added');
    app.refreshAll();
  });

  form.querySelector('#addCompany').addEventListener('click', () => {
    const name = prompt('Enter new company name');
    if (!name) return;
    app.db.run('INSERT OR IGNORE INTO companies(name) VALUES(?)', [name.trim()]);
    app.notify('Company added');
    app.refreshAll();
  });

  form.querySelector('#imageInput').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      imageBase64 = String(ev.target.result || '');
      const preview = form.querySelector('#imagePreview');
      preview.src = imageBase64;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(form);

    const productCode = String(f.get('product_code') || '').trim();
    const productName = String(f.get('product_name') || '').trim();
    const purchasePrice = Number(f.get('purchase_price') || 0);
    const salePrice = Number(f.get('sale_price') || 0);

    if (!productCode || !productName || purchasePrice <= 0 || salePrice <= 0) {
      app.notify('Please fill all required fields with valid values');
      return;
    }

    const addStock = Number(f.get('add_stock') || 0);
    const saleMargin = purchasePrice > 0 ? ((salePrice - purchasePrice) / purchasePrice) * 100 : 0;

    try {
      app.db.run(
        `INSERT INTO products (
          product_code, code_optional, product_name, category, company, keywords,
          purchase_price, sale_price, wholesale_price, sale_default_qty, sale_discount, sale_tax,
          max_order_qty, box_purchase_price, box_sale_price, box_size, min_stock_alert,
          sale_margin, description, location, image, in_stock, check_recipe
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          productCode,
          String(f.get('code_optional') || '').trim(),
          productName,
          String(f.get('category') || ''),
          String(f.get('company') || ''),
          String(f.get('keywords') || '').trim(),
          purchasePrice,
          salePrice,
          Number(f.get('wholesale_price') || 0),
          Number(f.get('sale_default_qty') || 0),
          Number(f.get('sale_discount') || 0),
          Number(f.get('sale_tax') || 0),
          Number(f.get('max_order_qty') || 0),
          Number(f.get('box_purchase_price') || 0),
          Number(f.get('box_sale_price') || 0),
          Number(f.get('box_size') || 0),
          Number(f.get('min_stock_alert') || 0),
          Number(saleMargin.toFixed(2)),
          String(f.get('description') || '').trim(),
          String(f.get('location') || '').trim(),
          imageBase64,
          addStock,
          f.get('check_recipe') ? 1 : 0,
        ]
      );

      const newP = app.db.queryOne('SELECT id,in_stock,min_stock_alert FROM products WHERE product_code=?', [productCode]);
      if (addStock > 0 && newP.id) {
        app.db.run('INSERT INTO stock_history (product_id,change_qty,date) VALUES (?,?,?)', [newP.id, addStock, new Date().toISOString()]);
      }
      if (newP.id && Number(newP.in_stock) <= Number(newP.min_stock_alert || 0)) {
        alert('Low stock alert: new product is below minimum stock threshold.');
      }

      form.reset();
      imageBase64 = '';
      form.querySelector('#imagePreview').classList.add('hidden');
      form.querySelector('#inStockDisplay').value = '0';
      recalcMargin();
      app.notify('Product saved successfully');
      app.refreshAll();
    } catch {
      app.notify('Failed to save product. Product code must be unique.');
    }
  });

  root.addEventListener('click', async e => {
    const id = e.target.dataset.id;
    if (e.target.matches('.delete-product')) {
      if (!(await askConfirm({ title: 'Delete product', text: 'This action cannot be undone.' }))) return;
      app.db.run('DELETE FROM products WHERE id=?', [id]);
      app.notify('Product deleted');
      app.refreshAll();
    }
    if (e.target.matches('.add-stock')) {
      const qty = Number(prompt('Add stock quantity:', '0') || 0);
      if (!qty || qty < 0) return;
      app.db.run('UPDATE products SET in_stock = in_stock + ? WHERE id=?', [qty, id]);
      app.db.run('INSERT INTO stock_history (product_id,change_qty,date) VALUES (?,?,?)', [id, qty, new Date().toISOString()]);
      const p = app.db.queryOne('SELECT product_name,in_stock,min_stock_alert FROM products WHERE id=?', [id]);
      if (Number(p.in_stock) <= Number(p.min_stock_alert || 0)) alert(`Low stock alert for ${p.product_name}`);
      app.notify('Stock increased');
      app.refreshAll();
    }
  });

  return {
    refresh() {
      const categories = app.db.query('SELECT name FROM categories ORDER BY name');
      const companies = app.db.query('SELECT name FROM companies ORDER BY name');
      form.querySelector('#categorySelect').innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
      form.querySelector('#companySelect').innerHTML = companies.map(c => `<option value="${c.name}">${c.name}</option>`).join('');

      const rows = app.db.query('SELECT * FROM products ORDER BY id DESC');
      root.querySelector('#productRows').innerHTML = rows.map(p => {
        const cls = p.in_stock <= 0 ? 'out-stock' : p.in_stock <= (p.min_stock_alert || 0) ? 'low-stock' : 'in-stock';
        const txt = p.in_stock <= 0 ? 'Out' : p.in_stock <= (p.min_stock_alert || 0) ? 'Low' : 'OK';
        return `<tr>
          <td>${p.product_name}<br/><small>${p.location || '-'}</small></td>
          <td>${p.product_code}</td>
          <td>${p.category || '-'} / ${p.company || '-'}</td>
          <td>Buy ৳${p.purchase_price || 0} | Sell ৳${p.sale_price || 0}<br/><small>Margin ${Number(p.sale_margin || 0).toFixed(2)}%</small></td>
          <td>${p.in_stock || 0} <span class="badge ${cls}">${txt}</span></td>
          <td><button class="btn-secondary add-stock" data-id="${p.id}">+ Stock</button> <button class="btn-danger delete-product" data-id="${p.id}">Delete</button></td>
        </tr>`;
      }).join('');
    },
  };
}
