/* ═══════════════════════════════════════
   LIFEPLAN — STATE
   js/core/state.js
═══════════════════════════════════════ */
const State = (() => {
  // ── PERSISTED STATE ──
  let profile    = Storage.get('profile')    || null;
  let tables     = Storage.get('tables')     || [];
  let blocks     = Storage.get('blocks')     || {};
  let schedState = Storage.get('schedState') || {};
  let strkState  = Storage.get('strkState')  || {};
  let notes      = Storage.get('notes')      || {};
  let badges     = Storage.get('badges')     || {};
  let alertCfg   = Storage.get('alertCfg')   || {};
  let pinHash    = Storage.get('pinHash')    || null;

  // ── RUNTIME STATE ──
  let activeTab    = 'home';
  let activeTbl    = null;
  let activeWk     = 0;
  let activeDy     = 0;
  let activeTTMode = 'sched';
  let archOpen     = false;

  // ── SAVE ALL ──
  const save = () => {
    Storage.set('profile',    profile);
    Storage.set('tables',     tables);
    Storage.set('blocks',     blocks);
    Storage.set('schedState', schedState);
    Storage.set('strkState',  strkState);
    Storage.set('notes',      notes);
    Storage.set('badges',     badges);
    Storage.set('alertCfg',   alertCfg);
    Storage.set('pinHash',    pinHash);
  };

  // ── DEFAULT BLOCKS (from user's image) ──
  const DEFAULT_BLOCKS = [
    { id:'d0', label:'Critical Thinking / Planning', tag:'FOCUS',   start:'05:00', end:'05:30' },
    { id:'d1', label:'House Chores',                 tag:'HOME',    start:'05:40', end:'06:30' },
    { id:'d2', label:'Cook · Bath · Eat · Get Ready',tag:'MORNING', start:'06:35', end:'07:20' },
    { id:'d3', label:'School Activities',            tag:'SCHOOL',  start:'08:00', end:'17:00' },
    { id:'d4', label:'Software Work',                tag:'WORK',    start:'10:00', end:'14:00' },
    { id:'d5', label:'Have Little Fun',              tag:'LEISURE', start:'14:00', end:'15:00' },
    { id:'d6', label:'Hardware Work',                tag:'WORK',    start:'15:00', end:'19:00' },
    { id:'d7', label:'School Revision',              tag:'STUDY',   start:'20:00', end:'22:00' },
    { id:'d8', label:'Nice Sleep',                   tag:'REST',    start:'22:00', end:'04:00' },
  ];

  // ── TIMEZONE LIST ──
  const TZ_LIST = [
    { tz:'Africa/Lagos',        name:'🇳🇬 Nigeria',      off:'WAT · UTC+1' },
    { tz:'Africa/Accra',        name:'🇬🇭 Ghana',         off:'GMT · UTC+0' },
    { tz:'Africa/Nairobi',      name:'🇰🇪 Kenya',         off:'EAT · UTC+3' },
    { tz:'Africa/Johannesburg', name:'🇿🇦 South Africa',  off:'SAST · UTC+2' },
    { tz:'Africa/Cairo',        name:'🇪🇬 Egypt',         off:'EET · UTC+2' },
    { tz:'Europe/London',       name:'🇬🇧 London',        off:'GMT/BST' },
    { tz:'Europe/Paris',        name:'🇫🇷 Paris',         off:'CET/CEST' },
    { tz:'America/New_York',    name:'🇺🇸 New York',      off:'EST/EDT' },
    { tz:'America/Los_Angeles', name:'🇺🇸 Los Angeles',   off:'PST/PDT' },
    { tz:'Asia/Dubai',          name:'🇦🇪 Dubai',         off:'GST · UTC+4' },
    { tz:'Asia/Kolkata',        name:'🇮🇳 India',         off:'IST · UTC+5:30' },
    { tz:'Asia/Shanghai',       name:'🇨🇳 China',         off:'CST · UTC+8' },
  ];

  // ── MONTH NAMES ──
  const MONTH_FULL  = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];
  const MONTH_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN',
                       'JUL','AUG','SEP','OCT','NOV','DEC'];
  const DAY_NAMES   = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  const DAY_FULL    = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  // ── TABLE TYPE META ──
  const TYPE_META = {
    timetable: { icon:'📋', label:'Daily Schedule' },
    build:     { icon:'🔥', label:'Build Habit' },
    stop:      { icon:'🚫', label:'Stop Habit' },
  };

  // ── VOICE PERSONALITIES ──
  const VOICE_PERSONALITIES = {
    strict: {
      name: 'Strict 😤',
      messages: [
        '{name}! Do your tasks. Now.',
        '{name}, stop procrastinating. Get it done.',
        'You set this schedule, {name}. Follow it.',
        '{name}! No excuses. Complete your tasks.',
        'Time is running out, {name}. Move.',
      ],
      pitch: 0.9, rate: 1.0,
    },
    friendly: {
      name: 'Friendly 😊',
      messages: [
        'Hey {name}! Your tasks are waiting 😊',
        '{name}, you can do it! Let\'s get going.',
        'Time to shine, {name}! Your schedule is ready.',
        'Don\'t forget your tasks, {name}! You\'ve got this.',
        'Hey {name}, a little progress goes a long way!',
      ],
      pitch: 1.1, rate: 0.95,
    },
    motivational: {
      name: 'Motivational 💪',
      messages: [
        'Let\'s GO {name}! Get those tasks DONE!',
        '{name}! Champions don\'t quit. Do your tasks!',
        'RISE UP {name}! Your future self is counting on you!',
        '{name}, every completed task is a WIN. Let\'s GO!',
        'NO DAYS OFF {name}! Complete your daily streak!',
      ],
      pitch: 1.2, rate: 1.05,
    },
  };

  // ── DAILY QUOTES ──
  const QUOTES = [
    { text: "Discipline is doing what needs to be done, even when you don't want to.", author: "Unknown" },
    { text: "Small disciplines repeated with consistency every day lead to great achievements.", author: "John C. Maxwell" },
    { text: "The secret of your future is hidden in your daily routine.", author: "Mike Murdock" },
    { text: "We are what we repeatedly do. Excellence is not an act but a habit.", author: "Aristotle" },
    { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
    { text: "Motivation gets you going. Discipline keeps you growing.", author: "John C. Maxwell" },
    { text: "Your daily choices shape your destiny. Choose wisely.", author: "Unknown" },
    { text: "The pain of discipline is far less than the pain of regret.", author: "Unknown" },
    { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
    { text: "It's not about having time. It's about making time.", author: "Unknown" },
    { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
    { text: "Push yourself because no one else is going to do it for you.", author: "Unknown" },
    { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
    { text: "Little by little, a little becomes a lot.", author: "Tanzanian Proverb" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  ];

  // ── BADGES DEFINITION ──
  const BADGE_DEFS = [
    { id:'first_tick',   icon:'✅', name:'First Step',      desc:'Mark your first task done',         check: (s) => getTotalDone(s) >= 1 },
    { id:'day_complete', icon:'⭐', name:'Perfect Day',      desc:'Complete all blocks in a day',       check: (s) => hasPerfectDay(s) },
    { id:'streak_3',     icon:'🔥', name:'On Fire',          desc:'3-day streak on any tracker',       check: (s) => getMaxStreak(s) >= 3 },
    { id:'streak_7',     icon:'🌟', name:'One Week Strong',  desc:'7-day streak on any tracker',       check: (s) => getMaxStreak(s) >= 7 },
    { id:'streak_14',    icon:'💎', name:'Two Week Warrior', desc:'14-day streak on any tracker',      check: (s) => getMaxStreak(s) >= 14 },
    { id:'streak_30',    icon:'👑', name:'Monthly Champion', desc:'30-day streak on any tracker',      check: (s) => getMaxStreak(s) >= 30 },
    { id:'week_done',    icon:'🏆', name:'Full Week',        desc:'Complete every day of a full week', check: (s) => hasFullWeek(s) },
    { id:'tables_3',     icon:'📚', name:'Planner',          desc:'Create 3 or more tables',           check: (s) => s.tables.length >= 3 },
    { id:'consistent',   icon:'💪', name:'Consistent',       desc:'Consistency score above 80',        check: (s) => getConsistencyScore(s) >= 80 },
    { id:'early_bird',   icon:'🌅', name:'Early Bird',       desc:'Mark first block done before 6AM',  check: (s) => hasEarlyBird(s) },
  ];

  // Badge check helpers (stubs — implemented in features/badges.js)
  function getTotalDone(s)        { return 0; }
  function hasPerfectDay(s)       { return false; }
  function getMaxStreak(s)        { return 0; }
  function hasFullWeek(s)         { return false; }
  function getConsistencyScore(s) { return 0; }
  function hasEarlyBird(s)        { return false; }

  return {
    // state getters/setters
    get profile()    { return profile; },    set profile(v)    { profile = v; },
    get tables()     { return tables; },     set tables(v)     { tables = v; },
    get blocks()     { return blocks; },     set blocks(v)     { blocks = v; },
    get schedState() { return schedState; }, set schedState(v) { schedState = v; },
    get strkState()  { return strkState; },  set strkState(v)  { strkState = v; },
    get notes()      { return notes; },      set notes(v)      { notes = v; },
    get badges()     { return badges; },     set badges(v)     { badges = v; },
    get alertCfg()   { return alertCfg; },   set alertCfg(v)   { alertCfg = v; },
    get pinHash()    { return pinHash; },     set pinHash(v)    { pinHash = v; },

    // runtime state
    get activeTab()    { return activeTab; },    set activeTab(v)    { activeTab = v; },
    get activeTbl()    { return activeTbl; },    set activeTbl(v)    { activeTbl = v; },
    get activeWk()     { return activeWk; },     set activeWk(v)     { activeWk = v; },
    get activeDy()     { return activeDy; },     set activeDy(v)     { activeDy = v; },
    get activeTTMode() { return activeTTMode; }, set activeTTMode(v) { activeTTMode = v; },
    get archOpen()     { return archOpen; },     set archOpen(v)     { archOpen = v; },

    // constants
    DEFAULT_BLOCKS, TZ_LIST, MONTH_FULL, MONTH_SHORT, DAY_NAMES, DAY_FULL,
    TYPE_META, VOICE_PERSONALITIES, QUOTES, BADGE_DEFS,

    save,
  };
})();
