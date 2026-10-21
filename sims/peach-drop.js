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
      { id: 'plum', ic: '', n: 'Слива', v: 5000000, col: '#ff3df0' },
      { id: 'blueberry', n: 'Черника', v: 8 }, { id: 'raspberry', n: 'Малина', v: 15 }, { id: 'lime', n: 'Лайм', v: 40 }, { id: 'banana', n: 'Банан', v: 90 },
      { id: 'kiwi', n: 'Киви', v: 180 }, { id: 'apricot', n: 'Абрикос', v: 380 }, { id: 'pomegranate', n: 'Гранат', v: 750 }, { id: 'fig', n: 'Инжир', v: 1400 },
      { id: 'persimmon', n: 'Хурма', v: 1900 }, { id: 'lychee', n: 'Личи', v: 3500 }, { id: 'avocado', n: 'Авокадо', v: 4500 }, { id: 'starfruit', n: 'Карамбола', v: 9500 },
      { id: 'papaya', n: 'Папайя', v: 22000 }, { id: 'dragon', n: 'Питайя', v: 60000 }, { id: 'durian', n: 'Дуриан', v: 150000 }, { id: 'rainbow', n: 'Радужный фрукт', v: 2000000 }
    ];
    FRUITS.sort((a, b) => a.v - b.v);
    const tierCol = v => v < 50 ? '#9aa3b8' : v < 300 ? '#6fb0ff' : v < 1500 ? '#b07cff' : v < 8000 ? '#ff6fd0' : v < 50000 ? '#ff9a4a' : v < 250000 ? '#ffd24a' : v < 1e6 ? '#ff4a4a' : v < 3e6 ? '#4af0ff' : '#ff3df0';
    FRUITS.forEach(f => { f.col = tierCol(f.v); });
    const FB = {}; FRUITS.forEach(f => FB[f.id] = f);
    const CRATES = [
      { id: 'c1', n: 'Корзинка', col: '#a8703a', rr: 0.92, w: { sorrel: 25, blueberry: 20, cherry: 25, raspberry: 14, straw: 10, lime: 5, lemon: 1 } },
      { id: 'c2', n: 'Ящик', col: '#5a8ad8', rr: 0.94, w: { cherry: 10, straw: 15, lime: 12, lemon: 18, banana: 14, orange: 14, kiwi: 8, apple: 6, pear: 2, peach: 1 } },
      { id: 'c3', n: 'Золотой ящик', col: '#d8a82a', rr: 0.95, w: { apple: 15, pear: 18, apricot: 15, pomegranate: 12, peach: 14, fig: 8, persimmon: 7, pine: 6, lychee: 3, mango: 2 } },
      { id: 'c4', n: 'Тропический', col: '#2fb872', rr: 0.96, w: { lychee: 15, avocado: 15, mango: 16, pine: 14, starfruit: 14, melon: 10, papaya: 8, grape: 5, dragon: 3 } },
      { id: 'c5', n: 'Королевский', col: '#a05ad8', rr: 0.97, w: { papaya: 20, melon: 20, grape: 20, dragon: 14, coco: 12, durian: 8, gold: 4, rainbow: 0.5 } },
      { id: 'c6', n: 'Мифический', col: '#e0405a', rr: 0.98, w: { coco: 20, durian: 22, gold: 25, dia: 14, rainbow: 5, plum: 0.5 } }
    ];
    CRATES.forEach(c => {
      let tw = 0, ev = 0; for (const k in c.w) { tw += c.w[k]; ev += c.w[k] * FB[k].v; } const u = ev / tw / c.rr, unit = u < 1000 ? 5 : u < 20000 ? 50 : u < 300000 ? 500 : 5000;
      c.price = Math.max(5, Math.ceil(u / unit) * unit);
      c.rare = Object.keys(c.w).filter(k => FB[k].v >= c.price * 1.2);
    });
    const PITY = 8, DOUBLE = 0.08, SHOP_MS = 5 * 60 * 1000;
    const EDGE = 0.95, HARVEST_EVERY = 45, HARVEST = 15;

    let rng = Math.random;
    const fresh = () => ({ coins: 100, inv: { cherry: 2 }, best: 0, spins: 0, wins: 0, harvestAt: 0, crates: 0, pity: {}, shop: { slot: 0, offers: [] } });
    let S = fresh();
    try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && typeof j.coins === 'number') S = Object.assign(S, j); } catch (e) { } S.pity = S.pity || {}; S.shop = S.shop || { slot: 0, offers: [] };
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
    const fmt = n => { n = Math.round(n); return n < 1000 ? String(n) : n < 1e6 ? (n / 1000).toFixed(n < 1e4 ? 1 : 0).replace(/\.0$/, '') + ' тыс.' : (n / 1e6).toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + ' млн'; };
    const count = id => S.inv[id] || 0;
    const bestId = () => { let b = null; FRUITS.forEach(f => { if (count(f.id) > 0 || S.best >= f.v) b = f; }); return b; };

    /* ----- выбор ----- */
    let sel = {}, addCoins = 0, target = null, spinning = false, tab = 'inv';
    const selSum = () => Object.keys(sel).reduce((a, k) => a + FB[k].v * sel[k], 0) + addCoins;
    const chanceFor = t => { const s = selSum(); return s <= 0 ? 0 : Math.max(0, Math.min(0.9, EDGE * s / t.v)); };
    const clean = () => { for (const k in sel) { sel[k] = Math.min(sel[k], count(k)); if (sel[k] <= 0) delete sel[k]; } addCoins = Math.min(addCoins, S.coins); };


    const drawFruit = window.PeachArt.drawFruit;

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
    [['inv', 'Фрукты'], ['tg', 'Цель'], ['cr', 'Ящики'], ['sh', 'Магазин']].forEach(([k, l]) => { const b = mk('button', 'pd-btn', l); b.onclick = () => { tab = k; render(); }; tabBtns[k] = b; tabs.appendChild(b); });
    col.appendChild(tabs);
    const body = mk('div'); col.appendChild(body);
    col.appendChild(mk('div', 'pd-note', 'Монеты и фрукты в игре виртуальные: их нельзя купить за деньги или вывести. Шанс считается честно: сумма ваших фруктов и монет ÷ цена цели, минус 5% комиссии игры.'));
    const reset = mk('button', 'pd-btn', 'Сбросить прогресс'); reset.style.cssText = 'display:block;margin:14px auto 0;opacity:.6'; col.appendChild(reset);
    const RKEY = 'peach_reset_at', RCD = 5 * 60 * 1000;
    const resetLeft = () => { let t = 0; try { t = +localStorage.getItem(RKEY) || 0; } catch (e) { } return Math.max(0, Math.ceil((t + RCD - Date.now()) / 1000)); };
    const resetLabel = () => { const l = resetLeft(); reset.textContent = l > 0 ? 'Сброс будет доступен через ' + Math.floor(l / 60) + ':' + String(l % 60).padStart(2, '0') : 'Сбросить прогресс'; reset.style.opacity = l > 0 ? 0.35 : 0.6; };
    reset.onclick = () => { if (resetLeft() > 0) { resetLabel(); return; } if (confirm('Сбросить весь прогресс «Персик дроп»? Следующий сброс будет доступен только через 5 минут.')) { S = fresh(); sel = {}; addCoins = 0; target = null; try { localStorage.setItem(RKEY, String(Date.now())); } catch (e) { } save(); render(); } };
    resetLabel();

    function toast(icon, title, text) {
      const m = mk('div', 'pd-modal'), c = mk('div', 'pd-card'); const ice = mk('div', 'ic'); if (typeof icon === 'string') ice.textContent = icon; else ice.appendChild(drawFruit(icon, 72)); c.append(ice, mk('h3', null, title), mk('p', null, text)); const ok = mk('button', 'pd-btn', 'Ок'); c.appendChild(ok); m.appendChild(c); root.appendChild(m);
      const close = () => m.remove(); ok.onclick = close; m.addEventListener('pointerdown', e => { if (e.target === m) close(); });
    }

    /* ----- действия ----- */
    function giveFruit(id, n) { S.inv[id] = count(id) + (n || 1); const f = FB[id]; if (f.v > S.best) S.best = f.v; }
    function takeFruit(id, n) { S.inv[id] = count(id) - n; if (S.inv[id] <= 0) delete S.inv[id]; }
    function seedRng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function genShop(slot) {
      const R = seedRng(slot * 7919 + 13), pool = FRUITS.filter(f => f.v >= 8 && f.v <= 150000), offers = [], used = {};
      for (let k = 0; k < 8; k++) { let f, g = 0; do { f = pool[Math.floor(Math.pow(R(), 1.3) * pool.length)]; } while (used[f.id] && ++g < 20); used[f.id] = 1; const sale = k < 2; offers.push({ id: f.id, price: Math.ceil(f.v * (sale ? 1.02 + R() * 0.06 : 1.2 + R() * 0.2)), left: sale ? 1 : f.v > 5000 ? 1 : 1 + Math.floor(R() * 3), tag: sale ? 'СКИДКА' : '' }); }
      const big = FRUITS.filter(f => f.v > 150000 && f.v <= 2000000), bf = big[Math.floor(R() * big.length)]; if (bf) offers.push({ id: bf.id, price: Math.ceil(bf.v * 1.4), left: 1, tag: 'РЕДКОСТЬ' });
      return offers;
    }
    function getShop() { const slot = Math.floor(Date.now() / SHOP_MS); if (S.shop.slot !== slot) { S.shop = { slot, offers: genShop(slot) }; save(); } return S.shop; }
    function buyOffer(i) { const sh = getShop(), o = sh.offers[i]; if (!o || o.left <= 0 || S.coins < o.price || spinning) return false; S.coins -= o.price; o.left--; giveFruit(o.id, 1); save(); blip(600, 0.12, 'square', 0.04, 900); render(); return true; }
    let opening = false;
    function rollCrate(c) {
      const pool = (S.pity[c.id] || 0) >= PITY && c.rare.length ? c.rare : Object.keys(c.w); let tw = 0; pool.forEach(k => tw += c.w[k]); let r = rng() * tw, got = pool[0];
      for (const k of pool) { r -= c.w[k]; if (r < 0) { got = k; break; } }
      S.pity[c.id] = c.rare.includes(got) ? 0 : (S.pity[c.id] || 0) + 1; const dbl = rng() < DOUBLE; giveFruit(got, dbl ? 2 : 1); S.crates++; return { id: got, dbl };
    }
    function openCrate(id) {
      const c = CRATES.find(q => q.id === id); if (!c || spinning || opening || S.coins < c.price) return null;
      S.coins -= c.price; const r = rollCrate(c); save(); render(); crateAnim(c, r.id, r.dbl); return r.id;
    }
    function openMany(id, n) {
      const c = CRATES.find(q => q.id === id); if (!c || spinning || opening || S.coins < c.price * n) return null;
      S.coins -= c.price * n; const res = {}; for (let i = 0; i < n; i++) { const r = rollCrate(c); res[r.id] = (res[r.id] || 0) + (r.dbl ? 2 : 1); } save(); render();
      const m = mk('div', 'pd-modal'), card = mk('div', 'pd-card'); card.style.width = 'min(360px,92vw)'; const grid = mk('div', 'pd-grid'); grid.style.margin = '10px 0';
      Object.keys(res).sort((a, b) => FB[b].v - FB[a].v).forEach(k => { const t = tile(FB[k], { cn: '×' + res[k] }); t.style.cursor = 'default'; grid.appendChild(t); });
      const ok = mk('button', 'pd-btn', 'Забрать'); card.append(mk('h3', null, c.n + ' ×' + n), grid, ok); m.appendChild(card); root.appendChild(m); ok.onclick = () => m.remove(); blip(520, 0.25, 'triangle', 0.06, 900); return res;
    }
    function crateAnim(c, got, dbl) {
      opening = true; const keys = Object.keys(c.w), IT = 80, N = 38, WIN = 32;
      const m = mk('div', 'pd-modal'), card = mk('div', 'pd-card'); card.style.width = 'min(340px,90vw)';
      const title = mk('h3', null, c.n); const box = mk('div', 'pd-crate'); card.append(title, box);
      const reel = mk('div', 'pd-reel'), strip = mk('div', 'pd-strip'); reel.appendChild(strip); reel.appendChild(mk('div', 'pd-mark'));
      for (let i = 0; i < N; i++) { const id = i === WIN ? got : keys[Math.floor(Math.random() * keys.length)], it = mk('div', 'pd-it'); it.style.borderColor = FB[id].col; it.style.background = 'linear-gradient(' + FB[id].col + '33,transparent)'; it.appendChild(drawFruit(id, 52)); strip.appendChild(it); }
      const res = mk('p', null, ''), ok = mk('button', 'pd-btn', 'Забрать'); ok.style.visibility = 'hidden';
      card.append(reel, res, ok); m.appendChild(card); root.appendChild(m);
      box.appendChild(drawFruit('crate', 70, c.col)); box.classList.add('shake'); blip(200, 0.25, 'square', 0.04, 120);
      let done = false;
      const reveal = () => { if (done) return; done = true; opening = false; box.remove(); res.textContent = (dbl ? 'ДВОЙНОЙ ДРОП ×2: ' : '') + FB[got].n + ' (' + fmt(FB[got].v) + ' монет)'; res.style.textShadow = '0 0 14px ' + FB[got].col; res.style.color = FB[got].col; res.style.cssText += ';font:800 16px system-ui'; ok.style.visibility = 'visible'; blip(520, 0.25, 'triangle', 0.06, 900); render(); };
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
      resetLabel(); Object.keys(tabBtns).forEach(k => tabBtns[k].classList.toggle('on', k === tab));
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
      } else if (tab === 'cr') {
        CRATES.forEach(c => {
          const r = mk('div', 'pd-row'), tx = mk('div', 'tx'), ic = mk('div'); ic.appendChild(drawFruit('crate', 40, c.col));
          const ds = mk('div', 'ds', 'Может выпасть: '); Object.keys(c.w).sort((a, b) => FB[a].v - FB[b].v).forEach(k => { const w = drawFruit(k, 20); w.style.verticalAlign = 'middle'; ds.appendChild(w); });
          const pl = S.pity[c.id] || 0; tx.append(mk('div', 'nm', c.n), ds, mk('div', 'ds', c.rare.length ? 'Редкий дроп гарантирован: ' + (pl >= PITY ? 'следующий!' : 'через ' + (PITY - pl)) + ' · шанс x2 дропа 8%' : 'Шанс x2 дропа 8%'));
          const bx = mk('div'); bx.style.cssText = 'display:flex;flex-direction:column;gap:5px';
          const b = mk('button', 'pd-btn', fmt(c.price) + ' монет'); b.disabled = S.coins < c.price || spinning || opening; b.onclick = () => openCrate(c.id);
          const b5 = mk('button', 'pd-btn', '×5 · ' + fmt(c.price * 5)); b5.disabled = S.coins < c.price * 5 || spinning || opening; b5.onclick = () => openMany(c.id, 5); bx.append(b, b5); r.append(ic, tx, bx); body.appendChild(r);
        });
      } else {
        const sh = getShop(), lf = Math.max(0, Math.ceil(((sh.slot + 1) * SHOP_MS - Date.now()) / 1000));
        const tm = mk('p', 'pd-note', ''); tm.id = 'pdShopTimer'; tm.style.margin = '0 0 8px'; tm.textContent = 'Ассортимент обновится через ' + Math.floor(lf / 60) + ':' + String(lf % 60).padStart(2, '0'); body.appendChild(tm);
        sh.offers.forEach((o, i) => {
          const f = FB[o.id], r = mk('div', 'pd-row'), ic = mk('div'); ic.appendChild(drawFruit(o.id, 40)); const tx = mk('div', 'tx');
          tx.append(mk('div', 'nm', f.n + (o.tag ? ' · ' + o.tag : '')), mk('div', 'ds', 'Цена фрукта ' + fmt(f.v) + ' · в наличии: ' + o.left));
          const b = mk('button', 'pd-btn', o.left > 0 ? fmt(o.price) + ' монет' : 'Продано'); b.disabled = o.left <= 0 || S.coins < o.price || spinning; b.onclick = () => buyOffer(i); r.append(ic, tx, b); body.appendChild(r);
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
      hT += dt; if (hT > 1) { hT = 0; resetLabel(); if (tab === 'sh' && !spinning && !opening) { const sh0 = S.shop.slot, nw = Math.floor(Date.now() / SHOP_MS); if (nw !== sh0) render(); else { const te = document.getElementById('pdShopTimer'); if (te) { const lf = Math.max(0, Math.ceil(((nw + 1) * SHOP_MS - Date.now()) / 1000)); te.textContent = 'Ассортимент обновится через ' + Math.floor(lf / 60) + ':' + String(lf % 60).padStart(2, '0'); } } } if (!spinning) { const left = Math.ceil((S.harvestAt + HARVEST_EVERY * 1000 - Date.now()) / 1000); harvest.disabled = left > 0; harvest.textContent = left > 0 ? 'Урожай через ' + left + ' с' : 'Собрать урожай +' + HARVEST; } }
      raf = requestAnimationFrame(frame);
    }
    function resize() { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; const g = ctx.createLinearGradient(0, 0, 0, canvas.height); g.addColorStop(0, '#2b1236'); g.addColorStop(1, '#140a1c'); ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height); drawWheel(); }
    resize(); render(); raf = requestAnimationFrame(frame);
    return {
      restart() { render(); }, resize, setPaused() { },
      destroy() { alive = false; save(); cancelAnimationFrame(raf); root.remove(); style.remove(); },
      debug: { getShop, buyOffer, openMany, rollCrate, get S() { return S; }, FRUITS, CRATES, select(id, n) { sel[id] = n; render(); }, setTarget(id) { target = FB[id]; render(); }, addCoins(n) { addCoins = n; render(); }, upgrade, openCrate, sellSelected, finish, doHarvest, chance: () => (target ? chanceFor(target) : 0), set rng(f) { rng = f; }, get spinning() { return spinning; }, tick(ms) { if (anim) { anim.t = anim.dur; frame(performance.now() + ms); } }, get anim() { return anim; }, render }
    };
  }
});
