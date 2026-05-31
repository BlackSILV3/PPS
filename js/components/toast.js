/* ═══════════════════════════════════════
   LIFEPLAN — TOAST NOTIFICATIONS
   js/components/toast.js
═══════════════════════════════════════ */
const Toast = (() => {
  const show = (msg, type = 'default', duration = 2500) => {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
      t.style.transition = 'all .25s ease';
      setTimeout(() => t.remove(), 260);
    }, duration);
  };
  const success = (msg) => show(msg, 'success');
  const error   = (msg) => show(msg, 'error');
  const warning = (msg) => show(msg, 'warning');
  return { show, success, error, warning };
})();


/* ═══════════════════════════════════════
   LIFEPLAN — CONFIRM DIALOG
   js/components/confirm.js
═══════════════════════════════════════ */
const Confirm = (() => {
  let _resolve = null;

  const show = ({ icon = '⚠️', title, msg, confirmLabel = 'CONFIRM', danger = true }) => {
    return new Promise(resolve => {
      _resolve = resolve;
      document.getElementById('conf-icon').textContent  = icon;
      document.getElementById('conf-title').textContent = title;
      document.getElementById('conf-msg').textContent   = msg;
      const btn = document.getElementById('conf-btn');
      btn.textContent = confirmLabel;
      btn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
      document.getElementById('ov-confirm').classList.add('open');
    });
  };

  const resolve = (val) => {
    document.getElementById('ov-confirm').classList.remove('open');
    if (_resolve) { _resolve(val); _resolve = null; }
  };

  return { show, resolve };
})();
