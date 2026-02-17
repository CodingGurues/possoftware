import { askConfirm } from './ui.js';

export function initCustomers(app) {
  const root = document.getElementById('customers');
  root.innerHTML = `
    <div class="panel">
      <h3>Customer Management</h3>
      <form id="customerForm" class="form-grid">
        <input name="name" placeholder="Name" required />
        <input name="phone" placeholder="Phone" required />
        <input name="email" type="email" placeholder="Email" required />
        <input name="address" placeholder="Address" required />
        <button class="btn-primary" type="submit">Add Customer</button>
      </form>
    </div>
    <div class="panel table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Phone</th><th>Total Purchases</th><th>Due</th><th>History</th><th>Actions</th></tr></thead>
        <tbody id="customerRows"></tbody>
      </table>
    </div>`;

  root.querySelector('#customerForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    app.db.run('INSERT INTO customers (name,phone,email,address) VALUES (?,?,?,?)', [f.get('name'), f.get('phone'), f.get('email'), f.get('address')]);
    e.target.reset();
    app.notify('Customer added');
    app.refreshAll();
  });

  root.addEventListener('click', async e => {
    const id = e.target.dataset.id;
    if (e.target.matches('.delete-customer')) {
      if (!(await askConfirm({ title: 'Delete customer', text: 'Delete this customer profile?' }))) return;
      app.db.run('DELETE FROM customers WHERE id=?', [id]);
      app.notify('Customer deleted');
      app.refreshAll();
    }
    if (e.target.matches('.customer-history')) {
      const data = app.db.query('SELECT id,total,invoice_date FROM invoices WHERE customer_id=? ORDER BY id DESC', [id]);
      alert(data.length ? data.map(x => `#${x.id} - ৳${x.total} (${x.invoice_date})`).join('\n') : 'No purchases yet');
    }
  });

  return {
    refresh() {
      const rows = app.db.query('SELECT * FROM customers ORDER BY id DESC');
      root.querySelector('#customerRows').innerHTML = rows.map(c => `<tr>
        <td>${c.name}<br/><small>${c.email}</small></td>
        <td>${c.phone}</td>
        <td>৳${c.total_purchases}</td>
        <td>৳${c.due_amount}</td>
        <td><button data-id="${c.id}" class="btn-secondary customer-history">View</button></td>
        <td><button data-id="${c.id}" class="btn-danger delete-customer">Delete</button></td>
      </tr>`).join('');
    },
  };
}
