/* AudioManager: один AudioContext и общий мьют для всех игр.
   Выключение звука приостанавливает контекст (actx.suspend) и глушит все HTMLAudio (саундтреки), включение возобновляет. */
(function () {
  const AM = {
    actx: null, muted: false, media: new Set(),
    init() {
      if (AM.actx) { if (!AM.muted && AM.actx.state === 'suspended') AM.actx.resume(); return AM.actx; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { AM.actx = new AC(); if (AM.muted) AM.actx.suspend(); }
      return AM.actx;
    },
    setMuted(m) {
      m = !!m; AM.muted = m;
      AM.media.forEach(a => { a.muted = m; });
      document.querySelectorAll('audio,video').forEach(a => { a.muted = m; });
      if (AM.actx) { if (m) { if (AM.actx.state === 'running') AM.actx.suspend(); } else if (AM.actx.state === 'suspended') AM.actx.resume(); }
    },
    held: [],
    hold() { AM.held = []; const all = new Set(AM.media); document.querySelectorAll('audio,video').forEach(a => all.add(a)); all.forEach(a => { if (!a.paused && !a.ended) { AM.held.push(a); a.pause(); } }); },
    release() { const h = AM.held; AM.held = []; h.forEach(a => { try { const p = a.play(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }); },
    drop() { AM.held = []; },
    toggleMute() { AM.setMuted(!AM.muted); return AM.muted; }
  };
  const OrigAudio = window.Audio;
  window.Audio = function (src) { const a = new OrigAudio(src); a.muted = AM.muted; AM.media.add(a); return a; };
  window.Audio.prototype = OrigAudio.prototype;
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { AM.media.add(this); if (AM.muted) this.muted = true; return play.apply(this, arguments); };
  window.AudioManager = AM;
})();
