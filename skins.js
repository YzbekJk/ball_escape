/* Скины героя для «Гнилой маршрутки» и «Светофора» (пиксель-арт).
   Skins.get() — выбранный скин; Skins.pick(cb) — окно выбора; Skins.deco(...) — детали головы/тела поверх базового человечка. */
(function () {
  const KEY = 'hero_skin';
  const LIST = [
    { id: 'school', name: 'Школьник', note: 'начальный', skin: '#f0c9a0', hair: '#432a1a', top: '#e8eef5', pants: '#1f2a44', shoes: '#1a1a22' },
    { id: 'kretin', name: 'Кретин 528', skin: '#f0c9a0', hair: '#1a1008', top: '#7a2a7a', pants: '#2a2530', shoes: '#1a1a22' },
    { id: 'afonya', name: 'Афоня Редокс', skin: '#e8b890', hair: '#6a4020', top: '#16161a', pants: '#121216', shoes: '#1a1a22' },
    { id: 'orange', name: 'Апельсиновый сок 2018', skin: '#ff6a1a', hair: '#ff6a1a', top: '#ff5a10', pants: '#e8501a', shoes: '#c8400e' },
    { id: 'bashmak', name: 'Башмак', skin: '#e8b898', hair: '#b87840', top: '#1f4f9a', pants: '#2a3350', shoes: '#1a1a22' }
  ];
  let curId = 'school';
  try { const s = localStorage.getItem(KEY); if (s && LIST.some(x => x.id === s)) curId = s; } catch (e) {}

  /* свой скин: сетка GW x GH пикселей (строка 8 — макушка, строка 46 — подошвы), '' — прозрачный */
  const GW = 16, GH = 46, CKEY = 'hero_custom';
  const CUSTOM = { id: 'custom', name: 'Свой скин', note: 'нарисуйте сами', custom: true, grid: null, skin: '#f0c9a0', hair: '#432a1a', top: '#3a6fd8', pants: '#2a3350', shoes: '#1a1a22' };
  function dominant(g, r0, r1, def) { const m = {}; for (let r = r0; r < r1; r++) for (let c = 0; c < GW; c++) { const v = g[r * GW + c]; if (v) m[v] = (m[v] || 0) + 1; } let b = def, n = 0; for (const k in m) if (m[k] > n) { n = m[k]; b = k; } return b; }
  function setCustom(g) { CUSTOM.grid = g; if (g) { CUSTOM.skin = dominant(g, 12, 19, '#f0c9a0'); CUSTOM.hair = dominant(g, 8, 12, '#432a1a'); CUSTOM.top = dominant(g, 20, 33, '#3a6fd8'); CUSTOM.pants = dominant(g, 34, 44, '#2a3350'); CUSTOM.shoes = dominant(g, 44, 46, '#1a1a22'); } }
  try { const g = JSON.parse(localStorage.getItem(CKEY)); if (Array.isArray(g) && g.length === GW * GH) setCustom(g); } catch (e) {}
  LIST.push(CUSTOM);
  const by = id => { const x = LIST.find(q => q.id === id); return x && !(x.custom && !x.grid) ? x : LIST[0]; };

  function drawCustom(R0, cx, fy, f, st, t, sk, fl) {
    const g = sk.grid; if (!g) return;
    const k = (st === 'duck' || st === 'dash') ? 0.7 : 1, y0 = fy - GH * k, l1 = st === 'walk' ? Math.round(Math.sin(t * 9) * 2) : 0;
    for (let r = 0; r < GH; r++) {
      let c = 0;
      while (c < GW) {
        const col = g[r * GW + c]; if (!col) { c++; continue; }
        let e = c + 1; while (e < GW && g[r * GW + e] === col) e++;
        const x0 = f > 0 ? c : GW - e, sh = r >= GH - 14 ? (c < GW / 2 ? l1 : -l1) : 0;
        R0(cx - GW / 2 + x0 + sh, y0 + r * k, e - c, k < 1 ? k + 0.35 : 1, fl ? '#fff' : col);
        c = e;
      }
    }
  }

  /* детали поверх базового человечка: R(x,y,w,h,color) — пиксельная кисть игры, cx — центр, hy — верх головы, fy — подошвы */
  function deco(R0, cx, hy, fy, f, st, t, skin, flashing) {
    const sk = skin || by(curId), id = sk.id;
    if (sk.custom) { drawCustom(R0, cx, fy, f, st, t, sk, flashing); return; }
    const R = flashing ? (x, y, w, h) => R0(x, y, w, h, '#fff') : R0;
    const hold = st === 'idle' || st === 'walk' || st === 'block' || st === 'duck' || st === 'hurt' || st === 'dash';
    if (id === 'school') {
      R(cx - 3, hy + 10, 6, 2, '#fff'); R(cx - 1, hy + 11, 2, 9, '#2a4a9a');                   // воротник и галстук
      R(cx - f * 8 - 3, hy + 11, 4, 13, '#c0392b'); R(cx - f * 8 - 3, hy + 11, 4, 2, '#8a2418'); // красный рюкзак
      R(cx + f * 2 - 1, hy + 14, 3, 2, '#2a4a9a');                                             // значок
    } else if (id === 'kretin') {
      R(cx - 5, hy + 6, 10, 5, '#3a2418'); R(cx - 5, hy + 3, 1, 4, '#3a2418'); R(cx + 4, hy + 3, 1, 4, '#3a2418');   // борода
      R(cx - 2, hy + 8, 4, 1, '#7a5040');
      R(cx - 4, hy + 3, 3, 1, '#1a1008'); R(cx + 1, hy + 3, 3, 1, '#1a1008');                   // брови
      R(cx - 8, hy - 3, 16, 2, '#111'); R(cx - 5, hy - 14, 10, 12, '#111'); R(cx - 5, hy - 5, 10, 2, '#555');   // цилиндр
      R(cx - 2, hy + 11, 4, 14, '#a07aa8'); R(cx - 3, hy + 10, 1, 15, '#2a1030'); R(cx + 2, hy + 10, 1, 15, '#2a1030');   // футболка и лацканы
      for (let i = 0; i < 9; i++) R(cx - 5 + ((i * 5) % 11), hy + 11 + ((i * 7) % 14), 1, 1, Math.floor(t * 5 + i) % 2 ? '#f0b0f8' : '#b050c0');   // пайетки
    } else if (id === 'afonya') {
      R(cx - 6, hy - 2, 12, 12, '#e8b890'); R(cx - 6, hy - 2, 12, 4, '#6a4020'); R(cx - 6, hy + 2, 2, 3, '#6a4020');   // квадратная голова
      R(cx + 4, hy + 2, 2, 8, '#d0a078');
      R(cx - 5, hy + 3, 3, 1, '#4a2a10'); R(cx + 1, hy + 3, 3, 1, '#4a2a10');
      R(cx - 4, hy + 4, 3, 3, '#fff'); R(cx + 1, hy + 4, 3, 3, '#fff'); R(cx - 3 + (f > 0 ? 1 : 0), hy + 5, 2, 2, '#111'); R(cx + 2 + (f > 0 ? 1 : 0), hy + 5, 2, 2, '#111');
      R(cx - 3, hy + 8, 6, 1, '#6a4a30'); R(cx - 1, hy + 9, 2, 1, '#a07050');                    // усики
      R(cx - 6, hy + 8, 12, 3, '#16161a');                                                       // капюшон
      R(cx - 3, hy + 15, 6, 3, '#222'); R(cx - 2, hy + 16, 4, 1, '#e0e0e0');                     // нашивка
      R(cx + 1, hy + 19, 4, 3, '#d02030'); R(cx + 2, hy + 20, 2, 1, '#fff');                     // флажок
      R(cx - 5, fy - 14, 1, 12, '#eee'); R(cx + 4, fy - 14, 1, 12, '#eee'); R(cx - 6, fy - 1, 5, 1, '#fff'); R(cx + 1, fy - 1, 5, 1, '#fff');   // лампасы и подошвы
      if (hold) { R(cx - f * 8 - 1, hy + 12, 3, 8, sk.top); R(cx - f * 8 - 1, hy + 19, 3, 3, sk.skin); R(cx - f * 8 - 1, hy + 17, 3, 1, '#ffd23a'); R(cx - f * 9, hy + 20, 5, 6, '#f4f4f4'); R(cx - f * 9, hy + 20, 5, 2, '#9a50c8'); }   // стакан и часы
    } else if (id === 'orange') {
      R(cx - 6, hy - 2, 12, 12, '#ff6a1a'); R(cx - 6, hy - 2, 12, 2, '#ff8a3a');                 // апельсиновая голова-блок
      R(cx, hy - 5, 1, 3, '#2a8a2a'); R(cx + 1, hy - 6, 5, 3, '#6ad040'); R(cx + 2, hy - 5, 3, 1, '#9af060');   // листик
      R(cx - 4, hy + 4, 2, 2, '#111'); R(cx + 2, hy + 4, 2, 2, '#111');
      R(cx - 3, hy + 7, 1, 1, '#111'); R(cx - 2, hy + 8, 4, 1, '#111'); R(cx + 2, hy + 7, 1, 1, '#111');   // улыбка
      R(cx - 5, hy + 11, 10, 1, '#ff8a3a'); R(cx - 1, fy - 14, 2, 8, '#c8400e');                 // блики и шов штанов
    } else if (id === 'bashmak') {
      R(cx - 6, hy - 2, 12, 4, '#b87840'); R(cx - 6, hy + 1, 4, 4, '#b87840'); R(cx + 3, hy + 1, 3, 3, '#a06830'); R(cx - 3, hy - 3, 6, 2, '#c88850');   // растрёпанные волосы
      R(cx - 6, hy + 3, 12, 4, '#2a8ae0'); R(cx - 5, hy + 3, 10, 1, '#7ad0ff');                  // синие очки-визор
      R(cx - 2, hy + 4, 4, 1, '#d0f0ff'); R(cx, hy + 5, 1, 1, '#d0f0ff'); R(cx - 2, hy + 6, 4, 1, '#d0f0ff');   // «Z» на визоре
      R(cx - 4, hy + 8, 8, 2, '#a07a58');                                                        // щетина
      R(cx - 3, hy + 10, 6, 1, '#163a78');                                                       // воротник
    }
  }

  /* ---------- окно выбора ---------- */
  let modal = null;
  function css() {
    if (document.getElementById('skinCss')) return;
    const s = document.createElement('style'); s.id = 'skinCss';
    s.textContent = '.skinModal{position:fixed;inset:0;z-index:9999;background:rgba(5,5,12,.88);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto}' +
      '.skinBox{width:min(520px,100%);background:#14141f;border:1px solid #33334a;border-radius:18px;padding:16px 14px 14px;color:#e8e8f4;font-family:system-ui,sans-serif}' +
      '.skinBox h2{margin:0 0 4px;font-size:20px;text-align:center}.skinBox p{margin:0 0 12px;text-align:center;font-size:13px;color:#9aa0b8}' +
      '.skinGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}' +
      '.skinCard{background:#1e1e2e;border:2px solid #33334a;border-radius:14px;padding:8px 4px 8px;color:#e8e8f4;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;font:600 12px/1.2 system-ui,sans-serif}' +
      '.skinCard canvas{width:60px;height:100px;image-rendering:pixelated}' +
      '.skinCard.sel{border-color:#ffd23a;background:#2a2a3e}.skinCard small{font-weight:500;color:#9aa0b8;font-size:11px}' +
      '.skinCard:active{transform:scale(.97)}.skinCard{position:relative}.skinEdit{position:absolute;top:4px;right:6px;font-size:15px;padding:2px 4px;background:#33334a;border-radius:8px}' +
      '.edRow{display:flex;gap:12px;align-items:flex-start;justify-content:center}.edCanvas{border:2px solid #33334a;border-radius:8px;cursor:crosshair;flex:none}' +
      '.edSide{display:flex;flex-direction:column;gap:8px;width:118px}.edPrev{width:56px;height:104px;image-rendering:pixelated;border-radius:8px;align-self:center}' +
      '.edTools{display:flex;flex-direction:column;gap:6px}.edBtn{background:#262638;border:2px solid #33334a;border-radius:10px;color:#e8e8f4;font:600 12px/1.2 system-ui,sans-serif;padding:7px 6px;cursor:pointer}' +
      '.edBtn.on{border-color:#ffd23a;background:#34344a}.edBtn.ok{background:#2f8f4a;border-color:#4fe07a;color:#fff}' +
      '.edPal{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}.edSw{aspect-ratio:1;border:2px solid #33334a;border-radius:6px;padding:0;cursor:pointer}.edSw.on{border-color:#fff;box-shadow:0 0 0 2px #ffd23a}' +
      '.edColor{width:100%;height:30px;border:none;background:none;padding:0}.edFoot{display:flex;gap:10px;justify-content:center;margin-top:12px}.edFoot .edBtn{flex:1;padding:10px;font-size:14px}';
    document.head.appendChild(s);
  }
  function drawBase(R, cx, fy, sk, f) {
    const hy = fy - 38;
    R(cx - 5, fy - 14, 4, 14, sk.pants); R(cx + 1, fy - 14, 4, 14, sk.pants); R(cx - 6, fy - 2, 5, 2, sk.shoes); R(cx + 1, fy - 2, 5, 2, sk.shoes);
    R(cx - 6, hy + 10, 12, 16, sk.top);
    R(cx - 5, hy, 10, 10, sk.skin); R(cx - 5, hy - 1, 10, 3, sk.hair);
    R(cx - 4, hy + 4, 3, 3, '#fff'); R(cx + 1, hy + 4, 3, 3, '#fff'); R(cx - 2.5, hy + 5, 1.5, 2, '#111'); R(cx + 2.5, hy + 5, 1.5, 2, '#111'); R(cx - 1, hy + 8, 3, 1, '#8a4a3a');
  }
  function preview(canvas, sk, t) {
    const S = 2, g = canvas.getContext('2d'); g.clearRect(0, 0, canvas.width, canvas.height);
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x * S), Math.round(y * S), Math.max(1, Math.round(w * S)), Math.max(1, Math.round(h * S))); };
    const cx = 18, fy = 57, hy = fy - 38, f = 1;
    if (sk.custom && !sk.grid) {
      g.strokeStyle = '#555'; g.setLineDash([4, 4]); g.strokeRect(10, 24, 52, 90); g.setLineDash([]);
      g.fillStyle = '#9aa0b8'; g.font = '700 34px system-ui'; g.textAlign = 'center'; g.fillText('+', 36, 80); return;
    }
    if (!sk.custom) drawBase(R, cx, fy, sk, f);
    R(cx - f * 8 - 1.5, hy + 12, 3, 11, sk.top); R(cx - f * 8 - 1.5, hy + 23, 3, 3, sk.skin); R(cx + f * 5, hy + 13, 5, 4, sk.top); R(cx + f * 10, hy + 11, 4, 5, sk.skin);
    deco(R, cx, hy, fy, f, 'idle', t || 0, sk, false);
  }
  /* шаблон для редактора: готовый скин, «запечённый» в сетку */
  function bake(sk) {
    const g = new Array(GW * GH).fill(''), cx = GW / 2, fy = GH;
    const R = (x, y, w, h, c) => { for (let yy = Math.floor(y); yy < Math.ceil(y + h); yy++) for (let xx = Math.floor(x); xx < Math.ceil(x + w); xx++) if (xx >= 0 && xx < GW && yy >= 0 && yy < GH) g[yy * GW + xx] = c; };
    if (!sk.custom) drawBase(R, cx, fy, sk, 1);
    deco(R, cx, fy - 38, fy, 1, 'idle', 0, sk, false);
    return g.map(c => c && c.charAt(0) === '#' ? (c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c) : '');
  }

  function editor(done, cancel) {
    css(); close();
    const PAL = ['#000000', '#ffffff', '#7a7a7a', '#c0c0c0', '#f0c9a0', '#e8b890', '#a06840', '#5a3a22', '#b87840', '#ffd23a', '#ff8a1c', '#ff3b3b', '#a0121a', '#ff7ac8', '#9a50c8', '#4a2a7a', '#3a6fd8', '#1f4f9a', '#6ad0ff', '#3ab04a', '#1f7a3a', '#6ad040', '#8a5a2b', '#2a2530'];
    let grid = CUSTOM.grid ? CUSTOM.grid.slice() : new Array(GW * GH).fill(''), color = '#e8b898', tool = 'pen', down = false;
    modal = document.createElement('div'); modal.className = 'skinModal';
    const box = document.createElement('div'); box.className = 'skinBox'; modal.appendChild(box);
    box.innerHTML = '<h2>Нарисуйте свой скин</h2><p>Герой смотрит вправо. Пунктир: макушка, шея, ноги. Свободное место сверху — для шляп.</p>';
    const row = document.createElement('div'); row.className = 'edRow'; box.appendChild(row);
    const cs = Math.max(8, Math.min(15, Math.floor((Math.min(innerWidth, 520) - 36 - 128) / GW), Math.floor((innerHeight - 200) / GH)));
    const cv = document.createElement('canvas'); cv.width = GW * cs; cv.height = GH * cs; cv.className = 'edCanvas'; row.appendChild(cv);
    const side = document.createElement('div'); side.className = 'edSide'; row.appendChild(side);
    const pv = document.createElement('canvas'); pv.width = 56; pv.height = 104; pv.className = 'edPrev'; side.appendChild(pv);
    const tools = document.createElement('div'); tools.className = 'edTools'; side.appendChild(tools);
    const btn = (label, fn, cls) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'edBtn' + (cls ? ' ' + cls : ''); b.textContent = label; b.onclick = fn; return b; };
    const tb = {};
    [['pen', 'Рисовать'], ['erase', 'Ластик'], ['fill', 'Заливка']].forEach(([k, l]) => { tb[k] = btn(l, () => { tool = k; syncTools(); }); tools.appendChild(tb[k]); });
    function syncTools() { for (const k in tb) tb[k].classList.toggle('on', k === tool); }
    const pal = document.createElement('div'); pal.className = 'edPal'; side.appendChild(pal);
    const sw = [];
    PAL.forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.className = 'edSw'; b.style.background = c; b.onclick = () => { color = c; tool = tool === 'erase' ? 'pen' : tool; syncSw(); syncTools(); }; pal.appendChild(b); sw.push([b, c]); });
    function syncSw() { sw.forEach(([b, c]) => b.classList.toggle('on', c === color)); ci.value = /^#[0-9a-f]{6}$/i.test(color) ? color : '#000000'; }
    const ci = document.createElement('input'); ci.type = 'color'; ci.className = 'edColor'; ci.oninput = () => { color = ci.value; tool = tool === 'erase' ? 'pen' : tool; syncSw(); syncTools(); }; side.appendChild(ci);
    const more = document.createElement('div'); more.className = 'edTools'; side.appendChild(more);
    more.appendChild(btn('Взять за основу «Школьник»', () => { grid = bake(by('school')); redraw(); }));
    more.appendChild(btn('Очистить', () => { grid = new Array(GW * GH).fill(''); redraw(); }));
    const foot = document.createElement('div'); foot.className = 'edFoot'; box.appendChild(foot);
    foot.appendChild(btn('Отмена', () => { close(); if (cancel) cancel(); }));
    foot.appendChild(btn('Готово — играть', () => {
      if (!grid.some(Boolean)) { alert('Нарисуйте хотя бы пару пикселей'); return; }
      setCustom(grid); try { localStorage.setItem(CKEY, JSON.stringify(grid)); localStorage.setItem(KEY, 'custom'); } catch (e) {}
      curId = 'custom'; close(); if (done) done(CUSTOM);
    }, 'ok'));
    const g2 = cv.getContext('2d');
    function redraw() {
      for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
        const v = grid[r * GW + c];
        g2.fillStyle = v || (((r + c) & 1) ? '#262636' : '#2e2e40'); g2.fillRect(c * cs, r * cs, cs, cs);
      }
      g2.strokeStyle = 'rgba(255,255,255,.06)'; g2.lineWidth = 1; g2.beginPath();
      for (let c = 0; c <= GW; c++) { g2.moveTo(c * cs + .5, 0); g2.lineTo(c * cs + .5, GH * cs); }
      for (let r = 0; r <= GH; r++) { g2.moveTo(0, r * cs + .5); g2.lineTo(GW * cs, r * cs + .5); }
      g2.stroke();
      g2.setLineDash([5, 4]); g2.lineWidth = 1.5;
      [[8, '#ffd23a'], [18, '#6ad0ff'], [32, '#ff7ac8']].forEach(([r, col]) => { g2.strokeStyle = col; g2.beginPath(); g2.moveTo(0, r * cs); g2.lineTo(GW * cs, r * cs); g2.stroke(); });
      g2.setLineDash([]);
      const p = pv.getContext('2d'); p.clearRect(0, 0, pv.width, pv.height); p.fillStyle = '#20202e'; p.fillRect(0, 0, pv.width, pv.height);
      const R = (x, y, w, h, c) => { p.fillStyle = c; p.fillRect(Math.round(x * 2), Math.round(y * 2), Math.max(1, Math.round(w * 2)), Math.max(1, Math.round(h * 2))); };
      drawCustom(R, 14, 50, 1, 'idle', 0, { grid }, false);
    }
    function at(e) { const r = cv.getBoundingClientRect(), c = Math.floor((e.clientX - r.left) / r.width * GW), rr = Math.floor((e.clientY - r.top) / r.height * GH); return (c < 0 || c >= GW || rr < 0 || rr >= GH) ? -1 : rr * GW + c; }
    function paint(i) { if (i < 0) return; const v = tool === 'erase' ? '' : color; if (grid[i] !== v) { grid[i] = v; redraw(); } }
    function flood(i) {
      if (i < 0) return; const target = grid[i], v = color; if (target === v) return; const st = [i];
      while (st.length) { const k = st.pop(); if (grid[k] !== target) continue; grid[k] = v; const c = k % GW, r = (k / GW) | 0; if (c > 0) st.push(k - 1); if (c < GW - 1) st.push(k + 1); if (r > 0) st.push(k - GW); if (r < GH - 1) st.push(k + GW); }
      redraw();
    }
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.setPointerCapture && cv.setPointerCapture(e.pointerId); if (tool === 'fill') { flood(at(e)); return; } down = true; paint(at(e)); });
    cv.addEventListener('pointermove', e => { if (down) paint(at(e)); });
    const upf = () => { down = false; }; cv.addEventListener('pointerup', upf); cv.addEventListener('pointercancel', upf);
    document.body.appendChild(modal); syncTools(); syncSw(); redraw();
  }

  function pick(cb) {
    css(); close();
    modal = document.createElement('div'); modal.className = 'skinModal';
    const box = document.createElement('div'); box.className = 'skinBox';
    box.innerHTML = '<h2>Выберите скин</h2><p>Нажмите на героя, чтобы начать игру</p>';
    const grid = document.createElement('div'); grid.className = 'skinGrid'; box.appendChild(grid);
    const cvs = [];
    const edit = () => editor(sk => { if (cb) cb(sk); }, () => pick(cb));
    LIST.forEach(sk => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'skinCard' + (sk.id === curId ? ' sel' : '');
      const c = document.createElement('canvas'); c.width = 72; c.height = 120; cvs.push([c, sk]); preview(c, sk, 0);
      const n = document.createElement('div'); n.textContent = sk.name; b.appendChild(c); b.appendChild(n);
      if (sk.note) { const s = document.createElement('small'); s.textContent = sk.note; b.appendChild(s); }
      if (sk.custom && sk.grid) { const ed = document.createElement('span'); ed.className = 'skinEdit'; ed.textContent = 'ред.'; ed.onclick = ev => { ev.stopPropagation(); edit(); }; b.appendChild(ed); }
      b.onclick = () => {
        if (sk.custom && !sk.grid) { edit(); return; }
        curId = sk.id; try { localStorage.setItem(KEY, curId); } catch (e) {} close(); if (cb) cb(sk);
      };
      grid.appendChild(b);
    });
    modal.appendChild(box); document.body.appendChild(modal);
    const t0 = performance.now();
    (function tick() { if (!modal) return; const t = (performance.now() - t0) / 1000; cvs.forEach(([c, sk]) => { if (sk.id === 'kretin') preview(c, sk, t); }); requestAnimationFrame(tick); })();
  }
  function close() { if (modal && modal.parentNode) modal.parentNode.removeChild(modal); modal = null; }

  window.Skins = { list: LIST, get: () => by(curId), pick, close, deco, preview };
})();
