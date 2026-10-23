(function () {
  const AM = window.AudioManager, PA = window.PeachArt;
  const TILES = [['cherry', '#d4506a'], ['peach', '#ff7d8f'], ['grape', '#8e5bd0'], ['apple', '#e04a4a'], ['pine', '#d9a82a'], ['plum', '#a05bd8'], ['mango', '#ff8a3a'], ['lemon', '#d9c83a'], ['coco', '#8a6a4a'], ['pear', '#7ac24a'], ['dia', '#4ad0e0'], ['straw', '#e0405a']];
  const WIN = ['gold', '#ffc83a'];
    let showing = false, count = 0, target = 60 + Math.random() * 30;

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
    .pad.pl{aspect-ratio:16/9;width:min(340px,80vw);border-color:#6a4a10;background:#050505;box-shadow:0 10px 40px rgba(0,0,0,.6),0 0 30px -6px rgba(255,200,60,.35)}
    .pl .st{position:absolute;inset:0;opacity:0;transition:opacity .5s}.pl .st.on{opacity:1}
    .pl .wall{background:repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 1px,transparent 1px 22px),repeating-linear-gradient(90deg,rgba(255,255,255,.04) 0 1px,transparent 1px 44px),radial-gradient(ellipse at 50% 40%,#2a2a2e,#0a0a0c 75%)}
    .pl .ghost{position:absolute;right:8%;top:14%;font:900 26px system-ui;color:rgba(255,255,255,.07);letter-spacing:-.01em}
    .pl .bag{position:absolute;bottom:4%;width:20%;aspect-ratio:.9;border-radius:46% 46% 30% 30%;background:radial-gradient(circle at 35% 30%,#444,#0b0b0b 70%);transition:transform .9s cubic-bezier(.2,.9,.3,1)}
    .pl .can{position:absolute;left:50%;bottom:6%;width:26%;aspect-ratio:.72;transform:translate(-50%,-160%) rotate(-30deg);opacity:0;transition:transform .9s cubic-bezier(.3,1.4,.5,1),opacity .3s;background:repeating-linear-gradient(90deg,#8a8a90 0 6px,#3a3a40 6px 9px);border-radius:6px 6px 10px 10px;box-shadow:0 0 0 3px #55555c inset}
    .pl .can.on{opacity:1;transform:translate(-120%,0) rotate(-72deg)}
    .pl .rot{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%) scale(.3);opacity:0;filter:grayscale(.9) brightness(.65);transition:transform .8s cubic-bezier(.2,1.3,.4,1),opacity .4s,filter .9s}
    .pl .rot.on{opacity:1;transform:translate(-30%,-50%) scale(1)}
    .pl .rot.glow{filter:none;transform:translate(-50%,-62%) scale(1.15)}
    .pl .grid{background:repeating-linear-gradient(0deg,rgba(120,255,120,.06) 0 1px,transparent 1px 16px),repeating-linear-gradient(90deg,rgba(120,255,120,.06) 0 1px,transparent 1px 16px),radial-gradient(ellipse at 50% 30%,#2a1a4a,#0a0510 80%)}
    .pl .pbtn{position:absolute;left:50%;bottom:9%;transform:translateX(-50%);padding:8px 26px;border-radius:8px;background:linear-gradient(#f0c020,#c89a10);color:#2a1a00;font:900 12px system-ui;letter-spacing:.06em;box-shadow:0 0 22px rgba(255,200,40,.5);transition:transform .15s,opacity .3s;opacity:0}
    .pl .pbtn.on{opacity:1}.pl .pbtn.press{transform:translateX(-50%) scale(.9)}
    .pl .cur{position:absolute;left:58%;bottom:3%;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:14px solid #fff;transform:rotate(-25deg);opacity:0;transition:all .6s}
    .pl .cur.on{opacity:1;left:56%;bottom:8%}
    .pl .side{position:absolute;top:8%;bottom:8%;width:27%;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-direction:column;font:700 7px system-ui;color:rgba(255,255,255,.7);gap:4px}
    .pl .ring{position:absolute;left:50%;top:50%;width:36%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:conic-gradient(#ff9a1a 0 var(--p,0%),#2a2a30 0);display:flex;align-items:center;justify-content:center}
    .pl .ring i{width:78%;height:78%;border-radius:50%;background:#0c0814;display:flex;align-items:center;justify-content:center}
    .pl .ring canvas{width:60%!important;height:auto!important}
    .pl .neon{background:radial-gradient(ellipse at 50% 40%,#3a1a6a,#07030d 75%);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:2px}
    .pl .neon b{font:900 clamp(24px,8vw,36px)/1 system-ui;color:#fff;text-shadow:0 0 14px #b070ff,0 0 30px #8a40ff;letter-spacing:-.01em}.pl .neon b span{color:#e0b8ff}
    .pl .neon small{font:700 9px system-ui;color:#d9b8ff;letter-spacing:.12em}
    .pl .neon.flash{animation:plf .35s 3}@keyframes plf{50%{filter:brightness(2.2)}}
  `;
  document.head.appendChild(css);

  function tone(f, d, type, v, slide) {
    if (!AM || AM.muted) return; const a = AM.actx; if (!a || a.state !== 'running') return;
    const n = a.currentTime, o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, n); if (slide) o.frequency.exponentialRampToValueAtTime(slide, n + d);
    g.gain.setValueAtTime(0.0001, n); g.gain.exponentialRampToValueAtTime(v || 0.04, n + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, n + d); o.connect(g); g.connect(a.destination); o.start(n); o.stop(n + d + 0.02);
  }
  let voice = null, vbuf = null, vsrc = null, vload = false, VF = 'assets/peach-ad-voice.mp3', cache = {};
  function setVoice(f) { if (VF === f) return; cache[VF] = vbuf; VF = f; vbuf = cache[f] || null; vload = false; voice = null; }
  function preload() {
    if (vbuf || vload || !AM || !AM.actx) return; vload = true;
    fetch(VF).then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => AM.actx.decodeAudioData(b, ok, no))).then(d => { vbuf = d; }).catch(() => { vload = false; });
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => { try { AM && AM.init(); } catch (e) { } preload(); }, { capture: true, passive: true }));
  function speak() {
    if (AM && AM.muted) return;
    try {
      const a = AM && AM.init();
      if (a && a.state === 'running' && vbuf) { vsrc = a.createBufferSource(); vsrc.buffer = vbuf; const g = a.createGain(); g.gain.value = 1; vsrc.connect(g); g.connect(a.destination); vsrc.start(); return; }
      preload();
      if (!voice) voice = new Audio(VF); voice.currentTime = 0; voice.muted = false; voice.volume = 1; const p = voice.play(); if (p && p.catch) p.catch(() => { });
    } catch (e) { }
  }
  function stopVoice() { try { if (vsrc) vsrc.stop(); } catch (e) { } vsrc = null; try { if (voice) voice.pause(); } catch (e) { } }

  function show() {
    if (showing) return; showing = true; const hold = window.GameHold && GameHold.on();
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
    const close = go => { T.forEach(clearTimeout); if (window.GameHold) GameHold.off(hold, go === true); stopVoice(); card.classList.remove('in'); setTimeout(() => { card.remove(); showing = false; }, 400); };
    x.onclick = e => { e.stopPropagation(); close(); };
    card.onclick = () => { close(true); location.hash = '#/peach-drop'; };
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

  function showPlum() {
    if (showing) return; showing = true; setVoice('assets/plum-ad-voice.mp3'); preload(); const hold = window.GameHold && GameHold.on();
    const T = [], at = (ms, f) => T.push(setTimeout(f, ms));
    const card = document.createElement('div'); card.className = 'pad pl';
    const x = document.createElement('button'); x.className = 'x'; x.textContent = '✕';
    const mk = (cls, parent) => { const d = document.createElement('div'); d.className = cls; (parent || card).appendChild(d); return d; };
    const s1 = mk('st wall'); mk('ghost', s1).textContent = 'СЛИВА';
    [[2, 6], [14, 2], [76, 5]].forEach(([l, b], i) => { const g = mk('bag', s1); g.style.left = l + '%'; g.style.bottom = b + '%'; g.style.transform = 'translateX(' + (i < 2 ? -120 : 120) + '%)'; g.dataset.k = '1'; });
    const can = mk('can', s1); const rot = mk('rot', s1); rot.appendChild(PA.drawFruit('plum', 70));
    const s2 = mk('st grid'); const pb = mk('pbtn', s2); pb.textContent = '⬆ ПРОКАЧАТЬ'; const cur = mk('cur', s2);
    const s3 = mk('st grid'); const L = mk('side', s3), Rr = mk('side', s3), ring = mk('ring', s3), ri = document.createElement('i'); ring.appendChild(ri); ri.appendChild(PA.drawFruit('plum', 60));
    L.style.left = '4%'; L.style.background = 'linear-gradient(#a03030,#401010)'; Rr.style.right = '4%'; Rr.style.background = 'linear-gradient(#777,#2a2a2a)';
    L.appendChild(PA.drawFruit('plum', 40)); L.append('ОБЫЧНАЯ СЛИВА'); Rr.appendChild(PA.drawFruit('gold', 40)); Rr.append('ЗОЛОТАЯ СЛИВА');
    const s4 = mk('st neon'); const nb = document.createElement('b'); nb.innerHTML = 'СЛИВА<br><span>КЛИКЕР</span>'; const ns = document.createElement('small'); ns.textContent = 'ЖМИ И ПРОКАЧИВАЙ'; s4.append(PA.drawFruit('plum', 50), nb, ns);
    card.appendChild(x); document.body.appendChild(card);
    const stage = n => [s1, s2, s3, s4].forEach((e, i) => e.classList.toggle('on', i === n));
    const close = go => { T.forEach(clearTimeout); if (window.GameHold) GameHold.off(hold, go === true); stopVoice(); setVoice('assets/peach-ad-voice.mp3'); card.classList.remove('in'); setTimeout(() => { card.remove(); showing = false; }, 400); };
    x.onclick = e => { e.stopPropagation(); close(); };
    card.onclick = () => { close(true); location.hash = '#/plum-clicker'; };
    requestAnimationFrame(() => { card.classList.add('in'); stage(0); });
    at(100, speak);
    at(250, () => s1.querySelectorAll('.bag').forEach(g => { g.style.transform = 'none'; }));
    at(500, () => { can.classList.add('on'); tone(140, 0.4, 'sawtooth', 0.05, 60); });
    at(1000, () => { rot.classList.add('on'); tone(200, 0.2, 'square', 0.04, 120); });
    at(1500, () => { rot.classList.add('glow'); tone(520, 0.25, 'triangle', 0.05, 900); });
    at(1700, () => { stage(1); });
    at(1900, () => { pb.classList.add('on'); cur.classList.add('on'); });
    at(2500, () => { pb.classList.add('press'); tone(300, 0.1, 'square', 0.04, 200); });
    at(2800, () => { stage(2); let p = 0; const iv = setInterval(() => { p += 4; ring.style.setProperty('--p', Math.min(100, p) + '%'); tone(500 + p * 6, 0.03, 'square', 0.015); if (p >= 100 || !showing) clearInterval(iv); }, 70); T.push(setTimeout(() => clearInterval(iv), 2000)); });
    at(4300, () => { stage(3); s4.classList.add('flash'); [660, 880, 1100, 1320].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sine', 0.05), i * 80)); });
    at(9000, close);
  }

  setInterval(() => {
    if (document.hidden || showing) return;
    const m = /^#\/([^/?]+)/.exec(location.hash); if (!m || m[1] === 'peach-drop') return;
    if (++count >= target) { count = 0; target = 60 + Math.random() * 30; if (m[1] === 'plum-clicker' || Math.random() < 0.5) show(); else showPlum(); }
  }, 1000);
  window.PeachAd = { show, showPlum };
})();
