// Ljusmotorn och rummens form, ljus och fotoplatser (bakas när rummet laddas).
/*BAKE-START*/
/* ================= gemensam ljusmotor =================
   Varje rum beskriver sin form som ett avståndsfält (SDF), sitt ljus och sina fotoplatser.
   Ljus och skuggor räknas ut när rummet laddas och läggs i ljuskartor. */
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function sstep(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function sdBox(x, y, z, b) { const qx = Math.abs(x - b.c[0]) - b.h[0], qy = Math.abs(y - b.c[1]) - b.h[1], qz = Math.abs(z - b.c[2]) - b.h[2];
  const mx = Math.max(qx, 0), my = Math.max(qy, 0), mz = Math.max(qz, 0); return Math.sqrt(mx * mx + my * my + mz * mz) + Math.min(Math.max(qx, qy, qz), 0); }
let OBJ = [], LIGHTS = [], SOLIDS = [], SDF = () => 99, AMBF = () => [0, 0, 0];

function objSDF(x, y, z, ex) {
  let d = 1e9;
  for (let i = 0; i < SOLIDS.length; i++) { const v = sdBox(x, y, z, SOLIDS[i]); if (v < d) d = v; }
  for (let i = 0; i < OBJ.length; i++) { const o = OBJ[i]; if (o.id === ex) continue; const v = sdBox(x, y, z, o); if (v < d) d = v; }
  return d;
}
function aoAt(px, py, pz, nx, ny, nz, ex) {
  let occ = 0, sca = 1;
  for (let i = 0; i < 5; i++) {
    const h = .05 + .16 * i, x = px + nx * h, y = py + ny * h, z = pz + nz * h;
    const d = Math.min(SDF(x, y, z), objSDF(x, y, z, ex));
    occ += (h - d) * sca; sca *= .78;
  }
  return clamp(1 - 1.6 * occ, .08, 1);
}
function softShadow(ox, oy, oz, dx, dy, dz, maxT, ex, k) {
  let res = 1, t = .03;
  for (let i = 0; i < 48 && t < maxT - .05; i++) {
    const h = objSDF(ox + dx * t, oy + dy * t, oz + dz * t, ex);
    if (h < .0015) return 0;
    res = Math.min(res, k * h / t);
    t += clamp(h, .012, .45);
  }
  return clamp(res, 0, 1);
}
// spot: kägla mot en punkt. target = önskad belysningsstyrka i siktpunkten. fx: armatur ("none", "head" eller stång upp i taket)
function addSpot(p, t, angle, target, col, opts) {
  opts = opts || {};
  let dx = t[0] - p[0], dy = t[1] - p[1], dz = t[2] - p[2]; const dist = Math.sqrt(dx * dx + dy * dy + dz * dz); dx /= dist; dy /= dist; dz /= dist;
  LIGHTS.push({ type: "spot", p, d: [dx, dy, dz], cosO: Math.cos(angle), cosI: Math.cos(angle * (opts.hard === false ? .55 : .86)), I: target * dist * dist, col,
    shadow: opts.shadow !== false, k: opts.k || 18, range: dist * 2.6, bp: t, b: (opts.bounce === undefined ? .15 : opts.bounce) * target, fx: opts.fx, noDust: opts.noDust, only: opts.only });
}
function addTube(p, len, I, col, opts) { opts = opts || {}; for (const o of [-.4, 0, .4]) LIGHTS.push({ type: "tube", p: [p[0], p[1], p[2] + o * len], I: I / 3, col, shadow: false, range: 11, bp: [p[0], 0, p[2] + o * len], b: I * .012, only: opts.only }); }
function addPoint(p, I, col, range, bounce, opts) { opts = opts || {}; LIGHTS.push({ type: "point", p, I, col, shadow: false, range, bp: p, b: bounce || 0, only: opts.only }); }
function addSky(p, I, col, range, only) { LIGHTS.push({ type: "sky", p, I, col, shadow: false, range, b: 0, only }); }
function addSun(d, I, col, gate, top, opts) { opts = opts || {}; const l = Math.hypot(d[0], d[1], d[2]); LIGHTS.push({ type: "sun", d: [d[0] / l, d[1] / l, d[2] / l], I, col, gate, top, shadow: opts.shadow !== false, k: opts.k || 40, b: 0, only: opts.only }); }
function addFill(p, b, col, only) { LIGHTS.push({ type: "fill", bp: p, b, col, only }); }
function addPanel(p, n, I, col, range, only) { LIGHTS.push({ type: "panel", p, n, I, col, shadow: false, range, b: 0, only }); }

function shade(px, py, pz, nx, ny, nz, ex) {
  const ao = aoAt(px, py, pz, nx, ny, nz, ex), A = AMBF(px, py, pz);
  let r = A[0] * ao, g = A[1] * ao, b = A[2] * ao;
  for (let i = 0; i < LIGHTS.length; i++) {
    const L = LIGHTS[i];
    if (L.only && !L.only(px, py, pz)) continue;
    let e = 0;
    if (L.type === "sun") {
      const ndl = nx * L.d[0] + ny * L.d[1] + nz * L.d[2];
      if (ndl > 0 && py < L.top) { let gv = L.gate(px, py, pz); if (gv > 0 && L.shadow) gv *= softShadow(px + nx * .025, py + ny * .025, pz + nz * .025, L.d[0], L.d[1], L.d[2], (L.top - py) / L.d[1], ex, L.k); e = L.I * ndl * gv; }
    } else if (L.type !== "fill") {
      let lx = L.p[0] - px, ly = L.p[1] - py, lz = L.p[2] - pz; const d2 = lx * lx + ly * ly + lz * lz, d = Math.sqrt(d2);
      if (d < L.range) {
        lx /= d; ly /= d; lz /= d;
        const ndl = nx * lx + ny * ly + nz * lz;
        if (ndl > 0) {
          let f = L.I / (d2 + .04);
          const q = d / L.range, w = 1 - q * q * q * q; f *= w * w;
          if (L.type === "spot") { const c = -(lx * L.d[0] + ly * L.d[1] + lz * L.d[2]); f = c <= L.cosO ? 0 : f * sstep(L.cosO, L.cosI, c); }
          else if (L.type === "tube") f *= .18 + .82 * Math.max(0, ly);
          else if (L.type === "sky") f *= Math.max(0, ly);
          else if (L.type === "panel") f *= Math.max(0, -(lx * L.n[0] + ly * L.n[1] + lz * L.n[2]));
          if (f > 1e-4 && L.shadow) f *= softShadow(px + nx * .025, py + ny * .025, pz + nz * .025, lx, ly, lz, d, ex, L.k);
          e = f * ndl;
        }
      }
    }
    if (L.b) { const bx = L.bp[0] - px, by = L.bp[1] - py, bz = L.bp[2] - pz; e += L.b * ao / (1 + (bx * bx + by * by + bz * bz) * .45); }
    if (e > 0) { r += e * L.col[0]; g += e * L.col[1]; b += e * L.col[2]; }
  }
  return [r, g, b];
}
const COL = { spot: [1, .93, .82], petrol: [.22, .78, .72], sodium: [1, .58, .18], red: [1, .06, .04], warm: [1, .72, .42],
  sky: [.66, .78, 1], sun: [1, .9, .74], rain: [.78, .85, .95], day: [.92, .94, .98], tung: [1, .6, .28], amber: [1, .5, .2] };

/* ================= tavelplatser ================= */
// en tavla på en vägg: C = mitten, N = väggens normal, size = höjd (eller bredd med wide), spotlight snett ovanför
function wslot(key, C, N, size, o) {
  o = o || {}; const d = o.d || 1.6, y = o.ly || C[1] + 2.2;
  const sp = { p: [C[0] + N[0] * d, y, C[2] + N[2] * d], t: C, a: o.a || .42, T: o.T || 1.7, o: o.only ? { only: o.only } : undefined };
  if (o.col) sp.col = o.col;
  return Object.assign({ key, C, U: [N[2], 0, -N[0]], N, spots: [sp] }, o.wide ? { w: size } : { h: size });
}
// fristående skivor: ax "z" = bilderna vetter mot ±z, ax "x" = mot ±x. keys = [framsidan (+), baksidan (−)]
const STANDS = {
  staden: [
    { x: -4.85, z: -5.5, w: 2.3, h: 3.0, t: .2, ax: "z", keys: ["over-soder", "sno-pa-soder"] },
    { x: -4.85, z: -11.5, w: 2.3, h: 3.0, t: .2, ax: "z", keys: ["granden", "valvet"] },
    { x: -4.85, z: -17.5, w: 2.3, h: 3.0, t: .2, ax: "z", keys: ["ljusstrimman", "nattvagnen"] },
    { x: 1.7, z: -3.8, w: 2.1, h: 2.6, t: .2, ax: "z", keys: ["manhattan", "neonregn"] },
    { x: 4.45, z: -15.6, w: 2.1, h: 2.6, t: .2, ax: "x", keys: [null, "taget"] }], // vid glaset med kanten mot ingången, så att kortväggen syns
  naturen: [
    { x: -4.9, z: -7.8, w: 2.2, h: 2.8, t: .16, ax: "z", keys: ["solnedgangen", "atlantkusten"] },
    { x: 4.9, z: -12.5, w: 2.2, h: 2.8, t: .16, ax: "z", keys: ["fonstervy", "bordet"] }],
  berattelser: []
};
function standSlots(room, size, o) {
  const out = [];
  for (const s of STANDS[room]) for (const sg of [1, -1]) {
    const N = s.ax === "z" ? [0, 0, sg] : [sg, 0, 0], C = s.ax === "z" ? [s.x, 1.85, s.z + sg * s.t / 2] : [s.x + sg * s.t / 2, 1.85, s.z];
    const key = s.keys[sg > 0 ? 0 : 1]; if (!key) continue; // en sida utan bild
    const sl = wslot(key, C, N, size, o); sl.maxW = s.w - .7; sl.labelBelow = true; out.push(sl);
  }
  return out;
}

/* ================= 01 STADEN =================
   Ett råare rum mitt i stan: putsen har släppt så att teglet syns, betong i golv, tak, balkar och pelare.
   Hela östra långväggen är industriglas från taket ner till en låg betongbröstning, och utanför ligger staden i dagsljus.
   En liten ståltrappa med fyra steg leder upp till en dörr vidare.
   x: tvärs (väggarna x=±6, glaset x=+6), z: längs (ingången z=0, bortre väggen z=-22), takhöjd 5,4 m. */
const GATA = !/[?&]utangata/.test(location.search); // gatan utanför foajén och entrén från gatan (?utangata visar den gamla dagsljusfoajén)
const REGN = !/[?&]sol/.test(location.search); // det regnar utanför alla fönster (?sol visar soligt väder)
// mulet regnväder: hur starkt himlaljuset in genom fönstren är i varje rum (ersätter solen)
const MULEN = { naturen: 1.7, berattelser: 1.6, manniskorna: 1.35 };
const CV = { X: 6, L: 22, H: 5.4, PIL: [[-2.9, -7.3], [2.9, -7.3], [-2.9, -14.6], [2.9, -14.6]], PW: .56,
  WIN: { y0: 1.1, y1: 5.25, PZ: 1.1 }, ST: { x: 0, z0: -20.1, run: .3, rise: .18 }, DOOR: { x: 0, w: 1.05, h: 2.15 },
  NEON: { x: 5.55, z: -11, w: 3.4, h: .95 }, LAMPS: [-4.2, -17.6] };
CV.WIN.PY = (CV.WIN.y1 - CV.WIN.y0) / 5;
const SUNC = (() => { const v = [.72, .56, .28], l = Math.hypot(...v); return v.map((c) => c / l); })(); // mot solen, utanför glasväggen
function stadenSDF(x, y, z) {
  let d = Math.min(x + CV.X, CV.X - x, y, CV.H - y, z + CV.L, -z);
  for (const [px, pz] of CV.PIL) d = Math.min(d, Math.max(Math.abs(x - px), Math.abs(z - pz)) - CV.PW / 2);
  return d;
}
// släpper glasväggen igenom solen här? Stålspröjsarna kastar ett rutnät av skuggor på golvet.
function cvSunGate(px, py, pz) {
  if (px >= CV.X - .01) return 0;
  const W = CV.WIN, t = (CV.X - px) / SUNC[0], hy = py + SUNC[1] * t, hz = pz + SUNC[2] * t;
  const m = Math.min(hy - W.y0, W.y1 - hy, -.15 - hz, hz + CV.L - .15); if (m <= 0) return 0;
  const fy = (hy - W.y0) / W.PY, fz = -hz / W.PZ;
  return sstep(0, .05, m) * sstep(.025, .05, Math.min(Math.abs(fy - Math.round(fy)) * W.PY, Math.abs(fz - Math.round(fz)) * W.PZ)) * .92;
}
function stadenLights() {
  const inRoom = (x, y, z) => z < .05;
  if (!REGN) addSun(SUNC, 3.0, COL.sun, cvSunGate, CV.H, { k: 50, only: inRoom });
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) addPanel([CV.X - .05, 2.1 + j * 2.1, -1.8 - i * 3.7], [-1, 0, 0], REGN ? 1.25 : 1.05, REGN ? [.78, .85, .95] : COL.sky, 24, inRoom); // regn: bara grått, svalt dagsljus
  if (!REGN) for (let i = 0; i < 3; i++) { const z = -3.5 - i * 7.2, t = 3.2 / SUNC[1]; addFill([CV.X - SUNC[0] * t, .3, z - SUNC[2] * t], .5, COL.sun, inRoom); }
  for (const z of CV.LAMPS) addPoint([-1.6, 3.4, z], .5, [1, .74, .44], 7, .03);                 // två burlampor
  addPoint([CV.DOOR.x, 1.9, -21.6], .45, [.8, .9, 1], 4, .02);                                  // ljus genom dörren på glänt
  addPoint([0, 1.4, 1.2], .3, [1, .8, .55], 4, .01);                                             // ljus från foajén
}
function stadenSlots() {
  const out = [], H = CV.H, o = { ly: H - .55, a: .42, T: 1.9 };
  [["perrongen", -1.7], ["telefonen", -3.9], ["trappan", -7.3], ["vantan", -9.7], ["rulltrappan", -13.3], ["grottan", -15.7], ["spetsen", -19.75]]
    .forEach(([k, z]) => out.push(wslot(k, [-6, 1.65, z], [1, 0, 0], 1.25, o)));
  // Norrtull, natt stort på bortre väggen till vänster om dörren, som en spegling av järnvägstunneln: slutpunkten man ser genom hela rummet
  out.push({ key: "norrtull-natt", C: [-3.35, 2.2, -22], U: [1, 0, 0], N: [0, 0, 1], h: 3.3,
    spots: [-.7, .7].map((dx) => ({ p: [-3.35 + dx, H - .55, -19.6], t: [-3.35 + dx * .5, 2.2, -22], a: .4, T: 1.7 })) });
  // järnvägstunneln stor på bortre väggen, till höger om dörren, med två spotlights
  out.push({ key: "tunneln", C: [3.35, 2.0, -22], U: [1, 0, 0], N: [0, 0, 1], w: 4.0, spots: [-1.1, 1.1].map((dx) => ({ p: [3.35 + dx, H - .55, -19.6], t: [3.35 + dx, 2.0, -22], a: .44, T: 1.6 })) });
  out.push(wslot("skyline-dis", [-3.5, 1.65, 0], [0, 0, -1], 1.25, o), wslot("vagnen", [3.5, 1.65, 0], [0, 0, -1], 1.25, o));
  return out.concat(standSlots("staden", 1.2, { ly: H - .55, d: 1.5, a: .44, T: 1.8 }));
}

/* ================= 02 NATUREN =================
   Ljus vit hall 12 × 20 m, 7 m i tak, två takfönster. In genom en mörk korridor (z 0…4.5). */
const NAT = { X: 6, L: 20, H: 7, TOP: 7.8, PX: 1, PZ: 1.5, CW: 1.1, CL: 4.5, CH: 2.8,
  SK: [{ x0: -3.5, x1: 3.5, z0: -8.5, z1: -4 }, { x0: -3.5, x1: 3.5, z0: -16, z1: -11.5 }] };
const SUN = (() => { const v = [-.3, .86, .42], l = Math.hypot(...v); return v.map((c) => c / l); })();
function natSlots() {
  const X = NAT.X, L = NAT.L, o = { d: 1.9, ly: 4.4, a: .4, T: 1.7, only: (x, y, z) => z < .05 };
  return [wslot("korsbarsblom", [-X, 1.8, -10], [1, 0, 0], 1.6, o), wslot("hagen", [X, 1.8, -3.6], [-1, 0, 0], 1.6, o), wslot("spegeln", [X, 1.8, -14], [-1, 0, 0], 1.4, o),
    wslot("pionerna", [-3.3, 1.7, 0], [0, 0, -1], 1.2, o), wslot("hosteld", [3.3, 1.7, 0], [0, 0, -1], 1.4, o),
    wslot("fran-ovan", [-4.6, 1.8, -L], [0, 0, 1], 1.4, o), wslot("piren", [4.6, 1.8, -L], [0, 0, 1], 1.4, o)].concat(standSlots("naturen", 1.25, o));
}
function naturenSDF(x, y, z) {
  if (z > 0) return Math.min(x + NAT.CW, NAT.CW - x, y, NAT.CH - y, NAT.CL - z);
  let d = Math.min(x + NAT.X, NAT.X - x, y, z + NAT.L);
  if (!(Math.abs(x) < NAT.CW && y < NAT.CH)) d = Math.min(d, -z);
  let sk = null; for (const s of NAT.SK) if (x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1) sk = s;
  if (sk) { d = Math.min(d, NAT.TOP - y); if (y > NAT.H) d = Math.min(d, x - sk.x0, sk.x1 - x, z - sk.z0, sk.z1 - z); }
  else d = Math.min(d, NAT.H - y);
  return d;
}
// släpper takfönstren igenom solen här? (mjuk kant, spröjsen ger skuggränder)
function sunGate(px, py, pz) {
  let best = 0;
  for (const s of NAT.SK) {
    let v = 1;
    for (const Y of [NAT.H, NAT.TOP]) {
      if (py >= Y) continue;
      const t = (Y - py) / SUN[1], hx = px + SUN[0] * t, hz = pz + SUN[2] * t;
      v *= sstep(0, .05, Math.min(hx - s.x0, s.x1 - hx, hz - s.z0, s.z1 - hz));
      if (Y === NAT.TOP && v > 0) { const fx = (hx - s.x0) / NAT.PX, fz = (hz - s.z0) / NAT.PZ;
        v *= sstep(.035, .06, Math.min(Math.abs(fx - Math.round(fx)) * NAT.PX, Math.abs(fz - Math.round(fz)) * NAT.PZ)); }
    }
    if (v > best) best = v;
  }
  return best;
}
function naturenLights() {
  const inRoom = (x, y, z) => z < .05;
  if (!REGN) addSun(SUN, 3.0, COL.sun, sunGate, NAT.H, { only: inRoom, k: 60 });
  for (const s of NAT.SK) {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) addSky([s.x0 + (i + .5) * (s.x1 - s.x0) / 4, NAT.TOP - .15, s.z0 + (j + .5) * (s.z1 - s.z0) / 3], REGN ? .8 * MULEN.naturen : .8, REGN ? COL.rain : COL.sky, REGN ? 22 : 18, inRoom);
    if (REGN) addFill([(s.x0 + s.x1) / 2, .3, (s.z0 + s.z1) / 2], .3, COL.rain, inRoom); // mjukt återkast från golvet under takfönstret
    else { const k = NAT.H / SUN[1]; addFill([(s.x0 + s.x1) / 2 - SUN[0] * k, .3, (s.z0 + s.z1) / 2 - SUN[2] * k], .6, COL.sun, inRoom); }
  }
  addTube([0, 2.68, 3.6], 1.0, .6, COL.petrol, { only: (x, y, z) => z > -.3 });
  addSpot([0, 2.5, -1.4], [0, 0, 2.4], .6, .3, COL.day, { hard: false, shadow: false, bounce: .04, fx: "none", noDust: true, only: (x, y, z) => z > -.2 });
}

/* ================= 03 BERÄTTELSER =================
   Nedgången industrihall 14 × 22 m, 8,5 m i tak. Höga fabriksfönster i väster, trasiga takljus längs mitten.
   Ingångskorridor z 0…5 (x 2.8…5.2). */
const HAL = { X: 7, L: 22, H: 8.5, TOP: 9.1, WX: -7, PY: 5.2 / 6, PZ: .9, CX0: 2.8, CX1: 5.2, CL: 5, CH: 3.0,
  FW: { z0: -12.4, z1: -8.6, h: 3.4 }, BENCH: [-7, -16], LAMPY: 3.3,
  WIN: [{ id: 0, z0: -5.8, z1: -2.2, y0: 2.2, y1: 7.4 }, { id: 1, z0: -11.8, z1: -8.2, y0: 2.2, y1: 7.4 }, { id: 2, z0: -17.8, z1: -14.2, y0: 2.2, y1: 7.4 }],
  SKY: [{ x0: -1.2, x1: 1.2, z0: -8.5, z1: -3 }, { x0: -1.2, x1: 1.2, z0: -18.5, z1: -13 }],
  boarded: new Set(["0:4:1", "0:5:1", "0:5:2", "1:0:3", "1:1:3", "2:3:0", "2:4:0", "2:5:2", "2:2:2"]) };
const SUNH = (() => { const v = [-.62, .55, .2], l = Math.hypot(...v); return v.map((c) => c / l); })();
// tavelplatser: två på den fristående väggen, två på östra väggen och två på var sida om pojken
function halSlots() {
  const X = HAL.X, L = HAL.L, inR = { only: (x, y, z) => z < .05 }, out = [], ho = { d: 2.2, ly: 4.6, a: .38, T: 1.6, only: inR.only };
  // den fristående väggen mitt i hallen: två bilder på varje sida
  for (const sx of [1, -1]) for (const [z, k] of (sx > 0 ? [[-9.6, "strangarna"], [-11.4, "utsikten"]] : [[-9.6, "kedjan"], [-11.4, "bonen"]]))
    out.push(wslot(k, [sx * .13, 1.75, z], [sx, 0, 0], 1.45, ho));
  out.push(wslot("kvallen", [X, 2.0, -4.5], [-1, 0, 0], 2.6, Object.assign({ wide: true, ly: 6 }, ho)), wslot("taggen", [X, 2.0, -15.6], [-1, 0, 0], 2.6, Object.assign({ wide: true, ly: 6 }, ho)));
  out.push(wslot("nummer79", [-3.5, 1.9, -L], [0, 0, 1], 1.9, Object.assign({ ly: 5.5, d: 2.6 }, ho)), wslot("trapporna", [3.4, 1.9, -L], [0, 0, 1], 1.9, Object.assign({ ly: 5.5, d: 2.6 }, ho)));
  // västra väggen mellan fönstren, ingångsväggen och östra väggen
  [["katten", -1.1], ["tvatten", -7.0], ["gangtunneln", -13.0], ["uppgangen", -19.9]].forEach(([k, z]) => out.push(wslot(k, [-X, 1.65, z], [1, 0, 0], 1.5, ho)));
  out.push(wslot("vakten", [-5.0, 1.65, 0], [0, 0, -1], 1.5, ho), wslot("grodden", [-2.4, 1.65, 0], [0, 0, -1], 1.4, ho));
  out.push(wslot("balkongerna", [X, 1.65, -7.3], [-1, 0, 0], 1.5, ho));
  // hörnen och ingångsväggen
  out.push(wslot("pickupen", [X, 1.65, -1.6], [-1, 0, 0], 1.5, ho), wslot("porten", [.3, 1.65, 0], [0, 0, -1], 1.5, ho));
  out.push(wslot("uppfor", [-5.3, 1.75, -L], [0, 0, 1], 1.5, Object.assign({ ly: 5.5, d: 2.6 }, ho)), wslot("pinnen", [5.3, 1.75, -L], [0, 0, 1], 1.2, Object.assign({ ly: 5.5, d: 2.6 }, ho)));
  return out;
}
function halSDF(x, y, z) {
  if (z > 0) return Math.min(x - HAL.CX0, HAL.CX1 - x, y, HAL.CH - y, HAL.CL - z);
  let d = Math.min(x + HAL.X, HAL.X - x, y, z + HAL.L);
  if (!(x > HAL.CX0 && x < HAL.CX1 && y < HAL.CH)) d = Math.min(d, -z);
  let sk = null; for (const s of HAL.SKY) if (x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1) sk = s;
  if (sk) { d = Math.min(d, HAL.TOP - y); if (y > HAL.H) d = Math.min(d, x - sk.x0, sk.x1 - x, z - sk.z0, sk.z1 - z); } else d = Math.min(d, HAL.H - y);
  return d;
}
// solen genom fabriksfönstren i västra väggen; igenspikade rutor och spröjs stoppar ljuset
function halSunGate(px, py, pz) {
  if (pz > 0 || px <= HAL.WX + .01) return 0;
  const t = (HAL.WX - px) / SUNH[0], hy = py + SUNH[1] * t, hz = pz + SUNH[2] * t;
  for (const w of HAL.WIN) {
    const m = Math.min(hy - w.y0, w.y1 - hy, hz - w.z0, w.z1 - hz); if (m <= 0) continue;
    const fy = (hy - w.y0) / HAL.PY, fz = (hz - w.z0) / HAL.PZ;
    if (HAL.boarded.has(w.id + ":" + Math.floor(fy) + ":" + Math.floor(fz))) return 0;
    return sstep(0, .05, m) * sstep(.03, .055, Math.min(Math.abs(fy - Math.round(fy)) * HAL.PY, Math.abs(fz - Math.round(fz)) * HAL.PZ));
  }
  return 0;
}
function halLights() {
  const inRoom = (x, y, z) => z < .05, inCorr = (x, y, z) => z > -.2;
  if (!REGN) addSun(SUNH, 3.2, COL.sun, halSunGate, HAL.H, { k: 60, only: inRoom });
  const skyI = REGN ? MULEN.berattelser : 1, skyC = REGN ? COL.rain : COL.sky;
  for (const bz of HAL.BENCH) for (const lx of [-1.4, 1.4]) addPoint([lx, HAL.LAMPY - .1, bz], .7, [1, .86, .7], 7, .03, { only: inRoom });
  for (const w of HAL.WIN) {
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) addPanel([HAL.WX + .05, w.y0 + (j + .5) * (w.y1 - w.y0) / 3, w.z0 + (i + .5) * (w.z1 - w.z0) / 3], [1, 0, 0], 1.15 * skyI, skyC, 26, inRoom);
    if (REGN) addFill([HAL.WX + 2, .3, (w.z0 + w.z1) / 2], .25, COL.rain, inRoom); // mjukt återkast från golvet innanför fönstret
    else { const yc = (w.y0 + w.y1) / 2, t = yc / SUNH[1]; addFill([HAL.WX - SUNH[0] * t, .3, (w.z0 + w.z1) / 2 - SUNH[2] * t], .6, COL.sun, inRoom); }
  }
  for (const s of HAL.SKY) for (let j = 0; j < 3; j++) addPanel([(s.x0 + s.x1) / 2, HAL.TOP - .1, s.z0 + (j + .5) * (s.z1 - s.z0) / 3], [0, -1, 0], 1.4 * skyI, skyC, 22, inRoom);
  addTube([4, 2.94, 2.6], 3.0, .8, [1, .8, .58], { only: inCorr });
  addPoint([4, 2.0, 4.75], .4, [.75, .95, 1], 4, .02, { only: inCorr });
}

/* ================= 00 FOAJÉN =================
   Entrén och navet, 12 × 12 m, 5,5 m i tak. Öppningar till alla rum och tavlor för galleri, om, priser och kontakt. */
const FOY = { X: 6, L: 12, H: 5.5, EX0: -2.9, EX1: 2.9, EH: 3.7, DH: 2.75, PW: .12, // glasentrén i väggen bakom ingången
  XS: [-2.9, -1.95, -1.0, 0, 1.0, 1.95, 2.9] };                                       // stålposternas läge
const FOY_LAMP = { xs: [-1.5, 1.5], z: -6, y: 2.75 }; // de två taklamporna
const SUNF = (() => { const v = [.3, 1.05, 1], l = Math.hypot(...v); return v.map((c) => c / l); })(); // mot solen, utanför entrén
// solen når en punkt om strålen mot solen går genom glaset och inte träffar en stålprofil
function foySunGate(px, py, pz) {
  if (pz > 0) return 0;
  const t = -pz / SUNF[2], hx = px + SUNF[0] * t, hy = py + SUNF[1] * t;
  const m = Math.min(hx - FOY.EX0, FOY.EX1 - hx, hy, FOY.EH - hy); if (m <= 0) return 0;
  let dm = 9; for (const x of FOY.XS) dm = Math.min(dm, Math.abs(hx - x));
  dm = Math.min(dm, Math.abs(hy - FOY.DH), hy - .06);
  return sstep(0, .04, m) * sstep(FOY.PW / 2, FOY.PW / 2 + .03, dm);
}
// två stora bilder på var sida om öppningen till vernissagen
function foySlots() {
  const out = [["kickflip", -3.9], ["nallen", 3.9]].map(([key, x]) => ({ key, C: [x, 1.85, -FOY.L], U: [1, 0, 0], N: [0, 0, 1], w: 2.0,
    spots: [{ p: [x, 5.3, -FOY.L + 2.4], t: [x, 1.85, -FOY.L], a: .32, T: 1.5 }] }));
  // östra väggen, på var sin sida om galleritavlan
  out.push(wslot("fasaden", [FOY.X, 1.75, -2.5], [-1, 0, 0], 1.4, { ly: 4.6, d: 1.8 }), wslot("klistermarken", [FOY.X, 1.75, -9.5], [-1, 0, 0], 1.4, { ly: 4.6, d: 1.8 }));
  return out;
}
function foySDF(x, y, z) { return Math.min(x + FOY.X, FOY.X - x, y, FOY.H - y, z + FOY.L, -z); }
function foyLights() {
  addPoint([0, 4.0, -11.4], .45, COL.tung, 5, 0);
  addSpot([0, 5.3, -9.4], [0, 3.9, -12], .34, 1.1, COL.spot); // skylten och logotypen över vernissageöppningen
  for (const z of [-3, -6, -9]) addSpot([-4.1, 5.3, z], [-6, 1.7, z], .3, 1.3, [1, .9, .76]);
  addSpot([4.0, 5.3, -6], [6, 1.8, -6], .38, 1.3, [1, .9, .76]);
  // två industrilampor sida vid sida, lågt över bänken: varmt ljus nedåt och lite sken ut i rummet
  for (const x of FOY_LAMP.xs) { addSpot([x, FOY_LAMP.y - .05, FOY_LAMP.z], [x, 0, FOY_LAMP.z], 1.05, .85, [1, .88, .72], { hard: false, k: 10, bounce: .1, fx: "none" }); addPoint([x, FOY_LAMP.y - .1, FOY_LAMP.z], .8, [1, .86, .7], 9, .03); }
  // dagsljus genom glasentrén
  if (GATA) { // kväll och regn ute: bara ett svagt, kallt sken från gatan och lite varmt från skylten och lyktorna
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) addPanel([FOY.EX0 + (i + .5) * (FOY.EX1 - FOY.EX0) / 4, (j + .5) * FOY.EH / 2, -.05], [0, 0, -1], .1, [.62, .7, .86], 16);
    return; }
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) addPanel([FOY.EX0 + (i + .5) * (FOY.EX1 - FOY.EX0) / 4, (j + .5) * FOY.EH / 2, -.05], [0, 0, -1], .35, COL.sky, 16);
  addSun(SUNF, 1.5, COL.sun, foySunGate, FOY.H, { k: 40 });
}

/* ================= 04 MÄNNISKORNA =================
   En gammal fotoateljé i ett tegelhus, 12 × 16 m och 6 m i tak. Fönster mot norr på västra väggen,
   varma glödlampor och en fotohörna med bakgrundspapper vid bortre väggen. In genom en korridor (z 0…4,5). */
const MAN = { X: 6, L: 16, H: 6, CW: 1.2, CL: 4.5, CH: 2.8,
  WIN: [{ z0: -7, z1: -4, y0: 1.2, y1: 4.8 }, { z0: -12, z1: -9, y0: 1.2, y1: 4.8 }] };
const inMC = (x, y, z) => z > -.1, inMR = (x, y, z) => z < .05;
function manSDF(x, y, z) {
  if (z > 0) return Math.min(x + MAN.CW, MAN.CW - x, y, MAN.CH - y, MAN.CL - z);
  let d = Math.min(x + MAN.X, MAN.X - x, y, MAN.H - y, z + MAN.L);
  if (!(Math.abs(x) < MAN.CW && y < MAN.CH)) d = Math.min(d, -z);
  return d;
}
const MAN_SOFT = [[-1.9, 2.05, -13.2], [1.9, 2.05, -13.2]], MAN_STOOL = [0, 1.2, -14.3];
const MAN_LOUNGE = { x: 0, z: -6.6, lampY: 2.75 }, MAN_PENDANTS = [0, 1, 2].map((i) => { const a = Math.PI / 2 + i * 2 * Math.PI / 3; return [Math.cos(a) * .27, Math.sin(a) * .27, [1.42, 1.78, 2.12][i]]; }); // höjden på glaskupornas underkant // tre i en cirkel: [x, z, underkant på glaskupan] // soffgruppen mitt i rummet
const SUNM = (() => { const v = [-.82, .62, .22], l = Math.hypot(...v); return v.map((c) => c / l); })(); // mot solen, utanför västra fönstren
function manSunGate(px, py, pz) {
  if (pz > 0 || px <= -MAN.X + .01) return 0;
  const t = (-MAN.X - px) / SUNM[0], hy = py + SUNM[1] * t, hz = pz + SUNM[2] * t;
  for (const w of MAN.WIN) {
    const m = Math.min(hy - w.y0, w.y1 - hy, hz - w.z0, w.z1 - hz); if (m <= 0) continue;
    const pz4 = (w.z1 - w.z0) / 4, py5 = (w.y1 - w.y0) / 5, fz = (hz - w.z0) / pz4, fy = (hy - w.y0) / py5;
    return sstep(0, .04, m) * sstep(.035, .06, Math.min(Math.abs(fz - Math.round(fz)) * pz4, Math.abs(fy - Math.round(fy)) * py5));
  }
  return 0;
}
function manLights() {
  // dagsljus från norr genom de stora fönstren: mjukt, inga solfläckar
  for (const w of MAN.WIN) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++)
    addPanel([-MAN.X + .05, w.y0 + (j + .5) * (w.y1 - w.y0) / 2, w.z0 + (i + .5) * (w.z1 - w.z0) / 2], [1, 0, 0], REGN ? .9 * MULEN.manniskorna : .9, REGN ? COL.rain : COL.sky, REGN ? 18 : 16, inMR);
  if (!REGN) addSun(SUNM, 2.6, COL.sun, manSunGate, MAN.H, { k: 40, only: inMR });
  // glödlampor i emaljskärmar
  for (const z of [-4, -11]) addPoint([0, 4.6, z], .7, [1, .9, .8], 10, .04, { only: inMR }); // mjukt fyllnadsljus
  // softboxarna i fotohörnan
  // softboxarna: mjukt, starkt ljus som faller på pallen och bakgrundspappret, med pallens skugga
  for (const p of MAN_SOFT) addSpot(p, [MAN_STOOL[0], .66, MAN_STOOL[2]], .62, 1.8, [1, .97, .92], { hard: false, k: 8, bounce: .12, fx: "none", only: inMR });
  for (const [dx, dz, y] of MAN_PENDANTS) addPoint([MAN_LOUNGE.x + dx, y + .14, MAN_LOUNGE.z + dz], .34, COL.tung, 5, .02, { only: inMR }); // pendlarna över soffbordet
  for (const sx of [-1.6, 1.6]) addPoint([sx, 2.45, -.28], .3, COL.tung, 3.5, .015, { only: inMR }); // vägglamporna vid dörren
  addTube([0, 2.74, 2.4], 3.0, .8, [1, .8, .58], { only: inMC });
  addPoint([0, 2.0, 4.25], .45, [1, .76, .5], 4, .02, { only: inMC });
}
function manSlots() {
  const X = MAN.X, L = MAN.L, warm = [1, .86, .7], o = { d: 1.7, ly: 3.7, a: .36, col: warm, only: inMR };
  const out = [];
  [["dansen", -2.4], ["people", -4.6], ["kragen", -6.8], ["pendlaren", -9.0], ["solglasogon", -11.2], ["kappan", -13.4]].forEach(([k, z]) => out.push(wslot(k, [X, 1.65, z], [-1, 0, 0], 1.15, o)));
  [["balkongen", -2.0], ["markiserna", -8.0], ["i-fonstret", -14.0]].forEach(([k, z]) => out.push(wslot(k, [-X, 1.65, z], [1, 0, 0], 1.3, o)));
  out.push(wslot("vila-i-frid", [-4.2, 1.7, -L], [0, 0, 1], 1.6, o), wslot("azizam", [4.2, 1.7, -L], [0, 0, 1], 1.6, o));
  [["roken", -4.5], ["glasogonen", -2.3], ["blicken", 2.3], ["gloden", 4.5]].forEach(([k, x]) => out.push(wslot(k, [x, 1.6, 0], [0, 0, -1], 1.1, o)));
  out.push({ key: "vid-fonstret", C: [-MAN.CW, 1.55, 2.3], U: [0, 0, -1], N: [1, 0, 0], h: 1.1, spots: [{ p: [-MAN.CW + .85, 2.72, 2.3], t: [-MAN.CW, 1.55, 2.3], a: .48, T: 1.5, o: { fx: "head", only: inMC } }] });
  out.push({ key: "pausen", C: [MAN.CW, 1.55, 2.3], U: [0, 0, 1], N: [-1, 0, 0], h: 1.1, spots: [{ p: [MAN.CW - .85, 2.72, 2.3], t: [MAN.CW, 1.55, 2.3], a: .48, T: 1.5, o: { fx: "head", only: inMC } }] });
  return out;
}


/* ================= rummen ================= */
const SPECS = {
  staden: { num: "01", name: "Staden", sub: "Betong, tegel och neon", next: "naturen",
    intro: "Ett råare rum mitt i stan: putsen har släppt, betongen har tagit över och genom glasväggen hör man staden. Tryck på en bild för att se den i full storlek.",
    sdf: stadenSDF, amb: (x, y, z) => { const k = (x + CV.X) / (2 * CV.X); return [.045 + k * .04, .047 + k * .045, .052 + k * .055]; },
    solids: CV.PIL.map(([x, z], i) => ({ c: [x, CV.H / 2, z], h: [CV.PW / 2, CV.H / 2, CV.PW / 2], id: "pil" + i })), lights: stadenLights,
    ceil: () => CV.H,
    start: { x: -1, z: -1.2, yaw: .12 },
    walk: [{ x0: -5.7, x1: 5.55, z0: -21.7, z1: -.45 }],
    look: { mirror: { mat: "garage", k: .19 }, fog: 0xc9d0d6, density: .008, bg: 0xc9d0d6, exposure: 1.15, bloom: .45, thr: 1.2 }, step: 560, wet: .45,
    slots: stadenSlots() },
  naturen: { num: "02", name: "Naturen", sub: "Ut ur mörkret, in i ljuset", next: "berattelser",
    intro: "Du kliver ut ur mörkret. Dagsljus, luft och färg: havet, kusten, bergen och hösten.",
    sdf: naturenSDF, solids: [], lights: naturenLights,
    amb: (x, y, z) => { if (z > 0) { const k = clamp(1 - z / 2.6, 0, 1) * .06; return [.005 + k * .9, .007 + k, .007 + k * 1.04]; } return [.18, .185, .192]; },
    ceil: (x, z) => z > 0 ? NAT.CH : NAT.H,
    start: { x: 0, z: 3.75, yaw: 0 }, walk: [{ x0: -5.6, x1: 5.6, z0: -19.6, z1: -.45 }, { x0: -.75, x1: .75, z0: -.6, z1: 4.15 }],
    look: { mirror: { mat: "betonggolv", k: .286 }, fog: 0xb9b5ab, density: .006, bg: 0xdedad2, exposure: 1.0, bloom: .35, thr: 2.2 }, step: 640, wet: .3,
    slots: [
      { key: "klippan", C: [-6, 2.05, -5.5], U: [0, 0, -1], N: [1, 0, 0], h: 2.4, spots: [{ p: [-3.8, 6.55, -5.5], t: [-6, 2.05, -5.5], a: .3, T: 1.7 }] },
      { key: "ronda", C: [-6, 2.05, -14.5], U: [0, 0, -1], N: [1, 0, 0], h: 2.4, spots: [{ p: [-3.8, 6.55, -14.5], t: [-6, 2.05, -14.5], a: .3, T: 1.7 }] },
      { key: "hostvagen", C: [6, 2.05, -10], U: [0, 0, 1], N: [-1, 0, 0], h: 2.6, spots: [{ p: [3.8, 6.55, -10], t: [6, 2.05, -10], a: .32, T: 1.7 }] },
      { key: "kusten", C: [0, 2.3, -20], U: [1, 0, 0], N: [0, 0, 1], w: 4.6, spots: [{ p: [-1.25, 6.55, -17.4], t: [-1.25, 2.3, -20], a: .36, T: 1.25 }, { p: [1.25, 6.55, -17.4], t: [1.25, 2.3, -20], a: .36, T: 1.25 }] },
      ...natSlots(),
      { key: "dahlian", C: [-NAT.CW, 1.55, 2.0], U: [0, 0, -1], N: [1, 0, 0], h: 1.0, spots: [{ p: [-.15, 2.74, 2.0], t: [-NAT.CW, 1.55, 2.0], a: .5, T: 1.4, o: { fx: "head", only: (x, y, z) => z > -.2 } }] },
      { key: "tulpanerna", C: [NAT.CW, 1.55, 2.0], U: [0, 0, 1], N: [-1, 0, 0], h: 1.0, spots: [{ p: [.15, 2.74, 2.0], t: [NAT.CW, 1.55, 2.0], a: .5, T: 1.4, o: { fx: "head", only: (x, y, z) => z > -.2 } }] }
    ] },
  berattelser: { num: "03", name: "Berättelser", sub: "En nedgången industrihall", next: "manniskorna",
    intro: "En övergiven industrihall med dagsljus genom trasiga fönster. Bilder som bär en idé eller en berättelse.",
    sdf: halSDF, solids: [{ c: [0, 1.7, -10.5], h: [.13, 1.7, 1.9], id: "fwall" }], lights: halLights,
    amb: (x, y, z) => z > 0 ? [.02, .018, .016] : [.15, .15, .155],
    ceil: (x, z) => z > 0 ? HAL.CH : HAL.H,
    start: { x: 4, z: 4.2, yaw: 0 }, walk: [{ x0: -6.6, x1: 6.6, z0: -21.6, z1: -.4 }, { x0: 3.25, x1: 4.75, z0: -.6, z1: 4.6 }],
    look: { mirror: { mat: "betonggolv", k: .282 }, fog: 0x9a968c, density: .006, bg: 0xc9c5bc, exposure: 1.15, bloom: .4, thr: 2.0 }, step: 560, wet: .28,
    slots: [
      { key: "pojken", C: [0, 2.75, -22], U: [1, 0, 0], N: [0, 0, 1], h: 3.9, spots: [{ p: [0, 7.7, -17.8], t: [0, 2.75, -22], a: .34, T: 1.5, o: { only: (x, y, z) => z < .05 } }] },
      { key: "lisboa", C: [7, 2.4, -11], U: [0, 0, 1], N: [-1, 0, 0], w: 4.4, spots: [{ p: [4.3, 7.7, -11], t: [7, 2.4, -11], a: .4, T: 1.5, o: { only: (x, y, z) => z < .05 } }] },
      ...halSlots(),
      { key: "masen", C: [HAL.CX0, 1.55, 2.5], U: [0, 0, -1], N: [1, 0, 0], h: 1.1, spots: [{ p: [3.75, 2.92, 2.5], t: [HAL.CX0, 1.55, 2.5], a: .48, T: 1.5, o: { fx: "head", only: (x, y, z) => z > -.2 } }] },
      { key: "skorna", C: [HAL.CX1, 1.55, 2.5], U: [0, 0, 1], N: [-1, 0, 0], h: 1.1, spots: [{ p: [4.25, 2.92, 2.5], t: [HAL.CX1, 1.55, 2.5], a: .48, T: 1.5, o: { fx: "head", only: (x, y, z) => z > -.2 } }] }
    ] },
  manniskorna: { num: "04", name: "Människorna", sub: "En gammal fotoateljé", next: "foajen",
    intro: "En gammal fotoateljé med tegelväggar, trägolv och ljus från norr. Här hänger porträtten: människorna framför kameran.",
    sdf: manSDF, solids: [], lights: manLights,
    amb: (x, y, z) => z > 0 ? [.02, .017, .014] : [.08, .072, .062],
    ceil: (x, z) => z > 0 ? MAN.CH : MAN.H - .3,
    start: { x: 0, z: 4.0, yaw: 0 }, walk: [{ x0: -5.6, x1: 5.6, z0: -15.6, z1: -.4 }, { x0: -.75, x1: .75, z0: -.6, z1: 4.1 }],
    look: { mirror: { mat: "tra", k: .16 }, fog: 0x1a1410, density: .007, bg: 0x0b0907, exposure: 1.25, bloom: .45, thr: 1.5 }, step: 540, wet: .2,
    slots: manSlots() },
  foajen: { num: "00", name: "Foajén", eyebrow: "En bättre bild · Entré", sub: "Välj rum, se galleriet eller boka", next: "staden",
    intro: "Välkommen till En bättre bild. Gå in genom den stora öppningen längst in för att komma till vernissagen. På väggarna hittar du galleriet, priser och kontakt.",
    sdf: foySDF, solids: [], lights: foyLights, amb: () => [.075, .07, .064], ceil: () => FOY.H,
    start: { x: 0, z: -1.6, yaw: 0 }, walk: [{ x0: -5.6, x1: 5.6, z0: -11.6, z1: -.45 }],
    look: { mirror: { mat: "garage", k: .24 }, fog: 0x0a0a09, density: .006, bg: 0x050505, exposure: 1.25, bloom: .4, thr: 1.6 }, step: 520, wet: .35,
    slots: foySlots() }
};
if (REGN) Object.assign(SPECS.staden.look, { fog: 0x464d53, bg: 0x464d53, density: .011, exposure: 1.08, bloom: .35, thr: 1.6 });
const ROOM_ORDER = ["foajen", "staden", "naturen", "berattelser", "manniskorna"];
function useRoom(key) {
  const S = SPECS[key]; OBJ = []; LIGHTS = []; SOLIDS = S.solids || []; SDF = S.sdf; AMBF = S.amb;
  S.lights();
  S.slots.forEach((sl) => sl.spots.forEach((sp) => addSpot(sp.p, sp.t, sp.a, sp.T, sp.col || COL.spot, sp.o)));
  return S;
}
/*BAKE-END*/
