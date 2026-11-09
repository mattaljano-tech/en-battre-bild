// Ljud och musik per rum.
"use strict";
/* ================= ljud (syntetiserat, ett ljudlandskap per rum) ================= */
let lbClosedAt = 0; // stängknappen i fotovyn ligger där ljudknappen ligger: ett klick får inte slå på ljudet
const MUSIC = { foajen: "musik/deep-bass-vibes.mp3", staden: "musik/staden.mp3", "*": "musik/rainy-city-night.mp3" }, MUSIC_VOL = .62; // låt per rum, * för resten
addEventListener("scroll", () => { if (scrollX || scrollY) scrollTo(0, 0); }, { passive: true });
const Sound = {
  ctx: null, on: false, tracks: {}, cur: null, master: null, wet: null, send: null, amb: null, timers: [], room: "staden", white: null, brown: null, chordI: 0,
  init() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    const ctx = this.ctx = new AC(), master = this.master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const conv = ctx.createConvolver(), len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    conv.buffer = ir; const wet = this.wet = ctx.createGain(); wet.gain.value = .55; conv.connect(wet); wet.connect(master); this.send = conv;
    { const rb = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), rd = rb.getChannelData(0); for (let i = 0; i < rd.length; i++) rd[i] = Math.random() * 2 - 1; this.rainBuf = rb; }
    const wn = ctx.createBuffer(1, ctx.sampleRate * .12, ctx.sampleRate), wd = wn.getChannelData(0); for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1; this.white = wn;
    const nb = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), nd = nb.getChannelData(0); let last = 0;
    for (let i = 0; i < nd.length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; nd[i] = last * 3.2; } this.brown = nb;
    return true;
  },
  loop(buf, filterType, freq, gain, q) {
    const ctx = this.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = buf; s.loop = true; f.type = filterType; f.frequency.value = freq; if (q) f.Q.value = q; g.gain.value = gain;
    s.connect(f); f.connect(g); g.connect(this.amb); s.start(); this.amb._src.push(s); return g;
  },
  osc(type, f, gain, dest) { const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; g.gain.value = gain; o.connect(g); g.connect(dest || this.amb); o.start(); this.amb._src.push(o); return o; },
  every(fn, min, max) { const go = () => { if (!this.on || !this.amb) return; fn.call(this); this.timers.push(setTimeout(go, min + Math.random() * (max - min))); }; this.timers.push(setTimeout(go, min * .4 + Math.random() * min * .6)); },
  out(node, pan, sendAmt) { const ctx = this.ctx; let n = node; if (ctx.createStereoPanner && pan) { const p = ctx.createStereoPanner(); p.pan.value = pan; node.connect(p); n = p; }
    n.connect(this.amb); if (sendAmt !== 0) { const s = ctx.createGain(); s.gain.value = sendAmt || 1; n.connect(s); s.connect(this.send); } },
  clearAmb() {
    this.timers.forEach(clearTimeout); this.timers = [];
    if (this.amb && this.ctx) { const a = this.amb; a.gain.setTargetAtTime(0, this.ctx.currentTime, .35); setTimeout(() => { a._src.forEach((s) => { try { s.stop(); } catch (e) {} }); try { a.disconnect(); } catch (e) {} }, 2200); }
    this.amb = null;
  },
  startAmb() {
    if (!this.ctx || !this.on) return; this.clearAmb();
    const ctx = this.ctx, amb = ctx.createGain(); amb.gain.value = 0; amb.gain.setTargetAtTime(1, ctx.currentTime, .9); amb.connect(this.master); amb._src = []; this.amb = amb; this.chordVol = 0;
    const S = SPECS[this.room] || { wet: .3 }; this.wet.gain.setTargetAtTime(S.wet, ctx.currentTime, .5);
    this.profiles[this.room].call(this, ctx);
  },
  profiles: {
    staden(ctx) { // staden utanför glaset: trafik, ett sus av folk, neonen som surrar och en kyrkklocka ibland
      this.loop(this.brown, "lowpass", 260, .11);
      this.loop(this.brown, "bandpass", 520, .025, .5);
      this.every(this.bell, 30000, 60000);
      if (REGN) { this.loop(this.rainBuf, "bandpass", 2600, .011, .4); this.loop(this.rainBuf, "lowpass", 900, .01); } // regn mot rutorna, svagt i bakgrunden
    },
    naturen(ctx) {
      const air = this.loop(this.brown, "bandpass", 900, .1, .5); // vindsuset: svagt, fåglarna har kvar sin volym
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .07; lg.gain.value = .045; lfo.connect(lg); lg.connect(air.gain); lfo.start(); this.amb._src.push(lfo);
      this.loop(this.brown, "lowpass", 220, .06);
      this.every(this.bird, 1800, 6500);
    },
    berattelser(ctx) {
      const wind = this.loop(this.brown, "bandpass", 520, .035, .6); // vinden genom hallen: svag, duvor, dropp och knarr har kvar sin volym
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .05; lg.gain.value = .02; lfo.connect(lg); lg.connect(wind.gain); lfo.start(); this.amb._src.push(lfo);
      this.loop(this.brown, "lowpass", 90, .03);
      this.every(this.pigeon, 9000, 20000); this.every(this.drip, 6000, 14000); this.every(this.creak, 18000, 35000);
    },
    manniskorna(ctx) { // stilla ateljé: stad långt borta, något som knarrar ibland
      this.loop(this.brown, "lowpass", 140, .2);
      this.loop(this.brown, "bandpass", 420, .05, .4);
      this.every(this.creak, 9000, 20000); this.chordVol = .008; this.every(this.chord, 9000, 14000);
    },
    gata(ctx) { // ute på gatan: regnet som smattrar på paraplyet och asfalten, staden som mullrar, bilar som väser förbi i vattnet
      this.loop(this.rainBuf, "bandpass", 2400, .05, .45); this.loop(this.rainBuf, "lowpass", 800, .045);
      const tap = this.loop(this.rainBuf, "highpass", 5200, .012); // dropparna mot paraplyduken
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .13; lg.gain.value = .005; lfo.connect(lg); lg.connect(tap.gain); lfo.start(); this.amb._src.push(lfo);
      this.loop(this.brown, "lowpass", 150, .13); this.loop(this.brown, "bandpass", 420, .02, .5);
      this.every(this.car, 5500, 13000); this.every(this.honk, 9000, 24000); this.every(this.drip, 2500, 6000); this.every(this.bell, 45000, 80000);
    },
    foajen(ctx) {
      this.loop(this.brown, "lowpass", 180, .14);
      this.chordVol = .011; this.every(this.chord, 5800, 6200);
    }
  },
  car() { // en bil som kör förbi i det våta: däcken väser, motorn mullrar och tonen sjunker när den passerar
    const ctx = this.ctx, t = ctx.currentTime, T = 4.5 + Math.random() * 2, dir = Math.random() < .5 ? -1 : 1, far = Math.random() < .35 ? .45 : 1;
    const out = ctx.createGain(); out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(far, t + T * .5); out.gain.linearRampToValueAtTime(0, t + T);
    let n = out; if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.setValueAtTime(-.9 * dir, t); p.pan.linearRampToValueAtTime(.9 * dir, t + T); out.connect(p); n = p; }
    n.connect(this.amb); const sg = ctx.createGain(); sg.gain.value = .5; n.connect(sg); sg.connect(this.send);
    const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), hg = ctx.createGain(); s.buffer = this.rainBuf; s.loop = true; bp.type = "bandpass"; bp.Q.value = .8;
    bp.frequency.setValueAtTime(1500, t); bp.frequency.linearRampToValueAtTime(2300, t + T * .5); bp.frequency.linearRampToValueAtTime(1100, t + T); hg.gain.value = .085;
    s.connect(bp); bp.connect(hg); hg.connect(out); s.start(t); s.stop(t + T + .1);
    const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), og = ctx.createGain(), f0 = 52 + Math.random() * 18; o.type = "sawtooth"; lp.type = "lowpass"; lp.frequency.value = 240; og.gain.value = .05;
    o.frequency.setValueAtTime(f0 * 1.06, t); o.frequency.setValueAtTime(f0 * 1.06, t + T * .45); o.frequency.linearRampToValueAtTime(f0 * .92, t + T * .6);
    o.connect(lp); lp.connect(og); og.connect(out); o.start(t); o.stop(t + T + .1); },
  honk() { // en bil som tutar någonstans i kvarteren: två toner, en eller två korta stötar, ibland en lång irriterad signal
    const ctx = this.ctx, t0 = ctx.currentTime, far = .35 + Math.random() * .65, pan = Math.random() * 1.6 - .8, base = 340 + Math.random() * 120, kind = Math.random();
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1300 + far * 1200; const g0 = ctx.createGain(); g0.gain.value = .022 * far; lp.connect(g0); this.out(g0, pan, 1.4 - far * .6);
    const blasts = kind < .45 ? [[0, .16], [.24, .16]] : kind < .8 ? [[0, .32]] : [[0, .9]];
    for (const [d, len] of blasts) for (const r of [1, 1.26]) { const o = ctx.createOscillator(), g = ctx.createGain(), t = t0 + d; o.type = "square"; o.frequency.value = base * r;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + .02); g.gain.setValueAtTime(1, t + len - .03); g.gain.linearRampToValueAtTime(0, t + len);
      o.connect(g); g.connect(lp); o.start(t); o.stop(t + len + .05); } },
  pigeon() { const ctx = this.ctx, t0 = ctx.currentTime, pan = Math.random() * 1.6 - .8, n = 2 + (Math.random() * 2 | 0);
    for (let k = 0; k < n; k++) { const t = t0 + k * .55, o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(), f = 380 + Math.random() * 60;
      o.frequency.setValueAtTime(f * 1.12, t); o.frequency.exponentialRampToValueAtTime(f, t + .35); lfo.frequency.value = 22; lg.gain.value = 12; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.03, t + .06); g.gain.exponentialRampToValueAtTime(.0001, t + .45);
      o.connect(g); this.out(g, pan, .6); o.start(t); lfo.start(t); o.stop(t + .5); lfo.stop(t + .5); } },
  drip() { const ctx = this.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), f = 900 + Math.random() * 1100;
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .45, t + .07);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09 + Math.random() * .06, t + .003); g.gain.exponentialRampToValueAtTime(.0001, t + .14);
    o.connect(g); this.out(g, Math.random() * 2 - 1, 1); o.start(t); o.stop(t + .2); },
  bird() { const ctx = this.ctx, t0 = ctx.currentTime, n = 3 + (Math.random() * 5 | 0), base = 2600 + Math.random() * 2200, pan = Math.random() * 1.6 - .8;
    for (let i = 0; i < n; i++) { const t = t0 + i * (.07 + Math.random() * .05), o = ctx.createOscillator(), g = ctx.createGain(), f = base * (.85 + Math.random() * .4);
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < .5 ? 1.35 : .7), t + .05);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.022, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + .07);
      o.connect(g); this.out(g, pan, .35); o.start(t); o.stop(t + .09); } },
  bell() { // kyrkklocka långt bort: några slag med långa, låga deltoner
    const ctx = this.ctx, t0 = ctx.currentTime, n = 1 + (Math.random() * 3 | 0), lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1300; this.out(lp, -.35, 1.2);
    for (let k = 0; k < n; k++) { const t = t0 + k * 2.6;
      [[.5, .5], [1, 1], [1.19, .55], [1.5, .4], [2, .3], [2.52, .18], [3.01, .12]].forEach(([r, a]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 196 * r;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.022 * a, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + 5.5 / Math.sqrt(r)); o.connect(g); g.connect(lp); o.start(t); o.stop(t + 6); }); } },
  creak() { const ctx = this.ctx, t = ctx.currentTime, s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.brown; bp.type = "bandpass"; bp.Q.value = 9; bp.frequency.setValueAtTime(260, t); bp.frequency.exponentialRampToValueAtTime(820, t + .7);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35, t + .15); g.gain.exponentialRampToValueAtTime(.0001, t + .9);
    s.connect(bp); bp.connect(g); this.out(g, Math.random() * 1.4 - .7, .8); s.start(t); s.stop(t + 1); },
  chord() { if (this.cur) return; const ctx = this.ctx, t = ctx.currentTime, vol = this.chordVol || .022, CH = [[50, 53, 57, 60, 64], [43, 53, 57, 59, 64], [48, 52, 55, 59, 62], [45, 49, 55, 58, 64]];
    const notes = CH[this.chordI++ % CH.length], lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1100; this.out(lp, 0, .4);
    notes.forEach((m, i) => { const f = 440 * Math.pow(2, (m - 69) / 12), o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), tt = t + i * .025;
      o.type = "triangle"; o.frequency.value = f; o2.type = "sine"; o2.frequency.value = f * 2.003;
      g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(vol, tt + .02); g.gain.exponentialRampToValueAtTime(vol * .36, tt + 1.2); g.gain.exponentialRampToValueAtTime(.0001, tt + 3.8);
      o.connect(g); o2.connect(g); g.connect(lp); o.start(tt); o2.start(tt); o.stop(tt + 4); o2.stop(tt + 4); }); },
  clink() { const ctx = this.ctx, t = ctx.currentTime, pan = Math.random() * 1.4 - .7;
    [2900, 4350, 6100].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f * (1 + Math.random() * .02);
      g.gain.setValueAtTime(.03 / (i + 1), t); g.gain.exponentialRampToValueAtTime(.0001, t + .45); o.connect(g); this.out(g, pan, .5); o.start(t); o.stop(t + .5); }); },
  step(side) {
    if (!this.on || !this.ctx) return; const ctx = this.ctx, t = ctx.currentTime, s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), base = (SPECS[this.room] || { step: 620 }).step;
    s.buffer = this.white; bp.type = "bandpass"; bp.frequency.value = base * (.85 + Math.random() * .4); bp.Q.value = 1.4;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.42, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + .1);
    s.connect(bp); bp.connect(g);
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = side * .15; g.connect(p); p.connect(this.master); p.connect(this.send); } else { g.connect(this.master); g.connect(this.send); }
    s.start(t);
  },
  flick() { if (!this.on || !this.ctx) return; const ctx = this.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = "square"; o.frequency.value = 100; g.gain.setValueAtTime(.012, t); g.gain.exponentialRampToValueAtTime(.0001, t + .06); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + .07); },
  setRoom(key) { this.room = key; if (this.on) { this.startAmb(); this.playMusic(); } },
  set(on) {
    if (on && !this.ctx && !this.init()) { toast("Ljud stöds inte i den här webbläsaren."); return; }
    this.on = on; if (on) $("rainBtn").hidden = true; $("soundBtn").setAttribute("aria-pressed", String(on)); $("soundLabel").textContent = on ? "Ljud på" : "Ljud av";
    if (!this.ctx) return;
    if (on) { this.ctx.resume(); this.master.gain.cancelScheduledValues(this.ctx.currentTime); this.master.gain.setTargetAtTime(.9, this.ctx.currentTime, .6); this.startAmb(); this.playMusic(); }
    else { this.master.gain.setTargetAtTime(0, this.ctx.currentTime, .2); this.clearAmb(); setTimeout(() => { if (!this.on) for (const k in this.tracks) this.tracks[k].a.pause(); }, 900); }
  },
  // bakgrundsmusiken ligger ovanpå rummets ljud, utan rummets eko; varje rum kan ha sin låt och de tonar över i varandra
  track(src) {
    let T = this.tracks[src]; if (T) return T;
    const a = new Audio(src); a.loop = true; a.preload = "auto";
    const g = this.ctx.createGain(); g.gain.value = 0; this.ctx.createMediaElementSource(a).connect(g); g.connect(this.master);
    return (this.tracks[src] = { a, g, stop: 0 });
  },
  playMusic() {
    if (!this.ctx || !this.on) return;
    const src = this.room === "gata" ? null : MUSIC[this.room] || MUSIC["*"], now = this.ctx.currentTime; // ute på gatan: bara regnet, musiken börjar inne
    // första gången, medan knapptrycket fortfarande räknas: väck alla låtar så att mobilen tillåter att de spelas senare
    if (!this.primed) { this.primed = true; new Set(Object.values(MUSIC)).forEach((s2) => { if (s2 !== src) { const P = this.track(s2); P.a.play().then(() => { if (this.cur !== s2) P.a.pause(); }).catch(() => {}); } }); }
    for (const k in this.tracks) if (k !== src) { const O = this.tracks[k]; O.g.gain.setTargetAtTime(0, now, 1.1); clearTimeout(O.stop); O.stop = setTimeout(() => { if (this.cur !== k) O.a.pause(); }, 6000); }
    this.cur = src; if (!src) return; const T = this.track(src); clearTimeout(T.stop);
    T.a.play().then(() => { if (this.cur === src && this.on) T.g.gain.setTargetAtTime(MUSIC_VOL, this.ctx.currentTime, 1.4); }).catch(() => {});
  }
};
$("soundBtn").addEventListener("click", (e) => { if (performance.now() - lbClosedAt < 900) return; Sound.set(!Sound.on); e.currentTarget.blur(); canvas.focus({ preventScroll: true }); });
