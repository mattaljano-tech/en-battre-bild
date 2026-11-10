// Sökaren, överst på startsidan (index.html): bilderna hänger på olika djup i ett mörkt rum och scrollen ställer skärpan.
// Ren WebGL2, utan Three.js. Finns inte WebGL2 visas bara Perrongen bakom rubriken, och resten av sidan är som vanligt.
"use strict";
(function () {
  const $ = (id) => document.getElementById(id);
  const root = $("sok"), stage = $("sokStage"), canvas = $("c");
  if (!root || !canvas) return;
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
  if (!gl) return;
  root.classList.add("gl");
  let dead = false;
  canvas.addEventListener("webglcontextlost", () => { dead = true; root.classList.remove("gl"); document.documentElement.classList.remove("sok-snap"); });
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = matchMedia("(pointer: coarse)").matches;
  const RAIN = !still && !/[?&]sol\b/.test(location.search); // ?sol: ingen regn på linsen

  /* ================= inställningar ================= */
  const FOV = 40 * Math.PI / 180, TAN = Math.tan(FOV / 2);
  const D = 5;        // avståndet där bilden är skarp
  const S = 3.6;      // avståndet mellan två bilder i djupled
  const K = .085;     // bländaren: större tal ger mer oskärpa
  const HOLD = .3;    // hur stor del av scrollen kring varje bild som bilden står kvar i skärpa (0 = inte alls, .5 = hela)
  const URVAL = ["gloden", "klippan", "azizam", "taggen"]; // bilderna i Sökaren, i den här ordningen (namnen i foton.js). Alla bilder finns i galleriet längre ner.
  const HERO = "lisboa"; // bilden bakom rubriken på första skärmen
  const MAXT = touch ? 1024 : 1440; // största sidan på en bild i grafikminnet
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;

  /* ================= stoppen: rubrik, rum, bilder, slut ================= */
  const ROOMS = [["Staden", "staden"], ["Naturen", "naturen"], ["Människorna", "manniskorna"], ["Berättelser", "berattelser"]];
  const group = (p) => p.meta.split(" · ")[0];
  const all = Object.keys(PHOTOS).map((key) => Object.assign({ key }, PHOTOS[key])).filter((p) => p.src);
  const AR = typeof FOTOMATT === "object" ? FOTOMATT : {};
  const stops = [{ kind: "intro" }];
  { const pick = URVAL.map((key) => all.find((p) => p.key === key)).filter(Boolean);
    pick.forEach((p, k) => stops.push({ kind: "photo", p, room: group(p), k, n: pick.length })); }
  const N = stops.length, journey = stops.filter((s) => s.kind === "photo");

  // ett tomt avsnitt per stopp, så att sidan går att scrolla och skärmläsare får en lista
  stops.forEach((s, i) => { if (s.kind === "intro") return;
    const sec = document.createElement("section"); sec.className = "stop " + s.kind; sec.dataset.i = i;
    const h = document.createElement(s.kind === "room" ? "h2" : "h3"); h.className = "sr"; h.textContent = s.kind === "room" ? s.name : s.p.title; sec.append(h);
    s.el = sec; root.append(sec); });

  /* ================= WebGL: program och buffertar ================= */
  function program(vs, fs) {
    const mk = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, "#version 300 es\nprecision highp float;\n" + src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, "a"); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  }
  let P_QUAD, P_SPECK, P_FINAL, P_DROP;
  try {
    // en bild i rummet: oskärpan görs med tolv prov i en skiva, och kanten mjuknar lika mycket som bilden
    P_QUAD = program(
      "in vec2 a; uniform vec3 uC; uniform vec2 uSize, uR, uF; out vec2 v;\n" +
      "void main(){ v = a * (1. + 2. * uR) - uR; vec3 p = uC + vec3((v - .5) * uSize * vec2(1., -1.), 0.); gl_Position = vec4(p.x * uF.x, p.y * uF.y, 0., -p.z); }",
      "in vec2 v; uniform sampler2D uT; uniform vec2 uR, uPx; uniform float uLod, uA, uDim, uHas, uBlur; uniform vec3 uTint; out vec4 o;\n" +
      "void main(){ vec2 e = max(uR, uPx); vec2 c = smoothstep(-e, e, v) * smoothstep(-e, e, 1. - v); vec4 col;\n" +
      "  if (uHas < .5) col = vec4(uTint, 1.);\n" +
      "  else if (uBlur < .5) col = textureLod(uT, clamp(v, 0., 1.), uLod);\n" +
      "  else { vec4 s = vec4(0.); for (int i = 0; i < 12; i++) { float fi = float(i) + .5, r = sqrt(fi / 12.), th = fi * 2.39996; s += textureLod(uT, clamp(v + vec2(cos(th), sin(th)) * r * uR, 0., 1.), uLod); } col = s / 12.; }\n" +
      "  o = vec4(col.rgb * uDim, col.a) * (c.x * c.y * uA); }");
    // ljusprickar i mörkret: i oskärpa blir de stora runda skivor, som lampor bakom ett motiv
    P_SPECK = program(
      "in vec2 a; uniform vec3 uC; uniform vec2 uF, uRad; out vec2 v;\n" +
      "void main(){ v = a * 2. - 1.; vec2 c = vec2(uC.x * uF.x, uC.y * uF.y) / -uC.z; gl_Position = vec4(c + v * uRad, 0., 1.); }",
      "in vec2 v; uniform vec3 uCol; out vec4 o;\n" +
      "void main(){ float d = length(v); float k = smoothstep(1., .88, d) * (.7 + .3 * smoothstep(.55, .95, d)); o = vec4(uCol * k, 0.); }");
    // hela bilden till skärmen: mörkare hörn och lite korn
    P_FINAL = program(
      "in vec2 a; out vec2 v; void main(){ v = a; gl_Position = vec4(a * 2. - 1., 0., 1.); }",
      "in vec2 v; uniform sampler2D uS; uniform float uTime; out vec4 o;\n" +
      "void main(){ vec3 c = texture(uS, v).rgb; c *= mix(.5, 1., smoothstep(.92, .3, length(v - .5)));\n" +
      "  float n = fract(sin(dot(gl_FragCoord.xy + uTime * 61., vec2(12.9898, 78.233))) * 43758.5453); o = vec4(c + (n - .5) * .03, 1.); }");
    // en regndroppe på linsen: den bryter bilden bakom (upp och ner, som en liten lins), med mörk kant och en glansfläck
    P_DROP = program(
      "in vec2 a; uniform vec2 uP, uRd; out vec2 v; void main(){ v = a * 2. - 1.; gl_Position = vec4(uP + v * uRd, 0., 1.); }",
      "in vec2 v; uniform sampler2D uS; uniform vec2 uUV, uRuv; uniform float uA; out vec4 o;\n" +
      "void main(){ float d = length(v); if (d > 1.) discard; float h = sqrt(max(0., 1. - d * d));\n" +
      "  vec3 c = texture(uS, clamp(uUV - v * uRuv * (1.3 + 1.9 * (1. - h)), 0., 1.)).rgb * mix(.4, 1.1, h);\n" +
      "  c += smoothstep(.24, 0., length(v - vec2(-.34, .4))) * .4 + smoothstep(.7, .98, d) * max(0., -v.y) * .22;\n" +
      "  float al = smoothstep(1., .9, d) * uA; o = vec4(c * al, al); }");
  } catch (e) { console.error(e); root.classList.remove("gl"); root.querySelectorAll(".stop").forEach((x) => x.remove()); return; }
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

  /* ================= texturer ================= */
  function upload(source, w, h) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { t, w, h };
  }
  const scratch = document.createElement("canvas");
  // state: 0 = inte hämtad, 1 = hämtas, 2 = klar, 3 = filen saknas
  function load(q) {
    if (q.state) return; q.state = 1;
    const im = new Image(); im.decoding = "async";
    im.onload = () => { if (q.state !== 1) return; const k = Math.min(1, MAXT / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
      scratch.width = w; scratch.height = h; scratch.getContext("2d").drawImage(im, 0, 0, w, h);
      q.tex = upload(scratch, w, h); q.ar = w / h; q.state = 2; layout(); };
    // mobilen hämtar den mindre versionen (img/1200). Saknas den tas originalet.
    const lite = touch ? q.src.replace(/^img\/([^/]+)\.\w+$/, "img/1200/$1.webp") : q.src;
    im.onerror = () => { if (im.src.indexOf("/1200/") >= 0) im.src = q.src; else q.state = 3; };
    im.src = lite;
  }
  function unload(q) { if (q.state === 2 && q.tex) gl.deleteTexture(q.tex.t); if (q.state !== 3) { q.tex = null; q.state = 0; } }
  function textTex(text) {
    const c = document.createElement("canvas"); c.width = 1536; c.height = 512; const x = c.getContext("2d");
    let size = 400; x.font = `800 ${size}px "Big Shoulders Display", "Arial Narrow", sans-serif`; const w = x.measureText(text).width; if (w > 1440) size *= 1440 / w;
    x.font = `800 ${size}px "Big Shoulders Display", "Arial Narrow", sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#e9e6df"; x.fillText(text, 768, 270);
    return upload(c, 1536, 512);
  }

  /* ================= det som hänger i rummet ================= */
  const quads = [];
  stops.forEach((s, i) => {
    if (s.kind === "photo") { const q = { i, z: -i * S, kind: "photo", src: s.p.src, ar: AR[s.p.key] || .75, state: 0, tex: null, tint: s.p.tone === "light" ? [.2, .21, .21] : [.07, .08, .08] }; s.q = q; quads.push(q); }
    else if (s.kind === "room") { const q = { i, z: -i * S, kind: "room", ar: 3, state: 0, tex: null, text: s.name.toUpperCase() }; s.q = q; quads.push(q); }
  });
  // bilden bakom rubriken: ligger en bit bakom skärpan och löses upp när man börjar scrolla
  const hero = { i: 0, z: -1.5, kind: "hero", dim: (PHOTOS[HERO] || {}).tone === "light" ? .4 : .62, src: (PHOTOS[HERO] || {}).src || "", ar: AR[HERO] || .8, state: PHOTOS[HERO] ? 0 : 3, tex: null, tint: [.05, .05, .05] }; quads.push(hero);
  const makeText = () => quads.forEach((q) => { if (q.kind === "room") { if (q.tex) gl.deleteTexture(q.tex.t); q.tex = textTex(q.text); q.state = 2; } });
  makeText(); if (document.fonts && document.fonts.load) document.fonts.load('800 100px "Big Shoulders Display"').then(makeText, () => {});

  // ljusprickarna: utspridda längs hela vägen, i gatlyktans, neonens och papprets färg
  const specks = []; { let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const cols = [[1, .66, .3], [.34, .8, .76], [.92, .9, .86], [1, .5, .2]];
    for (let i = 0; i < (touch ? 1 : 2) * N; i++) specks.push({ x: (rnd() * 2 - 1), y: (rnd() * 2 - 1), z: D - rnd() * (N * S + D), col: cols[(rnd() * cols.length) | 0], k: .35 + rnd() * .65, ph: rnd() * 6.28 }); }

  /* ================= storlek och placering ================= */
  let W = 1, H = 1, cssW = 1, cssH = 1, dpr = 1, maxDpr = touch ? 1.5 : 2, viewW = 1, viewH = 1, fbo = null, fboTex = null;
  const pos = (i) => { i = clamp(i, 0, N - 1); const s = stops[i]; if (s.kind !== "photo") return [0, 0];
    return cssW > cssH ? [(i % 2 ? 1 : -1) * viewW * (.14 + .07 * Math.sin(i * 1.7)), Math.sin(i * 1.9) * viewH * .07] : [(i % 2 ? 1 : -1) * viewW * .1, Math.sin(i * 1.9) * viewH * .1]; };
  function layout() {
    viewH = 2 * D * TAN; viewW = viewH * cssW / cssH;
    const wide = cssW > cssH;
    for (const q of quads) {
      if (q.kind === "hero") { const k = (D - q.z) / D * 1.12, vw = viewW * k, vh = viewH * k; q.w = Math.max(vw, vh * q.ar); q.h = q.w / q.ar; q.x = 0; q.y = 0; continue; }
      const fw = viewW * (q.kind === "room" ? .84 : wide ? .7 : .88), fh = viewH * (q.kind === "room" ? .4 : wide ? .72 : .58);
      q.h = Math.min(fh, fw / q.ar); q.w = q.h * q.ar; const p = pos(q.i); q.x = p[0]; q.y = p[1];
    }
  }
  function resize() {
    cssW = canvas.clientWidth || innerWidth; cssH = canvas.clientHeight || innerHeight; dpr = Math.min(devicePixelRatio || 1, maxDpr);
    W = Math.max(2, Math.round(cssW * dpr)); H = Math.max(2, Math.round(cssH * dpr)); canvas.width = W; canvas.height = H;
    if (fboTex) gl.deleteTexture(fboTex); if (!fbo) fbo = gl.createFramebuffer();
    fboTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, fboTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    layout();
  }
  addEventListener("resize", resize); resize();

  /* ================= regnet på linsen ================= */
  const drops = [], MAXDROPS = touch ? 8 : 14;
  function rain(dt) {
    if (drops.length < MAXDROPS && Math.random() < dt * (drops.length < 6 ? 5 : 1.1)) drops.push({ x: Math.random(), y: Math.random() * .92, r: .012 + Math.pow(Math.random(), 2.2) * .038, a: 0, vy: 0, wait: 2 + Math.random() * 9, dead: false });
    const unit = Math.min(cssW, cssH);
    for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i];
      d.a = clamp(d.a + (d.dead ? -dt * 7 : dt * 4), 0, 1); if (d.dead && d.a <= 0) { drops.splice(i, 1); continue; }
      if (d.r > .026) { d.wait -= dt; if (d.wait < 0) { d.vy = Math.min(.5, d.vy + dt * (.12 + d.r * 4)); d.y += d.vy * dt * (.6 + .4 * Math.sin(d.y * 40 + d.x * 9)); if (d.wait < -1.2 - d.r * 30 && d.vy > .2 && Math.random() < dt * 1.5) { d.wait = .6 + Math.random() * 3; d.vy = 0; } } }
      if (d.y > 1.1) { drops.splice(i, 1); continue; }
      for (let j = drops.length - 1; j >= 0; j--) { const e = drops[j]; if (e === d || e.dead || d.dead || e.r > d.r) continue; // en större droppe sväljer en mindre
        const dx = (e.x - d.x) * cssW, dy = (e.y - d.y) * cssH; if (dx * dx + dy * dy < Math.pow((d.r + e.r) * unit * .85, 2)) { d.r = Math.min(.06, Math.sqrt(d.r * d.r + e.r * e.r)); e.dead = true; e.a = Math.min(e.a, .3); } }
    }
  }
  // torka linsen: dropparna under fingret eller muspekaren försvinner
  function wipe(cx, cy) { const unit = Math.min(cssW, cssH); for (const d of drops) { const dx = d.x * cssW - cx, dy = d.y * cssH - cy, r = d.r * unit + (touch ? 34 : 26); if (dx * dx + dy * dy < r * r) d.dead = true; } }
  let mx = 0, my = 0;
  const top = () => canvas.getBoundingClientRect().top; // scenen rullar bort när man går vidare ner på sidan
  addEventListener("pointermove", (e) => { if (!active) return; const y = e.clientY - top(); if (e.pointerType === "mouse" && !touch) { mx = e.clientX / cssW * 2 - 1; my = y / cssH * 2 - 1; } wipe(e.clientX, y); }, { passive: true });
  addEventListener("pointerdown", (e) => { if (active) wipe(e.clientX, e.clientY - top()); }, { passive: true });
  addEventListener("touchmove", (e) => { if (active) for (const t of e.touches) wipe(t.clientX, t.clientY - top()); }, { passive: true });

  /* ================= ljud: slutarens klick (bara om besökaren slår på det) ================= */
  let actx = null, soundOn = false;
  if ($("sound")) $("sound").addEventListener("click", (e) => { soundOn = !soundOn; e.currentTarget.setAttribute("aria-pressed", String(soundOn)); e.currentTarget.textContent = soundOn ? "Ljud på" : "Ljud av";
    if (soundOn) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); click(); } catch (err) { soundOn = false; } } });
  function click() {
    if (!soundOn || !actx) return; const t0 = actx.currentTime;
    for (const [at, len, freq, vol] of [[0, .028, 3200, .5], [.07, .04, 1500, .4]]) { const n = Math.round(actx.sampleRate * len), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.5);
      const src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(); src.buffer = buf; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = .9; g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(actx.destination); src.start(t0 + at); }
  }

  /* ================= texten runt bilden ================= */
  const reticle = $("reticle"), cap = $("cap"), shutter = $("shutter"), scale = $("scale"), view = $("view");
  const intro = root.querySelector(".intro"), stopH = () => intro.offsetHeight || innerHeight;
  const rootTop = () => root.getBoundingClientRect().top + scrollY;
  const goTo = (i) => scrollTo({ top: rootTop() + i * stopH(), behavior: still ? "auto" : "smooth" });
  // skärpeskalan
  const roomBtns = []; let mark;
  { stops.forEach((s, i) => { const y = i / (N - 1) * 100 + "%";
      if (s.kind === "room") { const b = document.createElement("button"); b.type = "button"; b.style.top = y; const sp = document.createElement("span"); sp.textContent = s.name; b.append(sp); b.setAttribute("aria-label", s.name);
        b.addEventListener("click", () => goTo(i)); scale.append(b); roomBtns.push({ b, i }); }
      else { const t = document.createElement("i"); t.className = "tick"; t.style.top = y; scale.append(t); } });
    mark = document.createElement("i"); mark.className = "mark"; scale.append(mark); }
  let cur = -1, shownOpacity = -1, wasLock = false;
  function caption(i) {
    const s = stops[i]; $("capOpen").hidden = true; $("capAll").hidden = true;
    if (s.kind === "photo") { $("capT").textContent = s.p.title; $("capE").textContent = s.room + ", bild " + (s.k + 1) + " av " + s.n; $("capOpen").hidden = false; }
    else if (s.kind === "room") { $("capT").textContent = ""; $("capE").textContent = s.count + " bilder"; const a = $("capAll"); a.hidden = false; a.textContent = "Se alla i " + s.name; a.href = "#bilder-" + s.id; }
    else { $("capT").textContent = ""; $("capE").textContent = ""; }
    let room = -1; for (const r of roomBtns) if (r.i <= i) room = r.i; roomBtns.forEach((r) => r.b.classList.toggle("on", r.i === room));
  }
  function fire() { if (!still) { shutter.classList.remove("fire"); void shutter.offsetWidth; shutter.classList.add("fire"); } click(); }

  // bilden i full storlek: samma visning som galleriet längre ner (window.visaBild i index.html), och man bläddrar bland bilderna i Sökaren
  function openView(s) { const list = journey.map((x) => x.p), i = list.indexOf(s.p); if (i >= 0 && window.visaBild) window.visaBild(list, i); }
  $("capOpen").addEventListener("click", () => { if (cur >= 0 && stops[cur].kind === "photo") openView(stops[cur]); });
  canvas.addEventListener("click", () => { if (cur >= 0 && wasLock && stops[cur].kind === "photo") openView(stops[cur]); });

  // scrollen fäster vid varje bild, men bara här uppe. Länkar längre ner på sidan (Om, Kontakt …) ska inte fastna på vägen.
  const html = document.documentElement; let free = 0;
  document.addEventListener("click", (e) => { const a = e.target.closest('a[href^="#"]'); if (a && !root.contains(a)) { free = performance.now() + 1500; html.classList.remove("sok-snap"); } }, true);

  /* ================= bildrutan ================= */
  let tS = clamp((scrollY - rootTop()) / stopH(), 0, N - 1), active = true, last = performance.now(), pmx = 0, pmy = 0, ema = 16, slowFor = 0;
  const order = [];
  function frame(now) {
    if (dead) return;
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    const H0 = stopH(), rel = scrollY - rootTop(), end = (N - 1) * H0;
    html.classList.toggle("sok-snap", !still && rel < end + H0 - 2 && now > free);
    active = rel < end + H0 + 4; // scenen syns: annars ritas ingenting
    if (!active) return;
    ema += (dt * 1000 - ema) * .05; if (ema > 36 && dpr > 1) { slowFor += dt; if (slowFor > 2) { maxDpr = 1; slowFor = 0; resize(); } } else slowFor = 0; // hackar det: rita i lägre upplösning
    // scrollen stannar upp vid varje bild: runt ett stopp står kameran still (HOLD), och rör sig bara i mellanrummet
    const raw = clamp(rel / H0, 0, N - 1), stop = Math.round(raw), d = raw - stop, t = stop + Math.sign(d) * .5 * sstep(HOLD, .5, Math.abs(d));
    tS = still ? t : tS + (t - tS) * (1 - Math.exp(-dt * 7));
    pmx += (mx - pmx) * (1 - Math.exp(-dt * 3)); pmy += (my - pmy) * (1 - Math.exp(-dt * 3));

    // texten: vilket stopp, och är det skarpt?
    const near = clamp(Math.round(tS), 0, N - 1), off = Math.abs(tS - near), lock = 1 - sstep(.04, .22, off), s = stops[near];
    if (near !== cur) { const before = cur; cur = near; caption(near); if (before >= 0 && s.kind !== "intro") fire(); } // slutaren går mellan bilderna
    const isLock = lock > .6 && (s.kind === "photo" || s.kind === "room");
    if (isLock !== wasLock || reticle.dataset.k !== s.kind) { wasLock = isLock; reticle.dataset.k = s.kind; reticle.classList.toggle("lock", isLock && s.kind === "photo"); reticle.classList.toggle("off", s.kind !== "photo");
      stage.classList.toggle("sharp", isLock && s.kind === "photo"); }
    const op = s.kind === "intro" ? 0 : Math.round(lock * 20) / 20; if (op !== shownOpacity) { shownOpacity = op; cap.style.opacity = op; cap.style.visibility = op ? "visible" : "hidden"; }
    mark.style.top = tS / (N - 1) * 100 + "%";

    // hämta bilderna runt omkring, och släpp dem som ligger långt bort
    for (const q of quads) { if (q.kind === "room") continue; const d = q.i - tS; if (d > -2.5 && d < 4.5) load(q); else if ((d < -6 || d > 8) && q.state === 2) unload(q); }

    // kameran: åker framåt genom rummet och följer bilderna i sidled, med lite handhållen rörelse
    const i0 = Math.floor(tS), f = tS - i0, e = f * f * (3 - 2 * f), a = pos(i0), b = pos(i0 + 1);
    const sway = still ? 0 : 1, cx = mix(a[0], b[0], e) + pmx * viewW * .028 + Math.sin(now * .0006) * .03 * sway, cy = mix(a[1], b[1], e) - pmy * viewH * .025 + Math.sin(now * .00047 + 1) * .02 * sway, cz = -tS * S + D;
    const fy = 1 / TAN, fx = fy * cssH / cssW;

    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null); // skärmbilden får inte vara bunden medan vi ritar till den
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, W, H); gl.clearColor(.027, .035, .035, 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.enable(gl.BLEND);
    order.length = 0;
    for (const q of quads) { const dist = cz - q.z; if (dist < .45 || dist > D + 3.3 * S || q.state === 3) continue; order.push({ dist, q }); }
    for (const sp of specks) { const dist = cz - sp.z; if (dist < .7 || dist > D + 3 * S) continue; order.push({ dist, sp }); }
    order.sort((u, v) => v.dist - u.dist);
    let prog = null;
    for (const it of order) {
      const dist = it.dist, coc = K * H * Math.max(0, Math.abs(dist - D) - .04) / dist;
      if (it.q) { const q = it.q, U = P_QUAD.u;
        if (prog !== P_QUAD) { prog = P_QUAD; gl.useProgram(prog.p); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.uniform2f(U.uF, fx, fy); gl.uniform1i(U.uT, 0); }
        const sh = q.h / (2 * dist * TAN) * H, sw = sh * q.w / q.h, blur = coc > .6 ? coc : 0, has = q.state === 2 && q.tex;
        let alpha = sstep(1.5, 3., dist) * (1 - sstep(D + 2.6 * S, D + 3.2 * S, dist)), dim = Math.exp(-Math.max(0, dist - D) * .11);
        if (q.kind === "hero") { alpha *= 1 - sstep(.15, .8, tS); dim *= q.dim; }
        if (q.kind === "room") alpha *= .96;
        if (alpha <= .003) continue;
        gl.uniform3f(U.uC, q.x - cx, q.y - cy, -dist); gl.uniform2f(U.uSize, q.w, q.h); gl.uniform2f(U.uR, blur / sw, blur / sh); gl.uniform2f(U.uPx, 1 / sw, 1 / sh);
        gl.uniform1f(U.uA, alpha); gl.uniform1f(U.uDim, dim); gl.uniform1f(U.uBlur, blur ? 1 : 0); gl.uniform1f(U.uHas, has ? 1 : 0);
        if (has) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, q.tex.t); gl.uniform1f(U.uLod, Math.max(0, Math.log2(q.tex.w / sw), Math.log2(Math.max(1, blur * q.tex.w / sw * .5)))); }
        else { if (q.kind === "room") continue; gl.uniform3f(U.uTint, q.tint[0], q.tint[1], q.tint[2]); }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } else { const sp = it.sp, U = P_SPECK.u;
        if (prog !== P_SPECK) { prog = P_SPECK; gl.useProgram(prog.p); gl.blendFunc(gl.ONE, gl.ONE); gl.uniform2f(U.uF, fx, fy); }
        const rad = Math.max(1.6 * dpr, coc * .9), k = sp.k * clamp(5 * dpr / rad, .05, 1) * sstep(.7, 1.6, dist) * (.75 + .25 * Math.sin(now * .001 + sp.ph)) * .8;
        gl.uniform3f(U.uC, sp.x * viewW * 1.25 - cx, sp.y * viewH * .8 - cy, -dist); gl.uniform2f(U.uRad, rad * 2 / W, rad * 2 / H); gl.uniform3f(U.uCol, sp.col[0] * k, sp.col[1] * k, sp.col[2] * k);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
    }

    // till skärmen, och dropparna ovanpå
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); gl.disable(gl.BLEND);
    gl.useProgram(P_FINAL.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fboTex); gl.uniform1i(P_FINAL.u.uS, 0); gl.uniform1f(P_FINAL.u.uTime, still ? 0 : (now % 1000) / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (RAIN) { rain(dt); const U = P_DROP.u, unit = Math.min(cssW, cssH);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.useProgram(P_DROP.p); gl.uniform1i(U.uS, 0);
      for (const d of drops) { const px = d.r * unit * (.6 + .4 * d.a);
        gl.uniform2f(U.uP, d.x * 2 - 1, 1 - d.y * 2); gl.uniform2f(U.uRd, px * 2 / cssW, px * 2.15 / cssH); gl.uniform2f(U.uUV, d.x, 1 - d.y); gl.uniform2f(U.uRuv, px / cssW, px / cssH); gl.uniform1f(U.uA, d.a);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); } }
  }
  requestAnimationFrame(frame);
  window.__sokaren = { stops, quads, drops, get t() { return tS; } }; // för felsökning i konsolen
})();
