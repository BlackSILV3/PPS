/* ═══════════════════════════════════════
   LIFEPLAN — ALERT WIDGET + VOICE
   js/features/widget.js
═══════════════════════════════════════ */
const Widget = (() => {
  let snoozeUntil = null;
  let checkInterval = null;

  // ── VOICE ──
  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cfg = State.alertCfg;
    const personality = State.VOICE_PERSONALITIES[cfg.personality || 'friendly'];
    const utt = new SpeechSynthesisUtterance(text);
    utt.pitch  = personality.pitch  || 1.0;
    utt.rate   = personality.rate   || 1.0;
    utt.volume = cfg.volume !== undefined ? cfg.volume : 0.9;
    // Try to use a natural voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural'))
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (preferred) utt.voice = preferred;
    window.speechSynthesis.speak(utt);
  };

  const buildMessage = () => {
    const cfg = State.alertCfg;
    const personality = State.VOICE_PERSONALITIES[cfg.personality || 'friendly'];
    const msgs = personality.messages;
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    const name = State.profile?.name || 'Friend';
    return msg.replace(/{name}/g, name);
  };

  // ── PROGRESS ──
  const getTodayProgress = () => {
    const activeTables = State.tables.filter(t => !t.archived && t.type === 'timetable');
    if (activeTables.length === 0) return { done: 0, total: 0, pct: 0 };
    let totalDone = 0, totalBlocks = 0;
    activeTables.forEach(tbl => {
      const { wk, dy } = TZ.getTodayWkDay(tbl);
      const blks = (State.blocks[tbl.id] || []);
      const st   = (State.schedState[tbl.id] || {})[wk]?.[dy] || [];
      totalBlocks += blks.length;
      totalDone   += st.filter(s => s === 1).length;
    });
    return {
      done:  totalDone,
      total: totalBlocks,
      pct:   totalBlocks > 0 ? Math.round(totalDone / totalBlocks * 100) : 0,
    };
  };

  // ── SHOW WIDGET ──
  const show = () => {
    if (snoozeUntil && new Date() < snoozeUntil) return;
    const progress = getTodayProgress();
    if (progress.total === 0) return; // nothing to remind about
    if (progress.pct === 100) return; // already done

    const msg = buildMessage();
    const name = State.profile?.name || 'Friend';
    const widget = document.getElementById('alert-widget');

    widget.querySelector('.widget-msg').textContent = msg;
    widget.querySelector('.widget-sub').textContent =
      `${progress.done}/${progress.total} tasks completed today · ${progress.pct}%`;
    widget.querySelector('.widget-prog-fill').style.width = progress.pct + '%';
    widget.querySelector('.widget-avatar').textContent = name.charAt(0).toUpperCase();
    widget.classList.add('show');

    // Speak
    const cfg = State.alertCfg;
    if (cfg.voiceEnabled !== false) speak(msg);
  };

  const hide = () => {
    document.getElementById('alert-widget').classList.remove('show');
    window.speechSynthesis?.cancel();
  };

  const snooze = (minutes) => {
    snoozeUntil = new Date(Date.now() + minutes * 60000);
    hide();
    Toast.warning(`Snoozed for ${minutes} minutes`);
  };

  const snoozeTonight = () => {
    const tonight = TZ.now();
    tonight.setHours(23, 59, 0, 0);
    snoozeUntil = tonight;
    hide();
    Toast.warning('Snoozed until tonight');
  };

  // ── SHOULD ALERT? ──
  const shouldAlert = () => {
    if (!State.profile) return false;
    if (!State.alertCfg.enabled) return false;
    const progress = getTodayProgress();
    if (progress.total === 0 || progress.pct === 100) return false;
    if (snoozeUntil && new Date() < snoozeUntil) return false;

    const cfg = State.alertCfg;
    const now  = TZ.now();
    const hour = now.getHours();
    const min  = now.getMinutes();

    // Manual times check
    if (cfg.manualTimes && cfg.manualTimes.length > 0) {
      return cfg.manualTimes.some(t => {
        const [th, tm] = t.split(':').map(Number);
        return hour === th && min === tm;
      });
    }

    // Auto: check if any schedule block's end time has passed with < threshold% done
    if (cfg.autoDetect) {
      const threshold = cfg.threshold || 50;
      if (progress.pct < threshold) {
        // Alert if past midday and not enough done
        return hour >= 12;
      }
    }

    return false;
  };

  // ── START CHECKING ──
  const start = () => {
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(() => {
      if (shouldAlert()) show();
    }, 60000); // check every minute
  };

  const stop = () => {
    if (checkInterval) { clearInterval(checkInterval); checkInterval = null; }
  };

  // ── MANUAL TRIGGER (for testing) ──
  const trigger = () => { snoozeUntil = null; show(); };

  return { show, hide, snooze, snoozeTonight, start, stop, trigger, speak, buildMessage, getTodayProgress };
})();
