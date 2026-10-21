/* Сливовый кликер: жми на сливу, копи сливы, покупай улучшения и постройки — сливы начнут расти сами.
   Открывается кнопкой со сливой в меню (в списках не показывается: secret). Прогресс хранится в браузере.
   Золотая слива иногда пролетает по экрану — поймай её, и всё пойдёт ×7 на 15 секунд. */
Sims.register({
  id: 'plum-clicker',
  kind: 'game',
  secret: true,
  ownSpace: true,
  title: 'Сливовый кликер',
  desc: 'Жмите на сливу, копите сливы и прокачивайтесь: сила клика, деревья, садовники, сады, заводы компота. Ловите золотую сливу — на 15 секунд всё ×7. Прогресс сохраняется.',
  defaults: { sound: true },
  schema: [{ k: 'sound', l: 'Звуки', type: 'check', live: 1 }],

  preview(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a1240'); g.addColorStop(1, '#120720'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const r = Math.min(w, h) * 0.28, x = w / 2, y = h / 2;
    const p = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r); p.addColorStop(0, '#a65bd1'); p.addColorStop(1, '#4a1a70'); ctx.fillStyle = p; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    canvas.style.touchAction = 'none';
    const KEY = 'plum_save_v1';
    const BUILD = [
      { id: 'tree', ic: '🌱', n: 'Сливовое деревце', cps: 0.5, base: 15 },
      { id: 'gard', ic: '🧑‍🌾', n: 'Садовник', cps: 4, base: 100 },
      { id: 'orch', ic: '🌳', n: 'Сливовый сад', cps: 20, base: 700 },
      { id: 'comp', ic: '🥤', n: 'Компотная', cps: 120, base: 5000 },
      { id: 'jam', ic: '🍯', n: 'Джемовая фабрика', cps: 700, base: 40000 },
      { id: 'port', ic: '🌀', n: 'Сливовый портал', cps: 4000, base: 300000 },
      { id: 'gal', ic: '🌌', n: 'Сливовая галактика', cps: 25000, base: 2500000 },
      { id: 'mine', ic: '⛏️', n: 'Сливовая шахта', cps: 150000, base: 2e7, reb: 1 },
      { id: 'rock', ic: '🚀', n: 'Сливовая ракета', cps: 900000, base: 2e8, reb: 2 },
      { id: 'time', ic: '⏳', n: 'Машина времени', cps: 6e6, base: 2e9, reb: 3 },
      { id: 'multi', ic: '🪐', n: 'Сливовая мультивселенная', cps: 4e7, base: 3e10, reb: 5 },
      { id: 'god', ic: '👑', n: 'Сливовый бог', cps: 3e8, base: 5e11, reb: 8 }
    ];
    const CLICKUP = [
      { id: 'finger', ic: '👆', n: 'Крепкий палец', add: 1, base: 20, gr: 1.4 },
      { id: 'glove', ic: '🧤', n: 'Золотые перчатки', add: 15, base: 3000, gr: 1.5 },
      { id: 'fist', ic: '✊', n: 'Железный кулак', add: 150, base: 5e5, gr: 1.5, reb: 1 },
      { id: 'slay', ic: '⚔️', n: 'Сливобой', add: 2000, base: 1e7, gr: 1.5, reb: 2 },
      { id: 'titan', ic: '🦾', n: 'Рука Титана', add: 30000, base: 3e8, gr: 1.5, reb: 4 },
      { id: 'divine', ic: '☄️', n: 'Божественный клик', add: 5e5, base: 1e10, gr: 1.5, reb: 7 }
    ];
    const MULT = [
      { id: 'm1', ic: '💩', n: 'Удобрение', x: 2, cost: 1000, d: 'всё ×2' },
      { id: 'm2', ic: '💧', n: 'Золотая лейка', x: 2, cost: 25000, d: 'всё ×2' },
      { id: 'm3', ic: '🪱', n: 'Волшебный компост', x: 3, cost: 500000, d: 'всё ×3' },
      { id: 'm4', ic: '✨', n: 'Сливовая магия', x: 5, cost: 10000000, d: 'всё ×5' },
      { id: 'm5', ic: '🍵', n: 'Сливовый чай', x: 2, cost: 5e7, d: 'всё ×2', reb: 1 },
      { id: 'm6', ic: '🏡', n: 'Теплица', x: 3, cost: 2e8, d: 'всё ×3', reb: 2 },
      { id: 'm7', ic: '☄️', n: 'Космическое удобрение', x: 4, cost: 1e9, d: 'всё ×4', reb: 3 },
      { id: 'm8', ic: '🧬', n: 'Гибридные сливы', x: 5, cost: 1e10, d: 'всё ×5', reb: 4 },
      { id: 'm9', ic: '🔮', n: 'Сливовое пророчество', x: 8, cost: 1e11, d: 'всё ×8', reb: 6 },
      { id: 'm10', ic: '🌠', n: 'Сливовая сингулярность', x: 10, cost: 1e12, d: 'всё ×10', reb: 9 }
    ];
    const PERM = [
      { id: 'pgold', ic: '🌟', n: 'Золотой нюх', d: 'золотые сливы летят на 15% чаще за уровень', cost: 4, max: 4 },
      { id: 'pfren', ic: '🔥', n: 'Долгий угар', d: '+5 секунд золотого угара за уровень', cost: 6, max: 4 },
      { id: 'pstart', ic: '💰', n: 'Стартовый капитал', d: 'после перерождения начинаешь с 10 тыс. слив за уровень', cost: 3, max: 5 },
      { id: 'ptrain', ic: '🏋️', n: 'Сливовый тренинг', d: 'клик даёт +2% от слив в секунду за уровень', cost: 10, max: 5 }
    ];
    const RANKS = [[0, 'Сливовый новичок'], [100, 'Садовод'], [1e3, 'Фермер'], [1e4, 'Сливовый барон'], [1e5, 'Король компота'], [1e6, 'Император слив'], [1e7, 'Повелитель косточек'], [1e8, 'Сливовая вселенная']];

    const fresh = () => ({ plums: 0, total: 0, run: 0, clicks: 0, lv: {}, up: {}, ach: {}, pits: 0, golds: 0, rebirths: 0, perm: {}, ts: Date.now() });
    let S = fresh();
    function load() { try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && typeof j.plums === 'number') S = Object.assign(S, j); } catch (e) { } S.run = S.run || S.total; S.ach = S.ach || {}; S.lv = S.lv || {}; S.up = S.up || {}; S.perm = S.perm || {}; }
    function save() { S.ts = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
    load();

    const ACH = [
      { id: 'c1', ic: '👆', n: 'Первый клик', d: 'Кликнуть по сливе', t: () => S.clicks >= 1 },
      { id: 'c100', ic: '💪', n: 'Сотня кликов', d: '100 кликов', t: () => S.clicks >= 100 },
      { id: 'c1k', ic: '🔥', n: 'Тысяча кликов', d: '1000 кликов', t: () => S.clicks >= 1000 },
      { id: 'c10k', ic: '⚡', n: 'Палец-молния', d: '10 000 кликов', t: () => S.clicks >= 10000 },
      { id: 'p1k', ic: '🍑', n: 'Первая корзина', d: 'Собрать 1000 слив за всё время', t: () => S.total >= 1e3 },
      { id: 'p1m', ic: '🧺', n: 'Миллионер', d: 'Собрать 1 млн слив', t: () => S.total >= 1e6 },
      { id: 'p1b', ic: '🏭', n: 'Сливовый магнат', d: 'Собрать 1 млрд слив', t: () => S.total >= 1e9 },
      { id: 'tree', ic: '🌱', n: 'Первое деревце', d: 'Купить деревце', t: () => lvl('tree') >= 1 },
      { id: 'orch', ic: '🌳', n: 'Целый сад', d: '10 садов', t: () => lvl('orch') >= 10 },
      { id: 'jam', ic: '🍯', n: 'Джемовый король', d: 'Построить джемовую фабрику', t: () => lvl('jam') >= 1 },
      { id: 'b25', ic: '🏗️', n: 'Стройка века', d: '25 построек одного вида', t: () => BUILD.some(b => lvl(b.id) >= 25) },
      { id: 'cps1k', ic: '⏱️', n: 'Тысяча в секунду', d: '1000 слив в секунду', t: () => cps() >= 1000 },
      { id: 'cps1m', ic: '🚀', n: 'Миллион в секунду', d: '1 млн слив в секунду', t: () => cps() >= 1e6 },
      { id: 'g1', ic: '🌟', n: 'Золотой улов', d: 'Поймать золотую сливу', t: () => S.golds >= 1 },
      { id: 'g10', ic: '🏆', n: 'Охотник за золотом', d: 'Поймать 10 золотых слив', t: () => S.golds >= 10 },
      { id: 'rb1', ic: '♻️', n: 'Новая жизнь', d: 'Первое перерождение', t: () => S.rebirths >= 1 },
      { id: 'rb3', ic: '🔁', n: 'Круговорот', d: '3 перерождения', t: () => S.rebirths >= 3 },
      { id: 'rb5', ic: '🌀', n: 'Вечное возвращение', d: '5 перерождений', t: () => S.rebirths >= 5 },
      { id: 'rb10', ic: '🪦', n: 'Десять жизней', d: '10 перерождений', t: () => S.rebirths >= 10 },
      { id: 'p1t', ic: '🌌', n: 'Сливовая эра', d: 'Собрать 1 трлн слив', t: () => S.total >= 1e12 },
      { id: 'cps1b', ic: '💥', n: 'Миллиард в секунду', d: '1 млрд слив в секунду', t: () => cps() >= 1e9 },
      { id: 'god', ic: '👑', n: 'Сливовый бог', d: 'Построить Сливового бога', t: () => lvl('god') >= 1 },
      { id: 'perm', ic: '🌰', n: 'Коллекционер косточек', d: 'Купить 5 улучшений за косточки', t: () => PERM.reduce((a, d) => a + plv(d.id), 0) >= 5 }
    ];
    const achCount = () => ACH.filter(a => S.ach[a.id]).length;
    const pitsFree = () => S.pits - PERM.reduce((a, d) => { let c = 0; for (let i = 0; i < plv(d.id); i++) c += d.cost * (i + 1); return a + c; }, 0);
    const pitGain = () => Math.floor(Math.sqrt((S.run || 0) / 5e5));
    const lvl = id => S.lv[id] || 0;
    const plv = id => S.perm[id] || 0;
    const locked = d => (d.reb || 0) > S.rebirths;
    const costOf = (d, n) => Math.ceil(d.base * Math.pow(d.gr || 1.15, n));
    let frenzy = 0;
    const globalMult = () => MULT.reduce((m, u) => m * (S.up[u.id] ? u.x : 1), 1) * (frenzy > 0 ? 7 : 1) * (1 + 0.1 * S.pits) * (1 + 0.02 * achCount());
    const clickPower = () => (1 + CLICKUP.reduce((a, u) => a + lvl(u.id) * u.add, 0)) * globalMult() + baseCps() * globalMult() * 0.02 * plv('ptrain');
    const baseCps = () => BUILD.reduce((a, b) => a + lvl(b.id) * b.cps, 0);
    const cps = () => baseCps() * globalMult();
    function fmt(n) {
      if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1).replace(/\.0$/, '') : String(Math.floor(n));
      const sfx = [' тыс.', ' млн', ' млрд', ' трлн', ' квдрлн', ' квнтлн']; let i = -1; while (n >= 1000 && i < sfx.length - 1) { n /= 1000; i++; }
      const v = n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : String(Math.floor(n));
      return v.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') + sfx[i];
    }
    const rankIdx = () => { let r = 0; RANKS.forEach((q, i) => { if (S.total >= q[0]) r = i; }); return r; };

    /* ---------- звук ---------- */
    function blip(f, dur, type, vol, slide) {
      if (!cfg.sound) return; const a = ctl.audio(); if (!a || a.state !== 'running') return;
      const now = a.currentTime, o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, now); if (slide) o.frequency.exponentialRampToValueAtTime(slide, now + dur);
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(vol || 0.06, now + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, now + dur); o.connect(g); g.connect(a.destination); o.start(now); o.stop(now + dur + 0.02);
    }

    /* ---------- интерфейс (DOM-панель) ---------- */
    const host = canvas.parentElement;
    const style = document.createElement('style');
    style.textContent = `
      .pc-root{position:fixed;z-index:3;pointer-events:none;inset:0;font-family:system-ui,sans-serif;color:#f3e8ff}
      .pc-panel{position:absolute;pointer-events:auto;background:rgba(22,10,36,.94);border-top:2px solid #6b3a9a;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px 10px 18px}
      .pc-panel.pc-narrow{left:0;right:0;bottom:0;height:var(--ph)}
      .pc-panel.pc-wide{right:0;top:0;bottom:0;width:380px;border-top:0;border-left:2px solid #6b3a9a;padding-top:62px}
      .pc-bar{display:flex;gap:6px;align-items:center;margin:2px 0 8px}
      .pc-bar b{flex:1;font-size:13px;color:#d9b8ff}
      .pc-bar button{font:700 12px system-ui;padding:6px 9px;border-radius:8px;border:1px solid #6b3a9a;background:#2c1648;color:#f3e8ff;cursor:pointer}
      .pc-bar button.on{background:#7b3fb8;border-color:#c79bff}
      .pc-h{font:800 12px system-ui;letter-spacing:.06em;text-transform:uppercase;color:#a77fd0;margin:10px 2px 4px}
      .pc-row{display:flex;align-items:center;gap:8px;width:100%;text-align:left;margin:0 0 6px;padding:8px 10px;border-radius:10px;border:1px solid #4a2a6e;background:#2a1445;color:#f3e8ff;cursor:pointer;font:inherit}
      .pc-row:disabled,.pc-row.no{opacity:.45;cursor:default}
      .pc-row:not(.no):not(:disabled):hover{background:#3a1d5e;border-color:#b784f0}
      .pc-row .ic{font-size:24px;width:32px;text-align:center}
      .pc-row .tx{flex:1;min-width:0}
      .pc-row .nm{font-weight:700;font-size:14px}
      .pc-row .ds{font-size:12px;color:#c7a8ea}
      .pc-row .pr{font-weight:800;font-size:13px;color:#ffe08a;white-space:nowrap}
      .pc-row.done{border-color:#4f8f4f;background:#1f3a22}
      .pc-toast{position:absolute;left:calc(var(--tw,100%) / 2);top:var(--ty,70px);transform:translateX(-50%);background:rgba(0,0,0,.75);padding:8px 14px;border-radius:12px;font:700 14px system-ui;pointer-events:none;opacity:0;transition:opacity .3s;text-align:center;max-width:90%}
      .pc-ach{display:flex;flex-wrap:wrap;gap:6px}
      .pc-at{width:42px;height:42px;font-size:22px;border-radius:10px;border:1px solid #3a2457;background:#1a0d2b;filter:grayscale(1);opacity:.4;cursor:pointer}
      .pc-at.on{filter:none;opacity:1;border-color:#c79bff;background:#3a1d5e}
      .pc-reset{margin-top:14px;font:600 12px system-ui;padding:7px 10px;border-radius:8px;border:1px solid #6a2a3a;background:#2a1020;color:#ff9aa8;cursor:pointer}
    `;
    document.head.appendChild(style);
    const root = document.createElement('div'); root.className = 'pc-root'; host.appendChild(root);
    const panel = document.createElement('div'); panel.className = 'pc-panel'; root.appendChild(panel);
    const toast = document.createElement('div'); toast.className = 'pc-toast'; root.appendChild(toast);
    let buyMode = 1, toastT = 0;
    const say = s => { toast.textContent = s; toast.style.opacity = 1; toastT = 3; };

    const rows = [];
    function addHead(t) { const h = document.createElement('div'); h.className = 'pc-h'; h.textContent = t; panel.appendChild(h); }
    function addRow(def, kind) {
      const b = document.createElement('button'); b.className = 'pc-row';
      b.innerHTML = '<span class="ic"></span><span class="tx"><div class="nm"></div><div class="ds"></div></span><span class="pr"></span>';
      b.querySelector('.ic').textContent = def.ic; panel.appendChild(b);
      b.onclick = () => buy(kind, def.id);
      rows.push({ b, def, kind, nm: b.querySelector('.nm'), ds: b.querySelector('.ds'), pr: b.querySelector('.pr') });
    }
    const bar = document.createElement('div'); bar.className = 'pc-bar'; bar.innerHTML = '<b>Купить:</b>';
    [[1, '×1'], [10, '×10'], [0, 'Макс.']].forEach(([m, l]) => { const x = document.createElement('button'); x.textContent = l; x.onclick = () => { buyMode = m; [...bar.querySelectorAll('button')].forEach(q => q.classList.toggle('on', q === x)); refreshRows(); }; if (m === 1) x.classList.add('on'); bar.appendChild(x); });
    panel.appendChild(bar);
    addHead('Сила клика'); CLICKUP.forEach(d => addRow(d, 'click'));
    addHead('Постройки (сливы сами)'); BUILD.forEach(d => addRow(d, 'build'));
    addHead('Улучшения'); MULT.forEach(d => addRow(d, 'mult'));
    addHead('Перерождение');
    const rbRow = document.createElement('button'); rbRow.className = 'pc-row'; rbRow.innerHTML = '<span class="ic">♻️</span><span class="tx"><div class="nm"></div><div class="ds"></div></span><span class="pr"></span>'; panel.appendChild(rbRow);
    rbRow.onclick = () => rebirth();
    addHead('Косточки: постоянные улучшения'); PERM.forEach(d => addRow(d, 'perm'));
    addHead('Достижения'); const achBox = document.createElement('div'); achBox.className = 'pc-ach'; panel.appendChild(achBox);
    const achEls = ACH.map(a => { const e = document.createElement('button'); e.className = 'pc-at'; e.textContent = a.ic; e.onclick = () => say((S.ach[a.id] ? '✓ ' : '🔒 ') + a.n + ' — ' + a.d); achBox.appendChild(e); return e; });
    const achCnt = document.createElement('div'); achCnt.className = 'ds'; achCnt.style.cssText = 'margin:6px 2px;color:#c7a8ea;font-size:12px'; panel.appendChild(achCnt);
    function checkAch() { ACH.forEach(a => { if (!S.ach[a.id] && a.t()) { S.ach[a.id] = 1; say('Достижение: ' + a.ic + ' ' + a.n + ' (бонус +2% ко всему)'); blip(700, 0.25, 'triangle', 0.06, 1400); } }); }
    function rebirth() {
      const g = pitGain(); if (g < 1) return;
      if (!confirm('Перерождение: вы потеряете сливы, постройки и улучшения, но получите ' + g + ' косточек (+' + (g * 10) + '% ко всему навсегда). Продолжить?')) return;
      const keep = { total: S.total, clicks: S.clicks, ach: S.ach, golds: S.golds, pits: S.pits + g, rebirths: S.rebirths + 1, perm: S.perm };
      S = Object.assign(fresh(), keep); S.plums = 1e4 * plv('pstart');  frenzy = 0; save(); say('Перерождение! +' + g + ' косточек'); blip(330, 0.5, 'sine', 0.07, 990); checkAch(); refreshRows();
    }
    const rs = document.createElement('button'); rs.className = 'pc-reset'; rs.textContent = 'Сбросить весь прогресс'; panel.appendChild(rs);
    rs.onclick = () => { if (confirm('Сбросить ВЕСЬ прогресс сливового кликера, включая косточки и достижения?')) { S = fresh(); frenzy = 0; save(); refreshRows(); } };

    function priceFor(def, kind) {
      if (kind === 'mult') return { n: S.up[def.id] ? 0 : 1, cost: def.cost };
      const have = lvl(def.id); let n = buyMode === 0 ? 0 : buyMode, sum = 0, k = 0;
      if (buyMode === 0) { let p = S.plums; while (k < 500) { const c = costOf(def, have + k); if (p < c) break; p -= c; sum += c; k++; } if (!k) return { n: 1, cost: costOf(def, have) }; return { n: k, cost: sum }; }
      for (; k < n; k++) sum += costOf(def, have + k); return { n, cost: sum };
    }
    function buy(kind, id) {
      const def = (kind === 'click' ? CLICKUP : kind === 'build' ? BUILD : kind === 'perm' ? PERM : MULT).find(q => q.id === id); if (!def) return false;
      if (locked(def)) return false;
      if (kind === 'perm') { const n = plv(id), c = def.cost * (n + 1); if (n >= def.max || pitsFree() < c) return false; S.perm[id] = n + 1; blip(520, 0.25, 'triangle', 0.07, 1040); checkAch(); refreshRows(); save(); return true; }
      if (kind === 'mult') { if (S.up[id] || S.plums < def.cost) return false; S.plums -= def.cost; S.up[id] = 1; blip(520, 0.25, 'triangle', 0.07, 1040); refreshRows(); save(); return true; }
      const p = priceFor(def, kind); if (S.plums < p.cost) return false;
      S.plums -= p.cost; S.lv[id] = lvl(id) + p.n; blip(380, 0.12, 'square', 0.04, 760); refreshRows(); return true;
    }
    function refreshRows() {
      { const g = pitGain(); rbRow.querySelector('.nm').textContent = 'Перерождение №' + (S.rebirths + 1) + (S.pits ? ' · косточек: ' + pitsFree() + ' своб. из ' + S.pits : ''); rbRow.querySelector('.ds').textContent = g >= 1 ? 'Сейчас дадут +' + g + ' косточек (+' + (g * 10) + '% ко всему навсегда)' : 'Собери за забег от 500 тыс. слив — получишь косточки (+10% каждая) и откроешь новые постройки и улучшения'; rbRow.querySelector('.pr').textContent = g >= 1 ? '+' + g : ''; rbRow.classList.toggle('no', g < 1); }
      achEls.forEach((e, i) => e.classList.toggle('on', !!S.ach[ACH[i].id])); achCnt.textContent = 'Открыто ' + achCount() + ' из ' + ACH.length + ' · каждое даёт +2% ко всему';
      rows.forEach(r => {
        const d = r.def;
        if (locked(d)) { r.nm.textContent = d.n; r.ds.textContent = 'Откроется после перерождений: ' + d.reb + ' (у вас ' + S.rebirths + ')'; r.pr.textContent = ''; r.b.classList.remove('done'); r.b.classList.add('no'); return; }
        if (r.kind === 'perm') { const n = plv(d.id), c = d.cost * (n + 1), mx = n >= d.max; r.nm.textContent = d.n + ' · ур. ' + n + '/' + d.max; r.ds.textContent = d.d; r.pr.textContent = mx ? 'МАКС' : c + ' косточек'; r.b.classList.toggle('done', mx); r.b.classList.toggle('no', !mx && pitsFree() < c); return; }
        if (r.kind === 'mult') { const has = !!S.up[d.id]; r.nm.textContent = d.n + (has ? ' ✓' : ''); r.ds.textContent = d.d; r.pr.textContent = has ? '' : fmt(d.cost); r.b.classList.toggle('done', has); r.b.classList.toggle('no', !has && S.plums < d.cost); return; }
        const p = priceFor(d, r.kind);
        r.nm.textContent = d.n + ' · ур. ' + lvl(d.id);
        r.ds.textContent = r.kind === 'click' ? '+' + fmt(d.add * globalMult()) + ' за клик' : '+' + fmt(d.cps * globalMult()) + ' сл/с каждая';
        r.pr.textContent = (p.n > 1 ? '×' + p.n + ' · ' : '') + fmt(p.cost); r.b.classList.toggle('no', S.plums < p.cost);
      });
    }

    /* ---------- геометрия ---------- */
    let W = 0, H = 0, dpr = 1, wide = false, area = { x: 0, y: 0, w: 0, h: 0 };
    function layout() {
      wide = W >= 760; panel.className = 'pc-panel ' + (wide ? 'pc-wide' : 'pc-narrow');
      const ph = Math.round(H * 0.46); root.style.setProperty('--ph', ph + 'px'); root.style.setProperty('--ty', (wide ? H - 70 : H - ph - 56) + 'px'); root.style.setProperty('--tw', wide ? (W - 380) + 'px' : '100%');
      area = wide ? { x: 0, y: 0, w: W - 380, h: H } : { x: 0, y: 0, w: W, h: H - ph };
    }
    const plumC = () => { const hud = 178, r = Math.max(40, Math.min(area.w * 0.32, (area.h - hud - 30) / 2.4)); return { x: area.x + area.w / 2, y: hud + (area.h - hud) / 2, r }; };

    /* ---------- состояние эффектов ---------- */
    let achT = 0, t = 0, sq = 0, parts = [], floats = [], gold = null, goldIn = rnd(35, 70), paused = false, raf = 0, last = 0, alive = true, saveT = 0, rowT = 0, sparkle = [];
    function rnd(a, b) { return a + Math.random() * (b - a); }
    for (let i = 0; i < 30; i++) sparkle.push({ x: Math.random(), y: Math.random(), s: rnd(0.5, 2), p: Math.random() * 6 });

    function clickPlum(px, py) {
      const p = clickPower(); S.plums += p; S.total += p; S.run += p; S.clicks++; sq = 1;
      const c = plumC(), x = px != null ? px : c.x + rnd(-c.r * 0.4, c.r * 0.4), y = py != null ? py : c.y - c.r * 0.5;
      floats.push({ x, y, s: '+' + fmt(p), life: 0.9, col: frenzy > 0 ? '#ffe08a' : '#fff' });
      for (let i = 0; i < 6; i++) parts.push({ x, y, vx: rnd(-140, 140), vy: rnd(-260, -60), life: rnd(0.4, 0.9), col: Math.random() < 0.3 ? '#d8a8ff' : '#7b2fb0', r: rnd(2, 5) });
      blip(rnd(300, 420), 0.09, 'triangle', 0.05, rnd(500, 640));
    }
    function catchGold() {
      gold = null; frenzy = 15 + 5 * plv('pfren'); const bonus = Math.max(100, cps() * 30 / 7); S.plums += bonus; S.total += bonus; S.run += bonus; S.golds++;
      say('Золотая слива! Всё ×7 на ' + frenzy + ' секунд, +' + fmt(bonus)); [660, 880, 1100, 1320].forEach((f, i) => setTimeout(() => blip(f, 0.2, 'sine', 0.06), i * 70));
      const c = plumC(); for (let i = 0; i < 30; i++) parts.push({ x: c.x, y: c.y, vx: rnd(-260, 260), vy: rnd(-300, 100), life: rnd(0.6, 1.2), col: '#ffd54a', r: rnd(2, 5) });
    }

    function tick(dt) {
      t += dt; if (sq > 0) sq = Math.max(0, sq - dt * 5);
      if (frenzy > 0) frenzy = Math.max(0, frenzy - dt);
      const g = cps() * dt; S.plums += g; S.total += g; S.run += g;
      achT += dt; if (achT > 0.5) { achT = 0; checkAch(); }
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 700 * dt; p.life -= dt; }); parts = parts.filter(p => p.life > 0);
      floats.forEach(f => { f.y -= 50 * dt; f.life -= dt; }); floats = floats.filter(f => f.life > 0);
      if (gold) { gold.x += gold.vx * dt; gold.life -= dt; gold.y = gold.y0 + Math.sin(t * 3) * 14; if (gold.life <= 0 || gold.x < -60 || gold.x > W + 60) gold = null; }
      else { goldIn -= dt; if (goldIn <= 0) { goldIn = rnd(45, 90) * Math.pow(0.85, plv('pgold')); const dir = Math.random() < 0.5 ? 1 : -1; gold = { x: dir > 0 ? -40 : area.w + 40, y0: rnd(area.h * 0.15, area.h * 0.45), y: 0, vx: dir * rnd(90, 140), life: 12 }; } }
      if (toastT > 0) { toastT -= dt; if (toastT <= 0) toast.style.opacity = 0; }
      rowT += dt; if (rowT > 0.2) { rowT = 0; refreshRows(); }
      saveT += dt; if (saveT > 4) { saveT = 0; save(); }
    }

    /* ---------- рисование ---------- */
    function plumShape(x, y, r, sx, sy) {
      const X = v => x + v * r * sx, Y = v => y + v * r * sy;
      ctx.beginPath(); ctx.moveTo(X(0), Y(-0.82));
      ctx.bezierCurveTo(X(0.55), Y(-1.02), X(1.08), Y(-0.5), X(1.0), Y(0.12));
      ctx.bezierCurveTo(X(0.95), Y(0.78), X(0.45), Y(1.0), X(0), Y(1.0));
      ctx.bezierCurveTo(X(-0.45), Y(1.0), X(-0.95), Y(0.78), X(-1.0), Y(0.12));
      ctx.bezierCurveTo(X(-1.08), Y(-0.5), X(-0.55), Y(-1.02), X(0), Y(-0.82)); ctx.closePath();
    }
    function drawPlum(x, y, r, golden, sqv) {
      const sx = 1 + 0.1 * sqv, sy = 1 - 0.12 * sqv;
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y + r * 1.08, r * 0.9, r * 0.14, 0, 0, 7); ctx.fill(); ctx.restore();
      plumShape(x, y, r, sx, sy);
      const gr = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r * 1.15);
      if (golden) { gr.addColorStop(0, '#fff2a0'); gr.addColorStop(0.5, '#ffc933'); gr.addColorStop(1, '#b87a00'); } else { gr.addColorStop(0, '#b56ae0'); gr.addColorStop(0.45, '#6c2a9c'); gr.addColorStop(1, '#2d0f4a'); }
      ctx.fillStyle = gr; ctx.fill();
      if (!golden) {   // восковой налёт, бороздка, блик
        ctx.save(); plumShape(x, y, r, sx, sy); ctx.clip(); const wx = ctx.createLinearGradient(0, y - r * 0.3, 0, y + r * 1.0); wx.addColorStop(0, 'rgba(190,210,255,0)'); wx.addColorStop(0.5, 'rgba(190,210,255,.14)'); wx.addColorStop(1, 'rgba(190,210,255,.04)'); ctx.fillStyle = wx; ctx.fillRect(x - r * 1.2, y - r * 0.3, r * 2.4, r * 1.4); ctx.restore();
        ctx.strokeStyle = 'rgba(20,0,40,.45)'; ctx.lineWidth = Math.max(2, r * 0.04); ctx.beginPath(); ctx.moveTo(x + r * 0.02, y - r * 0.8 * sy); ctx.bezierCurveTo(x + r * 0.25, y - r * 0.2, x + r * 0.22, y + r * 0.5, x, y + r * 0.95 * sy); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(x - r * 0.45, y - r * 0.42 * sy, r * 0.16, r * 0.26, -0.7, 0, 7); ctx.fill();
      ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = Math.max(2, r * 0.07); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y - r * 0.8 * sy); ctx.quadraticCurveTo(x + r * 0.06, y - r * 1.05 * sy, x + r * 0.18, y - r * 1.15 * sy); ctx.stroke();
      ctx.fillStyle = '#4aa84a'; ctx.beginPath(); ctx.ellipse(x + r * 0.34, y - r * 1.06 * sy, r * 0.22, r * 0.1, -0.5, 0, 7); ctx.fill();
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, frenzy > 0 ? '#4a2a10' : '#2a1240'); bg.addColorStop(1, frenzy > 0 ? '#2a1204' : '#120720'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      sparkle.forEach(s => { const a = 0.25 + 0.25 * Math.sin(t * 1.5 + s.p); ctx.fillStyle = 'rgba(255,230,255,' + a + ')'; ctx.fillRect(s.x * area.w, s.y * area.h, s.s * 2, s.s * 2); });
      const c = plumC();
      // HUD
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const top = Math.max(64, area.h * 0.1);
      ctx.fillStyle = '#fff'; ctx.font = '900 ' + Math.round(Math.min(46, area.w * 0.1)) + 'px system-ui'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText(fmt(S.plums) + ' слив', area.w / 2, top);
      ctx.shadowBlur = 0; ctx.font = '700 ' + Math.round(Math.min(18, area.w * 0.04)) + 'px system-ui'; ctx.fillStyle = frenzy > 0 ? '#ffe08a' : '#d9b8ff';
      ctx.fillText('+' + fmt(cps()) + ' в секунду · +' + fmt(clickPower()) + ' за клик' + (S.pits ? ' · 🌰' + S.pits : ''), area.w / 2, top + 30);
      if (frenzy > 0) { ctx.fillStyle = '#ffe08a'; ctx.fillText('ЗОЛОТАЯ ЛИХОРАДКА ×7 — ещё ' + Math.ceil(frenzy) + ' с', area.w / 2, top + 52); }
      const ri = rankIdx(), nxt = RANKS[ri + 1]; ctx.fillStyle = '#ffd5f2'; ctx.fillText('Ранг: ' + RANKS[ri][1], area.w / 2, top + (frenzy > 0 ? 74 : 54));
      if (nxt) { const bw = Math.min(260, area.w * 0.6), bx = area.w / 2 - bw / 2, by = top + (frenzy > 0 ? 90 : 70), v = (S.total - RANKS[ri][0]) / (nxt[0] - RANKS[ri][0]); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(bx, by, bw, 8); ctx.fillStyle = '#c77bff'; ctx.fillRect(bx, by, bw * Math.min(1, v), 8); }
      drawPlum(c.x, c.y, c.r, false, sq);
      if (gold) drawPlum(gold.x, gold.y0 + (gold.y - gold.y0), Math.max(22, c.r * 0.28), true, 0);
      parts.forEach(p => { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1;
      floats.forEach(f => { ctx.globalAlpha = Math.min(1, f.life * 1.6); ctx.font = '900 ' + Math.round(Math.max(18, c.r * 0.28)) + 'px system-ui'; ctx.fillStyle = f.col; ctx.strokeStyle = '#2a0b44'; ctx.lineWidth = 4; ctx.strokeText(f.s, f.x, f.y); ctx.fillText(f.s, f.x, f.y); }); ctx.globalAlpha = 1;
      if (S.clicks === 0 && S.total < 5) { ctx.font = '700 18px system-ui'; ctx.fillStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * Math.sin(t * 4)) + ')'; ctx.fillText('Жми на сливу!', c.x, c.y + c.r * 1.35); }
    }

    /* ---------- ввод ---------- */
    function onDown(e) {
      if (paused) return; const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (gold) { const gr = Math.max(22, plumC().r * 0.28) * 1.4; if (Math.hypot(x - gold.x, y - gold.y) < gr) { catchGold(); return; } }
      const c = plumC(); if (Math.hypot(x - c.x, y - c.y) < c.r * 1.12) clickPlum(x, y);
    }
    function onKey(e) { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!e.repeat) clickPlum(); } }
    canvas.addEventListener('pointerdown', onDown); addEventListener('keydown', onKey);
    const onHide = () => save(); addEventListener('pagehide', onHide);

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2); W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); layout(); refreshRows();
    }
    function frame(ts) {
      if (!alive) return; const dt = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
      if (!paused) tick(dt); draw(); raf = requestAnimationFrame(frame);
    }
    resize();
    // пока вас не было
    const away = Math.min(7200, (Date.now() - (S.ts || Date.now())) / 1000);
    if (away > 60 && cps() > 0) { const g = cps() * away * 0.5; S.plums += g; S.total += g; S.run += g; say('Пока вас не было, сады дали +' + fmt(g) + ' слив'); }
    refreshRows();
    raf = requestAnimationFrame(frame);
    return {
      restart() { layout(); refreshRows(); },
      resize,
      setPaused(p) { paused = p; },
      destroy() { alive = false; save(); cancelAnimationFrame(raf); canvas.style.touchAction = ''; canvas.removeEventListener('pointerdown', onDown); removeEventListener('keydown', onKey); removeEventListener('pagehide', onHide); root.remove(); style.remove(); },
      debug: { clickPlum, buy, tick, catchGold, rebirth, checkAch, pitGain, get ach() { return S.ach; }, get S() { return S; }, get cps() { return cps(); }, get click() { return clickPower(); }, fmt, rows, get gold() { return gold; }, set gold(v) { gold = v; } }
    };
  }
});
