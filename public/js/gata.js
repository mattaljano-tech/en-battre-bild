// Gatan utanför foajén: husen, trottoaren, bilarna, regnet och glasentrén från utsidan.
"use strict";
/* ---------- gatan utanför foajén (?gata): samma värld inifrån och utifrån ----------
   Foajéns glasentré sitter i fasaden mot en regnig gata i skymningen. Gatan går längs x, ut från huset är +z. */
const STR = { FZ: .35, CURB: 5.0, ROAD1: 13.2, OPP: 16.8, XR: 21, CW: 9 }; // XR: där kvarteret slutar; sedan en tvärgata (CW bred) och husen på andra sidan den
let streetExt = null;
// entrén som riktiga delar (inte bakade): stålprofiler, glas och två dörrblad som kan svänga upp, och en rullgardin som hänger nere medan rummet byggs
function glassEntranceGata() {
  const x0 = FOY.EX0, x1 = FOY.EX1, EH = FOY.EH, DH = FOY.DH, XS = FOY.XS, PW = FOY.PW, FZ = STR.FZ;
  const lin = (h) => new THREE.Color(h).convertSRGBToLinear(), steelM = new THREE.MeshBasicMaterial({ color: lin(0x1c1d1e) }), revM = new THREE.MeshBasicMaterial({ color: lin(0x2a2928) }), hdlM = new THREE.MeshBasicMaterial({ color: lin(0x9a9a96) });
  const box = (w, h, d, m, x, y, z, par) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); (par || scene).add(o); return o; };
  for (const sx of [x0, x1]) box(.05, EH, FZ, revM, sx + (sx < 0 ? -.025 : .025), EH / 2, FZ / 2); // smygen i väggens tjocklek
  box(x1 - x0 + .1, .05, FZ, revM, 0, EH + .025, FZ / 2);
  box(x1 - x0, .02, FZ, steelM, 0, .01, FZ / 2);                                                      // tröskeln
  const bar = (cx, cy, w, h, par) => box(w, h, .18, steelM, cx, cy, .09, par);
  for (const px of XS) if (px !== 0) bar(px, EH / 2, PW, EH);
  bar(0, (DH + EH) / 2, PW, EH - DH);                                                                 // mittposten bara ovanför dörrarna
  bar(0, DH, x1 - x0, PW); bar(0, EH - PW / 2, x1 - x0, PW);
  for (const s of [-1, 1]) bar(s * (1 + x1) / 2, .06, x1 - 1, .12);                                  // bottenprofil utanför dörröppningen
  const gc = cnv(256, 512), gx = gc.getContext("2d"), gg = gx.createLinearGradient(0, 0, 256, 512);
  [[0, 0], [.42, 0], [.47, .3], [.52, 0], [.62, .15], [.66, 0]].forEach(([o, a]) => gg.addColorStop(o, "rgba(255,255,255," + a + ")")); gx.fillStyle = gg; gx.fillRect(0, 0, 256, 512);
  const gm = new THREE.MeshBasicMaterial({ map: T(gc, false, false), color: new THREE.Color(.5, .56, .58), transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  for (let i = 0; i < XS.length - 1; i++) for (const [ya, yb] of [[0, DH], [DH, EH]]) {
    if (ya === 0 && (i === 2 || i === 3)) continue; // dörrbladen har eget glas
    const m = new THREE.Mesh(new THREE.PlaneGeometry(XS[i + 1] - XS[i] - PW, yb - ya - PW), gm); m.position.set((XS[i] + XS[i + 1]) / 2, (ya + yb) / 2, .08); m.layers.set(2); scene.add(m); }
  // dörrbladen: gångjärn vid posterna x = ±1, svänger inåt
  const WL = 1 - PW / 2, leaves = [-1, 1].map((s) => { const g = new THREE.Group(); g.position.set(s * WL, 0, .09); scene.add(g);
    const lx = (u) => -s * u;
    box(.08, DH - .06, .16, steelM, lx(.04), (DH - .06) / 2, 0, g); box(.08, DH - .06, .16, steelM, lx(WL - .04), (DH - .06) / 2, 0, g);
    box(WL, .08, .16, steelM, lx(WL / 2), DH - .1, 0, g); box(WL, .28, .16, steelM, lx(WL / 2), .16, 0, g);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(WL - .16, DH - .44), gm); gl.position.set(lx(WL / 2), (.3 + DH - .14) / 2, 0); gl.layers.set(2); g.add(gl);
    const hx = lx(WL - .14), hg = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 1.4, 10), hdlM);
    for (const dz of [-.12, .12]) { const h = hg.clone(); h.position.set(hx, 1.35, dz); g.add(h); for (const dy of [-.6, .6]) box(.02, .02, .1, hdlM, hx, 1.35 + dy, dz / 2, g); }
    return { g, s }; });
  // rullgardinen: varmt linne med ljuset bakom, rullas upp när foajén är klar
  const bc = cnv(256, 256), bx = bc.getContext("2d"), bgr = bx.createLinearGradient(0, 0, 0, 256);
  bgr.addColorStop(0, "#5c4b38"); bgr.addColorStop(.5, "#8a6e4e"); bgr.addColorStop(1, "#6a5440"); bx.fillStyle = bgr; bx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 4) { bx.fillStyle = "rgba(30,20,10," + (.05 + (y % 8 ? 0 : .06)) + ")"; bx.fillRect(0, y, 256, 1); }
  bx.fillStyle = "rgba(20,14,8,.55)"; bx.fillRect(0, 248, 256, 8);
  const blind = new THREE.Group(); blind.position.set(0, EH, -.05); scene.add(blind);
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, EH), new THREE.MeshBasicMaterial({ map: T(bc, true, false), color: new THREE.Color(.62, .56, .5) })); m.position.y = -EH / 2; m.rotation.y = Math.PI; blind.add(m);
    const m2 = m.clone(); m2.rotation.y = 0; m2.position.z = -.005; blind.add(m2); }
  return {
    door: (a) => leaves.forEach((L) => { L.g.rotation.y = -L.s * a; }),
    lift: (t) => { blind.scale.y = Math.max(.001, 1 - t); blind.visible = t < .999; }
  };
}
function streetExterior() {
  const r = rng(404), XR = STR.XR, FZ = STR.FZ, CURB = STR.CURB, R1 = STR.ROAD1, OPP = STR.OPP, RY = -.14;
  const HZ = { value: new THREE.Color(.105, .12, .145) };
  const sm = (o) => { const m = new THREE.MeshBasicMaterial(o); m.customProgramCacheKey = () => "gatdis";
    m.onBeforeCompile = (sh) => { sh.uniforms.hazeC = HZ; sh.fragmentShader = "uniform vec3 hazeC;\n" + sh.fragmentShader.replace("#include <fog_fragment>", "#ifdef USE_FOG\n float fogFactor = 1.0 - exp(-.00055 * fogDepth * fogDepth);\n gl_FragColor.rgb = mix(gl_FragColor.rgb, hazeC, fogFactor);\n#endif"); }; return m; };
  const add = (m) => { m.layers.set(1); scene.add(m); return m; };
  const mesh = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); return add(m); };
  const box = (xa, xb, ya, yb, za, zb, mat) => mesh(new THREE.BoxGeometry(xb - xa, yb - ya, zb - za), mat, (xa + xb) / 2, (ya + yb) / 2, (za + zb) / 2);
  const col = (h, k) => { const c = new THREE.Color(h); return k === undefined ? c : c.multiplyScalar(k); };
  // husets kropp bakom fasaden: tegel på gavlarna i stället för en slät grå låda (texturen skalad efter väggarnas mått)
  let gavelM = null;
  const brickBox = (xa, xb, ya, yb, za, zb) => { const w = xb - xa, h = yb - ya, d = zb - za, g = new THREE.BoxGeometry(w, h, d), na = g.attributes.normal, ua = g.attributes.uv, TL = 2.4;
    for (let i = 0; i < ua.count; i++) { const ax = Math.abs(na.getX(i)), ay = Math.abs(na.getY(i)); ua.setXY(i, ua.getX(i) * (ax > .5 ? d : w) / TL, ua.getY(i) * (ay > .5 ? d : h) / TL); }
    if (!gavelM) gavelM = sm({ map: tex("radtegel"), color: col(0x7a6a62, .42) });
    const m = new THREE.Mesh(g, gavelM); m.position.set((xa + xb) / 2, (ya + yb) / 2, (za + zb) / 2); return add(m); };
  const tex = (k) => { const t = MATTEX[k].diff.clone(); t.needsUpdate = true; t.repeat.set(1, 1); t.offset.set(0, 0); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  // plan med världsskalad textur: (u, v) = läget i meter delat med tile
  const quadUV = (P, uv, map, color, extra) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P.flat(), 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv.flat(), 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
    return add(new THREE.Mesh(g, sm(Object.assign({ map: map || null, color }, extra || {})))); };
  const ground = (xa, xb, za, zb, y, map, tile, color) => quadUV([[xa, y, za], [xa, y, zb], [xb, y, zb], [xb, y, za]], [[xa / tile, za / tile], [xa / tile, zb / tile], [xb / tile, zb / tile], [xb / tile, za / tile]], map, color);
  const wall = (xa, xb, ya, yb, z, map, tile, color, face) => { const P = [[xa, ya, z], [xb, ya, z], [xb, yb, z], [xa, yb, z]]; if (face < 0) P.reverse();
    const uv = P.map(([x, y]) => [x / tile, y / tile]); return quadUV(P, uv, map, color); };
  const glowTex = T(radial([[0, "rgba(255,255,255,1)"], [.3, "rgba(255,255,255,.4)"], [1, "rgba(255,255,255,0)"]], 128), false, false);
  const glow = (w, h, c, x, y, z, rx, ry, a) => { const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: glowTex, color: col(c), transparent: true, opacity: a === undefined ? 1 : a, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), x, y, z); m.rotation.set(rx || 0, ry || 0, 0, "YXZ"); m.layers.set(2); return m; };
  const pool = (w, h, c, x, y, z, a) => glow(w, h, c, x, y + .012, z, -Math.PI / 2, 0, a);
  // himlen: skymning, ljusare nere vid taken; följer kameran
  const sky = (() => { const g = new THREE.SphereGeometry(470, 24, 12), p = g.attributes.position, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const t = clamp(p.getY(i) / 160, 0, 1), k = Math.pow(t, .45); c[i * 3] = .13 - .1 * k; c[i * 3 + 1] = .15 - .115 * k; c[i * 3 + 2] = .19 - .14 * k; }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3)); const m = mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })); m.renderOrder = -5; return m; })();
  // ---------- marken: trottoarplattor, kantsten av granit och gatsten, mörkt av regnet ----------
  const PL = tex("plattor"), GS = tex("gatsten");
  const XE = XR + STR.CW, ZA = -26, ZB = OPP + 26; // tvärgatorna i båda ändar
  ground(-XR, XR, FZ, CURB - .2, 0, PL, 2.2, col(0x5d6368));
  ground(-XR, XR, R1 + .2, OPP, 0, PL, 2.2, col(0x585e63));
  ground(-XE + 2, XE - 2, CURB, R1, RY, GS, 2.0, col(0x4a4f55));
  for (const [za, zb] of [[CURB - .2, CURB], [R1, R1 + .2]]) { box(-XR, XR, RY, .005, za, zb, sm({ color: col(0x4c4f52) })); }
  ground(-XE + 2, XE - 2, CURB, CURB + .45, RY + .004, null, 1, col(0x15181b));   // rännstenen: vattnet står kvar
  ground(-XE + 2, XE - 2, R1 - .45, R1, RY + .004, null, 1, col(0x15181b));
  for (const sg of [-1, 1]) { const a = sg > 0 ? XR : -XE, b = sg > 0 ? XE : -XR, ra = sg > 0 ? XR + 2 : -XE + 2, rb = sg > 0 ? XE - 2 : -XR - 2;
    ground(ra, rb, ZA, CURB, RY, GS, 2.0, col(0x4a4f55)); ground(ra, rb, R1, ZB, RY, GS, 2.0, col(0x4a4f55));                       // tvärgatan
    const near = sg > 0 ? [XR, XR + 2] : [-XR - 2, -XR], far = sg > 0 ? [XE - 2, XE] : [-XE, -XE + 2];
    ground(near[0], near[1], ZA, CURB, 0, PL, 2.2, col(0x5d6368)); ground(near[0], near[1], R1, ZB, 0, PL, 2.2, col(0x585e63));
    ground(far[0], far[1], ZA, ZB, 0, PL, 2.2, col(0x5a6065));                                                                     // trottoaren längs husen i änden
    box(sg > 0 ? XR + 1.8 : -XR - 2, sg > 0 ? XR + 2 : -XR - 1.8, RY, .005, ZA, CURB, sm({ color: col(0x4c4f52) })); box(sg > 0 ? XR + 1.8 : -XR - 2, sg > 0 ? XR + 2 : -XR - 1.8, RY, .005, R1, ZB, sm({ color: col(0x4c4f52) }));
    box(sg > 0 ? XE - 2 : -XE + 1.8, sg > 0 ? XE - 1.8 : -XE + 2, RY, .005, ZA, ZB, sm({ color: col(0x4c4f52) })); }
  // övergångsställe över gatan (textur ur Low road av Yarelon, CC BY): vita band längs gatan, gatsten emellan
  { const t = new THREE.TextureLoader().load("tex/overgangsstalle_diff.jpg"); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso;
    const xa = -8.1, xb = -4.9; quadUV([[xa, RY + .006, CURB], [xa, RY + .006, R1], [xb, RY + .006, R1], [xb, RY + .006, CURB]], [[0, 0], [0, (R1 - CURB) / 5.5], [(xb - xa) / 5.5, (R1 - CURB) / 5.5], [(xb - xa) / 5.5, 0]], t, col(0xffffff, .62));
    pool(3.4, 2.2, 0x6a5234, (xa + xb) / 2, RY + .008, CURB + 1.4, .35); }
  // ---------- vår sida: bottenvåningen ----------
  const BAND = 5.7, x0 = FOY.EX0, x1 = FOY.EX1, EH = FOY.EH;
  const OURS = [-6.45, 6.45]; // butikens hus är minst lika brett som foajén, så grannhusen aldrig når in i rummet
  { const m = tex("betong6"), c = col(0x3a3b3d);                         // butikens fasad: mörk, slät betong
    wall(OURS[0], x0, 0, BAND, FZ, m, 3, c, 1); wall(x1, OURS[1], 0, BAND, FZ, m, 3, c, 1); wall(x0, x1, EH, BAND, FZ, m, 3, c, 1); }
  // grannarnas bottenvåningar: puts i olika kulörer med skyltfönster
  const putsTone = [0x7a6c5c, 0x6c6a64, 0x7d6a58, 0x5f6466, 0x77705f];
  const shopTex = (w, h, seed, kinds) => { const q = rng(seed), ppm = 80, W = Math.round(w * ppm), H = Math.round(h * ppm), c = cnv(W, H), x = c.getContext("2d");
    x.clearRect(0, 0, W, H); const n = Math.max(1, Math.round(w / 3.2)), bw = W / n, lit = [];
    const names = ["KAFÉ", "BOKHANDEL", "BLOMMOR", "SKOMAKARE", "BAR", "FRISÖR", "VIN & DELI", "ANTIKT", "CYKLAR", "SKRÄDDARE"];
    for (let i = 0; i < n; i++) { const k = kinds ? kinds[i % kinds.length] : q(), X = i * bw, wx = X + bw * .1, ww = bw * .8, wy = H * .2, wh = H * .66;
      x.fillStyle = "rgba(14,15,16,.95)"; x.fillRect(wx - 6, wy - 6, ww + 12, wh + 12);
      if (k < .3) { // tänt kafé: varmt inne, stolar och bord som siluetter
        const g = x.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, "#e9b56a"); g.addColorStop(.6, "#a8672e"); g.addColorStop(1, "#4a2c16"); x.fillStyle = g; x.fillRect(wx, wy, ww, wh);
        x.fillStyle = "rgba(40,24,12,.85)"; for (let t = 0; t < 3; t++) { const tx = wx + ww * (.18 + t * .32); x.fillRect(tx - 18, wy + wh * .62, 36, 5); x.fillRect(tx - 2, wy + wh * .62, 4, wh * .38); x.fillRect(tx - 30, wy + wh * .7, 8, wh * .3); x.fillRect(tx + 22, wy + wh * .7, 8, wh * .3); }
        for (let l = 0; l < 3; l++) { const lx = wx + ww * (.2 + l * .3); x.fillStyle = "rgba(255,236,190,.9)"; x.beginPath(); x.arc(lx, wy + wh * .14, 7, 0, 7); x.fill(); }
        lit.push([(X + bw / 2) / ppm, 1]);
      } else if (k < .55) { // butik med skyltbelysning
        const g = x.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, "#38404a"); g.addColorStop(1, "#14181c"); x.fillStyle = g; x.fillRect(wx, wy, ww, wh);
        for (let s = 0; s < 4; s++) { const sx = wx + ww * (.12 + s * .22); x.fillStyle = `rgba(${120 + q() * 50 | 0},${100 + q() * 40 | 0},${80 + q() * 30 | 0},.55)`; x.fillRect(sx, wy + wh * (.35 + q() * .2), ww * .12, wh * (.25 + q() * .2)); }
        const sp = x.createLinearGradient(0, wy, 0, wy + wh * .5); sp.addColorStop(0, "rgba(255,226,170,.45)"); sp.addColorStop(1, "rgba(255,226,170,0)"); x.fillStyle = sp; x.fillRect(wx, wy, ww, wh * .5);
        lit.push([(X + bw / 2) / ppm, .55]);
      } else if (k < .8) { // nerdragen jalusi
        x.fillStyle = "#3e4245"; x.fillRect(wx, wy, ww, wh); for (let y = wy; y < wy + wh; y += 7) { x.fillStyle = "rgba(0,0,0,.35)"; x.fillRect(wx, y, ww, 2); x.fillStyle = "rgba(255,255,255,.06)"; x.fillRect(wx, y + 2, ww, 1); }
        x.fillStyle = "rgba(0,0,0,.25)"; x.fillRect(wx, wy + wh - 10, ww, 10);
      } else { // mörkt fönster och en port
        x.fillStyle = "#171a1e"; x.fillRect(wx, wy, ww * .58, wh); x.fillStyle = "#2a2018"; x.fillRect(wx + ww * .66, wy - 4, ww * .34, H - wy + 4);
        x.fillStyle = "rgba(200,190,170,.5)"; x.fillRect(wx + ww * .66 + 6, wy + wh * .5, 4, 20); }
      x.fillStyle = "rgba(0,0,0,.9)"; x.fillRect(wx + ww / 2 - 2, wy, 4, wh);                      // mittpost
      if (k < .55) { x.font = '600 ' + Math.round(H * .085) + 'px "Big Shoulders Display", "Arial Narrow", sans-serif'; x.textAlign = "center"; x.textBaseline = "middle";
        x.fillStyle = "rgba(255,232,190,.95)"; x.shadowColor = "rgba(255,200,130,.9)"; x.shadowBlur = 10; x.fillText(names[(q() * names.length) | 0], X + bw / 2, H * .1); x.shadowBlur = 0; }
    }
    return { t: T(c, true, false), lit }; };
  // en rad skyltfönster på fasaden z, vänd åt face (+1 ut mot gatan på vår sida, −1 på andra sidan)
  const shopRow = (xa, xb, z, face, seed, kinds) => { const h = 4.0, s = shopTex(xb - xa, h, seed, kinds), zz = z + face * .012;
    const P = [[xa, 0, zz], [xb, 0, zz], [xb, h, zz], [xa, h, zz]], uv = [[0, 0], [1, 0], [1, 1], [0, 1]]; if (face < 0) { P.reverse(); uv.reverse(); }
    quadUV(P, uv, s.t, col(0xffffff, 1.05), { transparent: true, alphaTest: .02 });
    for (const [u, k] of s.lit) { const px = xa + u, pz = z + face * 1.6; pool(3.2, 3.4, 0x7a5330, px, face > 0 ? 0 : 0, pz, .55 * k); pool(1.6, 6.5, 0x5a3c22, px, RY, z + face * (Math.abs((face > 0 ? CURB : R1) - z) + 2.6), .45 * k); } };
  const SIDE = []; for (const s of [-1, 1]) { let x = s * OURS[1]; while (Math.abs(x) < XR) { const w = 9 + 3 * ((r() * 3) | 0), xa = s > 0 ? x : x - w, xb = s > 0 ? x + w : x; SIDE.push([Math.max(-XR, xa), Math.min(XR, xb)]); x += s * w; } }
  if (!MODELS.butikshus) SIDE.forEach(([xa, xb], i) => { const c = col(putsTone[i % putsTone.length], .55);
    wall(xa, xb, 0, BAND, FZ, tex("puts"), 2.6, c, 1); shopRow(xa + .3, xb - .3, FZ, 1, 30 + i); });
  box(MODELS.butikshus ? OURS[0] : -XR, MODELS.butikshus ? OURS[1] : XR, BAND - .12, BAND + .12, FZ, FZ + .22, sm({ color: col(0x4a4846) }));             // gesims över bottenvåningen
  // ---------- skylten: EN BÄTTRE BILD i varmt vitt ljus över entrén ----------
  const SY = 4.5, SW = 5.4, SH = .62;
  box(-SW / 2, SW / 2, SY - SH / 2 - .04, SY + SH / 2 + .04, FZ, FZ + .14, sm({ color: col(0x121314) }));
  let signMat;
  { const c = cnv(2048, 236), x = c.getContext("2d");
    const draw = () => { x.fillStyle = "#121314"; x.fillRect(0, 0, 2048, 236); x.fillStyle = "#fff4e2"; x.textAlign = "center"; x.textBaseline = "middle"; x.font = '300 140px "Jost", "Archivo", sans-serif';
      if (x.letterSpacing !== undefined) x.letterSpacing = "40px"; x.shadowColor = "rgba(255,214,160,.9)"; x.shadowBlur = 26; x.fillText("EN BÄTTRE BILD", 1024 + 20, 122); x.shadowBlur = 0; };
    draw(); const st = T(c, true, false); signMat = new THREE.MeshBasicMaterial({ map: st, fog: false }); signMat.color.setRGB(1.5, 1.42, 1.32);
    mesh(new THREE.PlaneGeometry(SW - .1, SH), signMat, 0, SY, FZ + .145);
    if (document.fonts && document.fonts.load) document.fonts.load('300 140px "Jost"').then(() => { draw(); st.needsUpdate = true; }).catch(() => {}); }
  glow(SW * 1.7, 2.6, 0x6a4a2c, 0, SY, FZ + .02, 0, 0, .8);                                       // skenet på fasaden
  for (const sx of [-1.9, 1.9]) { // två svanhalsar som lyser ner på skylten
    const arm = mesh(new THREE.CylinderGeometry(.016, .016, .62, 8), sm({ color: col(0x111111) }), sx, SY + .58, FZ + .3); arm.rotation.x = Math.PI / 2 - .5;
    const hd = mesh(new THREE.ConeGeometry(.09, .14, 14, 1, true), sm({ color: col(0x161616), side: THREE.DoubleSide }), sx, SY + .66, FZ + .58); hd.rotation.x = -.5;
    glow(.26, .26, 0xffe2b0, sx, SY + .6, FZ + .6, -Math.PI / 2 - .5, 0, 1); }
  pool(6.5, 3.2, 0x8a6036, 0, 0, FZ + 1.9, .5);                                                    // foajéns ljus faller ut på trottoaren
  pool(2.6, 9, 0x6a4626, 0, RY, CURB + 4.2, .35);
  // ---------- fasadsatsen: våningarna ovanför, på båda sidor ----------
  const kitIndex = (root) => { if (!root) return null; root.updateMatrixWorld(true); const idx = {};
    root.traverse((o) => { if (!o.isMesh) return; const nm = o.parent && o.parent !== root ? o.parent.name : o.name;
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); if (!g.attributes.normal) g.computeVertexNormals();
      (idx[nm] = idx[nm] || []).push({ g, mat: o.material }); });
    for (const k in idx) { const b = new THREE.Box3(); idx[k].forEach((pc) => { pc.g.computeBoundingBox(); b.union(pc.g.boundingBox); }); idx[k].box = b; }
    return idx; };
  const KIT = kitIndex(MODELS.fasad), ACK = kitIndex(MODELS.ac), FEK = kitIndex(MODELS.brandtrappa), KB = {};
  const ROT = [new THREE.Matrix4(), new THREE.Matrix4().makeRotationY(Math.PI)], kv = new V3(); let kitXf = null; // kitXf: hela raden vriden (husen i gatans ände)
  const kitAdd = (idx, key, M, tint, side, glass) => { const parts = idx && idx[key]; if (!parts) return false; const nmM = new THREE.Matrix3().getNormalMatrix(M);
    for (const pc of parts) { const mn = pc.mat.name || "x"; const B = KB[mn] || (KB[mn] = { p: [], u: [], c: [], mat: pc.mat });
      const g = pc.g.clone(); g.applyMatrix4(M); const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv, isG = /glass/i.test(mn);
      for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); if (kitXf) { kv.set(pa.getX(i), y, pa.getZ(i)).applyMatrix4(kitXf); B.p.push(kv.x, kv.y, kv.z); } else B.p.push(pa.getX(i), y, pa.getZ(i)); B.u.push(ua ? ua.getX(i) : 0, ua ? ua.getY(i) : 0);
        const nz = na.getZ(i) * side, ny = na.getY(i), hgt = .62 + .38 * clamp(1 - (y - 6) / 16, 0, 1);
        const k = (.5 + .34 * Math.max(0, nz) + .12 * Math.max(0, ny) - .24 * Math.max(0, -ny)) * hgt, t = isG ? glass : tint;
        B.c.push(t[0] * (isG ? 1 : k), t[1] * (isG ? 1 : k), t[2] * (isG ? 1 : k)); } }
    return true; };
  const at = (x, y, z, side) => new THREE.Matrix4().makeTranslation(x, y, z).multiply(ROT[side > 0 ? 0 : 1]);
  const kitPlace = (idx, key, cx, yMin, cz, tint, side) => { const b = idx && idx[key] && idx[key].box; if (!b) return false;
    return kitAdd(idx, key, at(cx, yMin, cz, side).multiply(new THREE.Matrix4().makeTranslation(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2)), tint, side, [0, 0, 0]); };
  const KTINT = [[.5, .47, .44], [.6, .54, .46], [.52, .5, .5], [.66, .6, .52], [.44, .43, .45]];
  const KTYPES = [["centered_large", "_01", "_02", "_03"], ["centered_small", "_01", "_02", "_03"], ["centered_double", "_01", "_02", "_03"], ["offset_small", "_01", "_03", "_05"]];
  let fe = 0;
  const kitHouse = (xa, xb, side, zf, yb0, nf, ti) => {
    if (!KIT) return; const n = Math.max(1, Math.round((xb - xa) / 3)), cw = (xb - xa) / n, tint = KTINT[ti % KTINT.length], TY = KTYPES[(r() * KTYPES.length) | 0];
    const S = new THREE.Matrix4().makeScale(cw / 3, 1, 1);
    for (let f = 0; f < nf; f++) { const yb = yb0 + 3 * f, suf = f === nf - 1 ? TY[1] : f === 0 ? TY[3] : TY[2];
      for (let i = 0; i < n; i++) { const xs = side > 0 ? xa + i * cw : xa + (i + 1) * cw, plain = r() < .08;
        const wk = plain ? "wall_standard_standard_01" : "wall_window_" + TY[0] + suf, nk = "window_" + TY[0] + suf, b = KIT[wk] && KIT[wk].box; if (!b) continue;
        const M = at(xs, yb, zf, side).multiply(S).multiply(new THREE.Matrix4().makeTranslation(-b.min.x, -b.min.y, -b.min.z));
        const k = r(), glass = k < .3 ? [1.05, .72, .4] : k < .4 ? [.5, .34, .2] : k < .78 ? [.05, .06, .08] : [.13, .15, .19];
        kitAdd(KIT, wk, M, tint, side); if (!plain) kitAdd(KIT, nk, M, tint, side, glass);
        if (f > 0) { const cb = KIT.cornice_standard_standard_01 && KIT.cornice_standard_standard_01.box;
          if (cb) kitAdd(KIT, "cornice_standard_standard_01", at(xs, yb - .1, zf, side).multiply(S).multiply(new THREE.Matrix4().makeTranslation(-cb.min.x, -cb.min.y, 0)), tint, side); }
        if (!plain && f > 0 && ACK && r() < .22) { const key = r() < .55 ? "exterior_aircon_unit" : "exterior_aircon_unit_rusted", ab = ACK[key] && ACK[key].box;
          if (ab) kitPlace(ACK, key, xs + side * (cw / 2 + (r() - .5) * .6), yb - .55, zf + side * ((ab.max.z - ab.min.z) / 2 + .02), [.55, .55, .55], side); }
      } }
    const crb = KIT.crown_standard_standard_01 && KIT.crown_standard_standard_01.box, top = yb0 + 3 * nf;
    if (crb) for (let i = 0; i < n; i++) { const xs = side > 0 ? xa + i * cw : xa + (i + 1) * cw; kitAdd(KIT, "crown_standard_standard_01", at(xs, top, zf, side).multiply(S).multiply(new THREE.Matrix4().makeTranslation(-crb.min.x, -crb.min.y, 0)), tint, side); }
    // husets kropp bakom fasaden och taket, så att glappen och taklinjen blir hela
    { const bm = brickBox(xa, xb, yb0, top + .3, side > 0 ? zf - 12 : zf, side > 0 ? zf : zf + 12); if (kitXf) bm.applyMatrix4(kitXf); }
    if (FEK && fe < 1 && side < 0 && nf >= 3 && xb - xa > 8 && r() < .7) { fe++; const xc = (xa + xb) / 2 + (r() - .5) * 3, ft = [.32, .32, .34];
      for (let f = 0; f < nf; f++) { const yb = yb0 + 3 * f;
        kitPlace(FEK, "modular_fire_escape_platform_middle", xc, yb - .72 + 3, zf + side * .68, ft, side); kitPlace(FEK, "modular_fire_escape_railing_middle", xc, yb + .03 + 3, zf + side * .7, ft, side);
        if (f < nf - 1) { const b = FEK.modular_fire_escape_stairs && FEK.modular_fire_escape_stairs.box; if (b) kitAdd(FEK, "modular_fire_escape_stairs", at(xc + (f % 2 ? .5 : -.5) * side, yb + .03, zf + side * .69, side).multiply(new THREE.Matrix4().makeScale(f % 2 ? -1 : 1, .75, 1)).multiply(new THREE.Matrix4().makeTranslation(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2)), ft, side, [0, 0, 0]); } } }
    return top; };
  // vår sida: butikens hus över foajén och grannhusen
  kitHouse(OURS[0], OURS[1], 1, FZ, BAND + .12, isTouch ? 3 : 4, 0);
  // ---------- husen från Sketchfab (Fridqeir, CC BY 4.0): tegelfasader i gatuplan och låga betonghus ----------
  const groups = (root) => { const out = {}; if (!root) return out; root.updateMatrixWorld(true);
    root.traverse((o) => { if (!o.isMesh) return; const k = o.parent ? o.parent.name : o.name, g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
      if (!g.attributes.normal) g.computeVertexNormals(); (out[k] = out[k] || []).push({ g, mat: o.material, mn: o.material.name || "" }); });
    return out; };
  // vrid så att framsidan pekar mot +z och lägg hörnet (min x, min y, baksidan) i origo
  const normalize = (parts, f) => { const R = new THREE.Matrix4().makeRotationY(-Math.atan2(f[0], f[1])), bb = new THREE.Box3();
    const ps = parts.map((p) => { const g = p.g.clone().applyMatrix4(R); g.computeBoundingBox(); bb.union(g.boundingBox); return Object.assign({}, p, { g }); });
    ps.forEach((p) => p.g.translate(-bb.min.x, -bb.min.y, -bb.min.z)); const sz = bb.getSize(new V3()); return { parts: ps, w: sz.x, h: sz.y, d: sz.z }; };
  const frontOf = (parts) => { let fx = 0, fz = 0; parts.filter((p) => /window/i.test(p.mn)).forEach((p) => { const n = p.g.attributes.normal; for (let i = 0; i < n.count; i++) { fx += n.getX(i); fz += n.getZ(i); } });
    const l = Math.hypot(fx, fz); return l > 1e-3 ? [fx / l, fz / l] : [0, 1]; };
  const TH = groups(MODELS.tegelhus), BH = groups(MODELS.betonghus);
  const TV = Object.keys(TH).filter((k) => /^Building_[123]$/.test(k)).sort().map((k) => normalize(TH[k], frontOf(TH[k])));
  // betonghusen: framsidan är den sida av huvudmeshen (graffitifasaden) som har mest yta
  const frontByArea = (parts) => { const A = { px: 0, nx: 0, pz: 0, nz: 0 }, a = new V3(), b = new V3(), c = new V3(), n = new V3();
    parts.filter((p) => !/side|concrete/i.test(p.mn)).forEach((p) => { const pa = p.g.attributes.position; for (let i = 0; i + 2 < pa.count; i += 3) {
      a.fromBufferAttribute(pa, i); b.fromBufferAttribute(pa, i + 1); c.fromBufferAttribute(pa, i + 2); n.subVectors(b, a).cross(c.clone().sub(a)); const ar = n.length() / 2; if (ar < 1e-9) continue; n.normalize();
      if (Math.abs(n.x) > .8) A[n.x > 0 ? "px" : "nx"] += ar; else if (Math.abs(n.z) > .8) A[n.z > 0 ? "pz" : "nz"] += ar; } });
    const k = Object.keys(A).reduce((m, q) => A[q] > A[m] ? q : m, "pz"); return { px: [1, 0], nx: [-1, 0], pz: [0, 1], nz: [0, -1] }[k]; };
  const BV = Object.keys(BH).filter((k) => /^building_\d$/i.test(k)).sort().map((k) => normalize(BH[k], frontByArea(BH[k])));
  const placeV = (V, xa, zf, side, s, dark, xf) => { const M = (side > 0 ? new THREE.Matrix4().makeTranslation(xa, 0, zf) : new THREE.Matrix4().makeTranslation(xa + V.w * s, 0, zf).multiply(ROT[1])).multiply(new THREE.Matrix4().makeScale(s, s, s));
    const lit = r() < .45;
    for (const p of V.parts) { const g = p.g.clone().applyMatrix4(M), pa = g.attributes.position, na = g.attributes.normal, cc = new Float32Array(pa.count * 3), win = /window/i.test(p.mn);
      for (let i = 0; i < pa.count; i++) { const nz = na.getZ(i) * side, ny = na.getY(i), y = pa.getY(i);
        const k = win ? (lit ? 1.25 : .5) : (.5 + .34 * Math.max(0, nz) + .12 * Math.max(0, ny) - .24 * Math.max(0, -ny)) * (.7 + .3 * clamp(1 - y / 14, 0, 1)) * dark;
        cc[i * 3] = k * (win && lit ? 1.15 : 1); cc[i * 3 + 1] = k * (win && lit ? .86 : 1); cc[i * 3 + 2] = k * (win && lit ? .6 : 1); }
      g.setAttribute("color", new THREE.BufferAttribute(cc, 3)); if (xf) g.applyMatrix4(xf);
      add(new THREE.Mesh(g, sm({ map: p.mat.map || null, vertexColors: true, side: THREE.DoubleSide }))); }
    return lit; };
  // andra sidan: tegelfasader med butiker i gatuplan och fasadsatsens våningar ovanpå, ibland ett lågt betonghus
  { let x = -XR, i = 0; const kinds = [[.1, .9, .6], [.7, .4], [.2, .65, .85], [.5, .1], [.9, .3, .7]];
    while (x < XR) { let w = Math.min(XR - x, 9 + 3 * ((r() * 3) | 0)); if (w < 3) break;
      if (BV.length && i % 4 === 2 && XR - x > 9) { // lågt betonghus med graffiti
        const V = BV[(i >> 2) % BV.length], s = 1; w = V.w * s; placeV(V, x, OPP + V.d * s, -1, s, .62);
        brickBox(x + .1, x + w - .1, 0, V.h * s - .2, OPP + .8, OPP + V.d * s - .3); x += w; i++; continue; } // kroppen ligger innanför: fasaden sitter en bit in från framkanten
      const xa = x, xb = x + w;
      if (TV.length) { const V = TV[i % TV.length], n = Math.max(1, Math.round(w / V.w)), s = w / (n * V.w), H = V.h * s; let anyLit = false;
        for (let j = 0; j < n; j++) anyLit = placeV(V, xa + j * V.w * s, OPP, -1, s, .58) || anyLit;
        brickBox(xa, xb, 0, H, OPP, OPP + 12);
        if (anyLit) pool(w * .8, 3.4, 0x7a5330, (xa + xb) / 2, 0, OPP - 1.6, .4);
        box(xa, xb, H - .08, H + .14, OPP - .3, OPP, sm({ color: col(0x3e3c3a) }));
        kitHouse(xa, xb, -1, OPP, H + .14, (isTouch ? 2 : 2) + ((r() * 3) | 0), i + 2);
      } else { const tone = col(putsTone[(i + 2) % putsTone.length], .55);
        wall(xa, xb, 0, 4.3, OPP, tex(i % 2 ? "puts" : "tegelputs"), 2.6, tone, -1);
        shopRow(xa + .25, xb - .25, OPP, -1, 70 + i, kinds[i % kinds.length]);
        box(xa, xb, 4.2, 4.42, OPP - .22, OPP, sm({ color: col(0x4a4846) }));
        kitHouse(xa, xb, -1, OPP, 4.42, 3 + ((r() * 3) | 0), i + 2); }
      x = xb; i++; } }
  // vår sida: grannhusen är tegelhus med butik i gatuplan (Brick Shop Building, Fridqeir), ibland med fler våningar ovanpå
  { const SG = groups(MODELS.butikshus), SV = Object.keys(SG).filter((k) => /storefront/i.test(k)).map((k) => normalize(SG[k], [0, 1]))[0];
    SIDE.forEach(([xa, xb], i) => {
      if (!SV) { kitHouse(xa, xb, 1, FZ, BAND + .12, (isTouch ? 2 : 3) + ((r() * 2) | 0), i + 1); return; }
      const w = xb - xa, n = Math.max(1, Math.round(w / 9.4)), s = w / (n * SV.w), H = SV.h * s;
      for (let j = 0; j < n; j++) placeV(SV, xa + j * SV.w * s, FZ - SV.d * s, 1, s, .6);
      pool(w * .7, 3, 0x7a5330, (xa + xb) / 2, 0, FZ + 1.5, .35);
      if (i % 3 !== 1) kitHouse(xa, xb, 1, FZ - .02, H, (isTouch ? 1 : 2) + ((r() * 2) | 0), i + 1); }); }
  // husen i gatans båda ändar, på andra sidan tvärgatorna: samma sorts rad, vriden så att den vetter mot oss
  for (const sg of [1, -1]) { const xf = new THREE.Matrix4().makeTranslation(sg * XE, 0, (ZA + ZB) / 2).multiply(new THREE.Matrix4().makeRotationY(sg * Math.PI / 2)), half = (ZB - ZA) / 2;
    kitXf = xf; let x = -half, i = 0;
    while (x < half) { const w = Math.min(half - x, 9 + 3 * ((r() * 3) | 0)); if (w < 3) break; const xa = x, xb = x + w;
      if (TV.length) { const V = TV[(i + 1 + (sg > 0 ? 0 : 1)) % TV.length], n = Math.max(1, Math.round(w / V.w)), sc = w / (n * V.w), H = V.h * sc;
        for (let j = 0; j < n; j++) placeV(V, xa + j * V.w * sc, 0, -1, sc, .55, xf);
        const bm = brickBox(xa, xb, 0, H, 0, 12); bm.applyMatrix4(xf);
        kitHouse(xa, xb, -1, 0, H + .14, (isTouch ? 2 : 3) + ((r() * 3) | 0), i + 7);
      } else kitHouse(xa, xb, -1, 0, 0, 5, i + 7);
      x = xb; i++; }
    kitXf = null; }
  // ---------- höghus i fjärran (Low Poly Night City Building Skyline, 99.Miles, CC BY): tända fönster över taken runt om ----------
  { const parts = Object.values(groups(MODELS.skyline)).flat();
    if (parts.length) { camera.far = 500; camera.updateProjectionMatrix();
      const bb = new THREE.Box3(); parts.forEach((p) => { p.g.computeBoundingBox(); bb.union(p.g.boundingBox); }); const c = bb.getCenter(new V3()), m0 = parts[0].mat;
      const mat = new THREE.ShaderMaterial({ uniforms: { tB: { value: m0.map }, tE: { value: m0.emissiveMap || m0.map }, hz: HZ }, side: THREE.DoubleSide,
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
        fragmentShader: "uniform sampler2D tB, tE; uniform vec3 hz; varying vec2 vUv; void main(){ vec3 b = texture2D(tB, vUv).rgb, e = texture2D(tE, vUv).rgb; vec3 c = b * .3 + e * e * 4.0; gl_FragColor = vec4(mix(c, hz * 1.3, .22), 1.); }" });
      const ring = [[165, 10, .3, 1.45], [-180, 0, 2.2, 1.35], [25, 185, 1.1, 1.3], [-100, 170, 4, 1.2], [115, -160, 5.1, 1.3], [-120, -150, 3.3, 1.2]], rq = rng(77);
      for (let k = 0; k < (isTouch ? 8 : 12); k++) { const a = k / (isTouch ? 8 : 12) * Math.PI * 2 + rq() * .3, rad = 205 + rq() * 45; ring.push([Math.cos(a) * rad, Math.sin(a) * rad + 8, rq() * 6.28, 1.15 + rq() * .5]); } // en andra, högre ring längre bort
      for (const [cx, cz, ry, sc] of ring) {
        const M = new THREE.Matrix4().makeTranslation(cx, -2, cz).multiply(new THREE.Matrix4().makeRotationY(ry)).multiply(new THREE.Matrix4().makeScale(sc, sc, sc)).multiply(new THREE.Matrix4().makeTranslation(-c.x, -bb.min.y, -c.z));
        parts.forEach((p) => { const g = p.g.clone().applyMatrix4(M); add(new THREE.Mesh(g, mat)); }); } } }
  // satsens hinkar: en geometri per material
  for (const mn in KB) { const B = KB[mn], g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(B.p, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(B.u, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(B.c, 3)); g.computeVertexNormals(); g.computeBoundingSphere();
    const src = B.mat, blend = src.transparent || /exterior_aircon_unit(_rusted)?_02/.test(mn), glassM = /glass/i.test(mn);
    const m = glassM ? sm({ vertexColors: true, side: THREE.DoubleSide }) : blend ? sm({ vertexColors: true, color: 0x3a3c3e, alphaMap: src.map || null, alphaTest: .5, side: THREE.DoubleSide })
      : sm({ map: src.map || null, vertexColors: true, side: THREE.DoubleSide });
    add(new THREE.Mesh(g, m)); }
  // ---------- parkerade bilar (Generic passenger car pack av Comrade1280, CC BY 4.0) ----------
  // paketet står i en ring: varje kaross får sina närmaste hjul, vrids så att längden ligger längs x och lackas om i mörka kulörer
  const CARS = (() => { const root = MODELS.bilar; if (!root) return null; root.updateMatrixWorld(true); const bodies = {}, wheels = [];
    root.traverse((o) => { if (!o.isMesh) return; const pn = o.parent ? o.parent.name : "", g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
      if (!g.attributes.normal) g.computeVertexNormals(); g.computeBoundingBox(); const c = g.boundingBox.getCenter(new V3()), mn = o.material.name || "";
      const kind = /glass/i.test(mn) ? "glass" : /optic/i.test(mn) ? "optics" : /whee/i.test(mn) || /^wheel/i.test(pn) ? "wheel" : "body";
      if (/body/i.test(pn)) { const bk = pn.toLowerCase().replace(/[_ ]?body.*$/, ""); (bodies[bk] = bodies[bk] || []).push({ g, mat: o.material, kind, c }); }
      else if (kind === "wheel") wheels.push({ g, mat: o.material, kind, c }); });
    const out = {};
    for (const k in bodies) { const P = bodies[k], b = P.find((p) => p.kind === "body"); if (!b) continue;
      const pa = b.g.attributes.position; let mx = 0, mz = 0; for (let i = 0; i < pa.count; i++) { mx += pa.getX(i); mz += pa.getZ(i); } mx /= pa.count; mz /= pa.count;
      let sxx = 0, szz = 0, sxz = 0; for (let i = 0; i < pa.count; i++) { const dx = pa.getX(i) - mx, dz = pa.getZ(i) - mz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; }
      const th = .5 * Math.atan2(2 * sxz, sxx - szz); // längdaxelns riktning
      const parts = P.concat(wheels.filter((w) => Math.hypot(w.c.x - mx, w.c.z - mz) < 2.6));
      const M = new THREE.Matrix4().makeRotationY(th).multiply(new THREE.Matrix4().makeTranslation(-mx, 0, -mz)), bb = new THREE.Box3();
      const gs = parts.map((p) => { const g = p.g.clone().applyMatrix4(M); g.computeBoundingBox(); bb.union(g.boundingBox); return { g, mat: p.mat, kind: p.kind }; });
      gs.forEach((p) => p.g.translate(0, -bb.min.y, 0)); out[k] = { parts: gs, len: bb.max.x - bb.min.x }; }
    return out; })();
  const grayTex = (() => { const cache = new Map(); return (map) => { if (!map || !map.image) return null; if (cache.has(map)) return cache.get(map);
    const im = map.image, w = Math.min(512, im.width || 512), h = Math.min(512, im.height || 512), c = cnv(w, h), x = c.getContext("2d"); x.drawImage(im, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h), a = d.data; let sum = 0; for (let i = 0; i < a.length; i += 4) sum += .3 * a[i] + .59 * a[i + 1] + .11 * a[i + 2];
    const k = 205 / Math.max(1, sum / (a.length / 4)); for (let i = 0; i < a.length; i += 4) { const l = Math.min(255, (.3 * a[i] + .59 * a[i + 1] + .11 * a[i + 2]) * k); a[i] = a[i + 1] = a[i + 2] = l; }
    x.putImageData(d, 0, 0); const t = T(c, true, false); t.flipY = map.flipY; cache.set(map, t); return t; }; })();
  const shTex = T(radial([[0, "rgba(0,0,0,.85)"], [.55, "rgba(0,0,0,.55)"], [1, "rgba(0,0,0,0)"]], 128), false, false);
  const car = (key, x, z, yaw, paint, len) => { const C = CARS && CARS[key]; if (!C) return; const sc = len / C.len, y0 = RY;
    const M = new THREE.Matrix4().makeTranslation(x, y0, z).multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(new THREE.Matrix4().makeScale(sc, sc, sc));
    for (const p of C.parts) { const g = p.g.clone().applyMatrix4(M), na = g.attributes.normal, n = na.count, cc = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const ny = na.getY(i), side = Math.abs(na.getX(i) * Math.sin(yaw) + na.getZ(i) * Math.cos(yaw));
        const k = p.kind === "glass" ? .55 + .5 * Math.max(0, ny) : (.3 + .55 * Math.max(0, ny) + .2 * side) * (p.kind === "wheel" ? .55 : 1); cc[i * 3] = cc[i * 3 + 1] = cc[i * 3 + 2] = k; }
      g.setAttribute("color", new THREE.BufferAttribute(cc, 3));
      const m = p.kind === "body" ? sm({ map: grayTex(p.mat.map), color: paint, vertexColors: true })
        : p.kind === "glass" ? sm({ color: col(0x161b22), vertexColors: true })
        : p.kind === "optics" ? sm({ map: p.mat.map || null, color: col(0x8a8680), vertexColors: true })
        : sm({ map: p.mat.map || null, color: col(0x9a9a9a), vertexColors: true });
      m.side = THREE.DoubleSide; add(new THREE.Mesh(g, m)); }
    const s = mesh(new THREE.PlaneGeometry(len * 1.12, len * .5), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: .8 }), x, y0 + .006, z); s.rotation.set(-Math.PI / 2, 0, yaw, "YXZ");
    pool(len * .9, 1.2, 0x2a3036, x, y0 + .01, z + (z < (CURB + R1) / 2 ? 1.4 : -1.4), .35); }; // blank plåt speglas i det våta
  if (CARS) {
    const lane = CURB + 1.05, lane2 = R1 - 1.05;
    car("sedan", -11.5, lane, 0, col(0x1b2a44, .62), 4.6);
    car("wagon", 10.8, lane, Math.PI, col(0x3a1e22, .7), 4.8);
    car("minivan", -2.5, lane2, Math.PI, col(0x2a2d30, .7), 4.9);
    car("suv", 16, lane2, 0, col(0x15171a, .8), 4.9);
    if (!isTouch) { car("hatchback", -18, lane, 0, col(0x4a4a46, .6), 4.2); car("compact", 7, lane2, Math.PI, col(0x2f3a30, .65), 3.9); }
  }
  // ---------- gatlyktor vid kantstenen och lampor i vajrar över gatan ----------
  // ---------- lyktor (simple collection of low poly street lights, lupas, CC BY) och gatuprylar (City Props Collection, TampaJoey) ----------
  // ett föremål: fot i origo (lyktor: stolpens fot, armen mot +z), längsta sidan längs x om long är satt
  const objOf = (parts, o) => { o = o || {}; let f = [0, 1];
    const vsOf = (p) => p.g.attributes.position; const allMin = Math.min(...parts.map((p) => { p.g.computeBoundingBox(); return p.g.boundingBox.min.y; }));
    const allMax = Math.max(...parts.map((p) => p.g.boundingBox.max.y)), h = allMax - allMin;
    let px = 0, pz = 0, pn = 0; parts.forEach((p) => { const a = vsOf(p); for (let i = 0; i < a.count; i++) if (a.getY(i) < allMin + h * .05) { px += a.getX(i); pz += a.getZ(i); pn++; } }); px /= pn || 1; pz /= pn || 1;
    if (o.arm) { let ex = 0, ez = 0, en = 0; parts.filter((p) => /emit/i.test(p.mn)).forEach((p) => { const a = vsOf(p); for (let i = 0; i < a.count; i++) { ex += a.getX(i); ez += a.getZ(i); en++; } });
      if (en) { const dx = ex / en - px, dz = ez / en - pz, l = Math.hypot(dx, dz); if (l > 1e-4) f = [dx / l, dz / l]; } }
    if (o.long) { let sxx = 0, szz = 0, sxz = 0; parts.forEach((p) => { const a = vsOf(p); for (let i = 0; i < a.count; i++) { const dx = a.getX(i) - px, dz = a.getZ(i) - pz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; } });
      const th = .5 * Math.atan2(2 * sxz, sxx - szz); f = [Math.sin(th - Math.PI / 2), Math.cos(th - Math.PI / 2)]; }
    const R = new THREE.Matrix4().makeRotationY(-Math.atan2(f[0], f[1])).multiply(new THREE.Matrix4().makeTranslation(-px, -allMin, -pz)), bb = new THREE.Box3();
    const ps = parts.map((p) => { const g = p.g.clone().applyMatrix4(R); g.computeBoundingBox(); bb.union(g.boundingBox); return Object.assign({}, p, { g }); });
    if (!o.arm) { const c = bb.getCenter(new V3()); ps.forEach((p) => p.g.translate(-c.x, 0, -c.z)); }
    let head = null; ps.filter((p) => /emit/i.test(p.mn)).forEach((p) => { p.g.computeBoundingBox(); const c = p.g.boundingBox.getCenter(new V3()); head = head ? head.lerp(c, .5) : c; });
    const sz = new THREE.Box3().setFromPoints(ps.flatMap((p) => { p.g.computeBoundingBox(); return [p.g.boundingBox.min, p.g.boundingBox.max]; })).getSize(new V3());
    return { parts: ps, h: sz.y, w: Math.max(sz.x, sz.z), head }; };
  const lampC = 0xffd6a0;
  const placeObj = (O, x, y, z, yaw, sc, dark) => { const M = new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(new THREE.Matrix4().makeScale(sc, sc, sc));
    for (const p of O.parts) { const g = p.g.clone().applyMatrix4(M);
      if (/emit/i.test(p.mn)) { add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col(lampC, 1.7), fog: false, side: THREE.DoubleSide }))); continue; }
      const na = g.attributes.normal, cc = new Float32Array(na.count * 3);
      for (let i = 0; i < na.count; i++) { const k = (.38 + .42 * Math.max(0, na.getY(i)) + .22 * Math.abs(na.getZ(i))) * (dark || .7); cc[i * 3] = cc[i * 3 + 1] = cc[i * 3 + 2] = k; }
      g.setAttribute("color", new THREE.BufferAttribute(cc, 3));
      add(new THREE.Mesh(g, sm({ map: p.mat.map || null, color: p.mat.map ? 0xffffff : col(0x2a2c2e), vertexColors: true, side: THREE.DoubleSide }))); }
    return O.head ? O.head.clone().applyMatrix4(M) : null; };
  const LG = groups(MODELS.lyktor), PG = groups(MODELS.gatuprylar);
  const LAMP = LG.FarolaModernaRodonaDe1 ? objOf(LG.FarolaModernaRodonaDe1, { arm: true }) : null, WALL = LG.FarolaPared1 ? objOf(LG.FarolaPared1, { arm: true }) : null;
  const lampSprite = (p, sc, a) => { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col(lampC), transparent: true, opacity: a, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); h.scale.set(sc, sc, 1); h.position.copy(p); add(h).layers.set(2); };
  const poleM = sm({ color: col(0x1a1c1e) });
  for (const lx of [-17.5, -7.5, 7.5, 17.5]) { const lz = CURB - .45; let hp = null;
    if (LAMP) hp = placeObj(LAMP, lx, 0, lz, 0, 5.6 / LAMP.h, .55);
    if (!hp) { mesh(new THREE.CylinderGeometry(.06, .09, 5.2, 10), poleM, lx, 2.6, lz); box(lx - .05, lx + .05, 5.1, 5.18, lz, lz + 1.0, poleM);
      box(lx - .18, lx + .18, 4.94, 5.14, lz + .8, lz + 1.25, sm({ color: col(0x202224) })); hp = new V3(lx, 4.9, lz + 1.02); }
    lampSprite(hp.clone().add(new V3(0, -.12, 0)), 1.2, .5);
    pool(5.5, 5, 0x8a6a44, hp.x, 0, Math.min(hp.z, CURB - .3) - .6, .75); pool(5, 4.5, 0x7a5c3a, hp.x, RY, hp.z + 1.2, .6); pool(1.3, 7.5, 0x6a5234, hp.x, RY, hp.z + 4.5, .55); }
  if (WALL) for (const wx of [-3.75, 3.75]) { const hp = placeObj(WALL, wx, 2.75, FZ, 0, .62 / WALL.h, .5); if (hp) { lampSprite(hp, .7, .55); pool(2.6, 2.4, 0x8a6a44, wx, 0, FZ + 1.1, .45); } }
  // gatuprylar: soptunnor, en bänk, ett elskåp, brunnslock och dagvattenbrunnar
  const PO = (k, o) => PG[k] ? objOf(PG[k], o) : null;
  const put = (O, x, y, z, yaw, size, by, dark) => { if (!O) return; const sc = size / (by === "w" ? O.w : O.h); placeObj(O, x, y, z, yaw, sc, dark); };
  const TRASH = PO("TrashCommercial"), TRASH2 = PO("TrashCanLarge"), BENCH = PO("ParkBenchLong", { long: true }), UTIL = PO("Utility", { long: true }), MAN = PO("Manhole"), STORM = PO("StormDrain");
  put(TRASH2, -10.2, 0, CURB - .55, 0, .95, "h", .55); put(TRASH2, 5.2, 0, R1 + .65, 0, .95, "h", .55); put(TRASH, -12.4, 0, R1 + .6, 0, 1.0, "h", .55);
  put(BENCH, -15.5, 0, FZ + .55, 0, 1.9, "w", .6); put(UTIL, 13.8, 0, FZ + .45, 0, 1.25, "h", .55);
  put(MAN, 1.2, RY + .005, (CURB + R1) / 2 + .8, 0, .8, "w", .6); put(MAN, 12, RY + .005, (CURB + R1) / 2 - .6, 0, .8, "w", .6);
  for (const sx of [-14, 3.2, 16]) put(STORM, sx, RY + .004, CURB + .42, 0, .75, "w", .32);
  { const wireM = new THREE.LineBasicMaterial({ color: col(0x0c0d0e) });
    for (const wx of [-14, 0.0, 14, 28, -28]) { if (Math.abs(wx) > XR - 2) continue; const pts = [], yA = 7.6, sag = .55, za = FZ + .2, zb = OPP - .2, zm = (CURB + R1) / 2;
      for (let i = 0; i <= 16; i++) { const t = i / 16, z = za + (zb - za) * t; pts.push(new V3(wx, yA - sag * (1 - Math.pow((z - zm) / ((zb - za) / 2), 2)), z)); }
      add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireM));
      const ly = yA - sag; mesh(new THREE.CylinderGeometry(.03, .03, .35, 6), poleM, wx, ly - .17, zm);
      mesh(new THREE.ConeGeometry(.32, .22, 18, 1, true), sm({ color: col(0x1e2022), side: THREE.DoubleSide }), wx, ly - .4, zm);
      const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col(0xffe0b0), transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); h.scale.set(1.4, 1.4, 1); h.position.set(wx, ly - .5, zm); add(h).layers.set(2);
      pool(7, 7, 0x6e5434, wx, RY, zm, .55); } }
  // ---------- regnet ----------
  const rainU = { t: { value: 0 } };
  { const N = isTouch ? 2600 : 5200, base = new Float32Array(N * 6), kk = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) { const x = -30 + r() * 60, y = r() * 18, z = .7 + r() * (OPP - 1.2); for (let v = 0; v < 2; v++) { base.set([x, y, z], i * 6 + v * 3); kk[i * 2 + v] = v; } }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(base, 3)); g.setAttribute("k", new THREE.BufferAttribute(kk, 1));
    const m = new THREE.ShaderMaterial({ uniforms: rainU, transparent: true, depthWrite: false,
      vertexShader: "attribute float k; uniform float t; varying float a; void main(){ vec3 p = position; p.y = mod(position.y - t * 10.0, 18.0) - 1.0 - k * .5; p.x -= k * .04;" +
        " vec4 mv = modelViewMatrix * vec4(p, 1.); a = clamp(1. - (-mv.z - 1.) / 30., 0., 1.); gl_Position = projectionMatrix * mv; }",
      fragmentShader: "varying float a; void main(){ gl_FragColor = vec4(.62, .67, .74, .26 * a); }" });
    const l = new THREE.LineSegments(g, m); l.frustumCulled = false; add(l).layers.set(2); }
  // paraplyet (Elegant umbrella av Araon, CC BY): bärs av den som går på gatan
  let umbrella = null;
  { const parts = Object.values(groups(MODELS.paraply)).flat();
    if (parts.length) { const bb = new THREE.Box3(); parts.forEach((p) => { p.g.computeBoundingBox(); bb.union(p.g.boundingBox); }); const c = bb.getCenter(new V3()), sc = .98 / (bb.max.y - bb.min.y);
      umbrella = new THREE.Group(); umbrella.visible = false;
      for (const p of parts) { const g = p.g.clone().applyMatrix4(new THREE.Matrix4().makeScale(sc, sc, sc).multiply(new THREE.Matrix4().makeTranslation(-c.x, -bb.min.y, -c.z)));
        const na = g.attributes.normal, pa = g.attributes.position, cc = new Float32Array(na.count * 3);
        for (let i = 0; i < na.count; i++) { const k = .2 + .25 * Math.max(0, -na.getY(i)) + .12 * clamp(1 - pa.getY(i) / .98, 0, 1); cc[i * 3] = k * 1.05; cc[i * 3 + 1] = k; cc[i * 3 + 2] = k * .95; } // undersidan i skenet från lyktorna
        g.setAttribute("color", new THREE.BufferAttribute(cc, 3));
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: p.mat.map || null, color: p.mat.map ? 0xffffff : 0x333333, vertexColors: true, side: THREE.DoubleSide, fog: false })); m.layers.set(1); m.frustumCulled = false; umbrella.add(m); }
      scene.add(umbrella); } }
  return {
    umbrella,
    update(now) { rainU.t.value = now / 1000; sky.position.copy(camera.position); const fl = 1 + Math.sin(now / 900) * .012 + (Math.sin(now / 137) > .995 ? -.08 : 0); signMat.color.setRGB(1.5 * fl, 1.42 * fl, 1.32 * fl); }
  };
}
