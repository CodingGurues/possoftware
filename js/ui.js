export const fmt = n => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export function showToast(msg) {
  const root = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

export function askConfirm({ title, text }) {
  return new Promise(resolve => {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmText').textContent = text;
    modal.classList.remove('hidden');

    const cleanup = result => {
      modal.classList.add('hidden');
      ok.onclick = null;
      cancel.onclick = null;
      resolve(result);
    };

    const ok = document.getElementById('confirmOk');
    const cancel = document.getElementById('confirmCancel');
    ok.onclick = () => cleanup(true);
    cancel.onclick = () => cleanup(false);
  });
}

export function cardMetric(label, value) {
  return `<div class="card"><h4>${label}</h4><div class="metric">${value}</div></div>`;
}
