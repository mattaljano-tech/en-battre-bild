// Texturer som ritas i kod och material som laddas från tex/.
"use strict";
/* ================= texturer (ritas i kod) ================= */
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function cnv(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function grain(x, w, h, amt, seed) { const r = rng(seed), img = x.getImageData(0, 0, w, h), d = img.data; for (let i = 0; i < d.length; i += 4) { const n = (r() - .5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; } x.putImageData(img, 0, 0); }
function blotches(x, w, h, n, seed, cols, rmin, rmax, amin, amax) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const px = r() * w, py = r() * h, rad = rmin + r() * (rmax - rmin), col = cols[(r() * cols.length) | 0], a = amin + r() * (amax - amin);
    for (let ox = -1; ox <= 1; ox++) { const cx = px + ox * w; if (cx + rad < 0 || cx - rad > w) continue;
      const g = x.createRadialGradient(cx, py, 0, cx, py, rad); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.fillRect(cx - rad, py - rad, rad * 2, rad * 2); }
  }
}
function streaks(x, w, n, seed, col, maxLen, a0, a1, fromY) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) { const sx = r() * w, sy = (fromY || 0) + r() * 20, len = 40 + r() * maxLen, g = x.createLinearGradient(0, sy, 0, sy + len);
    g.addColorStop(0, `rgba(${col},${a0 + r() * (a1 - a0)})`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.fillRect(sx, sy, 1 + r() * 4, len); }
}
// gjuten betong med brädform, stagjärnshål, rinnmärken och smuts nertill. wM×hM meter, hela höjden i en textur.
function concreteWall(seed, wM, hM, base, o) {
  o = o || {};
  const W = 1024, Hh = Math.round(W * hM / wM), c = cnv(W, Hh), x = c.getContext("2d"), r = rng(seed), ppm = W / wM;
  x.fillStyle = base; x.fillRect(0, 0, W, Hh);
  const board = .19 * ppm;
  for (let y = 0; y < Hh; y += board) { x.fillStyle = `rgba(${r() > .5 ? "255,255,255" : "0,0,0"},${.02 + r() * .05})`; x.fillRect(0, y, W, board); x.fillStyle = "rgba(0,0,0,.22)"; x.fillRect(0, y, W, 1.2); }
  blotches(x, W, Hh, 260, seed, ["30,32,30", "120,122,116", "70,64,52", "40,52,50"], 20, 170, .06, .24);
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${r() > .5 ? "20,20,18" : "170,170,160"},${.15 + r() * .35})`; x.fillRect(r() * W, r() * Hh, 1.5, 1.5); }
  for (let gx = .3; gx < wM; gx += .6) for (let gy = .45; gy < hM - .2; gy += .6) { // stagjärnshål
    const hx = gx * ppm, hy = Hh - gy * ppm, g = x.createRadialGradient(hx, hy, 1, hx, hy, 6); g.addColorStop(0, "rgba(10,10,10,.9)"); g.addColorStop(1, "rgba(10,10,10,0)"); x.fillStyle = g; x.fillRect(hx - 6, hy - 6, 12, 12);
    if (r() > .6) { const g2 = x.createLinearGradient(0, hy, 0, hy + 80 + r() * 120); g2.addColorStop(0, "rgba(120,60,25,.35)"); g2.addColorStop(1, "rgba(120,60,25,0)"); x.fillStyle = g2; x.fillRect(hx - 2, hy, 4, 200); }
  }
  streaks(x, W, 90, seed + 2, "18,20,18", Hh * .7, .1, .35);
  if (o.efflor) streaks(x, W, 30, seed + 5, "210,212,200", Hh * .4, .05, .15, Hh * .2);
  const gm = x.createLinearGradient(0, Hh - (o.dirtM || .5) * ppm, 0, Hh); gm.addColorStop(0, "rgba(8,8,6,0)"); gm.addColorStop(1, "rgba(8,8,6,.8)"); x.fillStyle = gm; x.fillRect(0, Hh - (o.dirtM || .5) * ppm, W, (o.dirtM || .5) * ppm);
  if (o.oilBand) { const ob = o.oilBand * ppm, g3 = x.createLinearGradient(0, Hh - ob - 30, 0, Hh); g3.addColorStop(0, "rgba(5,6,5,0)"); g3.addColorStop(.15, "rgba(5,6,5,.55)"); g3.addColorStop(1, "rgba(5,6,5,.85)"); x.fillStyle = g3; x.fillRect(0, Hh - ob - 30, W, ob + 30); }
  const top = x.createLinearGradient(0, 0, 0, .5 * ppm); top.addColorStop(0, "rgba(6,6,5,.6)"); top.addColorStop(1, "rgba(6,6,5,0)"); x.fillStyle = top; x.fillRect(0, 0, W, .5 * ppm);
  grain(x, W, Hh, 18, seed + 9); return c;
}
function vaultTex(seed) {
  const S = 1024, c = cnv(S, S), x = c.getContext("2d"), r = rng(seed);
  x.fillStyle = "#3d3f3c"; x.fillRect(0, 0, S, S);
  blotches(x, S, S, 240, seed, ["14,15,14", "80,82,78", "50,44,36"], 30, 220, .08, .3);
  for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${r() > .5 ? "10,10,10" : "130,130,124"},${.15 + r() * .3})`; x.fillRect(r() * S, r() * S, 1.5, 1.5); }
  x.fillStyle = "rgba(8,9,8,.8)"; x.fillRect(0, 0, S, 6); x.fillStyle = "rgba(120,120,115,.25)"; x.fillRect(0, 6, S, 2); // ringskarv var 3:e meter
  for (let i = 0; i < 40; i++) { const px = r() * S; x.strokeStyle = `rgba(30,22,14,${.15 + r() * .2})`; x.lineWidth = 2 + r() * 5; x.beginPath(); x.moveTo(px, 0); x.lineTo(px + (r() - .5) * 40, S); x.stroke(); }
  grain(x, S, S, 16, seed + 1); return c;
}
// perronggolv 5,5 m brett (hela bredden i en textur) × 2,4 m: slitna grågröna plattor, gul taktil list och ljus kantsten
function floorTex(seed) {
  const ppm = 200, W = 1100, Hh = 480, c = cnv(W, Hh), x = c.getContext("2d"), r = rng(seed);
  x.fillStyle = "#2c3430"; x.fillRect(0, 0, W, Hh);
  const t = .6 * ppm;
  for (let ty = 0; ty < Hh; ty += t) for (let tx = 0; tx < 4.8 * ppm; tx += t) {
    x.fillStyle = `hsl(${138 + r() * 14},${8 + r() * 6}%,${24 + r() * 7}%)`; x.fillRect(tx + 2, ty + 2, Math.min(t, 4.8 * ppm - tx) - 4, t - 4);
  }
  blotches(x, W, Hh, 140, seed, ["10,12,10", "120,128,120", "60,58,48"], 15, 110, .06, .25);
  for (let i = 0; i < 5000; i++) { x.fillStyle = `rgba(${r() > .5 ? "8,10,9" : "170,176,168"},${.12 + r() * .3})`; x.fillRect(r() * 4.8 * ppm, r() * Hh, 1.5, 1.5); }
  // gul taktil list (räfflor längs perrongen)
  x.fillStyle = "#1e2220"; x.fillRect(4.85 * ppm, 0, .3 * ppm, Hh);
  for (let ry = 6; ry < Hh; ry += 14) for (let k = 0; k < 4; k++) { x.fillStyle = `rgba(${196 + r() * 30},${150 + r() * 25},${40 + r() * 20},${.55 + r() * .35})`; x.fillRect(4.88 * ppm + k * 14, ry, 10, 9); }
  // ljus kantsten
  x.fillStyle = "#a9a598"; x.fillRect(5.2 * ppm, 0, .3 * ppm, Hh);
  blotches(x, W, Hh, 40, seed + 4, ["40,40,36", "200,198,190"], 8, 40, .1, .3);
  x.fillStyle = "rgba(0,0,0,.6)"; x.fillRect(5.2 * ppm - 2, 0, 3, Hh); x.fillRect(5.5 * ppm - 4, 0, 4, Hh);
  const gw = x.createLinearGradient(0, 0, .4 * ppm, 0); gw.addColorStop(0, "rgba(6,7,6,.7)"); gw.addColorStop(1, "rgba(6,7,6,0)"); x.fillStyle = gw; x.fillRect(0, 0, .4 * ppm, Hh);
  grain(x, W, Hh, 16, seed + 2); return c;
}
function ballastTex(seed) {
  const S = 512, c = cnv(S, S), x = c.getContext("2d"), r = rng(seed);
  x.fillStyle = "#151614"; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) { const px = r() * S, py = r() * S, rr = 3 + r() * 7, l = 16 + r() * 34;
    x.fillStyle = `hsl(${20 + r() * 30},${r() * 12}%,${l}%)`; x.beginPath(); x.ellipse(px, py, rr, rr * (.6 + r() * .4), r() * 3, 0, 7); x.fill();
    x.fillStyle = "rgba(255,255,255,.08)"; x.beginPath(); x.ellipse(px - rr * .2, py - rr * .3, rr * .5, rr * .3, 0, 0, 7); x.fill(); }
  blotches(x, S, S, 30, seed, ["5,5,4", "70,40,20"], 20, 90, .2, .5);
  grain(x, S, S, 14, seed + 1); return c;
}
function graffitiCanvas(seed, w, h) {
  const c = cnv(w, h), x = c.getContext("2d"), r = rng(seed), cols = ["#2fa79c", "#c4372b", "#d9a838", "#d8d6cf", "#3b5bb5"];
  x.lineCap = "round"; x.lineJoin = "round";
  for (let s = 0; s < 3; s++) {
    const col = cols[(r() * cols.length) | 0], lw = 10 + r() * 18; let px = w * (.1 + r() * .3), py = h * (.35 + r() * .35);
    x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 7; k++) { const nx = px + 40 + r() * 120, ny = h * (.2 + r() * .6); x.bezierCurveTo(px + r() * 80, py - 80 + r() * 160, nx - r() * 80, ny - 80 + r() * 160, nx, ny); px = nx; py = ny; }
    x.strokeStyle = "rgba(10,10,10,.85)"; x.lineWidth = lw + 8; x.stroke(); x.strokeStyle = col; x.lineWidth = lw; x.stroke();
    for (let d = 0; d < 6; d++) { x.fillStyle = col; x.fillRect(w * (.15 + r() * .7), h * (.5 + r() * .2), 3, 20 + r() * 60); }
  }
  x.globalCompositeOperation = "destination-out"; blotches(x, w, h, 120, seed + 3, ["0,0,0"], 6, 40, .3, .9);
  for (let i = 0; i < 6000; i++) { x.fillStyle = `rgba(0,0,0,${r() * .6})`; x.fillRect(r() * w, r() * h, 2, 2); }
  x.globalCompositeOperation = "source-over"; return c;
}
function signCanvas(lines, o) {
  const c = cnv(o.w, o.h), x = c.getContext("2d");
  x.fillStyle = o.bg; x.fillRect(0, 0, o.w, o.h);
  if (o.border) { x.strokeStyle = o.border; x.lineWidth = o.bw || 6; x.strokeRect(o.bw * 2, o.bw * 2, o.w - o.bw * 4, o.h - o.bw * 4); }
  x.fillStyle = o.fg; x.textAlign = o.align || "center"; x.textBaseline = "middle";
  lines.forEach((l) => { x.font = l.font; if (x.letterSpacing !== undefined) x.letterSpacing = (l.track || 0) + "px";
    if (l.fit) { let fs = parseInt(l.font.match(/(\d+)px/)[1], 10); while (x.measureText(l.text).width > o.w * .86 && fs > 20) { fs -= 4; x.font = l.font.replace(/\d+px/, fs + "px"); } } x.globalAlpha = l.alpha || 1; x.fillText(l.text, l.x || o.w / 2, l.y); });
  x.globalAlpha = 1;
  if (o.wear) { blotches(x, o.w, o.h, 30, 4, ["20,20,18", "120,70,30"], 6, 40, .1, .35); grain(x, o.w, o.h, 14, 3); }
  return c;
}
function radial(stops, s) { const c = cnv(s, s), x = c.getContext("2d"), g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); stops.forEach(([o, col]) => g.addColorStop(o, col)); x.fillStyle = g; x.fillRect(0, 0, s, s); return c; }
function silhouette() {
  const W = 256, Hh = 640, c = cnv(W, Hh), x = c.getContext("2d");
  x.filter = "blur(10px)"; x.fillStyle = "rgba(0,0,0,.95)";
  x.beginPath(); x.ellipse(W / 2, 70, 34, 42, 0, 0, 7); x.fill();
  x.beginPath(); x.moveTo(W / 2 - 70, 140); x.quadraticCurveTo(W / 2, 110, W / 2 + 70, 140); x.lineTo(W / 2 + 62, 380); x.lineTo(W / 2 + 40, 620); x.lineTo(W / 2 + 6, 620); x.lineTo(W / 2, 400); x.lineTo(W / 2 - 6, 620); x.lineTo(W / 2 - 40, 620); x.lineTo(W / 2 - 62, 380); x.closePath(); x.fill();
  x.filter = "none"; return c;
}
function T(c, srgb, repeat) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = repeat === false ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping; if (srgb !== false) t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; return t; }
/* ---------- fotograferade material (Poly Haven, CC0): färg, ytstruktur (normal) och skugga i skrymslen (AO) ---------- */
const MATDEF = { betong: ["concrete_wall_008", 3], betong6: ["concrete_wall_006", 3], betonggolv: ["concrete_floor_03", 2.6], garage: ["garage_floor", 3], puts: ["plastered_wall", 2.6],
  tegel: ["red_bricks_04", 2.2], tra: ["wood_floor_worn", 2.2], rost: ["rusty_metal_03", 2], element: ["precast_concrete_wall", 3], tegelputs: ["plaster_brick_pattern", 2.4],
  lader: ["fabric_leather_02", 1], matta: ["dirty_carpet", 1.2], plat: ["rusty_corrugated_iron", 2], rost2: ["rusty_metal_05", 1.6], panel: ["rusty_metal_grid", 1.8], slitputs: ["damaged_plaster", 3.2], kalk: ["plaster_brick_pattern", 2.4], mork: ["beige_wall_001", 2.6], radtegel: ["brick_wall_001", 2.2], morktra: ["dark_wood", 2.4] };
if (GATA) Object.assign(MATDEF, { plattor: ["square_concrete_pavers", 2.4], gatsten: ["pavement_05", 2.2] });
const MATTEX = {};
function loadMats() {
  const tl = new THREE.TextureLoader(), jobs = [];
  for (const k in MATDEF) { if (MATTEX[k]) continue; const f = MATDEF[k][0], t = {};
    for (const [kind, srgb] of [["diff", true], ["nor", false], ["arm", false]]) jobs.push(new Promise((res) => {
      t[kind] = tl.load("tex/" + f + "_" + kind + ".jpg", res, undefined, res); t[kind].wrapS = t[kind].wrapT = THREE.RepeatWrapping; t[kind].anisotropy = maxAniso;
      if (srgb) t[kind].encoding = THREE.sRGBEncoding; }));
    MATTEX[k] = t; }
  return Promise.all(jobs).then(plankify);
}
// mörkt trä blir ett golv av breda plankor: fogar på längden och skarvar på tvären
function plankify() {
  const t = MATTEX.morktra; if (!t || t.planked || !t.diff.image) return; t.planked = true;
  const S = 1024, c = cnv(S, S), x = c.getContext("2d"), r = rng(17), n = 11, pw = S / n;
  for (let i = 0; i < n; i++) { const off = r() * S; x.save(); x.beginPath(); x.rect(i * pw, 0, pw, S); x.clip();
    x.translate(i * pw, 0); x.rotate(Math.PI / 2); x.drawImage(t.diff.image, -off, -pw - r() * 400, S * 1.5, S * 1.5); x.restore();
    x.fillStyle = `rgba(${r() > .5 ? "0,0,0" : "255,235,210"},${r() * .12})`; x.fillRect(i * pw, 0, pw, S); }
  for (let i = 0; i <= n; i++) { x.fillStyle = "rgba(8,5,3,.85)"; x.fillRect(i * pw - 1.5, 0, 3, S); }
  for (let i = 0; i < n; i++) { const y = r() * S; x.fillStyle = "rgba(8,5,3,.75)"; x.fillRect(i * pw, y, pw, 3); }
  const tex = T(c); t.diff = tex;
}
/* ---------- 3D-modeller (Poly Haven, CC0): laddas en gång, ljuset bakas in som för övriga föremål ---------- */
const MODELS = {}, MODEL_FILES = { bord: "industrial_coffee_table", bur: "caged_hanging_light", vagg: "industrial_wall_sconce", pall: "metal_stool_03", vaxt1: "potted_plant_01", vaxt2: "potted_plant_02", fasad: "modular_urban_apartments_facade", ac: "exterior_aircon_unit", brandtrappa: "modular_fire_escape", ror: "modular_industrial_pipes_01", hylla: "worn_metal_rack", fatolj: "mid_century_lounge_chair", pendel: "modern_ceiling_lamp_01", bilar: "bilar", tegelhus: "tegelhus", betonghus: "betonghus", butikshus: "butikshus", lyktor: "lyktor", gatuprylar: "gatuprylar", skyline: "skyline", paraply: "paraply" };
const ROOM_MODELS = { staden: ["bur", "fasad", "ac", "brandtrappa"], berattelser: ["hylla", "ror"], naturen: ["vaxt1", "vaxt2"], foajen: GATA && !SODER ? ["vaxt1", "vaxt2", "fasad", "ac", "brandtrappa", "bilar", "tegelhus", "betonghus", "butikshus", "lyktor", "gatuprylar", "skyline", "paraply"] : ["vaxt1", "vaxt2"], manniskorna: ["bord", "vagg", "pall", "fatolj", "pendel"] };
function loadModels(keys) {
  if (!THREE.GLTFLoader) return Promise.resolve(); const L = new THREE.GLTFLoader();
  return Promise.all(keys.filter((k) => !MODELS[k]).map((k) => new Promise((res) => { const f = MODEL_FILES[k];
    L.load("models/" + f + "/" + f + ".gltf", (g) => { MODELS[k] = g.scene; res(); }, undefined, () => res()); })));
}
// placera en modell: o.w = önskad bredd (m), annars o.sc; o.hang = överkanten på pos.y, annars står den på pos.y
function placeModel(k, pos, yaw, o) {
  o = o || {}; const root = MODELS[k]; if (!root) return null;
  root.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(root), sz = box.getSize(new V3());
  const sc = o.w ? o.w / Math.max(sz.x, sz.z) : (o.h ? o.h / sz.y : o.sc || 1), cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
  const y0 = o.hang ? pos[1] - box.max.y * sc : pos[1] - box.min.y * sc;
  const T = new THREE.Matrix4().compose(new V3(pos[0], y0, pos[2]), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), yaw || 0), new V3(sc * (o.stretch || 1), sc, sc)).multiply(new THREE.Matrix4().makeTranslation(-cx, 0, -cz));
  const id = o.id || "m-" + k + pos.join(",");
  root.traverse((m) => { if (!m.isMesh) return;
    let geo = m.geometry.clone(); geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(T, m.matrixWorld)); if (!geo.attributes.normal) geo.computeVertexNormals();
    if (o.cutAbove !== undefined) { // ta bort allt ovanför en höjd (t.ex. takfäste och stång på en pendel)
      if (geo.index) geo = geo.toNonIndexed(); const lim = y0 + o.cutAbove * sc, pa = geo.attributes.position, keep = [];
      for (let t = 0; t < pa.count; t += 3) if (Math.min(pa.getY(t), pa.getY(t + 1), pa.getY(t + 2)) < lim) keep.push(t);
      if (!keep.length) return;
      const ng = new THREE.BufferGeometry(); for (const name in geo.attributes) { const A = geo.attributes[name], n = A.itemSize, arr = new A.array.constructor(keep.length * 3 * n);
        keep.forEach((t, k) => { for (let v = 0; v < 3; v++) for (let c = 0; c < n; c++) arr[(k * 3 + v) * n + c] = A.array[(t + v) * n + c]; }); ng.setAttribute(name, new THREE.BufferAttribute(arr, n)); }
      geo = ng; }
    const src = m.material;
    if (o.glass && o.glass.test(src.name)) { scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(...(o.glassCol || [1, .95, .85])), transparent: true, opacity: .32, depthWrite: false, side: THREE.DoubleSide }))); return; }
    if (o.glow && o.glow.test(src.name)) { scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(...o.glowCol), map: src.map || null }))); return; }
    if (o.flat && (!o.flatOnly || o.flatOnly.test(src.name))) { // tunga modeller (växtblad): ljuset mäts på några punkter i stället för i varje hörn
      const L = o.flat, pa = geo.attributes.position, na = geo.attributes.normal, c = new Float32Array(pa.count * 3); geo.computeBoundingBox();
      const bb = geo.boundingBox, mx = (bb.min.x + bb.max.x) / 2, mz = (bb.min.z + bb.max.z) / 2, R = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2 || 1;
      for (let i = 0; i < pa.count; i++) { const t = clamp((pa.getY(i) - L.y0) / (L.y1 - L.y0), 0, 1), rr = clamp(Math.hypot(pa.getX(i) - mx, pa.getZ(i) - mz) / R, 0, 1),
          ty = clamp((pa.getY(i) - bb.min.y) / (bb.max.y - bb.min.y || 1), 0, 1), ao = (.38 + .62 * Math.pow(rr, .7)) * (.6 + .4 * ty), // inre och nedre blad i skugga av de andra
          k = (.55 + .45 * Math.max(0, na.getY(i)) + .1 * Math.abs(na.getX(i))) * ao;
        for (let j = 0; j < 3; j++) c[i * 3 + j] = (L.lo[j] + (L.hi[j] - L.lo[j]) * t) * k; }
      geo.setAttribute("color", new THREE.BufferAttribute(c, 3));
      scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: src.map || null, vertexColors: true, color: o.tint === undefined ? 0xffffff : o.tint, side: THREE.DoubleSide, alphaTest: src.alphaTest || 0 })));
      return; }
    prop(geo, { map: src.map || null, color: o.tint === undefined ? 0xffffff : o.tint, side: THREE.DoubleSide, alphaTest: src.alphaTest || 0 }, new V3(0, 0, 0), null, { id, shadow: !!o.shadow, collide: !!o.collide, cache: true });
    if (src.emissiveMap) scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: src.emissiveMap, color: new THREE.Color(...(o.emisCol || [3, 2, 1.1])), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  });
  return { top: y0 + (o.cutAbove !== undefined ? o.cutAbove : box.max.y) * sc, bottom: y0 + box.min.y * sc };
}
// en del ur en modulsats (t.ex. ett rörstycke): geometrin i satsens koordinater, och placering med en egen matris
function partGeo(k, name) {
  const root = MODELS[k]; if (!root) return null; root.updateMatrixWorld(true); let hit = null;
  root.traverse((m) => { if (!hit && m.isMesh && (m.name === name || (m.parent && m.parent.name === name))) hit = m; });
  if (!hit) root.traverse((m) => { if (!hit && m.isMesh && m.name.indexOf(name) === 0) hit = m; });
  if (!hit) return null; const geo = hit.geometry.clone().applyMatrix4(hit.matrixWorld); if (!geo.attributes.normal) geo.computeVertexNormals();
  return { geo, mat: hit.material };
}
// placera en del: nederkant och mitt i origo, sedan skala sy i sin längdriktning och matrisen M
function placePart(k, name, M, o) {
  o = o || {}; const P = partGeo(k, name); if (!P) return; const g = P.geo; g.computeBoundingBox(); const b = g.boundingBox;
  // rörets mittlinje: mitten av flänsen längst ner, inte hela delens mitt (ratt och manometer sticker ut åt sidan)
  let cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
  { const pa = g.attributes.position; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, n = 0;
    for (let i = 0; i < pa.count; i++) if (pa.getY(i) < b.min.y + .012) { n++; x0 = Math.min(x0, pa.getX(i)); x1 = Math.max(x1, pa.getX(i)); z0 = Math.min(z0, pa.getZ(i)); z1 = Math.max(z1, pa.getZ(i)); }
    if (n > 8) { cx = (x0 + x1) / 2; cz = (z0 + z1) / 2; } }
  g.translate(-cx, -b.min.y, -cz); if (o.sy) g.scale(1, o.sy, 1); g.applyMatrix4(M);
  prop(g, { map: P.mat.map || null, color: o.tint || 0xffffff, side: THREE.DoubleSide }, new V3(0, 0, 0), null, { id: o.id || "part-" + k, shadow: false, cache: true });
}
const M4 = (x, y, z, rx, ry, rz) => new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, "YXZ")), new V3(1, 1, 1));
// mat("betong", { color, s (meter per upprepning), relief, layer: { m: mat(...), mask } })
function mat(name, o) { o = o || {}; const t = MATTEX[name]; return { pbr: true, map: t.diff, nor: t.nor, arm: t.arm, s: o.s || MATDEF[name][1], color: o.color === undefined ? 0xffffff : o.color, relK: o.relief === undefined ? 1 : o.relief, layer: o.layer }; }
// ytan ljussätts av den bakade ljuskartan; normalkartan ger reliefen och AO-kartan mörkar fogar och sprickor
function pbrPatch(m, s) {
  const wall = Math.abs(s.N[1]) < .5, L = wall ? new V3(.12, .62, .78) : new V3(.28, .22, .93); L.normalize();
  const u = { norMap: { value: s.nor }, armMap: { value: s.arm }, relL: { value: L }, relK: { value: s.relK }, dirMap: { value: s.dirMap || null } };
  if (s.layer) Object.assign(u, { map2: { value: s.layer.m.map }, nor2: { value: s.layer.m.nor }, arm2: { value: s.layer.m.arm }, maskMap: { value: s.layer.mask },
    sc2: { value: s.layer.m.s ? s.tu / s.layer.m.s : 1 }, color2: { value: new THREE.Color(s.layer.m.color) } });
  m.defines = s.layer ? { PBR_MASK: "" } : {}; if (s.dirMap) m.defines.PBR_DIR = "";
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader.replace("#include <map_pars_fragment>", ["#include <map_pars_fragment>", "uniform sampler2D norMap; uniform sampler2D armMap; uniform vec3 relL; uniform float relK;", "#ifdef PBR_DIR", "uniform sampler2D dirMap;", "#endif",
      "#ifdef PBR_MASK", "uniform sampler2D map2; uniform sampler2D nor2; uniform sampler2D arm2; uniform sampler2D maskMap; uniform float sc2; uniform vec3 color2;", "#endif"].join("\n"))
      .replace("#include <map_fragment>", ["#include <map_fragment>",
        "vec3 nT = texture2D(norMap, vUv).xyz * 2. - 1.; vec3 armT = texture2D(armMap, vUv).rgb;",
        "#ifdef PBR_MASK", "vec4 mk = texture2D(maskMap, vUv2); vec2 uv2b = vUv * sc2;",
        "diffuseColor.rgb = mix(diffuseColor.rgb, mapTexelToLinear(texture2D(map2, uv2b)).rgb * color2, mk.r);",
        "nT = mix(nT, texture2D(nor2, uv2b).xyz * 2. - 1., mk.r); armT = mix(armT, texture2D(arm2, uv2b).rgb, mk.r); diffuseColor.rgb *= 1. - mk.g * .7;", "#endif",
        "#ifdef PBR_DIR",
        // ljusets riktning från Blender: hur ljuset ändras när ytan lutar åt u eller v, så reliefen får skuggor från de riktiga lamporna
        "vec2 gd = (texture2D(dirMap, vUv2).rg - .5) * 4.; vec3 nn = normalize(nT);",
        "float rel = clamp(1. + 1.6 * dot(nn.xy, gd) / max(nn.z, .35), .2, 2.);",
        "rel = mix(rel, clamp(dot(nn, relL) / relL.z, .3, 1.7), .3);",
        "#else",
        "float rel = clamp(dot(normalize(nT), relL) / relL.z, .3, 1.7);",
        "#endif",
        "diffuseColor.rgb *= mix(1., rel, relK) * mix(1., armT.r, .85);"].join("\n"));
  };
  m.customProgramCacheKey = () => "pbr" + (s.layer ? "m" : "") + (s.dirMap ? "d" : "");
}
// mask där putsen har släppt: röd = tegel syns, grön = skugga i kanten av putsen
function peelMask(seed, wM, hM, n) {
  const ppm = 48, W = Math.round(wM * ppm), Hh = Math.round(hM * ppm), c = cnv(W, Hh), x = c.getContext("2d"), r = rng(seed);
  x.fillStyle = "#000"; x.fillRect(0, 0, W, Hh);
  const blobs = [];
  for (let i = 0; i < (n || Math.round(wM * hM / 8)); i++) { const cx = r() * W, cy = Hh * (.1 + r() * .78), rad = (.35 + r() * r() * 1.1) * ppm, sq = .55 + r() * .3, f1 = r() * 6, f2 = r() * 6, pts = [];
    for (let k = 0; k < 40; k++) { const a = k / 40 * 6.283, q = .82 + .2 * Math.sin(3 * a + f1) + .1 * Math.sin(7 * a + f2) + (r() - .5) * .14; pts.push([cx + Math.cos(a) * rad * q, cy + Math.sin(a) * rad * q * sq]); }
    blobs.push(pts); }
  const path = (pts, dx, dy) => { x.beginPath(); pts.forEach(([px, py], i) => i ? x.lineTo(px + dx, py + dy) : x.moveTo(px + dx, py + dy)); x.closePath(); };
  x.filter = "blur(2px)"; x.strokeStyle = "rgb(0,255,0)"; x.lineWidth = 5; blobs.forEach((b) => { path(b, 1, 2); x.stroke(); });
  x.filter = "none"; x.fillStyle = "rgb(255,0,0)"; blobs.forEach((b) => { path(b, 0, 0); x.fill(); });
  x.globalCompositeOperation = "lighter"; x.filter = "blur(1.5px)"; x.strokeStyle = "rgb(0,150,0)"; x.lineWidth = 3; blobs.forEach((b) => { path(b, 0, 0); x.stroke(); });
  x.filter = "none"; x.globalCompositeOperation = "source-over";
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
// kalkad vit puts (Naturen)
function plasterTex(seed, base) {
  const S = 1024, c = cnv(S, S), x = c.getContext("2d"), r = rng(seed);
  x.fillStyle = base || "#d6d2c9"; x.fillRect(0, 0, S, S);
  blotches(x, S, S, 220, seed, ["150,146,138", "240,238,232", "190,184,172"], 30, 200, .05, .16);
  for (let i = 0; i < 90; i++) { x.strokeStyle = `rgba(${r() > .5 ? "255,255,250" : "160,156,148"},${.012 + r() * .022})`; x.lineWidth = 6 + r() * 16; x.beginPath(); x.arc(r() * S, r() * S, 60 + r() * 160, r() * 6, r() * 6 + .5 + r()); x.stroke(); }
  grain(x, S, S, 9, seed + 1); return c;
}
// ljust slipat betonggolv med sågskär var 3:e meter
function paleFloorTex(seed) {
  const S = 1024, c = cnv(S, S), x = c.getContext("2d"), r = rng(seed);
  x.fillStyle = "#aaa59b"; x.fillRect(0, 0, S, S);
  blotches(x, S, S, 200, seed, ["120,116,108", "200,196,188", "150,140,124"], 30, 220, .06, .2);
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${r() > .5 ? "90,86,80" : "220,216,208"},${.2 + r() * .4})`; const s = 1 + r() * 2.5; x.fillRect(r() * S, r() * S, s, s); }
  x.fillStyle = "rgba(60,56,50,.55)"; x.fillRect(0, 0, S, 3); x.fillRect(0, 0, 3, S);
  grain(x, S, S, 12, seed + 2); return c;
}
// golvplankor, 2 × 2 m per textur
function planksTex(seed, o) {
  o = o || {}; const S = 1024, c = cnv(S, S), x = c.getContext("2d"), r = rng(seed), n = 11, pw = S / n;
  x.fillStyle = "#120b06"; x.fillRect(0, 0, S, S);
  for (let i = 0; i < n; i++) { let y = -r() * 400; while (y < S) { const len = 200 + r() * 500, l = (o.lit || 22) + r() * 10;
      x.fillStyle = `hsl(${24 + r() * 10},${35 + r() * 15}%,${l}%)`; x.fillRect(i * pw, y, pw - 3, len - 3);
      for (let k = 0; k < 14; k++) { x.strokeStyle = `rgba(${r() > .4 ? "20,10,4" : "220,170,120"},${.06 + r() * .12})`; x.lineWidth = 1 + r() * 2; const gx = i * pw + r() * pw; x.beginPath(); x.moveTo(gx, y); x.lineTo(gx + (r() - .5) * 8, y + len); x.stroke(); }
      y += len; } }
  blotches(x, S, S, 50, seed + 3, ["10,6,3", "120,80,50"], 30, 150, .06, .2); grain(x, S, S, 14, seed + 1); return c;
}
function leafCanvas() {
  const W = 128, Hh = 256, c = cnv(W, Hh), x = c.getContext("2d");
  x.fillStyle = "#3f6b35"; x.beginPath(); x.moveTo(W / 2, 6);
  x.bezierCurveTo(W * 1.05, Hh * .3, W * .95, Hh * .75, W / 2, Hh - 4); x.bezierCurveTo(W * .05, Hh * .75, -W * .05, Hh * .3, W / 2, 6); x.fill();
  const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, "rgba(0,0,0,.25)"); g.addColorStop(.5, "rgba(255,255,200,.12)"); g.addColorStop(1, "rgba(0,0,0,.25)");
  x.globalCompositeOperation = "source-atop"; x.fillStyle = g; x.fillRect(0, 0, W, Hh);
  x.strokeStyle = "rgba(200,230,160,.5)"; x.lineWidth = 2; x.beginPath(); x.moveTo(W / 2, 10); x.lineTo(W / 2, Hh - 8); x.stroke();
  return c;
}
function chalkCanvas() {
  const W = 1200, Hh = 720, c = cnv(W, Hh), x = c.getContext("2d"), r = rng(4);
  x.fillStyle = "#1c2220"; x.fillRect(0, 0, W, Hh);
  blotches(x, W, Hh, 60, 3, ["200,205,200", "0,0,0"], 30, 160, .03, .08);
  x.fillStyle = "rgba(238,236,228,.9)"; x.textAlign = "center"; x.textBaseline = "middle";
  const line = (t, f, y, tr, a) => { x.font = f; if (x.letterSpacing !== undefined) x.letterSpacing = (tr || 0) + "px"; x.globalAlpha = a || .9; x.fillText(t, W / 2, y); };
  line("EN BÄTTRE BILD", '800 132px "Big Shoulders Display", "Arial Narrow", sans-serif', 170, 10);
  line("FOTOGRAFI", '500 34px "IBM Plex Mono", monospace', 262, 14, .7);
  x.globalAlpha = .5; x.fillRect(W * .3, 318, W * .4, 3);
  line("Staden · Naturen · Berättelser", 'italic 500 50px Archivo, sans-serif', 410, 1);
  line("Priser och bokning kommer snart", 'italic 400 40px Archivo, sans-serif', 520, 1, .75);
  x.globalAlpha = 1; for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(28,34,32,${r() * .5})`; x.fillRect(r() * W, r() * Hh, 2, 2); }
  return c;
}

// nergången målad vägg: blekt färg, flagor, fuktränder, mögel nertill, lite klotter. wM × hM meter i en textur.
function derelictWall(seed, wM, hM, base, dado) {
  const W = 1024, Hh = Math.round(W * hM / wM), c = cnv(W, Hh), x = c.getContext("2d"), r = rng(seed), ppm = W / wM;
  x.fillStyle = base; x.fillRect(0, 0, W, Hh);
  blotches(x, W, Hh, 260, seed, ["70,72,66", "170,170,160", "110,104,90", "60,66,62"], 30, 240, .04, .14);
  if (dado) { const by = Hh - 1.4 * ppm; x.fillStyle = dado; x.fillRect(0, by, W, Hh - by); x.fillStyle = "rgba(20,24,22,.6)"; x.fillRect(0, by - 2, W, 3); }
  // flagnad färg: små fläckar där putsen under syns, i samma gråa ton som väggen
  for (let i = 0; i < 46; i++) { const px = r() * W, py = Hh * (.15 + r() * .85), rw = 6 + r() * 26, rh = 4 + r() * 16;
    x.fillStyle = `rgba(${150 + r() * 14 | 0},${146 + r() * 12 | 0},${136 + r() * 10 | 0},${.35 + r() * .3})`; x.beginPath(); x.moveTo(px + rw, py);
    for (let a = .7; a < 6.28; a += .7) x.lineTo(px + Math.cos(a) * rw * (.6 + r() * .5), py + Math.sin(a) * rh * (.6 + r() * .5)); x.closePath(); x.fill();
    x.strokeStyle = "rgba(20,22,20,.22)"; x.lineWidth = 1; x.stroke(); }
  streaks(x, W, 140, seed + 2, "34,32,26", Hh * .55, .1, .38);
  streaks(x, W, 40, seed + 4, "120,64,28", Hh * .3, .08, .25, Hh * .25);
  const gm = x.createLinearGradient(0, Hh - .8 * ppm, 0, Hh); gm.addColorStop(0, "rgba(20,26,18,0)"); gm.addColorStop(1, "rgba(20,26,18,.75)"); x.fillStyle = gm; x.fillRect(0, Hh - .8 * ppm, W, .8 * ppm);
  x.strokeStyle = "rgba(30,30,26,.28)"; for (let i = 0; i < 12; i++) { x.lineWidth = .8 + r(); x.beginPath(); let px = r() * W, py = r() * Hh; x.moveTo(px, py); for (let k = 0; k < 9; k++) { px += (r() - .5) * 50; py += (r() - .3) * 40; x.lineTo(px, py); } x.stroke(); }
  if (seed % 2) { x.globalAlpha = .3; x.globalCompositeOperation = "multiply"; x.drawImage(graffitiCanvas(seed + 11, 1024, 420), W * (.2 + r() * .3), Hh - 1.25 * ppm, 1.6 * ppm, .66 * ppm); x.globalCompositeOperation = "source-over"; x.globalAlpha = 1; }
  grain(x, W, Hh, 14, seed + 9); return c;
}
function dirtyFloorTex(seed) {
  const S = 1024, c = cnv(S, S), x = c.getContext("2d"), r = rng(seed);
  x.fillStyle = "#6c6961"; x.fillRect(0, 0, S, S);
  blotches(x, S, S, 240, seed, ["40,38,34", "150,146,136", "90,80,64"], 30, 230, .06, .24);
  blotches(x, S, S, 6, seed + 4, ["22,22,20"], 60, 150, .4, .6);
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${r() > .5 ? "40,38,34" : "190,186,176"},${.15 + r() * .4})`; const sz = 1 + r() * 3; x.fillRect(r() * S, r() * S, sz, sz); }
  x.strokeStyle = "rgba(25,24,22,.5)"; for (let i = 0; i < 14; i++) { x.lineWidth = 1 + r(); x.beginPath(); let px = r() * S, py = r() * S; x.moveTo(px, py); for (let k = 0; k < 10; k++) { px += (r() - .5) * 80; py += (r() - .5) * 80; x.lineTo(px, py); } x.stroke(); }
  x.fillStyle = "rgba(20,19,17,.6)"; x.fillRect(0, 0, S, 3); x.fillRect(0, 0, 3, S);
  grain(x, S, S, 16, seed + 1); return c;
}
// fönsterrutor: frostat glas, några trasiga (ljusare) och några igenspikade
function winCanvas(w) {
  const cols = 4, rows = 6, W = 512, Hh = 768, c = cnv(W, Hh), x = c.getContext("2d"), pw = W / cols, ph = Hh / rows, r = rng(w.id * 13 + 5);
  for (let iy = 0; iy < rows; iy++) for (let iz = 0; iz < cols; iz++) {
    const cx = (cols - 1 - iz) * pw, cy = Hh - (iy + 1) * ph;
    if (HAL.boarded.has(w.id + ":" + iy + ":" + iz)) { for (let k = 0; k < 4; k++) { x.fillStyle = `hsl(28,${25 + r() * 15}%,${7 + r() * 6}%)`; x.fillRect(cx, cy + k * ph / 4, pw, ph / 4 - 2); } continue; }
    const broken = r() < .18, g = x.createLinearGradient(0, cy, 0, cy + ph);
    g.addColorStop(0, broken ? "#ffffff" : "#e9edee"); g.addColorStop(1, broken ? "#ffffff" : "#c4c9c4"); x.fillStyle = g; x.fillRect(cx, cy, pw, ph);
    if (!broken) { const k = .5 + r() * .4; x.fillStyle = `rgba(90,96,84,${.1 + r() * .25})`; x.fillRect(cx, cy + ph * k, pw, ph * (1 - k)); }
  }
  return c;
}
function boardCanvas(title, sub) {
  return signCanvas([{ text: title, font: '800 170px "Big Shoulders Display", "Arial Narrow", sans-serif', y: 270, track: 18 },
    { text: sub, font: '500 38px "IBM Plex Mono", monospace', y: 440, track: 4, alpha: .75 },
    { text: "→", font: '500 60px "IBM Plex Mono", monospace', y: 540, alpha: .6 }],
    { w: 1024, h: 640, bg: "#132c2b", fg: "#ece9e0", border: "rgba(236,233,224,.55)", bw: 6, wear: true });
}

// gammalt tegel: röda stenar i förband, ljus fog, rester av kalkfärg och smuts
function brickTex(seed, wM, hM) {
  const W = 1024, Hh = Math.round(W * hM / wM), c = cnv(W, Hh), x = c.getContext("2d"), r = rng(seed), ppm = W / wM, bw = .25 * ppm, bh = .075 * ppm, m = .012 * ppm;
  x.fillStyle = "#8d8479"; x.fillRect(0, 0, W, Hh);
  for (let row = 0, y = 0; y < Hh; row++, y += bh) for (let bx = (row % 2) * -bw / 2; bx < W; bx += bw) {
    const k = r(), cr = 112 + k * 40 + r() * 14, cg = 54 + k * 20 + r() * 10, cb = 38 + k * 14 + r() * 8;
    x.fillStyle = `rgb(${cr | 0},${cg | 0},${cb | 0})`; x.fillRect(bx + m / 2, y + m / 2, bw - m, bh - m);
    if (r() < .25) { x.fillStyle = `rgba(30,18,12,${.1 + r() * .2})`; x.fillRect(bx + m / 2, y + m / 2, bw - m, bh - m); }
  }
  blotches(x, W, Hh, 70, seed + 3, ["225,218,205", "205,198,186"], 30, 220, .08, .38);   // kalkfärg som flagnat
  streaks(x, W, 80, seed + 5, "30,22,18", Hh * .5, .06, .22);
  const gm = x.createLinearGradient(0, Hh - .6 * ppm, 0, Hh); gm.addColorStop(0, "rgba(20,14,10,0)"); gm.addColorStop(1, "rgba(20,14,10,.5)"); x.fillStyle = gm; x.fillRect(0, Hh - .6 * ppm, W, .6 * ppm);
  grain(x, W, Hh, 16, seed + 9); return c;
}
// trägolv: breda plank längs rummet, slitna och oljade
function plankTex(seed, tint) {
  const S = 1024, c = cnv(S, S), x = c.getContext("2d"), r = rng(seed), pw = S / 22;
  for (let i = 0; i < 22; i++) {
    const k = r(), base = tint || [118, 82, 52];
    x.fillStyle = `rgb(${base[0] * (.8 + k * .35) | 0},${base[1] * (.8 + k * .35) | 0},${base[2] * (.8 + k * .35) | 0})`; x.fillRect(i * pw, 0, pw, S);
    for (let g = 0; g < 26; g++) { x.strokeStyle = `rgba(${r() > .5 ? "40,24,12" : "220,180,130"},${.05 + r() * .1})`; x.lineWidth = .6 + r() * 1.4; x.beginPath(); const gx = i * pw + r() * pw; x.moveTo(gx, 0);
      for (let yy = 0; yy <= S; yy += 64) x.lineTo(gx + Math.sin(yy * .01 + g) * 2.5, yy); x.stroke(); }
    x.fillStyle = "rgba(20,12,6,.75)"; x.fillRect(i * pw, 0, 2, S);
    const j = r() * S; x.fillRect(i * pw, j, pw, 2);
  }
  blotches(x, S, S, 50, seed + 2, ["30,18,10", "170,130,90"], 20, 120, .05, .18);
  grain(x, S, S, 12, seed + 4); return c;
}
