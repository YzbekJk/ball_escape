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
  function buildMenu() {
    const cards = $('cards'); cards.innerHTML = '';
    Sims.list.forEach(sim => {
      const b = document.createElement('button'); b.className = 'card';
      const cv = document.createElement('canvas'); cv.width = 420; cv.height = 300;
      if (sim.preview) { const c = cv.getContext('2d'); sim.preview(c, cv.width, cv.height); }
      const t = document.createElement('div'); t.className = 't'; t.textContent = sim.title;
      const d = document.createElement('div'); d.className = 'd'; d.textContent = sim.desc || '';
      b.append(cv, t, d);
      b.onclick = () => { location.hash = '#/' + sim.id; };
      cards.appendChild(b);
    });
    const soon = document.createElement('div'); soon.className = 'card soon'; soon.textContent = 'Скоро здесь появятся новые симуляции';
    cards.appendChild(soon);
  }

  // ---------- simulation view ----------
  let current = null;   // { sim, cfg, inst, inputs, paused }

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
    sim.schema.forEach(f => {
      const box = document.createElement('div'); box.className = 'f' + (f.type === 'check' ? ' chk' : '');
      const lab = document.createElement('label'); let inp, out;
      if (f.type === 'check') {
        inp = document.createElement('input'); inp.type = 'checkbox';
        lab.append(inp, document.createTextNode(f.l));
      } else {
        lab.textContent = f.l; out = document.createElement('output'); lab.appendChild(out);
        inp = document.createElement('input'); inp.type = 'range';
        inp.min = f.min; inp.max = f.max; inp.step = f.step;
      }
      box.appendChild(lab); if (f.type !== 'check') box.appendChild(inp);
      fields.appendChild(box); inputs[f.k] = { inp, out, f };
      inp.addEventListener('input', () => {
        const v = f.type === 'check' ? inp.checked : parseFloat(inp.value);
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
    if (!sim) { location.hash = ''; return; }
    closeSim();
    menu.hidden = true; view.hidden = false; panel.hidden = true;
    view.classList.toggle('light', !!sim.light);
    $('btnPause').textContent = '⏸ Пауза';
    document.title = sim.title;
    const cfg = readCfg(sim);
    current = { sim, cfg, paused: false };
    current.inst = sim.create(canvas, cfg, { audio: () => actx });
    buildPanel();
    window.__sim = current;
  }
  function closeSim() {
    if (!current) return;
    current.inst.destroy(); current = null; window.__sim = null;
  }
  function showMenu() {
    closeSim();
    view.hidden = true; menu.hidden = false;
    document.title = 'Симуляции с шариком';
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
  }

  function route() {
    const m = location.hash.match(/^#\/([\w-]+)/);
    if (m) openSim(m[1]); else showMenu();
  }

  // ---------- buttons ----------
  $('btnBack').onclick = () => { location.hash = ''; if (!location.hash) route(); };
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
    if (e.key === ' ') { e.preventDefault(); $('btnPause').click(); }
    if (e.key === 'r' || e.key === 'R') current.inst.restart();
    if (e.key === 'Escape') { if (!panel.hidden) panel.hidden = true; else $('btnBack').click(); }
  });
  addEventListener('resize', () => { if (current) current.inst.resize(); });
  addEventListener('hashchange', route);

  buildMenu(); route();
})();
