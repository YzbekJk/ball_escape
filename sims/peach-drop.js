/* «Персик дроп» — апгрейдер фруктов (по мотивам сайтов-апгрейдеров, но на фруктах и без настоящих денег).
   Монеты и фрукты здесь виртуальные: их нельзя купить, вывести или обменять. Открывай ящики, выбирай свои фрукты (и монеты)
   и пробуй улучшить их до более дорогого фрукта: колесо показывает точный шанс. Выиграл — получаешь цель, проиграл — выбранное сгорает. */
Sims.register({
  id: 'peach-drop',
  kind: 'game',
  ownSpace: true,
  title: 'Персик дроп',
  desc: 'Апгрейдер фруктов: открывайте ящики, выбирайте фрукты и монеты и улучшайте их до более дорогого фрукта. Шанс виден на колесе. Всё виртуальное, настоящих денег нет. Прогресс хранится в браузере.',
  defaults: { sound: true },
  schema: [{ k: 'sound', l: 'Звуки', type: 'check', live: 1 }],

  preview(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2b1236'); g.addColorStop(1, '#140a1c'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.32;
    ctx.lineWidth = r * 0.22; ctx.strokeStyle = '#3a2a48'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#46d36a'; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + 2.2); ctx.stroke();
    ctx.fillStyle = '#ffb870'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, 7); ctx.fill(); ctx.fillStyle = '#ff7a8a'; ctx.beginPath(); ctx.arc(cx + r * 0.12, cy + r * 0.1, r * 0.2, 0, 7); ctx.fill();
  },

  create(canvas, cfg, ctl) {
    const ctx = canvas.getContext('2d');
    const KEY = 'peach_drop_v1';
    const FRUITS = [
      { id: 'sorrel', ic: '', n: 'Щавель', v: 5, col: '#9aa3b8' },
      { id: 'cherry', ic: '🍒', n: 'Вишня', v: 10, col: '#9aa3b8' },
      { id: 'straw', ic: '🍓', n: 'Клубника', v: 25, col: '#9aa3b8' },
      { id: 'lemon', ic: '🍋', n: 'Лимон', v: 60, col: '#6fb0ff' },
      { id: 'orange', ic: '🍊', n: 'Апельсин', v: 120, col: '#6fb0ff' },
      { id: 'apple', ic: '🍎', n: 'Яблоко', v: 250, col: '#b07cff' },
      { id: 'pear', ic: '🍐', n: 'Груша', v: 500, col: '#b07cff' },
      { id: 'peach', ic: '🍑', n: 'Персик', v: 1000, col: '#ff6fd0' },
      { id: 'pine', ic: '🍍', n: 'Ананас', v: 2500, col: '#ff6fd0' },
      { id: 'mango', ic: '🥭', n: 'Манго', v: 6000, col: '#ff9a4a' },
      { id: 'melon', ic: '🍉', n: 'Арбуз', v: 15000, col: '#ff9a4a' },
      { id: 'grape', ic: '🍇', n: 'Виноград', v: 40000, col: '#ffd24a' },
      { id: 'coco', ic: '🥥', n: 'Кокос', v: 100000, col: '#ffd24a' },
      { id: 'gold', ic: '🌟', n: 'Золотой персик', v: 300000, col: '#ff4a4a' },
      { id: 'dia', ic: '💎', n: 'Алмазный персик', v: 1000000, col: '#4af0ff' },
      { id: 'plum', ic: '', n: 'Слива', v: 5000000, col: '#ff3df0' }
    ];
    const FB = {}; FRUITS.forEach(f => FB[f.id] = f);
    const CRATES = [
      { id: 'c1', n: 'Корзинка', w: { sorrel: 30, cherry: 35, straw: 22, lemon: 11, orange: 5, apple: 1 } },
      { id: 'c2', n: 'Ящик', w: { sorrel: 5, cherry: 15, straw: 15, lemon: 20, orange: 20, apple: 15, pear: 7, peach: 3 } },
      { id: 'c3', n: 'Золотой ящик', w: { apple: 20, pear: 25, peach: 25, pine: 15, mango: 9, melon: 4, grape: 2, plum: 0.004 } }
    ];
    CRATES.forEach(c => { let tw = 0, ev = 0; for (const k in c.w) { tw += c.w[k]; ev += c.w[k] * FB[k].v; } c.price = Math.max(5, Math.ceil(ev / tw / 0.93 / 5) * 5); });   // в среднем возвращается ~93% цены
    const EDGE = 0.95, HARVEST_EVERY = 45, HARVEST = 15;

    let rng = Math.random;
    const fresh = () => ({ coins: 100, inv: { cherry: 2 }, best: 0, spins: 0, wins: 0, harvestAt: 0, crates: 0 });
    let S = fresh();
    try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && typeof j.coins === 'number') S = Object.assign(S, j); } catch (e) { }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
    const fmt = n => { n = Math.round(n); return n < 1000 ? String(n) : n < 1e6 ? (n / 1000).toFixed(n < 1e4 ? 1 : 0).replace(/\.0$/, '') + ' тыс.' : (n / 1e6).toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + ' млн'; };
    const count = id => S.inv[id] || 0;
    const bestId = () => { let b = null; FRUITS.forEach(f => { if (count(f.id) > 0 || S.best >= f.v) b = f; }); return b; };

    /* ----- выбор ----- */
    let sel = {}, addCoins = 0, target = null, spinning = false, tab = 'inv';
    const selSum = () => Object.keys(sel).reduce((a, k) => a + FB[k].v * sel[k], 0) + addCoins;
    const chanceFor = t => { const s = selSum(); return s <= 0 ? 0 : Math.max(0, Math.min(0.9, EDGE * s / t.v)); };
    const clean = () => { for (const k in sel) { sel[k] = Math.min(sel[k], count(k)); if (sel[k] <= 0) delete sel[k]; } addCoins = Math.min(addCoins, S.coins); };


    function drawFruit(id, px) {
      const c = document.createElement('canvas'), d = Math.min(window.devicePixelRatio || 1, 2); c.width = c.height = Math.round(px * d); c.style.width = c.style.height = px + 'px';
      const x = c.getContext('2d'); x.scale(c.width / 100, c.height / 100); x.lineJoin = x.lineCap = 'round';
      const ell = (cx, cy, rx, ry, col, rot) => { x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, rx, ry, rot || 0, 0, 7); x.fill(); };
      const leaf = (cx, cy, rot, col) => ell(cx, cy, 14, 6, col || '#3fa84a', rot);
      const shine = (cx, cy, r) => ell(cx, cy, r, r * 0.6, 'rgba(255,255,255,.45)', -0.6);
      const stem = (x1, y1, x2, y2) => { x.strokeStyle = '#6b4226'; x.lineWidth = 5; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); };
      const out = (col) => { x.strokeStyle = col || 'rgba(0,0,0,.28)'; x.lineWidth = 3; x.stroke(); };
      if (id === 'crate') { x.fillStyle = '#a8703a'; x.fillRect(12, 34, 76, 54); x.fillStyle = '#c88a4a'; x.fillRect(8, 24, 84, 16); x.strokeStyle = '#5a3a18'; x.lineWidth = 3; x.strokeRect(12, 34, 76, 54); x.strokeRect(8, 24, 84, 16); x.beginPath(); x.moveTo(12, 56); x.lineTo(88, 56); x.moveTo(50, 40); x.lineTo(50, 88); x.stroke(); x.fillStyle = '#ffd24a'; x.fillRect(44, 50, 12, 12); }
      else if (id === 'cherry') { stem(32, 66, 52, 18); stem(70, 68, 52, 18); ell(32, 70, 19, 19, '#d4203a'); ell(70, 72, 19, 19, '#b5162e'); shine(26, 63, 6); shine(64, 65, 6); leaf(62, 18, -0.3); }
      else if (id === 'sorrel') { x.strokeStyle = '#2f7a38'; x.lineWidth = 4; x.beginPath(); x.moveTo(50, 94); x.lineTo(50, 40); x.stroke(); [[-0.5, 30, 50], [0.5, 70, 50], [-0.25, 38, 28], [0.25, 62, 28], [0, 50, 12]].forEach(q => { x.save(); x.translate(q[1], q[2]); x.rotate(q[0]); x.fillStyle = '#4cb04f'; x.beginPath(); x.moveTo(0, 20); x.quadraticCurveTo(-18, 0, 0, -20); x.quadraticCurveTo(18, 0, 0, 20); x.fill(); x.strokeStyle = '#2f7a38'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 18); x.lineTo(0, -16); x.stroke(); x.restore(); }); x.strokeStyle = '#a02a2a'; x.lineWidth = 3; x.beginPath(); x.moveTo(50, 94); x.lineTo(50, 70); x.stroke(); }
      else if (id === 'plum') { ell(50, 58, 38, 36, '#6a1fa8'); ell(50, 58, 38, 36, 'rgba(255,255,255,0)'); x.strokeStyle = 'rgba(20,0,40,.5)'; x.lineWidth = 3; x.beginPath(); x.moveTo(50, 24); x.quadraticCurveTo(40, 58, 50, 92); x.stroke(); ell(66, 62, 22, 28, '#4c1480'); ell(36, 44, 18, 14, 'rgba(200,160,255,.35)', -0.5); shine(32, 42, 7); stem(50, 26, 52, 10); leaf(66, 16, -0.4); x.fillStyle = '#fff'; x.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 3 : 9; x.lineTo(80 + Math.cos(a) * r, 22 + Math.sin(a) * r); } x.fill(); x.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 2 : 6; x.lineTo(16 + Math.cos(a) * r, 76 + Math.sin(a) * r); } x.fill(); }
      else if (id === 'straw') { x.fillStyle = '#e0243a'; x.beginPath(); x.moveTo(18, 34); x.quadraticCurveTo(50, 22, 82, 34); x.quadraticCurveTo(76, 70, 50, 90); x.quadraticCurveTo(24, 70, 18, 34); x.fill(); x.fillStyle = '#ffe9a0'; [[36, 46], [52, 44], [66, 48], [44, 60], [58, 62], [50, 76]].forEach(q => ell(q[0], q[1], 2.6, 3.6, '#ffe9a0')); ell(50, 28, 22, 8, '#3fa84a'); ell(36, 24, 8, 5, '#3fa84a', -0.5); ell(64, 24, 8, 5, '#3fa84a', 0.5); }
      else if (id === 'lemon') { x.fillStyle = '#ffe14a'; x.beginPath(); x.moveTo(8, 52); x.quadraticCurveTo(18, 22, 50, 22); x.quadraticCurveTo(82, 22, 92, 52); x.quadraticCurveTo(82, 82, 50, 82); x.quadraticCurveTo(18, 82, 8, 52); x.fill(); out('#c9a800'); shine(38, 40, 10); leaf(66, 24, -0.4); }
      else if (id === 'orange') { ell(50, 56, 36, 36, '#ff9420'); out('#c9680a'); shine(36, 42, 10); leaf(56, 20, 0.2); x.fillStyle = '#3fa84a'; ell(50, 22, 4, 4, '#3fa84a'); }
      else if (id === 'apple') { ell(36, 56, 28, 32, '#e02a2a'); ell(64, 56, 28, 32, '#d02020'); ell(50, 64, 30, 26, '#e02a2a'); shine(34, 46, 8); stem(50, 30, 54, 12); leaf(66, 18, -0.4); }
      else if (id === 'pear') { ell(50, 70, 30, 26, '#a8d234'); ell(50, 40, 18, 22, '#b6dc3c'); shine(40, 64, 8); stem(50, 20, 54, 8); leaf(66, 16, -0.4); }
      else if (id === 'peach') { ell(50, 56, 36, 34, '#ffb48a'); ell(66, 60, 22, 28, '#ff7d8f'); x.strokeStyle = 'rgba(160,50,60,.5)'; x.lineWidth = 3; x.beginPath(); x.moveTo(50, 24); x.quadraticCurveTo(40, 56, 52, 88); x.stroke(); shine(34, 44, 8); leaf(62, 20, -0.5); stem(50, 26, 50, 16); }
      else if (id === 'pine') { ell(50, 62, 26, 32, '#f2b823'); x.strokeStyle = '#b57c10'; x.lineWidth = 2.5; for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(30 + i * 8, 36); x.lineTo(70 + i * 8, 90); x.moveTo(70 + i * 8, 36); x.lineTo(30 + i * 8, 90); x.stroke(); } x.fillStyle = '#3fa84a'; [[-22, -0.6], [-10, -0.25], [0, 0], [10, 0.25], [22, 0.6]].forEach(q => ell(50 + q[0] * 0.7, 18, 5, 16, '#3fa84a', q[1])); }
      else if (id === 'mango') { ell(50, 56, 38, 28, '#ffa31f', -0.5); ell(60, 62, 24, 18, '#ff5b3a', -0.5); shine(34, 46, 8); leaf(66, 22, 0.4, '#2f8f45'); }
      else if (id === 'melon') { ell(50, 56, 40, 34, '#2f8f45'); x.strokeStyle = '#1d6a32'; x.lineWidth = 4; [-24, -8, 8, 24].forEach(o => { x.beginPath(); x.moveTo(50 + o * 0.3, 23); x.quadraticCurveTo(50 + o * 1.7, 56, 50 + o * 0.3, 89); x.stroke(); }); shine(34, 42, 9); x.fillStyle = '#ff4a5a'; x.beginPath(); x.moveTo(60, 56); x.arc(60, 56, 26, -0.2, 1.0); x.closePath(); x.fill(); x.fillStyle = '#2a1410'; ell(70, 62, 2, 3, '#2a1410', 0.5); ell(64, 68, 2, 3, '#2a1410', 0.3); }
      else if (id === 'grape') { [[36, 38], [64, 38], [50, 40], [28, 58], [50, 60], [72, 58], [40, 78], [60, 78], [50, 92]].forEach((q, i) => { ell(q[0], q[1] - 6, 13, 13, i % 2 ? '#8e3fd0' : '#7a2fc0'); ell(q[0] - 4, q[1] - 10, 3.5, 3.5, 'rgba(255,255,255,.5)'); }); stem(50, 28, 52, 10); leaf(66, 14, -0.3); }
      else if (id === 'coco') { ell(50, 54, 38, 38, '#7a4a28'); out('#4a2a12'); ell(50, 54, 28, 28, '#f6f0e4'); ell(36, 46, 4.5, 5.5, '#4a2a12'); ell(52, 42, 4.5, 5.5, '#4a2a12'); ell(46, 60, 4.5, 5.5, '#4a2a12'); }
      else if (id === 'gold') { ell(50, 56, 36, 34, '#ffd24a'); ell(66, 60, 22, 28, '#f0a21a'); out('#9a6a00'); leaf(62, 20, -0.5, '#ffe58a'); x.fillStyle = '#fff'; x.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 4 : 11; x.lineTo(34 + Math.cos(a) * r, 40 + Math.sin(a) * r); } x.fill(); }
      else if (id === 'dia') { x.fillStyle = '#5ae6ff'; x.beginPath(); x.moveTo(24, 22); x.lineTo(76, 22); x.lineTo(92, 42); x.lineTo(50, 92); x.lineTo(8, 42); x.closePath(); x.fill(); out('#1a8fb0'); x.fillStyle = '#c4f6ff'; x.beginPath(); x.moveTo(24, 22); x.lineTo(40, 42); x.lineTo(50, 22); x.lineTo(60, 42); x.lineTo(76, 22); x.lineTo(92, 42); x.lineTo(8, 42); x.closePath(); x.fill(); x.strokeStyle = '#1a8fb0'; x.lineWidth = 2; x.beginPath(); x.moveTo(8, 42); x.lineTo(92, 42); x.moveTo(40, 42); x.lineTo(50, 92); x.lineTo(60, 42); x.stroke(); }
      return c;
    }

    /* ----- звук ----- */
    function blip(f, dur, type, vol, slide) {
      if (!cfg.sound) return; const a = ctl.audio(); if (!a || a.state !== 'running') return;
      const now = a.currentTime, o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, now); if (slide) o.frequency.exponentialRampToValueAtTime(slide, now + dur);
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(vol || 0.05, now + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, now + dur); o.connect(g); g.connect(a.destination); o.start(now); o.stop(now + dur + 0.02);
    }

    /* ----- DOM ----- */
    const host = canvas.parentElement, style = document.createElement('style');
    style.textContent = `
      .pd-root{position:fixed;inset:0;z-index:3;overflow-y:auto;-webkit-overflow-scrolling:touch;font-family:system-ui,sans-serif;color:#f6e9ff;padding:64px 12px 40px}
      .pd-col{max-width:560px;margin:0 auto}
      .pd-top{display:flex;align-items:center;gap:10px;justify-content:space-between;margin-bottom:10px}
      .pd-coins{font:800 22px system-ui}.pd-coins small{display:block;font:600 11px system-ui;color:#b99ad0}
      .pd-btn{font:700 13px system-ui;padding:9px 13px;border-radius:10px;border:1px solid #7a4a9a;background:#3a1d52;color:#fff;cursor:pointer}
      .pd-btn:disabled{opacity:.4;cursor:default}
      .pd-btn.go{background:#2f9a4f;border-color:#58e08a;font-size:17px;padding:13px 0;width:100%;margin-top:8px}
      .pd-btn.go:disabled{background:#2a3a30;border-color:#3a5a46}
      .pd-wheelbox{position:relative;width:min(300px,86vw);height:min(300px,86vw);margin:4px auto}
      .pd-wheelbox>canvas:first-child{position:absolute;inset:0;width:100%;height:100%}
      .pd-mid{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:none}
      .pd-mid .big{font:900 34px system-ui}.pd-mid .sm{font:600 12px system-ui;color:#cdb2e4}
      .pd-sum{text-align:center;font:600 13px system-ui;color:#d9c2ee;min-height:36px;margin:2px 0 4px}
      .pd-tabs{display:flex;gap:6px;margin:14px 0 8px}.pd-tabs button{flex:1}
      .pd-tabs button.on{background:#7b3fb8;border-color:#c79bff}
      .pd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}
      .pd-tile{position:relative;border-radius:12px;border:2px solid #4a2a6a;background:#241236;padding:8px 4px;text-align:center;cursor:pointer;color:inherit;font:inherit}
      .pd-tile .ic{font-size:30px;line-height:1.1}.pd-tile .nm{font:700 11px system-ui}.pd-tile .vl{font:600 11px system-ui;color:#ffe08a}
      .pd-tile .cn{position:absolute;top:3px;right:6px;font:800 11px system-ui;color:#fff}
      .pd-tile.on{background:#3b2a5c;box-shadow:0 0 0 2px #fff inset}
      .pd-tile.tg{background:#2c3f2a;border-color:#58e08a}
      .pd-tile .ch{font:800 11px system-ui;color:#8affb0}
      .pd-tile.no{opacity:.35}
      .pd-row{display:flex;align-items:center;gap:10px;padding:10px;margin:0 0 8px;border-radius:12px;border:1px solid #4a2a6a;background:#241236}
      .pd-row .tx{flex:1}.pd-row .nm{font:800 14px system-ui}.pd-row .ds{font:500 12px system-ui;color:#c7a8ea}
      .pd-coinrow{display:flex;align-items:center;gap:8px;margin:8px 0;font:600 12px system-ui}.pd-coinrow input{flex:1}
      .pd-note{font:500 11px system-ui;color:#9a7fb4;text-align:center;margin-top:16px;line-height:1.4}
      .pd-crate{height:80px;display:flex;align-items:center;justify-content:center;margin:6px 0}
      .pd-crate.shake{animation:pdShake .35s infinite}
      @keyframes pdShake{0%,100%{transform:rotate(0) scale(1)}25%{transform:rotate(-9deg) scale(1.06)}75%{transform:rotate(9deg) scale(1.06)}}
      .pd-reel{position:relative;overflow:hidden;height:88px;border-radius:12px;background:#140a1c;border:1px solid #4a2a6a;margin:8px 0}
      .pd-strip{display:flex;position:absolute;left:0;top:0;height:100%;align-items:center;will-change:transform}
      .pd-it{flex:0 0 80px;height:72px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;border-bottom:3px solid}
      .pd-mark{position:absolute;left:50%;top:0;bottom:0;width:3px;margin-left:-1px;background:#fff;box-shadow:0 0 8px #fff}
      .pd-modal{position:fixed;inset:0;background:rgba(10,4,16,.8);display:flex;align-items:center;justify-content:center;z-index:5;padding:20px}
      .pd-card{background:#241236;border:2px solid #7a4a9a;border-radius:18px;padding:22px 26px;text-align:center;max-width:340px}
      .pd-card .ic{font-size:64px}.pd-card h3{margin:6px 0;font:900 22px system-ui}.pd-card p{margin:6px 0 14px;font:500 14px system-ui;color:#d9c2ee}
    `;
    document.head.appendChild(style);
    const root = document.createElement('div'); root.className = 'pd-root'; host.appendChild(root);
    const col = document.createElement('div'); col.className = 'pd-col'; root.appendChild(col);
    const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

    const top = mk('div', 'pd-top'), coinsEl = mk('div', 'pd-coins'), harvest = mk('button', 'pd-btn');
    top.append(coinsEl, harvest); col.appendChild(top);
    const wbox = mk('div', 'pd-wheelbox'), wc = mk('canvas'), mid = mk('div', 'pd-mid'); wbox.append(wc, mid); col.appendChild(wbox);
    const sumEl = mk('div', 'pd-sum'); col.appendChild(sumEl);
    const coinRow = mk('div', 'pd-coinrow'), coinRange = mk('input'); coinRange.type = 'range'; coinRange.min = 0; coinRange.step = 1; coinRange.value = 0;
    const coinLab = mk('span', null, 'Добавить монеты: 0'); coinRow.append(coinLab, coinRange); col.appendChild(coinRow);
    const go = mk('button', 'pd-btn go', 'УЛУЧШИТЬ'); col.appendChild(go);
    const tabs = mk('div', 'pd-tabs'); const tabBtns = {};
    [['inv', 'Мои фрукты'], ['tg', 'Цель'], ['cr', 'Ящики']].forEach(([k, l]) => { const b = mk('button', 'pd-btn', l); b.onclick = () => { tab = k; render(); }; tabBtns[k] = b; tabs.appendChild(b); });
    col.appendChild(tabs);
    const body = mk('div'); col.appendChild(body);
    col.appendChild(mk('div', 'pd-note', 'Монеты и фрукты в игре виртуальные: их нельзя купить за деньги или вывести. Шанс считается честно: сумма ваших фруктов и монет ÷ цена цели, минус 5% комиссии игры.'));
    const reset = mk('button', 'pd-btn', 'Сбросить прогресс'); reset.style.cssText = 'display:block;margin:14px auto 0;opacity:.6'; col.appendChild(reset);
    reset.onclick = () => { if (confirm('Сбросить весь прогресс «Персик дроп»?')) { S = fresh(); sel = {}; addCoins = 0; target = null; save(); render(); } };

    function toast(icon, title, text) {
      const m = mk('div', 'pd-modal'), c = mk('div', 'pd-card'); const ice = mk('div', 'ic'); if (typeof icon === 'string') ice.textContent = icon; else ice.appendChild(drawFruit(icon, 72)); c.append(ice, mk('h3', null, title), mk('p', null, text)); const ok = mk('button', 'pd-btn', 'Ок'); c.appendChild(ok); m.appendChild(c); root.appendChild(m);
      const close = () => m.remove(); ok.onclick = close; m.addEventListener('pointerdown', e => { if (e.target === m) close(); });
    }

    /* ----- действия ----- */
    function giveFruit(id, n) { S.inv[id] = count(id) + (n || 1); const f = FB[id]; if (f.v > S.best) S.best = f.v; }
    function takeFruit(id, n) { S.inv[id] = count(id) - n; if (S.inv[id] <= 0) delete S.inv[id]; }
    let opening = false;
    function openCrate(id) {
      const c = CRATES.find(q => q.id === id); if (!c || spinning || opening || S.coins < c.price) return null;
      S.coins -= c.price; S.crates++; let tw = 0; for (const k in c.w) tw += c.w[k]; let r = rng() * tw, got = null;
      for (const k in c.w) { r -= c.w[k]; if (r < 0) { got = k; break; } } if (!got) got = Object.keys(c.w)[0];
      giveFruit(got, 1); save(); render(); crateAnim(c, got); return got;
    }
    function crateAnim(c, got) {
      opening = true; const keys = Object.keys(c.w), IT = 80, N = 38, WIN = 32;
      const m = mk('div', 'pd-modal'), card = mk('div', 'pd-card'); card.style.width = 'min(340px,90vw)';
      const title = mk('h3', null, c.n); const box = mk('div', 'pd-crate'); card.append(title, box);
      const reel = mk('div', 'pd-reel'), strip = mk('div', 'pd-strip'); reel.appendChild(strip); reel.appendChild(mk('div', 'pd-mark'));
      for (let i = 0; i < N; i++) { const id = i === WIN ? got : keys[Math.floor(Math.random() * keys.length)], it = mk('div', 'pd-it'); it.style.borderColor = FB[id].col; it.appendChild(drawFruit(id, 52)); strip.appendChild(it); }
      const res = mk('p', null, ''), ok = mk('button', 'pd-btn', 'Забрать'); ok.style.visibility = 'hidden';
      card.append(reel, res, ok); m.appendChild(card); root.appendChild(m);
      box.appendChild(drawFruit('crate', 70)); box.classList.add('shake'); blip(200, 0.25, 'square', 0.04, 120);
      let done = false;
      const reveal = () => { if (done) return; done = true; opening = false; box.remove(); res.textContent = FB[got].n + ' (' + fmt(FB[got].v) + ' монет)'; res.style.cssText = 'font:800 16px system-ui;color:#fff'; ok.style.visibility = 'visible'; blip(520, 0.25, 'triangle', 0.06, 900); render(); };
      const close = () => { if (!done) { strip.style.transition = 'none'; reveal(); } m.remove(); };
      ok.onclick = close;
      setTimeout(() => {
        box.classList.remove('shake'); box.style.display = 'none'; const w = reel.clientWidth || 300, off = WIN * IT + IT / 2 - w / 2 + (Math.random() - 0.5) * 40;
        strip.style.transition = 'transform 3.4s cubic-bezier(.1,.7,.15,1)'; strip.style.transform = 'translateX(' + (-off) + 'px)';
        let tk = 0; const iv = setInterval(() => { if (done) return clearInterval(iv); blip(700 + (tk++ % 6) * 40, 0.025, 'square', 0.015); }, 140);
        setTimeout(() => { clearInterval(iv); reveal(); }, 3500);
      }, 900);
    }
    function sellSelected() {
      if (spinning) return; const s = Object.keys(sel).reduce((a, k) => a + FB[k].v * sel[k], 0); if (!s) return;
      for (const k in sel) takeFruit(k, sel[k]); S.coins += Math.floor(s * 0.9); sel = {}; save(); blip(700, 0.12, 'square', 0.04, 1100); render();
    }
    let anim = null, theta = 0;
    function upgrade() {
      clean(); if (spinning || !target) return; const ch = chanceFor(target), s = selSum(); if (s <= 0 || ch <= 0.004) return;
      const spent = Object.assign({}, sel), cs = addCoins;
      for (const k in spent) takeFruit(k, spent[k]); S.coins -= cs; S.spins++;
      const win = rng() < ch, a = win ? rng() * ch * 360 : ch * 360 + rng() * (1 - ch) * 360;
      spinning = true; sel = {}; addCoins = 0; coinRange.value = 0; save();
      anim = { ch, names: Object.keys(spent).map(k => FB[k].n + '×' + spent[k]).join(' ') + (cs ? ' + ' + fmt(cs) + ' монет' : ''), sum: s, t: 0, dur: 4.6, from: theta % 360, to: 360 * 5 + a, win, target, last: 0 }; render();
    }
    function finish() {
      const a = anim; anim = null; spinning = false; theta = a.to % 360;
      if (a.win) { giveFruit(a.target.id, 1); S.wins++; blip(660, 0.5, 'triangle', 0.07, 1320); toast(a.target.id, 'Победа!', 'Вы получили: ' + a.target.n + ' (' + fmt(a.target.v) + ')'); }
      else { blip(180, 0.5, 'sawtooth', 0.05, 70); toast('✕', 'Не повезло', 'Выбранные фрукты и монеты сгорели. Попробуйте ещё раз!'); }
      if (!bestId() && S.coins < 10) { S.coins += HARVEST; }
      save(); render();
    }
    function doHarvest() {
      const left = S.harvestAt + HARVEST_EVERY * 1000 - Date.now(); if (left > 0) return;
      S.harvestAt = Date.now(); S.coins += HARVEST; save(); blip(500, 0.1, 'square', 0.04, 800); render();
    }
    harvest.onclick = doHarvest; go.onclick = upgrade;
    coinRange.oninput = () => { if (spinning) return; addCoins = +coinRange.value; render(); };

    /* ----- отрисовка интерфейса ----- */
    function tile(f, opts) {
      const t = mk('button', 'pd-tile' + (opts.on ? ' on' : '') + (opts.tg ? ' tg' : '') + (opts.no ? ' no' : ''));
      t.style.borderColor = opts.tg ? '#58e08a' : f.col; const ic = mk('div', 'ic'); ic.appendChild(drawFruit(f.id, 40)); t.append(ic, mk('div', 'nm', f.n), mk('div', opts.ch != null ? 'ch' : 'vl', opts.ch != null ? opts.ch : fmt(f.v)));
      if (opts.cn) t.appendChild(mk('div', 'cn', opts.cn)); return t;
    }
    function render() {
      clean();
      coinsEl.innerHTML = fmt(S.coins) + ' монет<small>лучший фрукт: ' + (bestId() ? bestId().n : 'пока нет') + '</small>';
      const left = Math.ceil((S.harvestAt + HARVEST_EVERY * 1000 - Date.now()) / 1000);
      harvest.disabled = left > 0; harvest.textContent = left > 0 ? 'Урожай через ' + left + ' с' : 'Собрать урожай +' + HARVEST;
      coinRange.max = Math.max(0, S.coins); coinRange.value = addCoins; coinRange.disabled = spinning; coinLab.textContent = 'Добавить монеты: ' + fmt(addCoins);
      const s = anim ? anim.sum : selSum(), names = Object.keys(sel).map(k => FB[k].n + '×' + sel[k]).join(' ');
      sumEl.textContent = anim ? 'Вложено: ' + anim.names + ' = ' + fmt(anim.sum) : s > 0 ? 'Вложено: ' + (names ? names + ' ' : '') + (addCoins ? '+ ' + fmt(addCoins) + ' монет ' : '') + '= ' + fmt(s) : 'Выберите фрукты на вкладке «Мои фрукты» и цель на вкладке «Цель»';
      Object.keys(tabBtns).forEach(k => tabBtns[k].classList.toggle('on', k === tab));
      body.textContent = '';
      if (tab === 'inv') {
        const ids = FRUITS.filter(f => count(f.id) > 0);
        if (!ids.length) body.appendChild(mk('p', 'pd-note', 'Фруктов нет. Откройте ящик на вкладке «Ящики» или соберите урожай.'));
        const grid = mk('div', 'pd-grid'); ids.forEach(f => {
          const t = tile(f, { on: sel[f.id] > 0, cn: (sel[f.id] ? sel[f.id] + '/' : '×') + count(f.id) });
          t.onclick = () => { if (spinning) return; sel[f.id] = ((sel[f.id] || 0) + 1) > count(f.id) ? 0 : (sel[f.id] || 0) + 1; if (!sel[f.id]) delete sel[f.id]; render(); }; grid.appendChild(t);
        }); body.appendChild(grid);
        if (Object.keys(sel).length) { const sb = mk('button', 'pd-btn', 'Продать выбранное за ' + fmt(Object.keys(sel).reduce((a, k) => a + FB[k].v * sel[k], 0) * 0.9)); sb.style.marginTop = '10px'; sb.onclick = sellSelected; body.appendChild(sb); const cl = mk('button', 'pd-btn', 'Снять выбор'); cl.style.cssText = 'margin:10px 0 0 8px'; cl.onclick = () => { sel = {}; render(); }; body.appendChild(cl); }
      } else if (tab === 'tg') {
        const grid = mk('div', 'pd-grid'); FRUITS.filter(f => f.v > s * 1.02 || (target && target.id === f.id)).forEach(f => {
          const ch = chanceFor(f), t = tile(f, { tg: target && target.id === f.id, no: s <= 0 || ch <= 0.004, ch: s > 0 ? (ch * 100).toFixed(ch < 0.1 ? 1 : 0).replace(/\.0$/, '') + '%' : null });
          t.onclick = () => { if (spinning) return; target = f; render(); }; grid.appendChild(t);
        }); body.appendChild(grid); if (!grid.children.length) body.appendChild(mk('p', 'pd-note', 'Нет целей дороже вложенного. Уменьшите вложение.'));
      } else {
        CRATES.forEach(c => {
          const r = mk('div', 'pd-row'), tx = mk('div', 'tx'); const ds = mk('div', 'ds', 'Может выпасть: '); Object.keys(c.w).forEach(k => { const w = drawFruit(k, 22); w.style.verticalAlign = 'middle'; ds.appendChild(w); }); tx.append(mk('div', 'nm', c.n), ds);
          const b = mk('button', 'pd-btn', fmt(c.price) + ' монет'); b.disabled = S.coins < c.price || spinning; b.onclick = () => openCrate(c.id); r.append(tx, b); body.appendChild(r);
        });
      }
      const ch = anim ? anim.ch : target ? chanceFor(target) : 0; go.disabled = spinning || !target || s <= 0 || ch <= 0.004;
      go.textContent = spinning ? 'КРУТИМ…' : target ? 'УЛУЧШИТЬ ДО ' + target.n.toUpperCase() + ' (' + (ch * 100).toFixed(1) + '%)' : 'УЛУЧШИТЬ';
      drawWheel();
    }

    /* ----- колесо ----- */
    function drawWheel() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2), sz = wbox.clientWidth || 300; if (wc.width !== Math.round(sz * dpr) || wc.height !== wc.width) { wc.width = wc.height = Math.round(sz * dpr); }
      const c = wc.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, sz, sz);
      const tg = anim ? anim.target : target, cx = sz / 2, cy = sz / 2, r = sz * 0.42, lw = sz * 0.1, ch = anim ? anim.ch : tg && selSum() > 0 ? chanceFor(tg) : 0, st = -Math.PI / 2;
      c.lineWidth = lw; c.lineCap = 'butt'; c.strokeStyle = '#3a2250'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke();
      if (ch > 0) { c.strokeStyle = '#46d36a'; c.beginPath(); c.arc(cx, cy, r, st, st + ch * Math.PI * 2); c.stroke(); c.strokeStyle = '#c0404a'; c.beginPath(); c.arc(cx, cy, r, st + ch * Math.PI * 2, st + Math.PI * 2); c.stroke(); }
      // стрелка
      const a = st + (theta * Math.PI / 180); c.save(); c.translate(cx, cy); c.rotate(a + Math.PI / 2); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -r - lw * 0.62); c.lineTo(-sz * 0.03, -r + lw * 0.2); c.lineTo(sz * 0.03, -r + lw * 0.2); c.closePath(); c.fill(); c.restore();
      c.strokeStyle = 'rgba(255,255,255,.15)'; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, r - lw / 2 - 2, 0, 7); c.stroke();
      mid.textContent = ''; if (tg) mid.appendChild(drawFruit(tg.id, 44)); mid.insertAdjacentHTML('beforeend', tg ? '<div class="big">' + (ch * 100).toFixed(ch > 0 && ch < 0.1 ? 1 : 0) + '%</div><div class="sm">шанс на ' + tg.n + '</div>' : '<div class="sm">Выберите цель</div>');
    }

    let raf = 0, alive = true, last = 0, hT = 0;
    function frame(ts) {
      if (!alive) return; const dt = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
      if (anim) {
        anim.t += dt; const k = Math.min(1, anim.t / anim.dur), e = 1 - Math.pow(1 - k, 3); const prev = theta; theta = anim.from + (anim.to - anim.from) * e;
        if (Math.floor(theta / 12) !== Math.floor(prev / 12)) blip(900 + (k * 400), 0.03, 'square', 0.02);
        drawWheel(); if (k >= 1) finish();
      }
      hT += dt; if (hT > 1) { hT = 0; if (!spinning) { const left = Math.ceil((S.harvestAt + HARVEST_EVERY * 1000 - Date.now()) / 1000); harvest.disabled = left > 0; harvest.textContent = left > 0 ? 'Урожай через ' + left + ' с' : 'Собрать урожай +' + HARVEST; } }
      raf = requestAnimationFrame(frame);
    }
    function resize() { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; const g = ctx.createLinearGradient(0, 0, 0, canvas.height); g.addColorStop(0, '#2b1236'); g.addColorStop(1, '#140a1c'); ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height); drawWheel(); }
    resize(); render(); raf = requestAnimationFrame(frame);
    return {
      restart() { render(); }, resize, setPaused() { },
      destroy() { alive = false; save(); cancelAnimationFrame(raf); root.remove(); style.remove(); },
      debug: { get S() { return S; }, FRUITS, CRATES, select(id, n) { sel[id] = n; render(); }, setTarget(id) { target = FB[id]; render(); }, addCoins(n) { addCoins = n; render(); }, upgrade, openCrate, sellSelected, finish, doHarvest, chance: () => (target ? chanceFor(target) : 0), set rng(f) { rng = f; }, get spinning() { return spinning; }, tick(ms) { if (anim) { anim.t = anim.dur; frame(performance.now() + ms); } }, get anim() { return anim; }, render }
    };
  }
});
