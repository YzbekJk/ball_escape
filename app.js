/* Shell: menu, routing (#/<sim-id>), settings panel, URL params. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const menu = $('menu'), view = $('view'), canvas = $('c'), panel = $('panel'), fields = $('fields');

  // ---------- audio (one shared context, unlocked by a user gesture) ----------
  let actx = null;
  function initAudio() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) actx = new AC();
  }
  addEventListener('pointerdown', () => { if (current && current.cfg.sound) initAudio(); }, { passive: true });

  // ---------- menu ----------
  // Every simulation may set kind: 'sim' (default) or 'game' — that decides the section it appears in.
  const SECTIONS = {
    sims:  { kind: 'sim',  title: 'Симуляции', icon: '🧪', desc: 'Смотрите, как шарик ведёт себя в разных ситуациях: настраивайте и делитесь ссылкой.', empty: 'Скоро здесь появятся новые симуляции' },
    games: { kind: 'game', title: 'Игры', icon: '🎮', desc: 'Здесь будут игры, в которых вы управляете шариком сами.', empty: 'Скоро здесь появятся игры' }
  };
  const kindOf = sim => sim.kind === 'game' ? 'game' : 'sim';
  const sectionOfKind = k => k === 'game' ? 'games' : 'sims';

  function showMenuPage(section) {
    closeSim();
    view.hidden = true; menu.hidden = false; menu.scrollTop = 0;
    const cards = $('cards'); cards.innerHTML = ''; cards.className = '';
    const back = $('menuBack');
    if (!section) {                                   // home: pick a section
      document.title = 'Шарики'; $('menuTitle').textContent = 'Шарики'; $('menuSub').textContent = 'Что хотите открыть?';
      back.hidden = true; cards.className = 'home';
      Object.keys(SECTIONS).forEach(id => {
        const sec = SECTIONS[id], count = Sims.list.filter(s => kindOf(s) === sec.kind).length;
        const b = document.createElement('button'); b.className = 'card big' + (count ? '' : ' empty');
        b.innerHTML = '<div class="ic"></div><div><div class="t"></div><div class="d"></div><span class="n"></span></div>';
        b.querySelector('.ic').textContent = sec.icon; b.querySelector('.t').textContent = sec.title;
        b.querySelector('.d').textContent = sec.desc; b.querySelector('.n').textContent = count ? count + ' шт.' : 'скоро';
        b.onclick = () => { location.hash = '#/' + id; };
        cards.appendChild(b);
      });
    } else {                                          // a section: list of its items
      const sec = SECTIONS[section];
      document.title = sec.title; $('menuTitle').textContent = sec.title; $('menuSub').textContent = 'Выберите, что открыть';
      back.hidden = false;
      const items = Sims.list.filter(s => kindOf(s) === sec.kind).sort((a, b) => (b.hit ? 1 : 0) - (a.hit ? 1 : 0));   // hits first
      items.forEach(sim => {
        const b = document.createElement('button'); b.className = 'card' + (sim.hit ? ' hit' : '');
        const cv = document.createElement('canvas'); cv.width = 420; cv.height = 300;
        if (sim.preview) { const c = cv.getContext('2d'); sim.preview(c, cv.width, cv.height); }
        const t = document.createElement('div'); t.className = 't'; t.textContent = sim.title;
        const d = document.createElement('div'); d.className = 'd'; d.textContent = sim.desc || '';
        b.append(cv, t, d);
        if (sim.hit) { const h = document.createElement('div'); h.className = 'hitbadge'; h.textContent = 'ХИТ!'; b.appendChild(h); }
        b.onclick = () => { location.hash = '#/' + sim.id; };
        cards.appendChild(b);
      });
      const soon = document.createElement('div'); soon.className = 'card soon'; soon.textContent = sec.empty;
      if (!items.length) cards.appendChild(soon);
      else { soon.textContent = 'Скоро здесь появится ещё что-то'; cards.appendChild(soon); }
    }
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
  }

  // ---------- simulation view ----------
  const APP_VERSION = 68;
  $('ver').textContent = 'Версия ' + APP_VERSION;
  let current = null;   // { sim, cfg, inst, inputs, paused }

  // ---- common overlay (timer + text) available in every simulation, hidden by default ----
  const EXTRA = { ovTimer: false, ovTimerY: 92, ovTimerSize: 9, ovText: false, ovTextStr: 'Текст', ovTextY: 8, ovTextSize: 7 };
  const EXTRA_SCHEMA = [
    { k: 'ovTimer', l: '⏱ Показать таймер', type: 'check', live: 1 },
    { k: 'ovTimerY', l: 'Таймер: положение по вертикали, %', min: 3, max: 97, step: 1, live: 1 },
    { k: 'ovTimerSize', l: 'Таймер: размер', min: 3, max: 25, step: 0.5, live: 1 },
    { k: 'ovText', l: '🅣 Показать текст', type: 'check', live: 1 },
    { k: 'ovTextStr', l: 'Текст', type: 'text', live: 1 },
    { k: 'ovTextY', l: 'Текст: положение по вертикали, %', min: 3, max: 97, step: 1, live: 1 },
    { k: 'ovTextSize', l: 'Текст: размер', min: 2, max: 20, step: 0.5, live: 1 }
  ];
  const ovTimer = $('ovTimer'), ovText = $('ovText');
  let timerT = 0, timerLast = 0, timerRaf = 0;
  function fmtTime(t) { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); }
  function updateOverlay(ts) {
    timerRaf = requestAnimationFrame(updateOverlay);
    if (!current) return;
    const c = current.cfg, dt = Math.min(0.1, (ts - timerLast) / 1000 || 0); timerLast = ts;
    if (!current.paused) timerT += dt * (c.simSpeed || 1);
    ovTimer.hidden = !c.ovTimer; ovText.hidden = !c.ovText;
    if (c.ovTimer) {
      ovTimer.textContent = fmtTime(timerT); ovTimer.style.top = c.ovTimerY + '%'; ovTimer.style.fontSize = c.ovTimerSize + 'vmin';
    }
    if (c.ovText) {
      ovText.textContent = c.ovTextStr; ovText.style.top = c.ovTextY + '%'; ovText.style.fontSize = c.ovTextSize + 'vmin';
    }
  }
  timerRaf = requestAnimationFrame(updateOverlay);

  function readCfg(sim) {
    const cfg = Object.assign({}, sim.defaults), q = new URLSearchParams(location.search);
    for (const k in sim.defaults) {
      if (!q.has(k)) continue;
      const d = sim.defaults[k], v = q.get(k);
      if (typeof d === 'number') { const n = parseFloat(v); if (isFinite(n)) cfg[k] = n; }
      else if (typeof d === 'boolean') cfg[k] = v === '1' || v === 'true';
      else cfg[k] = v;
    }
    return cfg;
  }
  function writeURL() {
    if (!current) return;
    const { sim, cfg } = current, q = new URLSearchParams();
    for (const k in sim.defaults) if (cfg[k] !== sim.defaults[k]) q.set(k, typeof cfg[k] === 'boolean' ? (cfg[k] ? 1 : 0) : cfg[k]);
    const s = q.toString();
    try { history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash); } catch (e) {}
  }
  const fmt = v => String(+(+v).toFixed(3));

  function buildPanel() {
    const { sim, cfg } = current, inputs = current.inputs = {};
    fields.innerHTML = '';
    $('panelTitle').textContent = sim.title;
    sim.schema.concat(EXTRA_SCHEMA).forEach(f => {
      const box = document.createElement('div'); box.className = 'f' + (f.type === 'check' ? ' chk' : '');
      const lab = document.createElement('label'); let inp, out;
      if (f.type === 'check') {
        inp = document.createElement('input'); inp.type = 'checkbox';
        lab.append(inp, document.createTextNode(f.l));
      } else if (f.type === 'text') {
        lab.textContent = f.l; inp = document.createElement('input'); inp.type = 'text'; inp.className = 'txt';
      } else {
        lab.textContent = f.l; out = document.createElement('output'); lab.appendChild(out);
        inp = document.createElement('input'); inp.type = 'range';
        inp.min = f.min; inp.max = f.max; inp.step = f.step;
      }
      box.appendChild(lab); if (f.type !== 'check') box.appendChild(inp);
      fields.appendChild(box); inputs[f.k] = { inp, out, f };
      inp.addEventListener('input', () => {
        const v = f.type === 'check' ? inp.checked : f.type === 'text' ? inp.value : parseFloat(inp.value);
        if (typeof v === 'number' && !isFinite(v)) return;
        cfg[f.k] = v; if (f.k === 'sound' && v) initAudio();
        refresh(); writeURL();
        if (!f.live) current.inst.restart();
      });
    });
    refresh();
  }
  function refresh() {
    const { cfg, inputs } = current;
    for (const k in inputs) {
      const { inp, out, f } = inputs[k];
      if (f.type === 'check') inp.checked = !!cfg[k]; else inp.value = cfg[k];
      if (out) out.textContent = fmt(cfg[k]);
    }
    $('btnSound').textContent = cfg.sound ? '🔊' : '🔇';
  }

  function openSim(id) {
    const sim = Sims.get(id);
    closeSim();
    for (const k in EXTRA) if (!(k in sim.defaults)) sim.defaults[k] = EXTRA[k];
    timerT = 0;
    menu.hidden = true; view.hidden = false; panel.hidden = true;
    view.classList.toggle('light', !!sim.light);
    $('btnPause').textContent = '⏸ Пауза';
    document.title = sim.title;
    const cfg = readCfg(sim);
    current = { sim, cfg, paused: false };
    current.inst = sim.create(canvas, cfg, { audio: () => actx, submitScore: v => submitScore(sim, cfg, v) });
    $('btnLB').hidden = !sim.lb; $('btnLB').onclick = () => LB.openBoard(sim);
    const origRestart = current.inst.restart; current.inst.restart = function () { timerT = 0; return origRestart.apply(this, arguments); };
    buildPanel();
    window.__sim = current;
  }
  // ---- accounts / leaderboards ----
  function submitScore(sim, cfg, v) {
    if (!sim.lb || !window.LB) return;
    const fair = sim.lb.fair || [];
    if (fair.some(k => cfg[k] !== sim.defaults[k])) { LB.toast('Рекорд не засчитан: изменены настройки сложности'); return; }
    LB.submit(sim.id, v, sim.lb.better);
  }
  const accBtn = $('accBtn');
  function refreshAcc() { accBtn.textContent = LB.loggedIn ? '👤 ' + LB.nick : '👤 Войти'; if (LB.loggedIn && LB.creator) { accBtn.append(' '); accBtn.append(LB.creatorBadge()); } }
  accBtn.onclick = () => LB.openAccount(); LB.onChange(refreshAcc); refreshAcc();

  function closeSim() {
    if (!current) return;
    current.inst.destroy(); current = null; window.__sim = null;
  }
  function route() {
    const m = location.hash.match(/^#\/([\w-]+)/), id = m && m[1];
    if (id && SECTIONS[id]) showMenuPage(id);
    else if (id && Sims.get(id)) openSim(id);
    else showMenuPage(null);
  }

  // ---------- buttons ----------
  $('btnBack').onclick = () => { location.hash = '#/' + sectionOfKind(kindOf(current.sim)); };
  $('menuBack').onclick = () => { location.hash = '#/'; };
  $('btnGear').onclick = () => { panel.hidden = !panel.hidden; initAudio(); };
  $('btnClose').onclick = () => { panel.hidden = true; };
  $('btnSound').onclick = () => { current.cfg.sound = !current.cfg.sound; if (current.cfg.sound) initAudio(); refresh(); writeURL(); };
  $('btnRestart').onclick = () => current.inst.restart();
  $('btnPause').onclick = e => {
    current.paused = !current.paused; current.inst.setPaused(current.paused);
    e.target.textContent = current.paused ? '▶ Дальше' : '⏸ Пауза';
  };
  $('btnDefaults').onclick = () => { Object.assign(current.cfg, current.sim.defaults); refresh(); writeURL(); current.inst.restart(); };
  $('btnCopy').onclick = e => {
    const done = () => { e.target.textContent = '✓ Скопировано'; setTimeout(() => e.target.textContent = '🔗 Копировать ссылку', 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, () => prompt('Ссылка:', location.href));
    else prompt('Ссылка:', location.href);
  };
  addEventListener('keydown', e => {
    if (!current || e.target.tagName === 'INPUT') return;
    if (e.key === ' ' && !current.sim.ownSpace) { e.preventDefault(); $('btnPause').click(); }
    if (e.key === 'r' || e.key === 'R') current.inst.restart();
    if (e.key === 'Escape') { if (!panel.hidden) panel.hidden = true; else $('btnBack').click(); }
  });
  addEventListener('resize', () => { if (current) current.inst.resize(); });
  addEventListener('hashchange', route);

  route();
})();
