/* Physics core for "Ball escape". Pure, deterministic, no DOM — also runs in Node for tests. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function angDiff(a, b) {
    let d = (a - b) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  }

  const DEFAULTS = {
    duration: 80,     // seconds until every layer is gone
    layers: 36,       // number of concentric rings
    innerR: 0.43,     // radius of the central chamber (outer radius = 1)
    gap0: 0.7,        // gap width at t=0, radians
    gap1: 3.6,        // gap width just before a layer disappears, radians
    erode: 2.2,       // >1 : layers stay closed longer, then open quickly
    twist: 0.12,      // angular offset between neighbouring gaps (spiral)
    spin: 0.9,        // gap rotation speed, rad/s
    spinVar: 1.5,     // outer layers rotate (1+spinVar) times faster
    ballR: 0.028,
    ballSpeed: 0.6,   // units per second
    gravity: 0,
    bounce: 1,        // restitution
    keepSpeed: true,  // keep constant speed when gravity = 0
    seed: 1
  };

  class Sim {
    constructor(params) {
      this.p = Object.assign({}, DEFAULTS, params || {});
      this.bounds = null; // {x,y} half-extent of the view, used after escape
      this.reset();
    }

    reset() {
      const p = this.p, rng = mulberry32(p.seed | 0);
      const N = p.layers | 0;
      this.N = N;
      this.dr = (1 - p.innerR) / N;
      this.t = 0;
      this.escaped = false;
      this.escapeT = null;
      this.events = [];
      this.phase = new Float64Array(N);
      this.omega = new Float64Array(N);
      this.death = new Float64Array(N);
      for (let k = 0; k < N; k++) {
        this.phase[k] = -Math.PI / 2 + k * p.twist;
        this.omega[k] = p.spin * (1 + p.spinVar * k / Math.max(1, N - 1));
        this.death[k] = p.duration * (0.04 + 0.93 * (k + 1) / N);
      }
      const a = rng() * TAU, r = rng() * 0.12, va = rng() * TAU;
      this.b = {
        x: Math.cos(a) * r, y: Math.sin(a) * r,
        vx: Math.cos(va) * p.ballSpeed, vy: Math.sin(va) * p.ballSpeed,
        px: 0, py: 0
      };
    }

    alive(k) { return this.t < this.death[k]; }
    theta(k, t) { return this.phase[k] + this.omega[k] * (t === undefined ? this.t : t); }
    halfGap(k, t) {
      const p = this.p, f = Math.min(1, t / this.death[k]);
      return (p.gap0 + (p.gap1 - p.gap0) * Math.pow(f, p.erode)) / 2;
    }

    step(dt) {
      const p = this.p, b = this.b, N = this.N, dr = this.dr, br = p.ballR;
      this.t += dt;
      const t = this.t;

      b.vy += p.gravity * dt;
      b.px = b.x; b.py = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt;
      const pd = Math.hypot(b.px, b.py);

      let d = Math.hypot(b.x, b.y);
      if (!this.escaped && d - br > 1) { this.escaped = true; this.escapeT = t; }

      if (d - br < 1) {
        for (let pass = 0; pass < 2; pass++) {
          d = Math.hypot(b.x, b.y);
          if (d < 1e-9) break;
          let k0 = Math.floor((d - br - p.innerR) / dr), k1 = Math.floor((d + br - p.innerR) / dr);
          if (k0 < 0) k0 = 0; if (k1 > N - 1) k1 = N - 1;
          let hit = false;
          for (let k = k0; k <= k1; k++) {
            if (t >= this.death[k]) continue;
            const diff = Math.abs(angDiff(Math.atan2(b.y, b.x), this.theta(k)));
            if (diff < this.halfGap(k, t) - br / d) continue;      // passes through the gap
            const rIn = p.innerR + k * dr, rOut = rIn + dr;
            const inside = pd < (rIn + rOut) / 2;
            const nd = inside ? rIn - br : rOut + br;
            const nx = b.x / d, ny = b.y / d;
            const vr = b.vx * nx + b.vy * ny;
            b.x = nx * nd; b.y = ny * nd;
            if ((inside && vr > 0) || (!inside && vr < 0)) {
              const j = (1 + p.bounce) * vr;
              b.vx -= j * nx; b.vy -= j * ny;
              this.events.push({ k, power: Math.min(1, Math.abs(vr) / 0.8) });
            }
            hit = true; break;
          }
          if (!hit) break;
        }
        if (p.keepSpeed && p.gravity === 0) {
          const s = Math.hypot(b.vx, b.vy);
          if (s > 1e-9) { b.vx *= p.ballSpeed / s; b.vy *= p.ballSpeed / s; }
        }
      }

      // after the escape the ball just bounces around inside the visible area
      if (this.escaped && this.bounds) {
        const bx = this.bounds.x - br, by = this.bounds.y - br;
        if (b.x > bx) { b.x = bx; b.vx = -Math.abs(b.vx); }
        if (b.x < -bx) { b.x = -bx; b.vx = Math.abs(b.vx); }
        if (b.y > by) { b.y = by; b.vy = -Math.abs(b.vy); }
        if (b.y < -by) { b.y = -by; b.vy = Math.abs(b.vy); }
      }
    }
  }

  const api = { Sim, DEFAULTS, mulberry32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BallSim = api;
})(typeof self !== 'undefined' ? self : this);
