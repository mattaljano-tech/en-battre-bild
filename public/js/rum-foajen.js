// Rum 00: Foajén.
"use strict";
/* ================= 00 FOAJÉN ================= */
// stor glasentré: dubbeldörr i glas med smala glaspartier på sidorna och dagsljus utanför
function glassEntrance() {
  const x0 = FOY.EX0, x1 = FOY.EX1, EH = FOY.EH, DH = FOY.DH, XS = FOY.XS, steel = 0x121313;
  // gatan utanför: ljus och kraftigt överexponerad, man anar bara fasaden mittemot
  const c = cnv(1024, 512), x = c.getContext("2d"), r = rng(91);
  x.fillStyle = "#f4f2ec"; x.fillRect(0, 0, 1024, 512);
  x.filter = "blur(10px)";
  x.fillStyle = "#e4dfd6"; x.fillRect(-40, 90, 1104, 320);
  for (let ry = 0; ry < 3; ry++) for (let cx = 0; cx < 12; cx++) { x.fillStyle = `rgba(${150 + r() * 30 | 0},${156 + r() * 30 | 0},${160 + r() * 30 | 0},.5)`; x.fillRect(14 + cx * 86, 120 + ry * 90, 46, 56); }
  x.fillStyle = "#ebe7df"; x.fillRect(-40, 410, 1104, 140);
  x.filter = "none";
  const out = new THREE.Mesh(new THREE.PlaneGeometry(26, 13), new THREE.MeshBasicMaterial({ map: T(c, true, false), color: new THREE.Color(1.6, 1.58, 1.5), fog: false }));
  out.position.set(0, 5, 7); out.rotation.y = Math.PI; scene.add(out);
  const pave = new THREE.Mesh(new THREE.PlaneGeometry(26, 7), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.27, 1.2), fog: false })); pave.rotation.x = -Math.PI / 2; pave.position.set(0, -.01, 3.5); scene.add(pave);
  // smyg i väggens tjocklek
  for (const sx of [x0, x1]) prop(new THREE.BoxGeometry(.05, EH, .35, 1, 6, 1), { color: 0x2c2b28 }, new V3(sx + (sx < 0 ? -.025 : .025), EH / 2, .17), null, { shadow: false });
  prop(new THREE.BoxGeometry(x1 - x0 + .1, .05, .35, 8, 1, 1), { color: 0x2c2b28 }, new V3(0, EH + .025, .17), null, { shadow: false });
  // stålprofiler
  const PW = FOY.PW, bar = (cx, cy, w, h) => prop(new THREE.BoxGeometry(w, h, .18, 1, 3, 1), { color: steel }, new V3(cx, cy, .09), null, { shadow: false });
  for (const px of XS) bar(px, EH / 2, PW, EH);
  bar(0, DH, x1 - x0, PW); bar(0, EH - PW / 2, x1 - x0, PW); bar(0, .06, x1 - x0, .12);
  for (const sx of [-.5, .5]) bar(sx, .2, 1 - PW, .28); // sparkplåt på dörrbladen
  // glaset
  const gc = cnv(256, 512), gx = gc.getContext("2d");
  const gg = gx.createLinearGradient(0, 0, 256, 512); gg.addColorStop(0, "rgba(255,255,255,0)"); gg.addColorStop(.42, "rgba(255,255,255,0)"); gg.addColorStop(.47, "rgba(255,255,255,.3)"); gg.addColorStop(.52, "rgba(255,255,255,0)"); gg.addColorStop(.62, "rgba(255,255,255,.15)"); gg.addColorStop(.66, "rgba(255,255,255,0)"); gx.fillStyle = gg; gx.fillRect(0, 0, 256, 512);
  const gm = new THREE.MeshBasicMaterial({ map: T(gc, false, false), color: new THREE.Color(.5, .56, .58), transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < XS.length - 1; i++) for (const [ya, yb] of [[0, DH], [DH, EH]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(XS[i + 1] - XS[i] - FOY.PW, yb - ya - FOY.PW), gm); m.position.set((XS[i] + XS[i + 1]) / 2, (ya + yb) / 2, .08); m.rotation.y = Math.PI; scene.add(m); }
  // långa dörrhandtag i borstat stål
  for (const sx of [-1, 1]) { prop(new THREE.CylinderGeometry(.018, .018, 1.4, 10), { color: 0xa4a4a0 }, new V3(sx * .14, 1.4, -.03), null, { shadow: false });
    for (const dy of [-.6, .6]) prop(new THREE.BoxGeometry(.02, .02, .08), { color: 0xa4a4a0 }, new V3(sx * .14, 1.4 + dy, .02), null, { shadow: false }); }
  // solstrålar genom glaset: svaga ljuskilar i luften och damm som glittrar i dem
  const pos = [], col = [], idx = [], pts = [], rr = rng(23);
  for (let i = 0; i < XS.length - 1; i++) for (const [ya, yb] of [[.12, DH]]) {
    const xa = XS[i] + FOY.PW / 2, xb = XS[i + 1] - FOY.PW / 2, b = pos.length / 3;
    const cs = [[xa, ya], [xb, ya], [xb, yb], [xa, yb]];
    cs.forEach(([cx, cy]) => { pos.push(cx, cy, 0); col.push(.9, .82, .66); });
    cs.forEach(([cx, cy]) => { const t = cy / SUNF[1]; pos.push(cx - SUNF[0] * t, .02, -SUNF[2] * t); col.push(.05, .045, .035); });
    for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; idx.push(b + k, b + k2, b + k2 + 4, b + k, b + k2 + 4, b + k + 4); }
    for (let n = 0; n < (isTouch ? 6 : 14); n++) { const px = xa + rr() * (xb - xa), py = ya + rr() * (yb - ya), t = py / SUNF[1] * rr(); pts.push(new V3(px - SUNF[0] * t, py - SUNF[1] * t, -SUNF[2] * t)); }
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); sg.setIndex(idx);
  scene.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .018, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
  return pts;
}
function buildFoajen() {
  const X = FOY.X, L = FOY.L, H = FOY.H;
  const FL = +(new URLSearchParams(location.search).get("foyljus") || 1.7); // texturen är mörk: förstärk den
  const tx = { wall: mat("betong6", { color: new THREE.Color(FL * .97, FL * .99, FL * 1.03) }), floor: mat("garage", { color: 0xa8b4c4 }), ceil: mat("betong", { color: 0x4a4944, relief: .5 }) };
  planar({ name: "golv", floor: true, O: [-X, 0, 0], U: [1, 0, 0], V: [0, 0, -1], lu: 2 * X, lv: L, map: tx.floor, tu: 3, tv: 3, color: 0x8e8a82 });
  planar({ O: [-X, 0, 0], U: [0, 0, -1], V: [0, 1, 0], lu: L, lv: H, map: tx.wall, tu: 4, tv: 3.2 });
  planar({ O: [X, 0, -L], U: [0, 0, 1], V: [0, 1, 0], lu: L, lv: H, map: tx.wall, tu: 4, tv: 3.2 });
  planar({ O: [-X, 0, -L], U: [1, 0, 0], V: [0, 1, 0], lu: 2 * X, lv: H, map: tx.wall, tu: 4, tv: 3.2 });
  planar({ O: [X, 0, 0], U: [-1, 0, 0], V: [0, 1, 0], lu: 2 * X, lv: H, map: tx.wall, tu: 4, tv: 3.2, shape: [[0, 0], [X - FOY.EX1, 0], [X - FOY.EX1, FOY.EH], [X - FOY.EX0, FOY.EH], [X - FOY.EX0, 0], [2 * X, 0], [2 * X, H], [0, H]] });
  let sunDust = [];
  if (GATA) { const gate = SODER ? soderDorr() : glassEntranceGata(); streetExt = Object.assign(SODER ? { update: () => {} } : streetExterior(), { gate }); if (STREET && STREET.on) STREET.attach(streetExt); }
  else sunDust = glassEntrance();
  planar({ O: [-X, H, -L], U: [1, 0, 0], V: [0, 0, 1], lu: 2 * X, lv: L, map: tx.ceil, tu: 4, tv: 4 });
  haloSign("EN BÄTTRE BILD", "Stockholm", [0, 4.68, -L + .02], [0, 0, 1], 5.0);
  // en enda stor öppning till vernissagen; där inne väljer man att ta turen eller vilket rum man börjar i
  opening({ C: [0, 0, -L], N: [0, 0, 1], U: [1, 0, 0], w: 3.0, h: 3.0, to: "vernissage", sign: ["TILL VERNISSAGEN", "FYRA RUM  ·  TA TUREN"], signW: 2.8, signY: 3.62, signOff: .07, glow: new THREE.Color(1.15, 1.05, .9) });
  menuBoard("om", "OM", "Vem står bakom kameran", [-X, 1.7, -3], [1, 0, 0], 1.6, 1.0);
  menuBoard("priser", "PRISER", "Paket och priser", [-X, 1.7, -6], [1, 0, 0], 1.6, 1.0);
  menuBoard("kontakt", "KONTAKT", "Boka en fotografering", [-X, 1.7, -9], [1, 0, 0], 1.6, 1.0);
  menuBoard("galleri", "GALLERI", "Alla bilder på ett ställe", [X, 1.8, -6], [-1, 0, 0], 2.4, 1.5);
  for (const lx of FOY_LAMP.xs) industrialLamp(lx, FOY_LAMP.y, FOY_LAMP.z, H);
  prop(worldUV(new THREE.BoxGeometry(2.6, .44, .55, 6, 2, 2), 2), { color: 0xa8a8a2, map: MATTEX.betong.diff }, new V3(0, .22, -6), null, { id: "fbench", collide: true });
  prop(worldUV(new THREE.BoxGeometry(2.5, .05, .5, 6, 1, 2), 1.5), { color: 0xb08460, map: MATTEX.tra.diff }, new V3(0, .465, -6), null, { id: "fbench" });
  plant(-5.2, -11.2, 2.1, 5); plant(5.2, -11.2, 1.9, 9); plant(5.2, -.9, 1.6, 14);
  if (!GATA) return { dust: sunDust };
  const ext = streetExt;
  return { dust: sunDust, update: (now) => ext.update(now), afterBake: () => { if (!(STREET && STREET.on)) ext.gate.lift(1); } };
}
