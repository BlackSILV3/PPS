/* ═══════════════════════════════════════
   LIFEPLAN — STORAGE
   js/core/storage.js
═══════════════════════════════════════ */
const Storage = (() => {
  const PREFIX = 'lp6_';

  const get = (key) => {
    try { return JSON.parse(localStorage.getItem(PREFIX + key)); }
    catch(e) { return null; }
  };
  const set = (key, val) => {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); return true; }
    catch(e) { console.error('Storage error:', e); return false; }
  };
  const del = (key) => localStorage.removeItem(PREFIX + key);
  const clear = () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  };

  // Export all data as JSON string
  const exportAll = () => {
    const data = {};
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => { data[k.replace(PREFIX,'')] = JSON.parse(localStorage.getItem(k)); });
    return JSON.stringify(data, null, 2);
  };

  // Import from JSON string
  const importAll = (jsonStr) => {
    try {
      const data = JSON.parse(jsonStr);
      Object.entries(data).forEach(([k,v]) => set(k, v));
      return true;
    } catch(e) { return false; }
  };

  return { get, set, del, clear, exportAll, importAll };
})();
