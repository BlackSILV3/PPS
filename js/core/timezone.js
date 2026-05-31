/* ═══════════════════════════════════════
   LIFEPLAN — TIMEZONE & DATE UTILS
   js/core/timezone.js
═══════════════════════════════════════ */
const TZ = (() => {
  const getTZ = () => (State.profile && State.profile.tz) || 'Africa/Lagos';

  // Get a Date object whose .getHours()/.getDate() etc reflect the target timezone
  const nowInTZ = (tz) => {
    try {
      return new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
    } catch(e) { return new Date(); }
  };

  // Convert any Date to the target timezone's equivalent local time
  const dateInTZ = (date, tz) => {
    try {
      return new Date(date.toLocaleString('en-US', { timeZone: tz }));
    } catch(e) { return date; }
  };

  // Get now in user's chosen timezone
  const now = () => nowInTZ(getTZ());

  // Format: "05:30"
  const formatTime = (d) =>
    String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');

  // Format: "Thursday · 29 May 2026"
  const formatFullDate = (d) => {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return `${days[d.getDay()]} · ${d.getDate()} ${State.MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`;
  };

  // Format: "29 MAY 2026"
  const formatShortDate = (d) =>
    `${d.getDate()} ${State.MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;

  // Format: "MAY 2026"
  const formatMonthYear = (d) =>
    `${State.MONTH_FULL[d.getMonth()].toUpperCase()} ${d.getFullYear()}`;

  // Today's day-of-week index Mon=0 … Sun=6
  const todayDOW = () => {
    const d = now().getDay(); // 0=Sun
    return d === 0 ? 6 : d - 1;
  };

  // Midnight-only date (no time component) for comparison
  const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  // Is a given date today?
  const isToday = (d) => {
    const n = now();
    return d.getDate() === n.getDate() &&
           d.getMonth() === n.getMonth() &&
           d.getFullYear() === n.getFullYear();
  };

  // Is a given date in the future?
  const isFuture = (d) => {
    const nm = midnight(now());
    const dm = midnight(d);
    return dm > nm;
  };

  // Is a given date in the past?
  const isPast = (d) => {
    const nm = midnight(now());
    const dm = midnight(d);
    return dm < nm;
  };

  // Days between two dates (ignoring time)
  const daysBetween = (a, b) => {
    const am = midnight(a), bm = midnight(b);
    return Math.round((bm - am) / 86400000);
  };

  // Get the real calendar date for a timetable slot
  // wk=0 is creation week, dy=0 is Monday
  const slotDate = (tbl, wk, dy) => {
    const tz = getTZ();
    const created = dateInTZ(new Date(tbl.createdAt), tz);
    const cm = midnight(created);
    const crDOW = cm.getDay() === 0 ? 6 : cm.getDay() - 1; // Mon=0
    const weekStart = new Date(cm);
    weekStart.setDate(cm.getDate() - crDOW + wk * 7);
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + dy);
    return d;
  };

  // Get which week/day index corresponds to today for a given table
  const getTodayWkDay = (tbl) => {
    const tz = getTZ();
    const n = nowInTZ(tz);
    const created = dateInTZ(new Date(tbl.createdAt), tz);
    const nm = midnight(n);
    const cm = midnight(created);
    const diffDays = Math.max(0, Math.floor((nm - cm) / 86400000));
    const wk = Math.floor(diffDays / 7);
    const dy = todayDOW();
    return { wk, dy };
  };

  // How many total days has a table existed up to today?
  const tableAgeDays = (tbl) => {
    const tz = getTZ();
    const n = nowInTZ(tz);
    const created = dateInTZ(new Date(tbl.createdAt), tz);
    return Math.max(1, Math.floor((midnight(n) - midnight(created)) / 86400000) + 1);
  };

  // Greeting based on hour
  const greeting = () => {
    const h = now().getHours();
    if (h < 12) return 'GOOD MORNING';
    if (h < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  return {
    getTZ, nowInTZ, dateInTZ, now, formatTime, formatFullDate,
    formatShortDate, formatMonthYear, todayDOW, midnight, isToday,
    isFuture, isPast, daysBetween, slotDate, getTodayWkDay,
    tableAgeDays, greeting,
  };
})();
