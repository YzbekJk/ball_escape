(function () {
  const AM = window.AudioManager, PA = window.PeachArt;
  const TILES = [['cherry', '#d4506a'], ['peach', '#ff7d8f'], ['grape', '#8e5bd0'], ['apple', '#e04a4a'], ['pine', '#d9a82a'], ['plum', '#a05bd8'], ['mango', '#ff8a3a'], ['lemon', '#d9c83a'], ['coco', '#8a6a4a'], ['pear', '#7ac24a'], ['dia', '#4ad0e0'], ['straw', '#e0405a']];
  const WIN = ['gold', '#ffc83a'];
    let showing = false, count = 0, target = 120 + Math.random() * 60;

  const css = document.createElement('style');
  css.textContent = `
    .pad{position:fixed;left:50%;top:68px;transform:translate(-50%,-30px);width:min(300px,72vw);aspect-ratio:2/1;z-index:40;border-radius:16px;border:2px solid #4a2a7a;background:linear-gradient(#150a24,#0a0512);box-shadow:0 10px 40px rgba(0,0,0,.6),0 0 0 1px rgba(160,100,255,.25) inset,0 14px 30px -10px rgba(150,80,255,.45);overflow:hidden;opacity:0;transition:opacity .35s,transform .35s;cursor:pointer;font-family:system-ui,sans-serif}
    .pad.in{opacity:1;transform:translate(-50%,0)}
    .pad .x{position:absolute;right:8px;top:6px;z-index:5;width:22px;height:22px;border-radius:50%;border:0;background:rgba(0,0,0,.5);color:#cdb;font:700 12px system-ui;cursor:pointer;opacity:.7}
    .pad .reel{position:absolute;inset:0;overflow:hidden;transition:opacity .5s}
    .pad .strip{position:absolute;left:0;top:0;bottom:0;display:flex;will-change:transform}
    .pad .t{flex:0 0 33.3333%;height:100%;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:8px}
    .pad .t i{display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:16px;border:1px solid rgba(255,255,255,.08)}
    .pad .t canvas{width:56%!important;height:auto!important;filter:drop-shadow(0 6px 8px rgba(0,0,0,.5))}
    .pad .btn{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:4;padding:9px 30px;border-radius:10px;border:2px solid #9a7ad8;background:linear-gradient(#6a4aa8,#3a2470);color:#fff;font:800 13px system-ui;letter-spacing:.1em;box-shadow:0 0 24px rgba(160,110,255,.6);transition:transform .15s,opacity .3s}
    .pad .btn.press{transform:translate(-50%,-50%) scale(.92)}
    .pad .btn.gone{opacity:0}
    .pad .win{position:absolute;left:50%;top:50%;z-index:3;height:86%;aspect-ratio:1;transform:translate(-50%,-50%) scale(.3);opacity:0;border-radius:22px;background:radial-gradient(circle at 50% 18%,#ffe27a,#c8901a 70%);border:3px solid #ffd96a;box-shadow:0 0 60px rgba(255,200,60,.7);display:flex;align-items:center;justify-content:center;transition:transform .55s cubic-bezier(.2,1.4,.4,1),opacity .3s}
    .pad .win.on{transform:translate(-50%,-50%) scale(1);opacity:1}
    .pad .win canvas{width:74%!important;height:auto!important}
    .pad .logo{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:10px;opacity:0;transition:opacity .6s;background:linear-gradient(#150a24,#07030d)}
    .pad .logo.on{opacity:1}
    .pad .logo b{display:block;font:900 clamp(22px,7vw,34px)/.95 system-ui;color:#fff;letter-spacing:-.01em}
    .pad .logo b span{color:#c9a8ff}
    .pad .logo small{display:block;margin-top:5px;font:600 9px system-ui;color:#b59ad8;letter-spacing:.08em}
  `;
  document.head.appendChild(css);

  function tone(f, d, type, v, slide) {
    if (!AM || AM.muted) return; const a = AM.actx; if (!a || a.state !== 'running') return;
    const n = a.currentTime, o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, n); if (slide) o.frequency.exponentialRampToValueAtTime(slide, n + d);
    g.gain.setValueAtTime(0.0001, n); g.gain.exponentialRampToValueAtTime(v || 0.04, n + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, n + d); o.connect(g); g.connect(a.destination); o.start(n); o.stop(n + d + 0.02);
  }
  let voice = null;
  function speak() {
    if (AM && AM.muted) return;
    try { if (!voice) voice = new Audio('assets/peach-ad-voice.mp3'); voice.currentTime = 0; voice.muted = !!(AM && AM.muted); voice.volume = 1; const p = voice.play(); if (p && p.catch) p.catch(() => { }); } catch (e) { }
  }

  function show() {
    if (showing) return; showing = true;
    const T = [], at = (ms, f) => T.push(setTimeout(f, ms)); let tick = 0;
    const card = document.createElement('div'); card.className = 'pad';
    const x = document.createElement('button'); x.className = 'x'; x.textContent = '✕';
    const reel = document.createElement('div'); reel.className = 'reel'; const strip = document.createElement('div'); strip.className = 'strip'; reel.appendChild(strip);
    const N = 26, WI = 20, list = [];
    for (let i = 0; i < N; i++) { const q = i === WI ? WIN : TILES[Math.floor(Math.random() * TILES.length)]; list.push(q); const t = document.createElement('div'); t.className = 't'; const b = document.createElement('i'); b.style.background = 'radial-gradient(ellipse at 50% 0%,' + q[1] + 'cc,' + q[1] + '22 60%,#120a1e)'; b.appendChild(PA.drawFruit(q[0], 90)); t.appendChild(b); strip.appendChild(t); }
    const btn = document.createElement('div'); btn.className = 'btn'; btn.textContent = 'КРУТИТЬ'; btn.classList.add('gone');
    const win = document.createElement('div'); win.className = 'win'; win.appendChild(PA.drawFruit('gold', 150));
    const logo = document.createElement('div'); logo.className = 'logo';
    const mark = PA.drawFruit('peach', 56); const txt = document.createElement('div'); txt.innerHTML = '<b>ПЕРСИК<br><span>ДРОП</span></b><small>ЖМИ И ИГРАЙ</small>'; logo.append(mark, txt);
    card.append(reel, btn, win, logo, x); document.body.appendChild(card);
    const place = p => { const w = card.clientWidth, tw = w / 3; strip.style.transform = 'translateX(' + (-(p * tw + tw / 2 - w / 2)) + 'px)'; };
    strip.style.transition = 'none'; place(2);
    const close = () => { T.forEach(clearTimeout); try { if (voice) voice.pause(); } catch (e) { } card.classList.remove('in'); setTimeout(() => { card.remove(); showing = false; }, 400); };
    x.onclick = e => { e.stopPropagation(); close(); };
    card.onclick = () => { close(); location.hash = '#/peach-drop'; };
    requestAnimationFrame(() => card.classList.add('in'));
    at(150, speak);
    at(600, () => { btn.classList.remove('gone'); tone(520, 0.12, 'triangle', 0.05, 780); });
    at(1500, () => { btn.classList.add('press'); tone(300, 0.1, 'square', 0.04, 200); });
    at(1700, () => {
      btn.classList.add('gone'); strip.style.transition = 'transform 2.6s cubic-bezier(.12,.7,.15,1)'; place(WI);
      const iv = setInterval(() => { if (!showing) return clearInterval(iv); tone(700 + (tick++ % 5) * 50, 0.025, 'square', 0.015); }, 120); T.push(setTimeout(() => clearInterval(iv), 2600));
    });
    at(4500, () => { win.classList.add('on'); [660, 880, 1100, 1320].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sine', 0.05), i * 80)); });
    at(5700, () => { reel.style.opacity = 0; win.style.opacity = 0; logo.classList.add('on'); });
    at(10200, close);
  }

  setInterval(() => {
    if (document.hidden || showing) return;
    const m = /^#\/([^/?]+)/.exec(location.hash); if (!m || m[1] === 'peach-drop') return;
    if (++count >= target) { count = 0; target = 120 + Math.random() * 60; show(); }
  }, 1000);
  window.PeachAd = { show };
})();
