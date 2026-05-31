/* ═══════════════════════════════════════
   LIFEPLAN — BADGES ENGINE
   js/features/badges.js
═══════════════════════════════════════ */
const Badges = (() => {
  const check = () => {
    const s = State;
    const newlyEarned = [];
    State.BADGE_DEFS.forEach(def => {
      if (s.badges[def.id]) return; // already earned
      try {
        if (def.check(s)) {
          s.badges[def.id] = { earnedAt: new Date().toISOString() };
          newlyEarned.push(def);
        }
      } catch(e) {}
    });
    if (newlyEarned.length > 0) {
      State.save();
      newlyEarned.forEach(b => showBadgePopup(b));
    }
    return newlyEarned;
  };

  const showBadgePopup = (badge) => {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      z-index:9999;background:var(--bg2);border:1px solid var(--acc-b);
      border-radius:16px;padding:28px 24px;text-align:center;
      box-shadow:0 8px 40px rgba(0,0,0,.7);animation:badgePop .4s cubic-bezier(.34,1.56,.64,1) both`;
    el.innerHTML = `
      <div style="font-size:52px;margin-bottom:10px">${badge.icon}</div>
      <div style="font-family:var(--font-m);font-size:8px;color:var(--acc);letter-spacing:2px;margin-bottom:6px">BADGE UNLOCKED</div>
      <div style="font-size:22px;font-weight:800;letter-spacing:1px;margin-bottom:4px">${badge.name}</div>
      <div style="font-family:var(--font-m);font-size:9px;color:var(--tx2);letter-spacing:.5px">${badge.desc}</div>`;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(() => el.remove(), 320); }, 2800);
    // speak it
    if (State.alertCfg?.voiceEnabled !== false) {
      setTimeout(() => Widget.speak(`Congratulations! You earned the ${badge.name} badge!`), 300);
    }
  };

  const getAll = () => State.BADGE_DEFS.map(def => ({
    ...def,
    earned: !!State.badges[def.id],
    earnedAt: State.badges[def.id]?.earnedAt || null,
  }));

  const getEarned = () => getAll().filter(b => b.earned);
  const getCount  = () => getEarned().length;

  // Badge check implementations
  const getTotalDone = () => {
    let count = 0;
    Object.values(State.schedState).forEach(tbl =>
      Object.values(tbl).forEach(wk =>
        Object.values(wk).forEach(dy =>
          dy.forEach(s => { if(s===1) count++; })
        )
      )
    );
    return count;
  };

  const hasPerfectDay = () => {
    return Object.entries(State.schedState).some(([id, tbl]) => {
      const blks = State.blocks[id] || [];
      if(blks.length === 0) return false;
      return Object.values(tbl).some(wk =>
        Object.values(wk).some(dy =>
          dy.length === blks.length && dy.every(s => s === 1)
        )
      );
    });
  };

  const getMaxStreakAll = () => {
    let max = 0;
    State.tables.filter(t => t.type !== 'timetable').forEach(t => {
      const s = State.strkState[t.id] || [];
      let cur = 0, best = 0;
      s.forEach(v => { if(v===1){cur++;best=Math.max(best,cur);}else cur=0; });
      max = Math.max(max, best);
    });
    return max;
  };

  const hasEarlyBird = () => {
    // check if first block ever marked before 6AM — we approximate with any completion
    return getTotalDone() > 0;
  };

  const hasFullWeek = () => {
    return Object.entries(State.schedState).some(([id, tbl]) => {
      const blks = State.blocks[id] || [];
      if(blks.length === 0) return false;
      return Object.values(tbl).some(wk => {
        const days = Object.values(wk);
        return days.length >= 5 && days.every(dy =>
          dy.length === blks.length && dy.filter(s=>s===1).length >= Math.ceil(blks.length * 0.6)
        );
      });
    });
  };

  // Override stub functions in BADGE_DEFS
  State.BADGE_DEFS.forEach(def => {
    if(def.id === 'first_tick')   def.check = () => getTotalDone() >= 1;
    if(def.id === 'day_complete') def.check = () => hasPerfectDay();
    if(def.id === 'streak_3')     def.check = () => getMaxStreakAll() >= 3;
    if(def.id === 'streak_7')     def.check = () => getMaxStreakAll() >= 7;
    if(def.id === 'streak_14')    def.check = () => getMaxStreakAll() >= 14;
    if(def.id === 'streak_30')    def.check = () => getMaxStreakAll() >= 30;
    if(def.id === 'week_done')    def.check = () => hasFullWeek();
    if(def.id === 'tables_3')     def.check = () => State.tables.length >= 3;
    if(def.id === 'consistent')   def.check = () => Stats.getConsistencyScore() >= 80;
    if(def.id === 'early_bird')   def.check = () => hasEarlyBird();
  });

  return { check, getAll, getEarned, getCount, showBadgePopup };
})();


/* ═══════════════════════════════════════
   LIFEPLAN — DAILY QUOTES
   js/features/quotes.js
═══════════════════════════════════════ */
const Quotes = (() => {
  const getToday = () => {
    const day = TZ.now().getDate() + TZ.now().getMonth() * 31;
    return State.QUOTES[day % State.QUOTES.length];
  };
  const getRandom = () => State.QUOTES[Math.floor(Math.random() * State.QUOTES.length)];
  return { getToday, getRandom };
})();


/* ═══════════════════════════════════════
   LIFEPLAN — STATS ENGINE
   js/features/stats.js
═══════════════════════════════════════ */
const Stats = (() => {
  // Consistency score 0–100 based on last 30 days
  const getConsistencyScore = () => {
    const ttTables = State.tables.filter(t => !t.archived && t.type === 'timetable');
    if (ttTables.length === 0) return 0;
    let totalPct = 0, days = 0;
    ttTables.forEach(tbl => {
      const blks = State.blocks[tbl.id] || [];
      if (blks.length === 0) return;
      const { wk: todayWk, dy: todayDy } = TZ.getTodayWkDay(tbl);
      // Last 30 days
      for (let w = Math.max(0, todayWk - 4); w <= todayWk; w++) {
        for (let d = 0; d < 7; d++) {
          if (w === todayWk && d > todayDy) continue;
          const dt = TZ.slotDate(tbl, w, d);
          if (TZ.isFuture(dt)) continue;
          const st = (State.schedState[tbl.id] || {})[w]?.[d] || [];
          const done = st.filter(s => s === 1).length;
          totalPct += done / blks.length * 100;
          days++;
        }
      }
    });
    return days > 0 ? Math.round(totalPct / days) : 0;
  };

  // Block statistics for a table
  const getBlockStats = (tblId) => {
    const blks = State.blocks[tblId] || [];
    const tbl  = State.tables.find(t => t.id === tblId);
    if (!tbl || blks.length === 0) return [];
    const stats = blks.map((b, i) => ({ ...b, done: 0, miss: 0, total: 0 }));
    const ss = State.schedState[tblId] || {};
    Object.values(ss).forEach(wkObj =>
      Object.values(wkObj).forEach(dayArr => {
        dayArr.forEach((s, i) => {
          if (i >= stats.length) return;
          stats[i].total++;
          if (s === 1) stats[i].done++;
          if (s === 2) stats[i].miss++;
        });
      })
    );
    return stats;
  };

  // Weekly summary data
  const getWeeklySummary = (tbl, wk) => {
    const blks = State.blocks[tbl.id] || [];
    if (blks.length === 0) return null;
    let totalDone = 0, totalBlocks = 0, bestDay = -1, bestDayDone = -1;
    const dayPcts = [];
    for (let d = 0; d < 7; d++) {
      const dt = TZ.slotDate(tbl, wk, d);
      if (TZ.isFuture(dt)) { dayPcts.push(null); continue; }
      const st = (State.schedState[tbl.id] || {})[wk]?.[d] || [];
      const done = st.filter(s => s === 1).length;
      const pct  = blks.length > 0 ? Math.round(done / blks.length * 100) : 0;
      dayPcts.push(pct);
      totalDone   += done;
      totalBlocks += blks.length;
      if (done > bestDayDone) { bestDayDone = done; bestDay = d; }
    }
    const overallPct = totalBlocks > 0 ? Math.round(totalDone / totalBlocks * 100) : 0;
    return { overallPct, dayPcts, bestDay, totalDone, totalBlocks };
  };

  // Auto-generate weekly review text
  const generateReviewText = (tbl, wk) => {
    const summary = getWeeklySummary(tbl, wk);
    if (!summary) return [];
    const insights = [];
    insights.push(`You completed ${summary.overallPct}% of your schedule this week.`);
    if (summary.bestDay >= 0)
      insights.push(`Your best day was ${State.DAY_FULL[summary.bestDay]} with ${summary.dayPcts[summary.bestDay]}% completion.`);
    const missed = summary.dayPcts.filter(p => p !== null && p < 50).length;
    if (missed > 0)
      insights.push(`${missed} day${missed>1?'s':''} fell below 50%. Focus on consistency next week.`);
    if (summary.overallPct >= 80)
      insights.push('Outstanding week! Keep up this momentum.');
    else if (summary.overallPct >= 50)
      insights.push('Good effort. Push for 80% next week.');
    else
      insights.push('Tough week. Small steps forward still count.');
    return insights;
  };

  // Get best and worst week
  const getBestWorstWeek = (tbl) => {
    const blks = State.blocks[tbl.id] || [];
    if (blks.length === 0) return { best: null, worst: null };
    const { wk: todayWk } = TZ.getTodayWkDay(tbl);
    let bestWk = 0, bestPct = -1, worstWk = 0, worstPct = 101;
    for (let w = 0; w <= todayWk; w++) {
      const s = getWeeklySummary(tbl, w);
      if (!s || s.totalBlocks === 0) continue;
      if (s.overallPct > bestPct)  { bestPct = s.overallPct;  bestWk = w; }
      if (s.overallPct < worstPct) { worstPct = s.overallPct; worstWk = w; }
    }
    return { best: { wk: bestWk, pct: bestPct }, worst: { wk: worstWk, pct: worstPct } };
  };

  return { getConsistencyScore, getBlockStats, getWeeklySummary, generateReviewText, getBestWorstWeek };
})();


/* ═══════════════════════════════════════
   LIFEPLAN — HEATMAP
   js/features/heatmap.js
═══════════════════════════════════════ */
const Heatmap = (() => {
  // Returns array of {date, pct} for last N days
  const getData = (tbl, days = 84) => {
    const blks = State.blocks[tbl.id] || [];
    if (blks.length === 0) return [];
    const result = [];
    const { wk: todayWk, dy: todayDy } = TZ.getTodayWkDay(tbl);
    for (let w = 0; w <= todayWk; w++) {
      for (let d = 0; d < 7; d++) {
        const dt = TZ.slotDate(tbl, w, d);
        if (TZ.isFuture(dt)) continue;
        const st   = (State.schedState[tbl.id] || {})[w]?.[d] || [];
        const done = st.filter(s => s === 1).length;
        const pct  = Math.round(done / blks.length * 100);
        result.push({ date: dt, pct, done, total: blks.length });
      }
    }
    return result.slice(-days);
  };

  const pctToClass = (pct) => {
    if (pct === 0)   return 'hm-0';
    if (pct < 50)    return 'hm-25';
    if (pct < 75)    return 'hm-50';
    if (pct < 100)   return 'hm-75';
    return 'hm-100';
  };

  return { getData, pctToClass };
})();


/* ═══════════════════════════════════════
   LIFEPLAN — NOTES
   js/features/notes.js
═══════════════════════════════════════ */
const Notes = (() => {
  // Key: tblId + '_' + wk + '_' + dy
  const key = (tblId, wk, dy) => `${tblId}_${wk}_${dy}`;

  const get = (tblId, wk, dy) => (State.notes[key(tblId, wk, dy)] || '');

  const set = (tblId, wk, dy, text) => {
    State.notes[key(tblId, wk, dy)] = text;
    State.save();
  };

  return { get, set };
})();


/* ═══════════════════════════════════════
   LIFEPLAN — LOCK (PIN)
   js/features/lock.js
═══════════════════════════════════════ */
const Lock = (() => {
  // Simple hash (not cryptographic — just obscurity for a local app)
  const hash = (pin) => {
    let h = 0;
    for (let i = 0; i < pin.length; i++) {
      h = ((h << 5) - h) + pin.charCodeAt(i);
      h |= 0;
    }
    return String(Math.abs(h));
  };

  const isEnabled = () => !!State.pinHash;

  const setPin = (pin) => {
    State.pinHash = hash(pin);
    State.save();
    Toast.success('PIN set successfully');
  };

  const removePin = (pin) => {
    if (hash(pin) !== State.pinHash) { Toast.error('Wrong PIN'); return false; }
    State.pinHash = null;
    State.save();
    Toast.success('PIN removed');
    return true;
  };

  const verify = (pin) => hash(pin) === State.pinHash;

  const showLockScreen = () => new Promise(resolve => {
    if (!isEnabled()) { resolve(true); return; }
    document.getElementById('lock-screen').style.display = 'flex';
    let entered = '';
    const dots = document.querySelectorAll('.pin-dot');

    const update = () => {
      dots.forEach((d, i) => d.classList.toggle('filled', i < entered.length));
    };
    const onKey = (val) => {
      if (val === 'del') { entered = entered.slice(0,-1); update(); return; }
      if (entered.length >= 4) return;
      entered += val;
      update();
      if (entered.length === 4) {
        setTimeout(() => {
          if (verify(entered)) {
            document.getElementById('lock-screen').style.display = 'none';
            resolve(true);
          } else {
            dots.forEach(d => { d.classList.remove('filled'); d.classList.add('error'); });
            setTimeout(() => dots.forEach(d => { d.classList.remove('error'); d.classList.remove('filled'); }), 500);
            entered = '';
            Toast.error('Wrong PIN. Try again.');
          }
        }, 80);
      }
    };
    // Expose for HTML buttons
    window._pinKeypress = onKey;
  });

  return { isEnabled, setPin, removePin, verify, showLockScreen };
})();


/* ═══════════════════════════════════════
   LIFEPLAN — EXPORT
   js/features/export.js
═══════════════════════════════════════ */
const Export = (() => {
  // Backup all data as downloadable JSON file
  const backupData = () => {
    const data = Storage.exportAll();
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `lifeplan_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('Backup downloaded');
  };

  // Restore from JSON file
  const restoreData = (file) => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const ok = Storage.importAll(e.target.result);
      if (ok) { Toast.success('Data restored! Reloading…'); setTimeout(() => location.reload(), 1200); }
      else    { Toast.error('Invalid backup file'); }
      resolve(ok);
    };
    reader.readAsText(file);
  });

  // Simple text export of today's schedule
  const exportTodayText = (tbl) => {
    const blks  = State.blocks[tbl.id] || [];
    const { wk, dy } = TZ.getTodayWkDay(tbl);
    const st    = (State.schedState[tbl.id] || {})[wk]?.[dy] || [];
    const date  = TZ.formatFullDate(TZ.slotDate(tbl, wk, dy));
    let text = `LIFEPLAN — ${tbl.name.toUpperCase()}\n${date}\n${'─'.repeat(40)}\n`;
    blks.forEach((b, i) => {
      const s = st[i] || 0;
      const mark = s === 1 ? '✓' : s === 2 ? '✗' : '○';
      text += `\n${mark}  ${b.start}–${b.end}  ${b.label}`;
    });
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${tbl.name.replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('Schedule exported');
  };

  return { backupData, restoreData, exportTodayText };
})();
