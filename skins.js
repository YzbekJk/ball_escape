/* Скины героя для «Гнилой маршрутки» и «Светофора» (пиксель-арт).
   Skins.get() — выбранный скин; Skins.pick(cb) — окно выбора; Skins.deco(...) — детали головы/тела поверх базового человечка. */
(function () {
  const KEY = 'hero_skin';
  const LIST = [
    { id: 'school', name: 'Школьник', note: 'начальный', skin: '#f0c9a0', hair: '#432a1a', top: '#e8eef5', pants: '#1f2a44', shoes: '#1a1a22' },
    { id: 'kretin', name: 'Кретин 528', skin: '#f0c9a0', hair: '#1a1008', top: '#7a2a7a', pants: '#2a2530', shoes: '#1a1a22' },
    { id: 'money', name: 'Мистер деньги', skin: '#f0c9a0', hair: '#111', top: '#1f7a3a', pants: '#17502a', shoes: '#1a1a22' },
    { id: 'afonya', name: 'Афоня Редокс', skin: '#e8b890', hair: '#6a4020', top: '#16161a', pants: '#121216', shoes: '#1a1a22' },
    { id: 'orange', name: 'Апельсиновый сок 2018', skin: '#ff6a1a', hair: '#ff6a1a', top: '#ff5a10', pants: '#e8501a', shoes: '#c8400e' },
    { id: 'bashmak', name: 'Башмак', skin: '#e8b898', hair: '#b87840', top: '#1f4f9a', pants: '#2a3350', shoes: '#1a1a22' }
  ];
  let curId = 'school';
  try { const s = localStorage.getItem(KEY); if (s && LIST.some(x => x.id === s)) curId = s; } catch (e) {}

  const by = id => LIST.find(x => x.id === id) || LIST[0];

  /* детали поверх базового человечка: R(x,y,w,h,color) — пиксельная кисть игры, cx — центр, hy — верх головы, fy — подошвы */
  function deco(R0, cx, hy, fy, f, st, t, skin, flashing) {
    const sk = skin || by(curId), id = sk.id, R = flashing ? (x, y, w, h) => R0(x, y, w, h, '#fff') : R0;
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
    } else if (id === 'money') {
      R(cx - 5, hy - 1, 10, 3, '#111'); R(cx - 5, hy + 2, 2, 3, '#111');                         // зализанные волосы
      R(cx - 5, hy + 3, 10, 3, '#111'); R(cx - 4, hy + 3, 3, 1, '#5a5a66'); R(cx + 1, hy + 3, 3, 1, '#5a5a66');   // тёмные очки
      R(cx - 1, hy + 10, 2, 14, '#f0f0e0'); R(cx - 1, hy + 11, 2, 11, '#0e3a1c');                // рубашка и галстук
      R(cx - 4, hy + 12, 8, 1, '#ffd23a'); R(cx - 1, hy + 13, 2, 2, '#ffd23a');                  // золотая цепь
      R(cx + 2, hy + 16, 4, 4, '#7ae07a'); R(cx + 3, hy + 16, 2, 4, '#3a9a3a');                  // пачка денег в кармане
      R(cx - 5, hy + 19, 3, 3, '#ffd23a'); R(cx - 4, hy + 20, 1, 1, '#9a7a10');                  // золотой «$»
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
      '.skinCard:active{transform:scale(.97)}';
    document.head.appendChild(s);
  }
  function preview(canvas, sk, t) {
    const S = 2, g = canvas.getContext('2d'); g.clearRect(0, 0, canvas.width, canvas.height);
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x * S), Math.round(y * S), Math.max(1, Math.round(w * S)), Math.max(1, Math.round(h * S))); };
    const cx = 18, fy = 57, hy = fy - 38, f = 1;
    R(cx - 5, fy - 14, 4, 14, sk.pants); R(cx + 1, fy - 14, 4, 14, sk.pants); R(cx - 6, fy - 2, 5, 2, sk.shoes); R(cx + 1, fy - 2, 5, 2, sk.shoes);
    R(cx - 6, hy + 10, 12, 16, sk.top);
    R(cx - 5, hy, 10, 10, sk.skin); R(cx - 5, hy - 1, 10, 3, sk.hair);
    R(cx - 4, hy + 4, 3, 3, '#fff'); R(cx + 1, hy + 4, 3, 3, '#fff'); R(cx - 2.5, hy + 5, 1.5, 2, '#111'); R(cx + 2.5, hy + 5, 1.5, 2, '#111'); R(cx - 1, hy + 8, 3, 1, '#8a4a3a');
    R(cx - f * 8 - 1.5, hy + 12, 3, 11, sk.top); R(cx - f * 8 - 1.5, hy + 23, 3, 3, sk.skin); R(cx + f * 5, hy + 13, 5, 4, sk.top); R(cx + f * 10, hy + 11, 4, 5, sk.skin);
    deco(R, cx, hy, fy, f, 'idle', t || 0, sk, false);
  }
  function pick(cb) {
    css(); close();
    modal = document.createElement('div'); modal.className = 'skinModal';
    const box = document.createElement('div'); box.className = 'skinBox';
    box.innerHTML = '<h2>Выберите скин</h2><p>Нажмите на героя, чтобы начать игру</p>';
    const grid = document.createElement('div'); grid.className = 'skinGrid'; box.appendChild(grid);
    const cvs = [];
    LIST.forEach(sk => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'skinCard' + (sk.id === curId ? ' sel' : '');
      const c = document.createElement('canvas'); c.width = 72; c.height = 120; cvs.push([c, sk]); preview(c, sk, 0);
      const n = document.createElement('div'); n.textContent = sk.name; b.appendChild(c); b.appendChild(n);
      if (sk.note) { const s = document.createElement('small'); s.textContent = sk.note; b.appendChild(s); }
      b.onclick = () => { curId = sk.id; try { localStorage.setItem(KEY, curId); } catch (e) {} close(); if (cb) cb(sk); };
      grid.appendChild(b);
    });
    modal.appendChild(box); document.body.appendChild(modal);
    const t0 = performance.now();
    (function tick() { if (!modal) return; const t = (performance.now() - t0) / 1000; cvs.forEach(([c, sk]) => { if (sk.id === 'kretin') preview(c, sk, t); }); requestAnimationFrame(tick); })();
  }
  function close() { if (modal && modal.parentNode) modal.parentNode.removeChild(modal); modal = null; }

  window.Skins = { list: LIST, get: () => by(curId), pick, close, deco, preview };
})();
