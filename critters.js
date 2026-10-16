/* Котозайцы пробегают по меню, их можно лопнуть тапом. */
(function () {
  const menu = document.getElementById('menu'), layer = document.getElementById('critters'), cnt = document.getElementById('popCount');
  let list = [], nextSpawn = 0, last = 0, popped = 0, ac = null;
  try { popped = +localStorage.getItem('pops') || 0; } catch (e) {}
  const show = () => { if (cnt) cnt.textContent = popped ? 'Лопнуто котозайцев: ' + popped : ''; };
  show();

  function pop(sound) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ac = ac || new AC(); if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(900 + Math.random() * 200, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.07);
      g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.12);
    } catch (e) {}
  }
  function burst(x, y, size) {
    for (let i = 0; i < 14; i++) {
      const p = document.createElement('i'); p.className = 'fluff';
      const a = Math.random() * 6.283, d = size * (0.5 + Math.random() * 0.9);
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d + 'px');
      layer.appendChild(p); setTimeout(() => p.remove(), 700);
    }
  }
  function spawn() {
    const size = 70 + Math.random() * 60, fromLeft = Math.random() < 0.5;
    const el = document.createElement('img'); el.src = 'assets/kotozayac.jpg'; el.className = 'critter'; el.alt = ''; el.draggable = false;
    el.style.width = el.style.height = size + 'px';
    const c = {
      el, size, x: fromLeft ? -size : innerWidth, v: (fromLeft ? 1 : -1) * (50 + Math.random() * 70),
      y0: 90 + Math.random() * (innerHeight - 220), ph: Math.random() * 6, rot: 0, dead: false
    };
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); if (c.dead) return; c.dead = true;
      const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, size);
      el.classList.add('pop'); setTimeout(() => el.remove(), 180);
      popped++; try { localStorage.setItem('pops', popped); } catch (e) {} show(); pop();
    });
    layer.appendChild(el); list.push(c);
  }
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
    if (menu.hidden) return;
    if (ts > nextSpawn && list.length < 4) { spawn(); nextSpawn = ts + 1500 + Math.random() * 3500; }
    for (const c of list) {
      if (c.dead) continue;
      c.x += c.v * dt; c.ph += dt * 5; c.rot += c.v * dt * 1.2 / (c.size / 2) * 57.3 * 0.5;
      const y = c.y0 + Math.abs(Math.sin(c.ph)) * -22;
      c.el.style.transform = 'translate(' + c.x + 'px,' + y + 'px) rotate(' + c.rot + 'deg)';
      if (c.x < -c.size * 1.5 || c.x > innerWidth + c.size * 0.5) { c.dead = true; c.el.remove(); }
    }
    list = list.filter(c => !c.dead);
  }
  requestAnimationFrame(frame);
})();
