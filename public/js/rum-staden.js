// Rum 01: Staden.
"use strict";
/* ================= 01 STADEN: betong, tegel, glas och neon ================= */
// puts som har släppt i flak: teglet syns igenom, med skugga i kanten där putsen tar slut
function peeledWall(seed, wM, hM, o) {
  o = o || {};
  const brick = brickTex(seed, wM, hM), W = brick.width, Hh = brick.height, ppm = W / wM, r = rng(seed + 101);
  const c = cnv(W, Hh), x = c.getContext("2d"); x.drawImage(brick, 0, 0);
  x.globalCompositeOperation = "multiply"; x.fillStyle = "rgba(215,180,168,1)"; x.fillRect(0, 0, W, Hh); x.globalCompositeOperation = "source-over";
  const blobs = [], blob = (cx, cy, rad, sq) => { const pts = [], n = 30, f1 = r() * 6, f2 = r() * 6; for (let k = 0; k < n; k++) { const a = k / n * 6.283, q = .82 + .2 * Math.sin(3 * a + f1) + .1 * Math.sin(7 * a + f2) + (r() - .5) * .16; pts.push([cx + Math.cos(a) * rad * q, cy + Math.sin(a) * rad * q * sq]); } blobs.push(pts); };
  for (let i = 0; i < (o.n || Math.round(wM * hM / 8)); i++) {
    const cx = r() * W, cy = Hh * (.1 + r() * .78), rad = (.35 + r() * r() * 1.1) * ppm;
    blob(cx, cy, rad, .55 + r() * .3);
  }
  const path = (ctx, pts, dx, dy) => { ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(px + dx, py + dy) : ctx.moveTo(px + dx, py + dy)); ctx.closePath(); };
  x.filter = "blur(3px)"; x.strokeStyle = "rgba(10,8,6,.6)"; x.lineWidth = .03 * ppm; blobs.forEach((b) => { path(x, b, .01 * ppm, .016 * ppm); x.stroke(); }); x.filter = "none";
  const p = cnv(W, Hh), y = p.getContext("2d");
  y.fillStyle = o.plaster || "#9d978c"; y.fillRect(0, 0, W, Hh);
  blotches(y, W, Hh, 220, seed + 3, ["70,66,58", "200,196,186", "120,110,92"], 30, 220, .05, .18);
  streaks(y, W, 120, seed + 4, "40,36,30", Hh * .6, .08, .3);
  const gm = y.createLinearGradient(0, Hh - .7 * ppm, 0, Hh); gm.addColorStop(0, "rgba(30,28,24,0)"); gm.addColorStop(1, "rgba(30,28,24,.6)"); y.fillStyle = gm; y.fillRect(0, Hh - .7 * ppm, W, .7 * ppm);
  y.globalCompositeOperation = "destination-out"; y.fillStyle = "#000"; blobs.forEach((b) => { path(y, b, 0, 0); y.fill(); });
  x.drawImage(p, 0, 0);
  x.strokeStyle = "rgba(225,220,208,.3)"; x.lineWidth = 1.5; blobs.forEach((b) => { path(x, b, 0, 0); x.stroke(); });
  grain(x, W, Hh, 10, seed + 7); return c;
}
// smutsigt industriglas: klara rutor, några med trådglas och någon med en spricka; mörkare smuts nertill
function glassCanvas(lenM, hM, cols, rows) {
  const ppm = 2048 / lenM, W = 2048, Hh = Math.round(hM * ppm), c = cnv(W, Hh), x = c.getContext("2d"), r = rng(77), pw = W / cols, ph = Hh / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const X = i * pw, Y = j * ph, k = r();
    x.fillStyle = k < .14 ? "rgba(232,236,238,.62)" : `rgba(215,222,228,${.07 + r() * .08})`; x.fillRect(X, Y, pw, ph);
    if (k < .14) { x.strokeStyle = "rgba(60,64,66,.35)"; x.lineWidth = 1; for (let g = 6; g < pw; g += 12) { x.beginPath(); x.moveTo(X + g, Y); x.lineTo(X + g, Y + ph); x.stroke(); } for (let g = 6; g < ph; g += 12) { x.beginPath(); x.moveTo(X, Y + g); x.lineTo(X + pw, Y + g); x.stroke(); } }
    if (r() < .05) { x.strokeStyle = "rgba(240,244,246,.7)"; x.lineWidth = 1.2; let px = X + r() * pw, py = Y + r() * ph; x.beginPath(); x.moveTo(px, py); for (let s = 0; s < 6; s++) { px += (r() - .5) * pw * .5; py += (r() - .3) * ph * .4; x.lineTo(px, py); } x.stroke(); }
    const g = x.createLinearGradient(0, Y, 0, Y + ph); g.addColorStop(0, "rgba(90,86,78,0)"); g.addColorStop(1, `rgba(90,86,78,${.12 + r() * .18})`); x.fillStyle = g; x.fillRect(X, Y, pw, ph);
  }
  blotches(x, W, Hh, 60, 9, ["150,146,138", "235,238,240"], 20, 120, .03, .1);
  return c;
}
// stadens fasader i dagsljus: fönsterrader i en kulör
// husens väggmaterial utan fönster: fönstren byggs som riktiga hål med djup
function cityFacade(src, base) {
  const c = cnv(512, 512), x = c.getContext("2d");
  x.drawImage(src.diff.image, 0, 0, 512, 512);
  if (base) { x.globalCompositeOperation = "multiply"; x.fillStyle = base; x.fillRect(0, 0, 512, 512); x.globalCompositeOperation = "source-over"; }
  return c;
}
// regn: strängar som faller mellan glaset och husen, och droppar och rinnande stråk på rutorna
function buildRain(X, L, W) {
  const N = 4200, base = new Float32Array(N * 6), kk = new Float32Array(N * 2), r = rng(91);
  for (let i = 0; i < N; i++) { const x = X + .6 + Math.pow(r(), 1.6) * 40, y = r() * 30, z = 25 - r() * 70;
    for (let v = 0; v < 2; v++) { base.set([x, y, z], i * 6 + v * 3); kk[i * 2 + v] = v; } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(base, 3)); g.setAttribute("k", new THREE.BufferAttribute(kk, 1));
  const u = { t: { value: 0 } };
  const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false,
    vertexShader: "attribute float k; uniform float t; varying float a; void main(){ vec3 p = position; p.y = mod(position.y - t * 11.0, 30.0) - 9.0 - k * .55; p.x -= k * .05; p.z += k * .02;" +
      " vec4 mv = modelViewMatrix * vec4(p, 1.); a = clamp(1. - (-mv.z - 4.) / 45., 0., 1.); gl_Position = projectionMatrix * mv; }",
    fragmentShader: "varying float a; void main(){ gl_FragColor = vec4(.78, .82, .86, .32 * a); }" });
  const lines = new THREE.LineSegments(g, m); lines.frustumCulled = false; lines.layers.set(1); scene.add(lines);
  // dropparna på glaset: en stillastående textur och en som sakta rinner
  const drops = (seed, streaks) => { const H = W.y1 - W.y0, cw = 4096, ch = Math.round(cw * H / L * 2), c = cnv(cw, ch), x = c.getContext("2d"), q = rng(seed), sx = cw / L, sy = ch / H / 2;
    for (let i = 0; i < (streaks ? 320 : 11000); i++) { const px = q() * cw, py = q() * ch, rr = (streaks ? 1.8 + q() * 1.4 : .55 + Math.pow(q(), 4) * 2.6) * sx / 190;
      if (streaks) { const len = (40 + q() * 160) * sy / 60; const gr = x.createLinearGradient(0, py - len, 0, py); gr.addColorStop(0, "rgba(220,228,236,0)"); gr.addColorStop(1, "rgba(220,228,236,.35)");
        x.strokeStyle = gr; x.lineWidth = rr * .8; x.beginPath(); x.moveTo(px, py - len); x.bezierCurveTo(px + (q() - .5) * 6, py - len * .6, px + (q() - .5) * 6, py - len * .3, px, py); x.stroke(); }
      x.fillStyle = "rgba(30,36,44,.2)"; x.beginPath(); x.ellipse(px, py + rr * .25, rr, rr * 1.15, 0, 0, 7); x.fill();   // mörk kant nertill
      x.fillStyle = "rgba(225,232,240,.2)"; x.beginPath(); x.ellipse(px, py, rr * .82, rr * .95, 0, 0, 7); x.fill();       // droppen
      x.fillStyle = "rgba(255,255,255,.42)"; x.beginPath(); x.arc(px - rr * .3, py - rr * .35, rr * .28, 0, 7); x.fill(); }  // glans
    const t = T(c, true, true); t.repeat.set(1, .5); return t; };
  const pane = (tex) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(L, W.y1 - W.y0), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    p.position.set(X - .015, (W.y0 + W.y1) / 2, -L / 2); p.rotation.y = -Math.PI / 2; scene.add(p); return p; };
  pane(drops(5, false)); const run = drops(8, true); pane(run);
  return (now) => { u.t.value = now / 1000; run.offset.y = (now / 1000 * .035) % 1; };
}
function buildCity() {
  const r = rng(12), hx = (h, k) => { const c = new THREE.Color(h); k = k === undefined ? 1 : k; return [c.r * k, c.g * k, c.b * k]; }, mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  // allt utom väggytorna samlas i en enda geometri med färg per hörn: smygar, glas, karmar, bleck, tak, balkonger
  const P = [], C = [];
  const quad = (a, b, c, d, ca, cb, cc, cd) => { cb = cb || ca; cc = cc || ca; cd = cd || ca;
    P.push(...a, ...b, ...c, ...a, ...c, ...d); C.push(...ca, ...cb, ...cc, ...ca, ...cc, ...cd); };
  const box = (xa, xb, ya, yb, za, zb, col, noFront) => { // fasaden vetter mot -x (mot betongrummet)
    if (!noFront) quad([xa, ya, za], [xa, ya, zb], [xa, yb, zb], [xa, yb, za], col);
    quad([xa, yb, za], [xa, yb, zb], [xb, yb, zb], [xb, yb, za], mul(col, 1.1));
    quad([xa, ya, za], [xa, ya, zb], [xb, ya, zb], [xb, ya, za], mul(col, .5));
    quad([xa, ya, zb], [xb, ya, zb], [xb, yb, zb], [xa, yb, zb], mul(col, .8));
    quad([xa, ya, za], [xb, ya, za], [xb, yb, za], [xa, yb, za], mul(col, .64));
  };
  const plate = (x, za, zb, ya, yb, col) => quad([x, ya, za], [x, ya, zb], [x, yb, zb], [x, yb, za], col);
  const SKYLO = hx(0x1f2731), SKYHI = hx(0x56677a);
  // stadens eget dis, oberoende av rummets: luftperspektiv utan att husen blir bleka
  const cityMat = (o) => { const m = new THREE.MeshBasicMaterial(o); m.customProgramCacheKey = () => "stadsdis";
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace("#include <fog_fragment>", "#ifdef USE_FOG\n float fogFactor = 1.0 - exp(-" + (REGN ? ".00055" : ".000144") + " * fogDepth * fogDepth);\n gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);\n#endif"); }; return m; };
  // ett fönster i fasaden x0, mellan zB < zA och y0 < y1
  const win = (x0, zA, zB, y0, y1, o) => {
    const D = o.depth, xg = x0 + D, wc = o.wall;
    quad([x0, y1, zA], [x0, y1, zB], [xg, y1, zB], [xg, y1, zA], mul(wc, .4));      // smyg upptill i skugga
    quad([x0, y0, zA], [x0, y0, zB], [xg, y0, zB], [xg, y0, zA], mul(wc, .95));     // smyg nertill i ljus
    quad([x0, y0, zA], [x0, y1, zA], [xg, y1, zA], [xg, y0, zA], mul(wc, .62));
    quad([x0, y0, zB], [x0, y1, zB], [xg, y1, zB], [xg, y0, zB], mul(wc, .8));
    // glaset: speglar himlen, ljusare ju högre upp; ibland ett mörkt rum, gardiner eller en tänd lampa
    const t = clamp((y0 + 12) / 42, 0, 1), k = r(); let top, bot;
    if (k < .42) { top = mul(lerp3(SKYLO, SKYHI, .45 + t * .55), .9 + r() * .2); bot = mul(lerp3(SKYLO, SKYHI, t * .5), .85 + r() * .2); }
    else if (k < .72) { top = hx(0x2a313a, .9 + r() * .3); bot = hx(0x15191e); }
    else if (k < .9) { top = hx(0x333b45); bot = hx(0x1d2228); }
    else { top = hx(0xf0cf96, .9 + r() * .15); bot = hx(0xb98d55); }
    const ys = y1 - (y1 - y0) * .2;
    quad([xg, y0, zA], [xg, y0, zB], [xg, ys, zB], [xg, ys, zA], bot, bot, top, top);
    quad([xg, ys, zA], [xg, ys, zB], [xg, y1, zB], [xg, y1, zA], top, top, mul(top, .55), mul(top, .55)); // skuggan från smygen
    const fx = xg - .012, w = zA - zB;
    if (k >= .72 && k < .9) { const g = r(); // gardiner: neddragen rullgardin eller två draperier
      if (g < .5) { const yb = y1 - (y1 - y0) * (.3 + r() * .5); plate(fx + .004, zA, zB, yb, y1, hx(0xe6dfd0, .85 + r() * .15)); }
      else { const cc = hx([0xe9e2d4, 0xc9b8a0, 0x9fa9a8][(r() * 3) | 0], .9); plate(fx + .004, zA, zA - w * .28, y0, y1, cc); plate(fx + .004, zB + w * .28, zB, y0, y1, cc); } }
    const fc = o.frame, b = .055;
    plate(fx, zA, zB, y1 - b, y1, fc); plate(fx, zA, zB, y0, y0 + b, fc); plate(fx, zA, zA - b, y0, y1, fc); plate(fx, zB + b, zB, y0, y1, fc);
    plate(fx, (zA + zB) / 2 + b / 2, (zA + zB) / 2 - b / 2, y0, y1, fc);
    if (o.transom) { const yt = y0 + (y1 - y0) * .7; plate(fx, zA, zB, yt - b / 2, yt + b / 2, fc); }
    box(x0 - .12, x0 + .02, y0 - .08, y0, zB - .07, zA + .07, o.sill);              // fönsterbleck
    if (o.header) box(x0 - .07, x0, y1 + .06, y1 + .26, zB - .14, zA + .14, o.header); // omfattning ovanför
    if (o.plants && r() < .06) for (let i = 0; i < 3; i++) box(x0 - .1, x0 + .02, y0, y0 + .18 + r() * .2, zA - w * (.15 + i * .3) - .12, zA - w * (.15 + i * .3), hx(0x4f6b3c, .8 + r() * .3));
  };
  const SRC = { puts: MATTEX.puts, tegel: MATTEX.tegel, tegelputs: MATTEX.tegelputs, element: MATTEX.element, betong: MATTEX.betong };
  // fasadtyper: stenstadens putsade hus, tegelhus och några modernare med balkonger
  const TYPES = [
    { src: "puts", base: "#e3cfa6", wall: 0xd8c39c, style: "klassisk" }, { src: "puts", base: "#d9a37c", wall: 0xc9946c, style: "klassisk" },
    { src: "tegelputs", base: "#ece6da", wall: 0xe4ddd0, style: "klassisk" }, { src: "tegel", base: null, wall: 0x9c5a42, style: "tegel" },
    { src: "puts", base: "#cdb98e", wall: 0xc4af84, style: "klassisk" }, { src: "betong", base: "#c4c0b6", wall: 0xaaa69c, style: "modern" },
    { src: "tegel", base: "#c99a80", wall: 0x8a5a48, style: "tegel" }, { src: "puts", base: "#b8c2bc", wall: 0xaab4ae, style: "klassisk" }];
  const tex = TYPES.map((ty) => { const t = T(cityFacade(SRC[ty.src], ty.base)); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; });
  const roofCols = [0x3f4746, 0x4a3f3a, 0x55524c, 0x394140];
  // ---------- modulsatser från Poly Haven: fasad, AC-aggregat och brandtrappor ----------
  const kitIndex = (root) => { if (!root) return null; root.updateMatrixWorld(true); const idx = {};
    root.traverse((o) => { if (!o.isMesh) return; const nm = o.parent && o.parent !== root ? o.parent.name : o.name;
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); if (!g.attributes.normal) g.computeVertexNormals();
      (idx[nm] = idx[nm] || []).push({ g, mat: o.material }); });
    for (const k in idx) { const b = new THREE.Box3(); idx[k].forEach((pc) => { pc.g.computeBoundingBox(); b.union(pc.g.boundingBox); }); idx[k].box = b; }
    return idx; };
  const KIT = kitIndex(MODELS.fasad), ACK = kitIndex(MODELS.ac), FEK = kitIndex(MODELS.brandtrappa), KB = {};
  const KBASIS = new THREE.Matrix4().makeBasis(new V3(0, 0, 1), new V3(0, 1, 0), new V3(-1, 0, 0)); // satsens framsida (+z) vänds mot rummet (−x)
  // lägg en del i rätt hink per material; ljuset sätts per hörn: framsidor ljusa, undersidor mörka
  const kitAdd = (idx, key, M, tint, glass) => { const parts = idx && idx[key]; if (!parts) return false;
    for (const pc of parts) { const mn = pc.mat.name || "x"; const B = KB[mn] || (KB[mn] = { p: [], u: [], c: [], mat: pc.mat });
      const g = pc.g.clone(); g.applyMatrix4(M); const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv, isG = /glass/i.test(mn);
      for (let i = 0; i < pa.count; i++) { B.p.push(pa.getX(i), pa.getY(i), pa.getZ(i)); B.u.push(ua ? ua.getX(i) : 0, ua ? ua.getY(i) : 0);
        const nx = na.getX(i), ny = na.getY(i), k = .6 + .3 * Math.max(0, -nx) + .16 * Math.max(0, ny) - .22 * Math.max(0, -ny), t = isG ? glass : tint;
        B.c.push(t[0] * (isG ? 1 : k), t[1] * (isG ? 1 : k), t[2] * (isG ? 1 : k)); } }
    return true; };
  // centrerad del: mitten i (cx, cz), nederkant på yMin, skalad (sx, sy, sz) i satsens koordinater
  const kitPlace = (idx, key, cx, yMin, cz, tint, sc, glass) => { const b = idx && idx[key] && idx[key].box; if (!b) return false; sc = sc || [1, 1, 1];
    const M = new THREE.Matrix4().makeTranslation(cx, yMin, cz).multiply(KBASIS).multiply(new THREE.Matrix4().makeScale(sc[0], sc[1], sc[2]))
      .multiply(new THREE.Matrix4().makeTranslation(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2));
    return kitAdd(idx, key, M, tint, glass || [0, 0, 0]); };
  const KITTINTS = [[1, 1, 1], [1.3, 1.2, 1.05], [1.15, 1.1, 1.08], [1.42, 1.34, 1.2], [.92, .9, .92]];
  const KITTYPES = [["centered_large", "_01", "_02", "_03"], ["centered_small", "_01", "_02", "_03"], ["centered_double", "_01", "_02", "_03"], ["offset_small", "_01", "_03", "_05"]];
  let fireEscapes = 0;
  // ett hus i fasadsatsen: moduler om 3 × 3 m våning för våning uppifrån, en takkrona överst och gesimser mellan våningarna
  const kitFacade = (x0, z0, w, top, wall, holesOut) => {
    const n = Math.max(1, Math.round(w / 3)), cw = w / n, nf = Math.ceil((top + 4.5) / 3), kb = top - 3 * nf, tint = KITTINTS[(r() * KITTINTS.length) | 0];
    const T = KITTYPES[(r() * KITTYPES.length) | 0];
    for (let f = 0; f < nf; f++) { const yb = top - 3 * (f + 1), suf = f === 0 ? T[3] : f === 1 ? T[2] : T[1];
      for (let i = 0; i < n; i++) { const zs = z0 - w + i * cw, plain = r() < .1;
        const wk = plain ? "wall_standard_standard_01" : "wall_window_" + T[0] + suf, nk = "window_" + T[0] + suf, b = KIT[wk] && KIT[wk].box; if (!b) continue;
        const M = new THREE.Matrix4().makeTranslation(x0, yb, zs).multiply(KBASIS).multiply(new THREE.Matrix4().makeScale(cw / 3, 1, 1)).multiply(new THREE.Matrix4().makeTranslation(-b.min.x, -b.min.y, -b.min.z));
        const k = r(), glass = k < .45 ? [.12, .15, .19] : k < .75 ? [.055, .065, .085] : k < .9 ? [.38, .37, .35] : [1.1, .82, .48];
        kitAdd(KIT, wk, M, tint); if (!plain) kitAdd(KIT, nk, M, tint, glass);
        if (f > 0) { const cb = KIT.cornice_standard_standard_01 && KIT.cornice_standard_standard_01.box; // gesims vid varje bjälklag
          if (cb) kitAdd(KIT, "cornice_standard_standard_01", new THREE.Matrix4().makeTranslation(x0, yb + 3 - .1, zs).multiply(KBASIS).multiply(new THREE.Matrix4().makeScale(cw / 3, 1, 1)).multiply(new THREE.Matrix4().makeTranslation(-cb.min.x, -cb.min.y, 0)), tint); }
        // AC-aggregat på konsoler under ett och annat fönster
        if (!plain && f > 0 && ACK && r() < .34) { const key = r() < .55 ? "exterior_aircon_unit" : "exterior_aircon_unit_rusted", ab = ACK[key] && ACK[key].box;
          if (ab) kitPlace(ACK, key, x0 - (ab.max.z - ab.min.z) / 2 - .02, yb - .55, zs + cw / 2 + (r() - .5) * .6, [1, 1, 1]); }
      }
    }
    { const crb = KIT.crown_standard_standard_01 && KIT.crown_standard_standard_01.box; // takkronan
      if (crb) for (let i = 0; i < n; i++) kitAdd(KIT, "crown_standard_standard_01", new THREE.Matrix4().makeTranslation(x0, top, z0 - w + i * cw).multiply(KBASIS).multiply(new THREE.Matrix4().makeScale(cw / 3, 1, 1)).multiply(new THREE.Matrix4().makeTranslation(-crb.min.x, -crb.min.y, 0)), tint); }
    // brandtrappa på ett par hus: plattform och räcke vid varje våning, trappor emellan
    if (FEK && fireEscapes < 2 && w > 7 && nf >= 2 && r() < .55) { fireEscapes++; const zc = z0 - w * (.3 + r() * .4), ft = [.55, .55, .58];
      for (let f = 0; f < nf; f++) { const yb = top - 3 * (f + 1);
        kitPlace(FEK, "modular_fire_escape_platform_middle", x0 - .68, yb - .72, zc, ft); kitPlace(FEK, "modular_fire_escape_railing_middle", x0 - .7, yb + .03, zc, ft);
        if (f < nf - 1) kitPlace(FEK, "modular_fire_escape_stairs", x0 - .69, yb - 3 + .03, zc + (f % 2 ? .5 : -.5), ft, [f % 2 ? -1 : 1, .75, 1]); } }
    return kb;
  };
  const house = (x0, z0, w, d, top, rough, kit) => {
    const bot = -12, ti = (r() * TYPES.length) | 0, ty = TYPES[ti], wall = hx(ty.wall), style = ty.style;
    const o = style === "modern" ? { ww: 1.9 + r() * .5, wh: 1.55, sp: 2.9, fh: 3, depth: .2, frame: hx(0x2a2d2f), sill: hx(0x8c8f90), header: null, transom: false }
      : style === "tegel" ? { ww: 1.15, wh: 1.85, sp: 2.35 + r() * .3, fh: 3.2, depth: .3, frame: hx(r() < .5 ? 0xe6e2d8 : 0x2f3d37), sill: hx(0xb3ada2), header: hx(0x6a3526), transom: true, plants: true }
      : { ww: 1.1 + r() * .15, wh: 1.8, sp: 2.4 + r() * .35, fh: 3.25, depth: .28, frame: hx(r() < .7 ? 0xeeeae0 : 0x3a4a44), sill: hx(0xa9a59c), header: hx(ty.wall, 1.08), transom: true, plants: true };
    o.wall = wall;
    const useKit = kit && KIT, balc = style === "modern" && r() < .7, holes = [];
    box(x0, x0 + d, bot, top, z0 - w, z0, mul(wall, .92), true); // husets kropp: gavlarna syns i glappen
    const ftop = useKit ? kitFacade(x0, z0, w, top, wall) : top; // med satsen: den släta fasaden går bara upp till modulerna
    const n = Math.max(1, Math.floor((w - 1.4) / o.sp)), m0 = (w - (n - 1) * o.sp) / 2;
    for (let y = bot + 1; !useKit && y + o.wh < top - (style === "modern" ? .9 : 1.3); y += o.fh) {
      const ground = y < bot + 2;
      for (let i = 0; i < n; i++) {
        const u = m0 + i * o.sp, ww = ground ? Math.min(o.sp - .5, o.ww * 1.6) : o.ww, wh = ground ? o.wh * 1.3 : o.wh;
        const isB = balc && !ground && i % 2 === 0, y0 = isB ? y - .25 : y, y1 = y + wh, zA = z0 - u + ww / 2, zB = z0 - u - ww / 2;
        holes.push([u - ww / 2, u + ww / 2, y0, y1]); win(x0, zA, zB, y0, y1, o);
        if (isB) { const bz = ww / 2 + .45; // balkong: platta, räcke och några stolpar
          box(x0 - 1.15, x0, y0 - .2, y0, z0 - u - bz, z0 - u + bz, hx(0xb8b5ae));
          box(x0 - 1.17, x0 - 1.1, y0, y0 + 1, z0 - u - bz, z0 - u + bz, hx(0x34383a));
          box(x0 - 1.15, x0, y0, y0 + 1, z0 - u + bz - .05, z0 - u + bz, hx(0x34383a)); box(x0 - 1.15, x0, y0, y0 + 1, z0 - u - bz, z0 - u - bz + .05, hx(0x34383a));
          if (r() < .35) box(x0 - .9, x0 - .5, y0, y0 + .5 + r() * .4, z0 - u + bz - .5, z0 - u + bz - .1, hx(0x587a44, .8 + r() * .3)); }
      }
      if (style !== "modern" && y > bot + 2 && y < bot + 2 + o.fh) box(x0 - .1, x0, y - .45, y - .25, z0 - w, z0, hx(ty.wall, 1.06)); // våningsband
    }
    // fasaden med riktiga hål för fönstren
    const sh = new THREE.Shape([new THREE.Vector2(0, bot), new THREE.Vector2(w, bot), new THREE.Vector2(w, ftop), new THREE.Vector2(0, ftop)]);
    for (const [u0, u1, y0, y1] of holes) sh.holes.push(new THREE.Path([new THREE.Vector2(u0, y0), new THREE.Vector2(u0, y1), new THREE.Vector2(u1, y1), new THREE.Vector2(u1, y0)]));
    const fg = new THREE.ShapeGeometry(sh), fp = fg.attributes.position, fu = fg.attributes.uv, fcol = new Float32Array(fp.count * 3), tone = .9 + r() * .14;
    for (let i = 0; i < fp.count; i++) { const u = fp.getX(i), v = fp.getY(i), k = (.74 + .26 * clamp((v - bot) / (top - bot) * 1.4, 0, 1)) * tone;
      fp.setXYZ(i, x0, v, z0 - u); fu.setXY(i, u / 3.2, v / 3.2); fcol[i * 3] = fcol[i * 3 + 1] = fcol[i * 3 + 2] = k; }
    fg.setAttribute("color", new THREE.BufferAttribute(fcol, 3)); fg.computeBoundingSphere();
    { const fm = new THREE.Mesh(fg, cityMat({ map: tex[ti], vertexColors: true, color: 0xe6e2da, side: THREE.DoubleSide })); fm.layers.set(1); scene.add(fm); }
    // taket
    const rc = hx(roofCols[(r() * roofCols.length) | 0]);
    if (style !== "modern" && !useKit) box(x0 - .38, x0 + .06, top - .55, top - .1, z0 - w, z0, hx(ty.wall, 1.1)); // takgesims
    if (rough && style !== "modern" && !useKit && r() < .7) { // sadeltak i plåt med takkupor och skorstenar
      const rh = d * .34, xr = x0 + d / 2, ax = x0 - .35, ys = (x) => top + (x - ax) / (xr - ax) * rh;
      quad([ax, top, z0], [ax, top, z0 - w], [xr, top + rh, z0 - w], [xr, top + rh, z0], mul(rc, 1.05), mul(rc, 1.05), mul(rc, .8), mul(rc, .8));
      quad([xr, top + rh, z0], [xr, top + rh, z0 - w], [x0 + d, top, z0 - w], [x0 + d, top, z0], mul(rc, .6));
      for (const zz of [z0, z0 - w]) { P.push(ax, top, zz, xr, top + rh, zz, x0 + d, top, zz); C.push(...mul(wall, .7), ...mul(wall, .7), ...mul(wall, .7)); }
      const nd = Math.floor(w / 4.2);
      for (let i = 0; i < nd; i++) { if (r() < .25) continue; const zc = z0 - w * (i + .5) / nd, xf = ax + (xr - ax) * .22, yb = ys(xf) - .1;
        box(xf, xf + 1.4, yb, yb + 1.5, zc - .8, zc + .8, mul(wall, .95));
        quad([xf - .15, yb + 1.5, zc + .9], [xf - .15, yb + 1.5, zc - .9], [xf + 1.4, yb + 2.1, zc - .9], [xf + 1.4, yb + 2.1, zc + .9], mul(rc, 1.1));
        win(xf, zc + .4, zc - .4, yb + .25, yb + 1.25, Object.assign({}, o, { depth: .12, header: null, plants: false })); }
      for (let i = 0; i < 1 + (r() * 3 | 0); i++) { const zc = z0 - w * (.15 + r() * .7), xc = xr - .4 + r() * .8;
        box(xc - .35, xc + .35, top + rh - .4, top + rh + 1.3, zc - .5, zc + .5, hx(0x8c5a46, .9)); box(xc - .42, xc + .42, top + rh + 1.3, top + rh + 1.42, zc - .57, zc + .57, hx(0x45403c)); }
    } else { // platt tak: bröstning, plåtkant och saker på taket
      box(x0 + .1, x0 + d, top, top + .25, z0 - w, z0, mul(rc, .9));
      if (!useKit) { box(x0 - .05, x0 + .3, top, top + .7, z0 - w, z0, mul(wall, .93)); box(x0 - .12, x0 + .37, top + .7, top + .8, z0 - w, z0, hx(0x9a9894)); }
      if (r() < .6) { const zc = z0 - w * (.2 + r() * .6), xc = x0 + d * (.3 + r() * .4); box(xc - 1.3, xc + 1.3, top, top + 2.6, zc - 1.2, zc + 1.2, mul(wall, .85)); }
      for (let i = 0; i < (r() * 4 | 0); i++) { const zc = z0 - w * (.1 + r() * .8), xc = x0 + 1.2 + r() * (d - 2.4); box(xc - .5, xc + .5, top + .25, top + 1.1, zc - .7, zc + .7, hx(0x9fa4a6, .8 + r() * .25)); }
      if (r() < .5) { const zc = z0 - w * (.2 + r() * .6), xc = x0 + d * (.4 + r() * .4), hh = 2.5 + r() * 3; box(xc - .04, xc + .04, top, top + hh, zc - .04, zc + .04, hx(0x2c2e30)); box(xc - .04, xc + .04, top + hh - .6, top + hh - .55, zc - .7, zc + .7, hx(0x2c2e30)); }
    }
  };
  for (const [xa, xb, tmin, tmax, rough, kit] of [[15, 18, 1.5, 9, 1, 1], [30, 36, 5, 17, 1, 0], [48, 56, 9, 26, 0, 0]]) {
    let z = 30; while (z > -60) { const w = 7 + r() * 8; house(xa + r() * (xb - xa), z, w, 10 + r() * 6, tmin + r() * (tmax - tmin), rough, kit && (isTouch ? z < 8 && z - w > -32 : z < 22 && z - w > -50)); z -= w + (r() < .3 ? 2 + r() * 3 : 0); }
  }
  // satsens hinkar blir en geometri per material
  for (const mn in KB) { const B = KB[mn], g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(B.p, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(B.u, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(B.c, 3)); g.computeBoundingSphere();
    const src = B.mat, blend = src.transparent || /exterior_aircon_unit(_rusted)?_02/.test(mn), glass = /glass/i.test(mn);
    const m = glass ? cityMat({ vertexColors: true, side: THREE.DoubleSide })
      : blend ? cityMat({ vertexColors: true, color: 0x3a3c3e, alphaMap: src.map || null, alphaTest: .5, side: THREE.DoubleSide })
      : cityMat({ map: src.map || null, vertexColors: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m); mesh.layers.set(1); scene.add(mesh); }
  { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3)); g.computeBoundingSphere();
    const cm = new THREE.Mesh(g, cityMat({ vertexColors: true, side: THREE.DoubleSide })); cm.layers.set(1); scene.add(cm); }
  // några fåglar som glider runt över taken
  const birds = [], bm = new THREE.MeshBasicMaterial({ color: 0x2b2e31, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, -.12, .02, .32, .05, 0, 0, 0, 0, 0, .05, 0, 0, -.12, .02, -.32], 3));
    const b = new THREE.Mesh(g, bm); b.layers.set(1); scene.add(b); birds.push({ m: b, ph: r() * 6.28, o: [r() * 3 - 1.5, r() * 2 - 1, r() * 3 - 1.5], sp: .8 + r() * .4 }); }
  // kyrkspira och en byggkran långt bort
  { const m = (c) => new THREE.MeshBasicMaterial({ color: c });
    const tw = new THREE.Mesh(new THREE.BoxGeometry(4, 34, 4), m(0x8f8a80)); tw.position.set(44, 5, -26); scene.add(tw);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(2.6, 16, 4), m(0x5c6b66)); sp.position.set(44, 30, -26); sp.rotation.y = Math.PI / 4; scene.add(sp);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(1, 46, 1), m(0xb88a4a)); mast.position.set(60, 11, 8); scene.add(mast);
    const jib = new THREE.Mesh(new THREE.BoxGeometry(1, .8, 30), m(0xb88a4a)); jib.position.set(60, 33.5, 0); scene.add(jib);
    const street = new THREE.Mesh(new THREE.PlaneGeometry(80, 120), m(0x7d7b76)); street.rotation.x = -Math.PI / 2; street.position.set(46, -12, -10); scene.add(street); }
  // himlen: ljus dis vid horisonten, blå uppåt
  const sg = new THREE.SphereGeometry(66, 32, 16), pc = sg.attributes.position, cols = new Float32Array(pc.count * 3);
  for (let i = 0; i < pc.count; i++) { const t = clamp(pc.getY(i) / 66, 0, 1), k = Math.pow(t, .6); cols[i * 3] = REGN ? .33 - .1 * k : .84 * (1 - k) + .5 * k; cols[i * 3 + 1] = REGN ? .355 - .1 * k : .87 * (1 - k) + .64 * k; cols[i * 3 + 2] = REGN ? .385 - .09 * k : .9 * (1 - k) + .84 * k; }
  sg.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  scene.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
  return (now) => { const t = now / 1000 * .09; // flocken drar en stor slinga långt bort, vingarna slår ibland
    for (const b of birds) { const a = t * b.sp + b.ph * .05, cx = 34 + Math.cos(a) * 14, cz = -12 + Math.sin(a) * 26;
      b.m.position.set(cx + b.o[0], 15 + Math.sin(a * 2.3) * 2 + b.o[1], cz + b.o[2] * 2); b.m.rotation.y = -a + Math.PI;
      const f = Math.sin(now / 1000 * 9 + b.ph) * (Math.sin(now / 1000 * .7 + b.ph) > .2 ? .16 : .03), pa = b.m.geometry.attributes.position;
      pa.setY(1, f); pa.setY(5, f); pa.needsUpdate = true; b.m.scale.setScalar(2.6); } };
}
// neonskylt i rosa: rören som en bild med alfa, och ett mjukt sken bakom
function neonCanvas(text, blur) {
  const c = cnv(2048, 640), x = c.getContext("2d"); x.fillStyle = "#fff"; x.strokeStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
  x.font = '300 300px Jost, "Futura", sans-serif'; if (x.letterSpacing !== undefined) x.letterSpacing = "26px";
  if (blur) { x.filter = `blur(${blur}px)`; x.lineWidth = 26; x.strokeText(text, 1024, 330); }
  x.lineWidth = blur ? 10 : 4; x.lineJoin = "round"; x.fillText(text, 1024, 330); if (!blur) x.strokeText(text, 1024, 330);
  x.filter = "none"; return c;
}
const CVC = 0x9a978f; // betongens grundton
function buildStaden() {
  const X = CV.X, L = CV.L, H = CV.H, W = CV.WIN;
  const tx = { floor: mat("garage", { color: 0x98abc8 }), ceil: mat("betong", { color: 0x9a9890, relief: .6 }), conc: mat("betong", { color: 0xa8b2c4 }),
    west: mat("slitputs", { color: 0xe8e4de }), far: mat("slitputs", { color: 0xe8e4de }) };
  planar({ name: "golv", floor: true, O: [-X, 0, 0], U: [1, 0, 0], V: [0, 0, -1], lu: 2 * X, lv: L, map: tx.floor, tu: 3.5, tv: 3.5, color: 0xa29e96 });
  planar({ name: "tak", O: [-X, H, -L], U: [1, 0, 0], V: [0, 0, 1], lu: 2 * X, lv: L, map: tx.ceil, tu: 4, tv: 4 });
  planar({ name: "tegelväggen", O: [-X, 0, 0], U: [0, 0, -1], V: [0, 1, 0], lu: L, lv: H, map: tx.west });
  const d = CV.DOOR, du = d.x + X, dv = 4 * CV.ST.rise;
  planar({ name: "bortre väggen", O: [-X, 0, -L], U: [1, 0, 0], V: [0, 1, 0], lu: 2 * X, lv: H, map: tx.far, holes: [[[du - d.w / 2, dv], [du + d.w / 2, dv], [du + d.w / 2, dv + d.h], [du - d.w / 2, dv + d.h]]] });
  planar({ name: "ingångsväggen", O: [X, 0, 0], U: [-1, 0, 0], V: [0, 1, 0], lu: 2 * X, lv: H, map: tx.conc, tu: 4, tv: 3.2 });
  planar({ name: "bröstning", O: [X, 0, -L], U: [0, 0, 1], V: [0, 1, 0], lu: L, lv: W.y0, map: tx.conc, tu: 4, tv: 3.2 });
  planar({ name: "överliggare", O: [X, W.y1, -L], U: [0, 0, 1], V: [0, 1, 0], lu: L, lv: H - W.y1, map: tx.conc, tu: 4, tv: 3.2 });
  // pelare och balkar i betong
  for (const [px, pz] of CV.PIL) { const h = CV.PW / 2;
    for (const [O, U] of [[[px - h, 0, pz + h], [1, 0, 0]], [[px + h, 0, pz + h], [0, 0, -1]], [[px + h, 0, pz - h], [-1, 0, 0]], [[px - h, 0, pz - h], [0, 0, 1]]])
      planar({ name: "pelare", O, U, V: [0, 1, 0], lu: CV.PW, lv: H, map: tx.conc, tu: 4, tv: 3.2, res: RES * .8 }); }
  for (const z of [-7.3, -14.6]) prop(new THREE.BoxGeometry(2 * X, .45, .42, 24, 2, 2), { color: CVC }, new V3(0, H - .225, z), null, { id: "balk" + z });
  prop(new THREE.BoxGeometry(L, .08, .36, 40, 1, 2), { color: 0x8e8b84 }, new V3(X - .17, W.y0 + .04, -L / 2), [0, Math.PI / 2, 0], { id: "sill", shadow: false });
  // ventilationstrumma och kabelstege i taket
  prop(new THREE.CylinderGeometry(.26, .26, L - .2, 20, 12), { color: 0x5d605f }, new V3(-4, H - .62, -L / 2), [Math.PI / 2, 0, 0], { id: "duct", shadow: false });
  for (let z = -1.5; z > -L; z -= 2.4) rodProp([-4, H, z], [-4, H - .36, z], .012, 0x2a2b2b);
  prop(new THREE.BoxGeometry(.4, .06, L - .4, 2, 1, 30), { color: 0x262827 }, new V3(1.4, H - .5, -L / 2), null, { id: "tray", shadow: false });
  // glasväggen: stålspröjs i ett tätt rutnät och smutsigt glas
  const cols = Math.round(L / W.PZ), steel = 0x1b1d1d;
  const oldGrid = [];
  for (let i = 0; i <= cols; i++) oldGrid.push(prop(new THREE.BoxGeometry(.07, W.y1 - W.y0, i % 5 === 0 ? .14 : .05, 1, 8, 1), { color: steel }, new V3(X - .03, (W.y0 + W.y1) / 2, -i * W.PZ), null, { shadow: false }));
  for (let j = 0; j <= 5; j++) oldGrid.push(prop(new THREE.BoxGeometry(.07, j % 5 === 0 ? .12 : .045, L, 1, 1, 60), { color: steel }, new V3(X - .03, W.y0 + j * W.PY, -L / 2), null, { shadow: false }));
  if (SODER) { innergardGlas(X, L, W, oldGrid); }
  else { const g = new THREE.Mesh(new THREE.PlaneGeometry(L, W.y1 - W.y0), new THREE.MeshBasicMaterial({ map: T(glassCanvas(L, W.y1 - W.y0, cols, 5), true, false), color: REGN ? 0x6a7076 : 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    g.position.set(X, (W.y0 + W.y1) / 2, -L / 2); g.rotation.y = -Math.PI / 2; scene.add(g); }
  const cityTick0 = SODER ? innergard(X, L) : buildCity(), rain = REGN ? buildRain(X, L, W) : null;
  const cityTick = (now, dt) => { cityTick0(now, dt); if (rain) rain(now, dt); };
  // ståltrappan: tre steg och ett vilplan (fyra steg upp) till en dörr på glänt
  { const S = CV.ST, sx = S.x, hw = .68, st = 0x1e2120, rust = (geo) => [worldUV(geo, 1.5), { color: 0x8a7a6c, map: MATTEX.rost.diff }];
    for (let k = 0; k < 3; k++) prop(...rust(new THREE.BoxGeometry(1.3, .045, S.run - .02, 4, 1, 2)), new V3(sx, (k + 1) * S.rise - .022, S.z0 - S.run * k - S.run / 2), null, { id: "trappa" });
    const top = 4 * S.rise, zl = S.z0 - 3 * S.run;
    prop(...rust(new THREE.BoxGeometry(1.4, .06, -L - zl, 4, 1, 3)), new V3(sx, top - .03, (zl - L) / 2), null, { id: "trappa" });
    for (const s of [-1, 1]) {
      const len = Math.hypot(3 * S.run, 3 * S.rise), str = prop(new THREE.BoxGeometry(.04, .22, len + .12, 1, 1, 6), { color: st }, new V3(sx + s * hw, 1.5 * S.rise, S.z0 - 1.5 * S.run), [Math.atan2(S.rise, S.run), 0, 0], { id: "trappa" });
      prop(new THREE.BoxGeometry(.05, top, .05), { color: st }, new V3(sx + s * hw, top / 2, -L + .1), null, { id: "trappa" });
      prop(new THREE.BoxGeometry(.05, top, .05), { color: st }, new V3(sx + s * hw, top / 2, zl), null, { id: "trappa" });
      rodProp([sx + s * hw, 0, S.z0], [sx + s * hw, 1.0, S.z0], .022, 0x1c1e1e); rodProp([sx + s * hw, top, zl], [sx + s * hw, top + 1.0, zl], .022, 0x1c1e1e);
      rodProp([sx + s * hw, 1.0, S.z0], [sx + s * hw, top + 1.0, zl], .02, 0x1c1e1e); rodProp([sx + s * hw, top + 1.0, zl], [sx + s * hw, top + 1.0, -L + .05], .02, 0x1c1e1e);
      rodProp([sx + s * hw, .55, S.z0], [sx + s * hw, top + .55, zl], .012, 0x1c1e1e);
    }
    colliders.push({ x0: sx - .78, x1: sx + .78, z0: -L, z1: S.z0 });
    // dörren: stålkarm, dörrblad som står på glänt och kallt dagsljus bakom
    const dz = -L, y0 = top;
    for (const s of [-1, 1]) prop(new THREE.BoxGeometry(.08, d.h + .08, .14), { color: steel }, new V3(d.x + s * (d.w / 2 + .04), y0 + d.h / 2, dz + .03), null, { shadow: false });
    prop(new THREE.BoxGeometry(d.w + .16, .08, .14), { color: steel }, new V3(d.x, y0 + d.h + .04, dz + .03), null, { shadow: false });
    const hinge = new THREE.Group(); hinge.position.set(d.x + d.w / 2, y0, dz - .02); hinge.rotation.y = -.55; scene.add(hinge);
    prop(worldUV(new THREE.BoxGeometry(d.w, d.h, .05, 2, 4, 1).translate(-d.w / 2, d.h / 2, 0), 1.5), { color: 0xc8c4bc, map: MATTEX.panel.diff }, new V3(0, 0, 0), null, { parent: hinge, shadow: false });
    prop(new THREE.BoxGeometry(.14, .03, .04), { color: 0x9a9890 }, new V3(-d.w + .1, 1.05, .05), null, { parent: hinge, shadow: false });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(d.w + .3, d.h + .3), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 1.3, 1.38) })); back.position.set(d.x, y0 + d.h / 2, dz - 1.4); scene.add(back);
    for (const s of [-1, 1]) { const j = new THREE.Mesh(new THREE.PlaneGeometry(1.4, d.h), new THREE.MeshBasicMaterial({ color: new THREE.Color(.42, .45, .48), side: THREE.DoubleSide })); j.position.set(d.x + s * d.w / 2, y0 + d.h / 2, dz - .7); j.rotation.y = Math.PI / 2; scene.add(j); }
    { const fl = new THREE.Mesh(new THREE.PlaneGeometry(d.w, 1.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(.55, .58, .6) })); fl.rotation.x = -Math.PI / 2; fl.position.set(d.x, y0, dz - .7); scene.add(fl); }
    back.userData.exit = "naturen"; occluders.push(back);
    exits.push({ x0: sx - .6, x1: sx + .6, z0: S.z0 - .3, z1: S.z0 + .45, to: "naturen", title: "02 NATUREN" });
    decal(signCanvas([{ text: "02  NATUREN", font: '800 110px "Big Shoulders Display", "Arial Narrow", sans-serif', y: 104, track: 12, fit: true },
      { text: "GÅ VIDARE", font: '500 40px "IBM Plex Mono", monospace', y: 196, track: 6, alpha: .75, fit: true }],
      { w: 1024, h: 256, bg: "#14302f", fg: "#ece9e0", border: "rgba(236,233,224,.6)", bw: 5, wear: true }), 1.1, .275, new V3(d.x, y0 + d.h + .38, dz + .02), new V3(0, 0, 1), { boost: 1.3, minL: .07 });
  }
  // burlampor, en bänk i betong och lite skräp som blivit kvar
  for (const z of CV.LAMPS) { const b = placeModel("bur", [-1.6, 3.95, z], 0, { h: .75, hang: true, emisCol: [4, 2.6, 1.3] }); if (b) rodProp([-1.6, b.top, z], [-1.6, H, z], .01, 0x111111); else cageLamp(-1.6, 3.4, z, H); }
  buildStands("staden", 0x52504c, 0x1b1d1d);
  prop(worldUV(new THREE.BoxGeometry(.62, .44, 2.2, 2, 2, 8), 2), { color: 0xc0c0ba, map: MATTEX.betong.diff }, new V3(3.9, .22, -11), null, { id: "cbench", collide: true }); benchSeats(3.9, -11, 2.2, .62, .44, false); // vid glaset, man sitter och ser ut på regnet
  opening({ C: [0, 0, 0], N: [0, 0, -1], U: [-1, 0, 0], w: 1.4, h: 2.5, to: "foajen", sign: ["00  FOAJÉN", "TILLBAKA"], glow: new THREE.Color(1.1, .82, .55) });
  return { noDust: true, update: cityTick };
}

/* ---------- Söder: genom glaset ser man en innergård (renderad i Blender) ---------- */
// stora klara rutor i stället för det täta rutnätet; det gamla rutnätet finns kvar men dolt så att det förbakade ljuset stämmer
function innergardGlas(X, L, W, oldGrid) {
  oldGrid.forEach((m) => { m.scale.setScalar(1e-4); }); // krymps till ingenting: rummets props slås ihop efter bakningen, så att bara dölja dem räcker inte
  const lin = (h) => new THREE.Color(h).convertSRGBToLinear(), steel = new THREE.MeshBasicMaterial({ color: lin(0x161818) });
  const add = (geo, x, y, z) => { const o = new THREE.Mesh(geo, steel); o.position.set(x, y, z); scene.add(o); };
  const n = 8, yt = W.y0 + (W.y1 - W.y0) * .7;
  for (let i = 0; i <= n; i++) add(new THREE.BoxGeometry(.09, W.y1 - W.y0, i % n === 0 ? .16 : .08), X - .04, (W.y0 + W.y1) / 2, -i * L / n);
  for (const [y, h] of [[W.y0, .12], [yt, .07], [W.y1, .12]]) add(new THREE.BoxGeometry(.09, h, L), X - .04, y, -L / 2);
  const gc = cnv(256, 512), gx = gc.getContext("2d"), gg = gx.createLinearGradient(0, 0, 256, 512);
  [[0, 0], [.4, 0], [.46, .22], [.52, 0], [.63, .1], [.67, 0]].forEach(([o, a]) => gg.addColorStop(o, "rgba(255,255,255," + a + ")")); gx.fillStyle = gg; gx.fillRect(0, 0, 256, 512);
  const gm = new THREE.MeshBasicMaterial({ map: T(gc, false, false), color: new THREE.Color(.5, .55, .6), transparent: true, opacity: .18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  for (let i = 0; i < n; i++) for (const [ya, yb] of [[W.y0, yt], [yt, W.y1]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L / n - .09, yb - ya - .1), gm); m.position.set(X - .01, (ya + yb) / 2, -(i + .5) * L / n); m.rotation.y = -Math.PI / 2; m.layers.set(2); scene.add(m); }
}
// innergården: renderad från rummets mitt (x 0, z −11, ögonhöjd) med 10 mm-objektiv och lagd på en skiva där bortre huset står (x 21)
function innergard(X, L) {
  const D = 21, Wd = 2 * D * 1.8, Hd = Wd / 2.25, cy = 1.6 + .172 * Wd;
  const tex = new THREE.TextureLoader().load("film/innergard.jpg"); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(Wd, Hd), new THREE.MeshBasicMaterial({ map: tex, fog: false, toneMapped: false }));
  m.position.set(D, cy, -11); m.rotation.y = -Math.PI / 2; m.layers.set(1); scene.add(m);
  return () => {};
}
