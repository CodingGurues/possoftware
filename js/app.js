import { PosDatabase } from './db.js';
import { showToast } from './ui.js';
import { initDashboard } from './dashboard.js';
import { initInventory } from './inventory.js';
import { initCustomers } from './customers.js';
import { initInvoices } from './invoices.js';
import { initVendors } from './vendors.js';
import { initReports } from './reports.js';

const SQL = await initSqlJs({ locateFile: f => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${f}` });

const app = {
  notify: showToast,
  db: new PosDatabase(SQL, showToast),
  modules: [],
  refreshAll() {
    this.modules.forEach(m => m.refresh());
  },
};

await app.db.init();

app.modules = [
  initDashboard(app),
  initInventory(app),
  initCustomers(app),
  initInvoices(app),
  initVendors(app),
  initReports(app),
];
app.refreshAll();

const viewTitle = document.getElementById('viewTitle');
document.getElementById('navLinks').addEventListener('click', e => {
  if (!e.target.dataset.view) return;
  document.querySelectorAll('.nav-links button').forEach(b => b.classList.toggle('active', b === e.target));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(e.target.dataset.view).classList.add('active');
  viewTitle.textContent = e.target.textContent;
});

document.getElementById('themeToggle').addEventListener('click', () => {
  const body = document.body;
  const next = body.dataset.theme === 'dark' ? 'light' : 'dark';
  body.dataset.theme = next;
  localStorage.setItem('theme', next);
});
if (localStorage.getItem('theme')) document.body.dataset.theme = localStorage.getItem('theme');

document.getElementById('exportDb').addEventListener('click', () => {
  const data = app.db.exportBinary();
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pos-backup.sqlite';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('importDb').addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  app.db.importBinary(await file.arrayBuffer());
  app.refreshAll();
});

document.getElementById('searchInput').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  const active = document.querySelector('.view.active');
  active.querySelectorAll('tbody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});

showToast('POS loaded successfully');
