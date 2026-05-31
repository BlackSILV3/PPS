/* ═══════════════════════════════════════
   LIFEPLAN — MAIN APP CONTROLLER
   js/app.js
═══════════════════════════════════════ */

/* ════════════════════════════════
   CLOCK
════════════════════════════════ */
const Clock = (() => {
  const tick = () => {
    const n = TZ.now();
    const el = document.getElementById('clk');
    if (el) el.textContent = TZ.formatTime(n);
    const gl = document.getElementById('greet-lbl');
    if (gl) gl.textContent = TZ.greeting();
    const gd = document.getElementById('greet-date');
    if (gd) gd.textContent = TZ.formatFullDate(n);
  };
  const start = () => { tick(); setInterval(tick, 1000); };
  return { start, tick };
})();

/* ════════════════════════════════
   SETUP SCREEN
════════════════════════════════ */
const SS = (() => {
  let _theme = 'green';
  let _tz    = 'Africa/Lagos';

  const init = () => {
    _buildTZGrid('tz-grid-setup', _tz, tz => { _tz = tz; });
  };

  const goStep2 = () => {
    const n = document.getElementById('inp-name').value.trim();
    if (!n) { document.getElementById('inp-name').focus(); return; }
    document.getElementById('ss1').style.display = 'none';
    document.getElementById('ss2').style.display = 'block';
  };

  const goStep3 = () => {
    document.getElementById('ss2').style.display = 'none';
    document.getElementById('ss3').style.display = 'block';
  };

  const pickTheme = (el) => {
    document.querySelectorAll('#ss3 .swatch').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    _theme = el.dataset.t;
    App.applyThemeClass(_theme);
    const names = { green:'Green', red:'Red', blue:'Blue', yellow:'Yellow', black:'White' };
    document.getElementById('setup-theme-name').textContent = 'Selected: ' + names[_theme];
  };

  const finish = () => {
    const name = document.getElementById('inp-name').value.trim();
    if (!name) { goStep2(); return; }
    State.profile = {
      name, aim: '', theme: _theme, tz: _tz,
      joinedAt: new Date().toISOString(),
    };
    State.alertCfg = {
      enabled: true, voiceEnabled: true,
      personality: 'friendly', volume: 0.9,
      autoDetect: true, threshold: 50,
      manualTimes: [],
    };
    State.save();
    App.launch();
  };

  return { init, goStep2, goStep3, pickTheme, finish };
})();

/* ════════════════════════════════
   CORE APP
════════════════════════════════ */
const App = (() => {
  /* ── launch ── */
  const launch = () => {
    applyThemeClass(State.profile.theme || 'green');
    const ss = document.getElementById('setup-screen');
    ss.classList.add('hiding');
    setTimeout(() => ss.style.display = 'none', 350);
    document.getElementById('app-shell').style.display = 'flex';
    _refreshGreeting();
    Views.Home.render();
    Clock.start();
    Widget.start();
    _checkStreakAlert();
    setTimeout(() => Badges.check(), 1000);
  };

  /* ── theme ── */
  const applyThemeClass = (t) => {
    document.body.className = 'theme-' + t +
      (document.body.classList.contains('light') ? ' light' : '');
    document.querySelectorAll('.t-dot').forEach(d =>
      d.classList.toggle('active', d.dataset.t === t));
  };

  const applyTheme = (t) => {
    applyThemeClass(t);
    if (State.profile) { State.profile.theme = t; State.save(); }
  };

  const toggleLight = () => {
    document.body.classList.toggle('light');
    document.getElementById('light-toggle').classList.toggle('on',
      document.body.classList.contains('light'));
  };

  /* ── greeting ── */
  const _refreshGreeting = () => {
    const p = State.profile; if (!p) return;
    const name = p.name.toUpperCase();
    document.getElementById('greet-name').textContent = name;
    document.getElementById('greet-aim').textContent  = p.aim ? '↳ ' + p.aim : '';
    document.getElementById('menu-name').textContent  = p.name;
    document.getElementById('menu-avatar').textContent = p.name.charAt(0).toUpperCase();
    document.getElementById('profile-avatar').textContent = p.name.charAt(0).toUpperCase();
    document.getElementById('profile-name').textContent   = p.name;
    document.getElementById('profile-aim-disp').textContent = p.aim ? p.aim : '–';
    const d = TZ.dateInTZ(new Date(p.joinedAt), TZ.getTZ());
    const joined = `Joined ${d.getDate()} ${State.MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`;
    document.getElementById('menu-since').textContent    = joined.toUpperCase();
    document.getElementById('profile-joined').textContent = joined;
    const tz = State.TZ_LIST.find(t => t.tz === TZ.getTZ()) || State.TZ_LIST[0];
    const tzSub = tz.name.replace(/^../,'').trim() + ' · ' + tz.off;
    document.getElementById('prof-tz-sub').textContent   = tzSub;
    const menuTzSub = document.getElementById('menu-tz-sub');
    if (menuTzSub) menuTzSub.textContent = tzSub;
    document.getElementById('pin-status').textContent =
      Lock.isEnabled() ? 'PIN enabled' : 'Not set';
    // quote
    const q = Quotes.getToday();
    document.getElementById('quote-card').innerHTML =
      `<div class="quote-text">"${q.text}"</div><div class="quote-author">— ${q.author}</div>`;
  };

  /* ── streak alert ── */
  const _checkStreakAlert = () => {
    const streaks = State.tables.filter(t => !t.archived && t.type !== 'timetable');
    const atRisk  = streaks.filter(t => {
      const age = TZ.tableAgeDays(t);
      if (age < 2) return false;
      const s = State.strkState[t.id] || [];
      return s[age - 2] === 1 && !s[age - 1]; // yesterday done, today not yet
    });
    const alertEl = document.getElementById('streak-alert');
    if (atRisk.length > 0) {
      alertEl.style.display = 'flex';
      document.getElementById('streak-alert-msg').textContent =
        `⚠️ Mark today's streak for "${atRisk[0].name}" before midnight!`;
      document.getElementById('badge-dot').classList.add('show');
    } else {
      alertEl.style.display = 'none';
    }
  };

  /* ── navigation ── */
  const openView = (id) => {
    document.querySelectorAll('.view').forEach(v => {
      v.classList.toggle('active', v.id === id);
      v.classList.toggle('hidden', v.id !== id);
    });
    document.getElementById(id).scrollTop = 0;
  };

  const goHome = () => {
    openView('v-home');
    Views.Home.render();
    _updateTabBar('home');
  };

  const switchTab = (tab) => {
    State.activeTab = tab;
    _updateTabBar(tab);
    const viewMap = {
      home:    'v-home',
      history: 'v-history',
      badges:  'v-badges',
      profile: 'v-profile',
    };
    if (viewMap[tab]) {
      openView(viewMap[tab]);
      if (tab === 'history') Views.History.render();
      if (tab === 'badges')  Views.Badges.render();
      if (tab === 'profile') _refreshGreeting();
    }
  };

  const _updateTabBar = (tab) => {
    ['home','history','badges','profile'].forEach(t => {
      document.getElementById('tab-' + t)?.classList.toggle('active', t === tab);
    });
  };

  /* ── side menu ── */
  const openMenu = () => {
    document.getElementById('side-overlay').classList.add('open');
    document.getElementById('side-panel').classList.add('open');
  };
  const closeMenu = () => {
    document.getElementById('side-overlay').classList.remove('open');
    document.getElementById('side-panel').classList.remove('open');
  };

  /* ── archived toggle ── */
  const toggleArch = () => {
    State.archOpen = !State.archOpen;
    document.getElementById('arch-section').classList.toggle('open', State.archOpen);
    document.getElementById('arch-arrow').classList.toggle('open', State.archOpen);
  };

  /* ── open table ── */
  const openTable = (id) => {
    const tbl = State.tables.find(t => t.id === id);
    if (!tbl) return;
    State.activeTbl = tbl;
    if (tbl.type === 'timetable') {
      const { wk, dy } = TZ.getTodayWkDay(tbl);
      State.activeWk = wk; State.activeDy = dy;
      document.getElementById('tt-title').textContent = tbl.name.toUpperCase();
      Views.TT.setMode('sched');
      openView('v-timetable');
    } else {
      document.getElementById('st-title').textContent = tbl.name.toUpperCase();
      document.getElementById('st-name').textContent  = tbl.name;
      const sub  = tbl.type === 'stop' ? 'STOP HABIT' : 'BUILD HABIT';
      const d    = TZ.dateInTZ(new Date(tbl.createdAt), TZ.getTZ());
      document.getElementById('st-sub').textContent =
        `${sub} · STARTED ${d.getDate()} ${State.MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
      Views.Streak.render();
      openView('v-streak');
    }
  };

  return {
    launch, applyThemeClass, applyTheme, toggleLight,
    goHome, switchTab, openView, openMenu, closeMenu,
    toggleArch, openTable,
  };
})();

/* ════════════════════════════════
   VIEWS
════════════════════════════════ */
const Views = {};

/* ── HOME ── */
Views.Home = (() => {
  const _getTablePill = (t) => {
    if (t.archived) return { cls:'pill-arch', txt:'ARCHIVED' };
    if (t.type === 'timetable') {
      const { wk, dy } = TZ.getTodayWkDay(t);
      const blks = State.blocks[t.id] || [];
      const st   = (State.schedState[t.id] || {})[wk]?.[dy] || [];
      const done = st.filter(s => s === 1).length;
      const total = blks.length;
      if (total === 0)      return { cls:'pill-muted', txt:'NO BLOCKS' };
      if (done === 0)       return { cls:'pill-muted', txt:'NOT STARTED' };
      if (done === total)   return { cls:'pill-acc',   txt:'✓ COMPLETE' };
      return { cls:'pill-warn', txt:`${done}/${total} DONE` };
    } else {
      const streak = _calcStreak(t.id);
      if (streak === 0) return { cls:'pill-muted', txt:'0 DAYS' };
      return { cls:'pill-acc', txt:`🔥 ${streak} DAYS` };
    }
  };

  const _calcStreak = (id) => {
    const s = State.strkState[id] || [];
    let streak = 0;
    const age = TZ.tableAgeDays(State.tables.find(t => t.id === id) || {createdAt: new Date().toISOString()});
    for (let i = age - 1; i >= 0; i--) {
      if (s[i] === 1) streak++; else break;
    }
    return streak;
  };

  const _makeCard = (t, delay) => {
    const meta = State.TYPE_META[t.type] || State.TYPE_META.timetable;
    const pill = _getTablePill(t);
    const c    = document.createElement('div');
    c.className = `t-card fu fu${delay}${t.archived ? ' archived' : ''}`;
    c.innerHTML = `
      <div class="t-card-icon">${meta.icon}</div>
      <div class="t-card-body">
        <div class="t-card-name">${_esc(t.name)}</div>
        <div class="t-card-meta">${meta.label}${t.goal ? ' · ' + _esc(t.goal.substring(0,28)) : ''}</div>
      </div>
      <div class="pill ${pill.cls}">${pill.txt}</div>
      <div class="t-arrow">›</div>`;
    c.onclick = () => App.openTable(t.id);
    return c;
  };

  const render = () => {
    const active   = State.tables.filter(t => !t.archived);
    const archived = State.tables.filter(t => t.archived);
    const al = document.getElementById('active-list');
    al.innerHTML = '';
    if (active.length === 0) {
      al.innerHTML = '<div style="font-family:var(--font-m);font-size:8px;color:var(--tx3);letter-spacing:1px;padding:4px 0">NO ACTIVE TABLES — CREATE ONE BELOW</div>';
    } else {
      active.forEach((t, i) => al.appendChild(_makeCard(t, Math.min(i + 2, 6))));
    }
    const aw = document.getElementById('arch-wrap');
    if (archived.length === 0) { aw.style.display = 'none'; return; }
    aw.style.display = 'block';
    document.getElementById('arch-lbl').textContent = `ARCHIVED TABLES (${archived.length})`;
    const as = document.getElementById('arch-section');
    as.innerHTML = '';
    archived.forEach(t => as.appendChild(_makeCard(t, 1)));
  };

  return { render };
})();

/* ── TIMETABLE ── */
Views.TT = (() => {
  const _ensureSS = (id, wk, dy, len) => {
    if (!State.schedState[id]) State.schedState[id] = {};
    if (!State.schedState[id][wk]) State.schedState[id][wk] = {};
    if (!State.schedState[id][wk][dy] || State.schedState[id][wk][dy].length !== len)
      State.schedState[id][wk][dy] = new Array(len).fill(0);
  };

  const setMode = (mode) => {
    State.activeTTMode = mode;
    document.getElementById('btn-mode-sched').classList.toggle('active', mode === 'sched');
    document.getElementById('btn-mode-edit').classList.toggle('active',  mode === 'edit');
    document.getElementById('tt-sched-panel').style.display = mode === 'sched' ? 'block' : 'none';
    document.getElementById('tt-edit-panel').style.display  = mode === 'edit'  ? 'block' : 'none';
    // Hide edit for archived
    document.getElementById('btn-mode-edit').style.display =
      State.activeTbl?.archived ? 'none' : '';
    if (mode === 'sched') { _buildWeekStrip(); _buildDayStrip(); _renderSched(); }
    else                  { _renderEditor(); }
  };

  const _buildWeekStrip = () => {
    const el = document.getElementById('week-strip'); el.innerHTML = '';
    const { wk: todayWk } = TZ.getTodayWkDay(State.activeTbl);
    const maxWk = todayWk + 1;
    for (let w = 0; w <= maxWk; w++) {
      const s = TZ.slotDate(State.activeTbl, w, 0);
      const e = TZ.slotDate(State.activeTbl, w, 6);
      const lbl = `WK ${w+1}  ${s.getDate()} ${State.MONTH_SHORT[s.getMonth()]}–${e.getDate()} ${State.MONTH_SHORT[e.getMonth()]}`;
      const b = document.createElement('div');
      b.className = 'wk-btn' + (w === State.activeWk ? ' active' : '');
      b.textContent = lbl;
      b.onclick = (() => { const ww = w; return () => {
        State.activeWk = ww; _buildWeekStrip(); _buildDayStrip(); _renderSched();
      }; })();
      el.appendChild(b);
    }
  };

  const _buildDayStrip = () => {
    const el = document.getElementById('day-strip'); el.innerHTML = '';
    const blks = State.blocks[State.activeTbl.id] || [];
    for (let d = 0; d < 7; d++) {
      const dt  = TZ.slotDate(State.activeTbl, State.activeWk, d);
      const fut = TZ.isFuture(dt), tod = TZ.isToday(dt);
      _ensureSS(State.activeTbl.id, State.activeWk, d, blks.length);
      const st   = State.schedState[State.activeTbl.id][State.activeWk][d];
      const done = st.filter(s => s === 1).length;
      const miss = st.filter(s => s === 2).length;
      let dc = '';
      if (!fut && done === blks.length && blks.length > 0) dc = 'd-full';
      else if (!fut && done + miss > 0) dc = 'd-part';
      const btn = document.createElement('div');
      btn.className = `day-btn ${dc}${d === State.activeDy ? ' active' : ''}`;
      btn.style.opacity = fut ? '0.35' : '1';
      if (tod) btn.style.boxShadow = '0 0 0 1px var(--acc)';
      btn.innerHTML = `
        <div class="dbd">${State.DAY_NAMES[d]}</div>
        <div class="dbn">${dt.getDate()}</div>
        <div class="ddt">${State.MONTH_SHORT[dt.getMonth()]}</div>
        <div class="day-dot"></div>`;
      btn.onclick = (() => { const dd = d; return () => {
        State.activeDy = dd; _buildDayStrip(); _renderSched();
      }; })();
      el.appendChild(btn);
    }
  };

  const _renderSched = () => {
    const blks = State.blocks[State.activeTbl.id] || [];
    _ensureSS(State.activeTbl.id, State.activeWk, State.activeDy, blks.length);
    const list  = document.getElementById('sched-list'); list.innerHTML = '';
    const state = State.schedState[State.activeTbl.id][State.activeWk][State.activeDy];
    const dt    = TZ.slotDate(State.activeTbl, State.activeWk, State.activeDy);
    const fut   = TZ.isFuture(dt);
    // Load day note
    const noteTxt = Notes.get(State.activeTbl.id, State.activeWk, State.activeDy);
    document.getElementById('day-note-txt').value = noteTxt;
    if (blks.length === 0) {
      list.innerHTML = '<div class="no-blocks">NO BLOCKS YET — TAP "EDIT BLOCKS" TO ADD</div>';
      _updateProg(0, 0, 0); return;
    }
    blks.forEach((blk, i) => {
      const s   = state[i] || 0;
      const cls = s === 1 ? 'si-done' : s === 2 ? 'si-miss' : '';
      const tick= s === 1 ? '✓' : s === 2 ? '✗' : '';
      const div = document.createElement('div');
      div.className = `s-item ${cls} fu fu${Math.min(i % 6 + 1, 6)}`;
      if (fut) div.style.opacity = '0.4';
      div.innerHTML = `
        <div class="s-time">${blk.start}<br><span style="color:var(--tx3)">→${blk.end}</span></div>
        <div>
          <div class="s-name">${_esc(blk.label)}</div>
          <div class="s-tag">${_esc(blk.tag || '')}</div>
        </div>
        <div class="s-tick">${tick}</div>`;
      if (!fut && !State.activeTbl.archived) {
        div.onclick = () => {
          state[i] = (state[i] + 1) % 3;
          State.save();
          _renderSched(); _buildDayStrip();
          _updateProg(
            state.filter(s => s === 1).length,
            state.filter(s => s === 2).length,
            blks.length
          );
          setTimeout(() => Badges.check(), 500);
        };
      }
      list.appendChild(div);
    });
    _updateProg(
      state.filter(s => s === 1).length,
      state.filter(s => s === 2).length,
      blks.length
    );
  };

  const _updateProg = (done, miss, total) => {
    const pct = total > 0 ? Math.round(done / total * 100) : 0;
    document.getElementById('prog-n').textContent    = done;
    document.getElementById('prog-fill').style.width = pct + '%';
    document.getElementById('prog-sub').textContent  =
      `${pct}% complete · ${miss} missed · ${total - done - miss} remaining`;
  };

  const _renderEditor = () => {
    const blks = State.blocks[State.activeTbl.id] || [];
    const list = document.getElementById('block-list'); list.innerHTML = '';
    if (blks.length === 0) {
      list.innerHTML = '<div class="no-blocks">NO BLOCKS YET — ADD YOUR FIRST BLOCK ABOVE</div>';
      return;
    }
    blks.forEach((blk, i) => {
      const row = document.createElement('div');
      row.className = `bl-item fu fu${Math.min(i % 6 + 1, 6)}`;
      row.innerHTML = `
        <div class="bl-time-col">${blk.start}<br><span style="color:var(--tx3)">→${blk.end}</span></div>
        <div class="bl-info">
          <div class="bl-name">${_esc(blk.label)}</div>
          <div class="bl-tag">${_esc(blk.tag || '')}</div>
        </div>
        <div class="bl-actions">
          <button class="bl-act-btn" onclick="Views.TT.moveBlock(${i},-1)">↑</button>
          <button class="bl-act-btn" onclick="Views.TT.moveBlock(${i},1)">↓</button>
          <button class="bl-act-btn" onclick="Sheets.openEditBlock(${i})">✎</button>
          <button class="bl-act-btn del" onclick="Views.TT.deleteBlock(${i})">✕</button>
        </div>`;
      list.appendChild(row);
    });
  };

  const moveBlock = (i, dir) => {
    const blks = State.blocks[State.activeTbl.id] || [];
    const ni = i + dir;
    if (ni < 0 || ni >= blks.length) return;
    [blks[i], blks[ni]] = [blks[ni], blks[i]];
    State.blocks[State.activeTbl.id] = blks;
    State.save(); _renderEditor();
  };

  const deleteBlock = (i) => {
    const blks = State.blocks[State.activeTbl.id] || [];
    blks.splice(i, 1);
    State.blocks[State.activeTbl.id] = blks;
    State.save(); _renderEditor();
    Toast.success('Block removed');
  };

  return { setMode, moveBlock, deleteBlock };
})();

/* ── STREAK ── */
Views.Streak = (() => {
  const _calcStreak = (id) => {
    const tbl = State.tables.find(t => t.id === id);
    if (!tbl) return 0;
    const age = TZ.tableAgeDays(tbl);
    const s   = State.strkState[id] || [];
    let streak = 0;
    for (let i = age - 1; i >= 0; i--) {
      if (s[i] === 1) streak++; else break;
    }
    return streak;
  };

  const _calcLongest = (id) => {
    const s = State.strkState[id] || [];
    let cur = 0, best = 0;
    s.forEach(v => { if (v === 1) { cur++; best = Math.max(best, cur); } else cur = 0; });
    return best;
  };

  const _calcTotal = (id) => (State.strkState[id] || []).filter(v => v === 1).length;

  const render = () => {
    if (!State.activeTbl) return;
    const id  = State.activeTbl.id;
    const tbl = State.activeTbl;
    const current = _calcStreak(id);
    const longest = _calcLongest(id);
    const total   = _calcTotal(id);
    document.getElementById('st-count').textContent = current;
    // Stats row
    const sr = document.getElementById('streak-stats-row');
    sr.innerHTML = `
      <div class="streak-stat"><div class="streak-stat-val">${longest}</div><div class="streak-stat-lbl">LONGEST</div></div>
      <div class="streak-stat"><div class="streak-stat-val">${total}</div><div class="streak-stat-lbl">TOTAL DAYS</div></div>
      <div class="streak-stat"><div class="streak-stat-val">${TZ.tableAgeDays(tbl)}</div><div class="streak-stat-lbl">DAY ${TZ.tableAgeDays(tbl)}</div></div>`;
    _renderGrid();
  };

  const _renderGrid = () => {
    const tbl = State.activeTbl; if (!tbl) return;
    const id  = tbl.id;
    if (!State.strkState[id]) State.strkState[id] = [];
    const tz      = TZ.getTZ();
    const created = TZ.dateInTZ(new Date(tbl.createdAt), tz);
    const cm      = TZ.midnight(created);
    const age     = TZ.tableAgeDays(tbl);
    const crDOW   = cm.getDay() === 0 ? 6 : cm.getDay() - 1;
    const lead    = crDOW;
    const numRows = Math.ceil((lead + age) / 7);
    const el = document.getElementById('sg-grid'); el.innerHTML = '';
    for (let r = 0; r < numRows; r++) {
      const row = document.createElement('div'); row.className = 'sg-row';
      for (let c = 0; c < 7; c++) {
        const ci = r * 7 + c, di = ci - lead;
        const cell = document.createElement('div'); cell.className = 'sg-cell';
        if (di < 0 || di >= age) {
          cell.style.cssText = 'background:transparent;border-color:transparent';
        } else {
          const cd  = new Date(cm); cd.setDate(cm.getDate() + di);
          const isT = TZ.isToday(cd), isF = TZ.isFuture(cd);
          cell.innerHTML = `<span>${cd.getDate()}</span>
            <span class="sg-cell-day">${State.MONTH_SHORT[cd.getMonth()]}</span>`;
          if (isF) { cell.classList.add('sg-fut'); }
          else {
            const sv = State.strkState[id][di] || 0;
            if (isT) cell.classList.add('sg-today');
            if (sv === 1) cell.classList.add('sg-done');
            else if (sv === 2) cell.classList.add('sg-miss');
            const dii = di;
            cell.onclick = () => {
              State.strkState[id][dii] =
                (State.strkState[id][dii] || 0) === 0 ? 1 :
                State.strkState[id][dii] === 1 ? 2 : 0;
              State.save();
              render();
              setTimeout(() => Badges.check(), 500);
            };
          }
        }
        row.appendChild(cell);
      }
      el.appendChild(row);
    }
  };

  return { render };
})();

/* ── HISTORY ── */
Views.History = (() => {
  let _selTblId = null;

  const render = () => {
    // Consistency score
    const score = Stats.getConsistencyScore();
    document.getElementById('score-val').textContent = score;
    const circ = 2 * Math.PI * 32;
    const fill  = document.getElementById('score-ring-fill');
    fill.setAttribute('stroke-dasharray', circ.toFixed(1));
    fill.setAttribute('stroke-dashoffset', (circ - circ * score / 100).toFixed(1));
    document.getElementById('score-info-sub').textContent =
      score >= 80 ? 'Excellent consistency! Keep it up.' :
      score >= 50 ? 'Good progress. Aim for 80+.' :
      'Build your habit. Every day counts.';
    // Table selector
    const ttTables = State.tables.filter(t => t.type === 'timetable');
    const sel = document.getElementById('history-tbl-select'); sel.innerHTML = '';
    if (ttTables.length === 0) {
      sel.innerHTML = '<div style="font-family:var(--font-m);font-size:8px;color:var(--tx3);letter-spacing:1px">No timetables yet</div>';
      return;
    }
    if (!_selTblId || !ttTables.find(t => t.id === _selTblId))
      _selTblId = ttTables[0].id;
    ttTables.forEach(t => {
      const b = document.createElement('div');
      b.className = 'wk-btn' + (t.id === _selTblId ? ' active' : '');
      b.textContent = t.name;
      b.onclick = () => { _selTblId = t.id; render(); };
      sel.appendChild(b);
    });
    const tbl = ttTables.find(t => t.id === _selTblId);
    if (!tbl) return;
    _renderWeeklyReview(tbl);
    _renderHeatmap(tbl);
    _renderBlockStats(tbl);
  };

  const _renderWeeklyReview = (tbl) => {
    const wrap = document.getElementById('weekly-review-wrap'); wrap.innerHTML = '';
    const { wk: todayWk } = TZ.getTodayWkDay(tbl);
    // Show last 3 weeks
    const startWk = Math.max(0, todayWk - 2);
    for (let w = todayWk; w >= startWk; w--) {
      const summary  = Stats.getWeeklySummary(tbl, w);
      const insights = Stats.generateReviewText(tbl, w);
      if (!summary) continue;
      const s = TZ.slotDate(tbl, w, 0), e = TZ.slotDate(tbl, w, 6);
      const card = document.createElement('div');
      card.className = 'review-card fu';
      card.innerHTML = `
        <div class="review-week-lbl">WEEK ${w+1} · ${s.getDate()} ${State.MONTH_SHORT[s.getMonth()]} – ${e.getDate()} ${State.MONTH_SHORT[e.getMonth()]} ${e.getFullYear()}</div>
        <div style="display:flex;align-items:flex-end;gap:12px;margin-bottom:12px">
          <div>
            <div class="review-score">${summary.overallPct}<span style="font-size:20px;color:var(--tx2)">%</span></div>
            <div class="review-score-lbl">WEEKLY SCORE</div>
          </div>
          <div class="review-week-bar" style="flex:1">
            ${summary.dayPcts.map((p,i) => {
              const h = p !== null ? Math.max(4, p * 0.4) : 4;
              const col = p === null ? 'var(--bg4)' : p >= 80 ? 'var(--acc)' : p >= 50 ? 'var(--amber)' : 'var(--red)';
              return `<div class="rwb-col">
                <div class="rwb-bar-track">
                  <div class="rwb-bar-fill" style="height:${h}px;background:${col}"></div>
                </div>
                <div class="rwb-lbl">${State.DAY_NAMES[i][0]}</div>
              </div>`;
            }).join('')}
          </div>
        </div>
        <div class="review-insights">
          ${insights.map(i => `<div class="review-insight">${i}</div>`).join('')}
        </div>`;
      wrap.appendChild(card);
    }
  };

  const _renderHeatmap = (tbl) => {
    const wrap = document.getElementById('heatmap-wrap');
    wrap.style.display = 'block';
    document.getElementById('heatmap-title').textContent =
      tbl.name.toUpperCase() + ' · ACTIVITY HEATMAP';
    const data = Heatmap.getData(tbl, 84);
    const grid = document.getElementById('heatmap-grid'); grid.innerHTML = '';
    data.forEach(d => {
      const cell = document.createElement('div');
      cell.className = 'hm-cell ' + Heatmap.pctToClass(d.pct);
      cell.dataset.tip = `${d.date.getDate()} ${State.MONTH_SHORT[d.date.getMonth()]}: ${d.pct}%`;
      grid.appendChild(cell);
    });
  };

  const _renderBlockStats = (tbl) => {
    const wrap = document.getElementById('block-stats-wrap');
    const list = document.getElementById('block-stats-list');
    const stats = Stats.getBlockStats(tbl.id);
    if (stats.length === 0) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block'; list.innerHTML = '';
    stats.forEach(s => {
      const pct = s.total > 0 ? Math.round(s.done / s.total * 100) : 0;
      const barW = Math.max(4, pct);
      const row = document.createElement('div'); row.className = 'block-stat-item';
      row.innerHTML = `
        <div class="bs-name">${_esc(s.label)}</div>
        <div class="bs-bars">
          <div class="bs-bar bs-done" style="width:${barW}px"></div>
          ${s.miss > 0 ? `<div class="bs-bar bs-miss" style="width:${Math.max(2, s.miss/s.total*40)}px"></div>` : ''}
        </div>
        <div class="bs-pct">${pct}%</div>`;
      list.appendChild(row);
    });
  };

  return { render };
})();

/* ── BADGES ── */
Views.Badges = (() => {
  const render = () => {
    const all  = Badges.getAll();
    const earned = all.filter(b => b.earned).length;
    document.getElementById('badges-count').textContent =
      `${earned} / ${all.length} EARNED`;
    const grid = document.getElementById('badges-grid'); grid.innerHTML = '';
    all.forEach(b => {
      const card = document.createElement('div');
      card.className = `badge-card${b.earned ? ' earned' : ' locked'}`;
      card.innerHTML = `
        <div class="badge-icon">${b.icon}</div>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
        ${b.earned && b.earnedAt
          ? `<div class="badge-earned-date">${_fmtDate(b.earnedAt)}</div>`
          : b.earned ? '' : '<div style="font-family:var(--font-m);font-size:7px;color:var(--tx3);margin-top:4px">🔒 LOCKED</div>'}`;
      grid.appendChild(card);
    });
    document.getElementById('badge-dot').classList.toggle('show', earned > 0);
  };

  const _fmtDate = (iso) => {
    const d = new Date(iso);
    return `${d.getDate()} ${State.MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  };

  return { render };
})();

/* ════════════════════════════════
   SHEETS (all bottom sheets)
════════════════════════════════ */
const Sheets = (() => {
  const _open  = (id) => document.getElementById(id).classList.add('open');
  const _close = (id) => document.getElementById(id).classList.remove('open');

  /* ── New table ── */
  let _newType = 'timetable', _newSchedType = 'default';

  const openNew = () => {
    _newType = 'timetable'; _newSchedType = 'default';
    ['tt','build','stop'].forEach(k =>
      document.getElementById('to-' + k).classList.remove('sel'));
    document.getElementById('to-tt').classList.add('sel');
    ['st-default','st-custom'].forEach(k =>
      document.getElementById(k).classList.remove('sel'));
    document.getElementById('st-default').classList.add('sel');
    document.getElementById('sched-type-section').style.display = 'block';
    document.getElementById('new-name').value = '';
    document.getElementById('new-goal').value = '';
    _open('ov-new');
  };

  const pickType = (t) => {
    _newType = t;
    const m = { timetable:'tt', build:'build', stop:'stop' };
    ['tt','build','stop'].forEach(k =>
      document.getElementById('to-' + k).classList.remove('sel'));
    document.getElementById('to-' + m[t]).classList.add('sel');
    document.getElementById('sched-type-section').style.display =
      t === 'timetable' ? 'block' : 'none';
  };

  const pickSchedType = (t) => {
    _newSchedType = t;
    ['st-default','st-custom'].forEach(k =>
      document.getElementById(k).classList.remove('sel'));
    document.getElementById('st-' + t).classList.add('sel');
  };

  const saveNew = () => {
    const name = document.getElementById('new-name').value.trim();
    if (!name) { document.getElementById('new-name').focus(); return; }
    const id = 'tbl_' + Date.now();
    const tbl = {
      id, name, type: _newType,
      goal: document.getElementById('new-goal').value.trim(),
      createdAt: new Date().toISOString(),
      archived: false,
      schedType: _newType === 'timetable' ? _newSchedType : 'none',
    };
    State.tables.push(tbl);
    if (_newType === 'timetable') {
      State.blocks[id] = _newSchedType === 'default'
        ? State.DEFAULT_BLOCKS.map((b, i) => ({
            id: 'b' + i, label: b.label, tag: b.tag, start: b.start, end: b.end
          }))
        : [];
    }
    State.save();
    _close('ov-new');
    Views.Home.render();
    Toast.success('Table created!');
    setTimeout(() => Badges.check(), 500);
  };

  /* ── Block editor ── */
  let _editBlockIdx = -1;

  const openAddBlock = () => {
    _editBlockIdx = -1;
    document.getElementById('block-sheet-title').textContent = 'ADD BLOCK';
    document.getElementById('bl-label').value = '';
    document.getElementById('bl-tag').value   = '';
    document.getElementById('bl-start').value = '';
    document.getElementById('bl-end').value   = '';
    _open('ov-block');
  };

  const openEditBlock = (i) => {
    _editBlockIdx = i;
    const blk = (State.blocks[State.activeTbl.id] || [])[i];
    if (!blk) return;
    document.getElementById('block-sheet-title').textContent = 'EDIT BLOCK';
    document.getElementById('bl-label').value = blk.label;
    document.getElementById('bl-tag').value   = blk.tag || '';
    document.getElementById('bl-start').value = blk.start;
    document.getElementById('bl-end').value   = blk.end;
    _open('ov-block');
  };

  const saveBlock = () => {
    const label = document.getElementById('bl-label').value.trim();
    const start = document.getElementById('bl-start').value;
    const end   = document.getElementById('bl-end').value;
    if (!label) { document.getElementById('bl-label').focus(); return; }
    if (!start || !end) { document.getElementById('bl-start').focus(); return; }
    const blk = {
      id: 'b' + Date.now(), label,
      tag:   document.getElementById('bl-tag').value.trim().toUpperCase(),
      start, end,
    };
    const blks = State.blocks[State.activeTbl.id] || [];
    if (_editBlockIdx === -1) blks.push(blk);
    else blks[_editBlockIdx] = blk;
    State.blocks[State.activeTbl.id] = blks;
    State.save();
    _close('ov-block');
    Views.TT.setMode('edit'); // re-render editor
    Toast.success(_editBlockIdx === -1 ? 'Block added!' : 'Block updated!');
  };

  /* ── Profile ── */
  const openProfile = () => {
    document.getElementById('p-name').value = State.profile?.name || '';
    document.getElementById('p-aim').value  = State.profile?.aim  || '';
    const d = TZ.dateInTZ(new Date(State.profile?.joinedAt || Date.now()), TZ.getTZ());
    document.getElementById('p-date').value =
      `${d.getDate()} ${State.MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`;
    _open('ov-profile');
  };

  const saveProfile = () => {
    const name = document.getElementById('p-name').value.trim();
    if (!name) { document.getElementById('p-name').focus(); return; }
    State.profile.name = name;
    State.profile.aim  = document.getElementById('p-aim').value.trim();
    State.save();
    App.applyThemeClass(State.profile.theme);
    // refresh all name displays
    document.getElementById('greet-name').textContent = name.toUpperCase();
    document.getElementById('greet-aim').textContent = State.profile.aim ? '↳ ' + State.profile.aim : '';
    document.getElementById('menu-name').textContent  = name;
    document.getElementById('menu-avatar').textContent = name.charAt(0).toUpperCase();
    document.getElementById('profile-avatar').textContent = name.charAt(0).toUpperCase();
    document.getElementById('profile-name').textContent   = name;
    document.getElementById('profile-aim-disp').textContent = State.profile.aim || '–';
    _close('ov-profile');
    Toast.success('Profile updated!');
  };

  /* ── Timezone ── */
  let _tempTZ = '';
  const openTZ = () => {
    App.closeMenu();
    _tempTZ = TZ.getTZ();
    _buildTZGrid('tz-grid-settings', _tempTZ, tz => { _tempTZ = tz; });
    _open('ov-tz');
  };
  const saveTZ = () => {
    if (_tempTZ && State.profile) { State.profile.tz = _tempTZ; State.save(); }
    _close('ov-tz');
    Clock.tick();
    Toast.success('Timezone updated!');
  };

  /* ── Alert settings ── */
  let _alertDraft = {};
  const openAlertSettings = () => {
    App.closeMenu();
    _alertDraft = { ...State.alertCfg };
    const cfg = _alertDraft;
    document.getElementById('alert-enabled-toggle').classList.toggle('on', !!cfg.enabled);
    document.getElementById('auto-detect-toggle').classList.toggle('on', !!cfg.autoDetect);
    document.getElementById('alert-volume').value = cfg.volume ?? 0.9;
    ['strict','friendly','motivational'].forEach(p => {
      document.getElementById('vp-' + p).classList.toggle('sel', cfg.personality === p);
    });
    _renderManualTimes();
    _open('ov-alert');
  };
  const toggleAlertEnabled = () => {
    _alertDraft.enabled = !_alertDraft.enabled;
    document.getElementById('alert-enabled-toggle').classList.toggle('on', _alertDraft.enabled);
  };
  const toggleAutoDetect = () => {
    _alertDraft.autoDetect = !_alertDraft.autoDetect;
    document.getElementById('auto-detect-toggle').classList.toggle('on', _alertDraft.autoDetect);
  };
  const pickPersonality = (p) => {
    _alertDraft.personality = p;
    ['strict','friendly','motivational'].forEach(k =>
      document.getElementById('vp-' + k).classList.toggle('sel', k === p));
    // preview voice
    Widget.speak(
      State.VOICE_PERSONALITIES[p].messages[0].replace(/{name}/g, State.profile?.name || 'Friend')
    );
  };
  const addManualTime = () => {
    const val = document.getElementById('manual-time-inp').value;
    if (!val) return;
    if (!_alertDraft.manualTimes) _alertDraft.manualTimes = [];
    if (!_alertDraft.manualTimes.includes(val)) {
      _alertDraft.manualTimes.push(val);
      _renderManualTimes();
    }
  };
  const _renderManualTimes = () => {
    const el = document.getElementById('manual-times-list'); el.innerHTML = '';
    (_alertDraft.manualTimes || []).forEach(t => {
      const chip = document.createElement('div');
      chip.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:var(--bg3);border:1px solid var(--bd2);border-radius:20px;padding:4px 10px;font-family:var(--font-m);font-size:9px;color:var(--tx2)';
      chip.innerHTML = `${t} <span style="cursor:pointer;color:var(--red)" onclick="this.parentElement.remove();_alertDraft.manualTimes=_alertDraft.manualTimes.filter(x=>x!=='${t}')">✕</span>`;
      el.appendChild(chip);
    });
  };
  const saveAlertSettings = () => {
    _alertDraft.volume = parseFloat(document.getElementById('alert-volume').value);
    State.alertCfg = _alertDraft;
    State.save();
    Widget.stop(); Widget.start();
    _close('ov-alert');
    Toast.success('Alert settings saved!');
  };

  /* ── PIN ── */
  const openPIN = () => {
    if (Lock.isEnabled()) {
      document.getElementById('pin-sheet-sub').textContent = 'REMOVE EXISTING PIN';
      document.getElementById('pin-new-lbl').textContent   = 'CURRENT PIN';
      document.getElementById('pin-confirm-wrap').style.display = 'none';
      document.getElementById('pin-save-btn').textContent  = 'REMOVE PIN';
    } else {
      document.getElementById('pin-sheet-sub').textContent = 'SET A 4-DIGIT PIN';
      document.getElementById('pin-new-lbl').textContent   = 'NEW PIN';
      document.getElementById('pin-confirm-wrap').style.display = 'block';
      document.getElementById('pin-save-btn').textContent  = 'SET PIN →';
    }
    document.getElementById('pin-new-inp').value     = '';
    document.getElementById('pin-confirm-inp').value = '';
    _open('ov-pin');
  };
  const savePIN = () => {
    const val = document.getElementById('pin-new-inp').value.trim();
    if (val.length !== 4 || !/^\d{4}$/.test(val)) { Toast.error('PIN must be 4 digits'); return; }
    if (Lock.isEnabled()) {
      if (!Lock.removePin(val)) return;
    } else {
      const confirm = document.getElementById('pin-confirm-inp').value.trim();
      if (val !== confirm) { Toast.error('PINs do not match'); return; }
      Lock.setPin(val);
    }
    document.getElementById('pin-status').textContent = Lock.isEnabled() ? 'PIN enabled' : 'Not set';
    _close('ov-pin');
  };

  /* ── Manage tables ── */
  const openManage = () => {
    App.closeMenu();
    const list = document.getElementById('manage-list'); list.innerHTML = '';
    if (State.tables.length === 0) {
      list.innerHTML = '<div style="font-family:var(--font-m);font-size:8px;color:var(--tx3);letter-spacing:1px;padding:6px 0">NO TABLES YET</div>';
    } else {
      State.tables.forEach(t => {
        const meta = State.TYPE_META[t.type] || State.TYPE_META.timetable;
        const row  = document.createElement('div'); row.className = 'manage-item';
        row.innerHTML = `
          <div class="manage-item-icon">${meta.icon}</div>
          <div class="manage-item-name">${_esc(t.name)}</div>
          ${t.archived
            ? `<span class="pill pill-arch" style="margin-right:4px">ARCHIVED</span>`
            : `<button class="arch-btn" title="Archive" onclick="Sheets._archiveTable('${t.id}','${_esc(t.name)}')">📦</button>`}
          <button class="del-btn" title="Delete" onclick="Sheets._deleteTable('${t.id}','${_esc(t.name)}')">✕</button>`;
        list.appendChild(row);
      });
    }
    _open('ov-manage');
  };

  const _archiveTable = async (id, name) => {
    const ok = await Confirm.show({
      icon:'📦', title:'ARCHIVE TABLE?',
      msg:`"${name}" will be marked as ended and moved to archived. Data is kept.`,
      confirmLabel:'YES, ARCHIVE', danger:false,
    });
    if (!ok) return;
    const t = State.tables.find(t => t.id === id);
    if (t) { t.archived = true; State.save(); }
    openManage(); Views.Home.render();
    Toast.success('Table archived');
  };

  const _deleteTable = async (id, name) => {
    const ok = await Confirm.show({
      icon:'🗑️', title:'DELETE TABLE?',
      msg:`"${name}" and ALL its data will be permanently removed. This cannot be undone.`,
      confirmLabel:'YES, DELETE', danger:true,
    });
    if (!ok) return;
    State.tables = State.tables.filter(t => t.id !== id);
    delete State.schedState[id];
    delete State.strkState[id];
    delete State.blocks[id];
    State.save();
    openManage(); Views.Home.render();
    Toast.success('Table deleted');
  };

  return {
    openNew, pickType, pickSchedType, saveNew,
    openAddBlock, openEditBlock, saveBlock,
    openProfile, saveProfile,
    openTZ, saveTZ,
    openAlertSettings, toggleAlertEnabled, toggleAutoDetect,
    pickPersonality, addManualTime, saveAlertSettings,
    openPIN, savePIN,
    openManage, _archiveTable, _deleteTable,
  };
})();

/* ════════════════════════════════
   TZ GRID BUILDER (shared)
════════════════════════════════ */
function _buildTZGrid(gridId, selectedTZ, onPick) {
  const g = document.getElementById(gridId); g.innerHTML = '';
  State.TZ_LIST.forEach(t => {
    const d = document.createElement('div');
    d.className = 'tz-opt' + (t.tz === selectedTZ ? ' sel' : '');
    d.dataset.tz = t.tz;
    d.innerHTML = `<div class="tz-name">${t.name}</div><div class="tz-off">${t.off}</div>`;
    d.onclick = () => {
      g.querySelectorAll('.tz-opt').forEach(e => e.classList.remove('sel'));
      d.classList.add('sel');
      onPick(t.tz);
    };
    g.appendChild(d);
  });
}

/* ════════════════════════════════
   UTIL
════════════════════════════════ */
function _esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ════════════════════════════════
   BOOT
════════════════════════════════ */
window.addEventListener('DOMContentLoaded', async () => {
  SS.init();
  if (State.profile) {
    document.getElementById('setup-screen').style.display = 'none';
    await Lock.showLockScreen();
    App.launch();
  }
  // load voices for speech synthesis
  window.speechSynthesis?.getVoices();
  window.speechSynthesis?.addEventListener('voiceschanged', () =>
    window.speechSynthesis.getVoices());
});
