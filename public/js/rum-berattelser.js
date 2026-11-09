// Rum 03: Berättelser (industrihallen).
"use strict";
/* ================= 03 BERÄTTELSER: nedgången industrihall ================= */
function buildHall() {
  const X = HAL.X, L = HAL.L, H = HAL.H, CX0 = HAL.CX0, CX1 = HAL.CX1, CL = HAL.CL, CH = HAL.CH;
  const tx = { wall: mat("betong", { color: 0xb8c4d8 }), wall2: mat("betong", { color: 0xc4c8d6 }),
    floor: mat("betonggolv", { color: 0x8ea8cc }), ceil: mat("betong", { color: 0x8c8c86, relief: .6 }), corr: mat("plat", { color: 0xb8aca0 }) };
  planar({ name: "golv", floor: true, O: [-X, 0, 0], U: [1, 0, 0], V: [0, 0, -1], lu: 2 * X, lv: L, map: tx.floor, tu: 4, tv: 4, color: 0x7c7972 });
  planar({ name: "tak", O: [-X, H, -L], U: [1, 0, 0], V: [0, 0, 1], lu: 2 * X, lv: L, map: tx.ceil, tu: 4, tv: 4, holes: HAL.SKY.map((k) => [[k.x0 + X, k.z0 + L], [k.x1 + X, k.z0 + L], [k.x1 + X, k.z1 + L], [k.x0 + X, k.z1 + L]]) });
  planar({ name: "fönsterväggen", O: [-X, 0, 0], U: [0, 0, -1], V: [0, 1, 0], lu: L, lv: H, map: tx.wall, tu: 6, tv: H, holes: HAL.WIN.map((w) => [[-w.z1, w.y0], [-w.z0, w.y0], [-w.z0, w.y1], [-w.z1, w.y1]]) });
  planar({ name: "östra väggen", O: [X, 0, -L], U: [0, 0, 1], V: [0, 1, 0], lu: L, lv: H, map: tx.wall2, tu: 6, tv: H });
  planar({ name: "bortre väggen", O: [-X, 0, -L], U: [1, 0, 0], V: [0, 1, 0], lu: 2 * X, lv: H, map: tx.wall2, tu: 6, tv: H });
  const a = X - CX1, b = X - CX0;
  planar({ name: "ingångsväggen", O: [X, 0, 0], U: [-1, 0, 0], V: [0, 1, 0], lu: 2 * X, lv: H, shape: [[0, 0], [a, 0], [a, CH], [b, CH], [b, 0], [2 * X, 0], [2 * X, H], [0, H]], map: tx.wall, tu: 6, tv: H });
  const steel = 0x2a2c2a, shaftPts = [];
  // takljus
  HAL.SKY.forEach((k) => {
    const dh = HAL.TOP - H, w = k.x1 - k.x0, d = k.z1 - k.z0;
    planar({ O: [k.x0, H, k.z0], U: [1, 0, 0], V: [0, 1, 0], lu: w, lv: dh, map: tx.ceil, tu: 4, tv: 4, res: 8 });
    planar({ O: [k.x1, H, k.z1], U: [-1, 0, 0], V: [0, 1, 0], lu: w, lv: dh, map: tx.ceil, tu: 4, tv: 4, res: 8 });
    planar({ O: [k.x0, H, k.z1], U: [0, 0, -1], V: [0, 1, 0], lu: d, lv: dh, map: tx.ceil, tu: 4, tv: 4, res: 8 });
    planar({ O: [k.x1, H, k.z0], U: [0, 0, 1], V: [0, 1, 0], lu: d, lv: dh, map: tx.ceil, tu: 4, tv: 4, res: 8 });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 2.2, 2.5) })); glass.rotation.x = Math.PI / 2; glass.position.set((k.x0 + k.x1) / 2, HAL.TOP, (k.z0 + k.z1) / 2); scene.add(glass);
    for (let z = k.z0 + 1.1; z < k.z1 - .1; z += 1.1) prop(new THREE.BoxGeometry(w, .08, .07, 2, 1, 1), { color: steel }, new V3((k.x0 + k.x1) / 2, HAL.TOP - .05, z), null, { shadow: false });
  });
  // fabriksfönster med spröjs och solstrålar genom dammet
  HAL.WIN.forEach((w) => {
    const wz = w.z1 - w.z0, wy = w.y1 - w.y0;
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(wz, wy), new THREE.MeshBasicMaterial({ map: T(winCanvas(w), true, false), color: new THREE.Color(2.0, 2.1, 2.3) }));
    gl.rotation.y = Math.PI / 2; gl.position.set(HAL.WX - .03, (w.y0 + w.y1) / 2, (w.z0 + w.z1) / 2); scene.add(gl);
    for (let k = 0; k <= 4; k++) prop(new THREE.BoxGeometry(.07, wy, .06, 1, 4, 1), { color: steel }, new V3(HAL.WX + .03, (w.y0 + w.y1) / 2, w.z0 + k * HAL.PZ), null, { shadow: false });
    for (let k = 0; k <= 6; k++) prop(new THREE.BoxGeometry(.07, .06, wz, 1, 1, 4), { color: steel }, new V3(HAL.WX + .03, w.y0 + k * HAL.PY, (w.z0 + w.z1) / 2), null, { shadow: false });
    prop(new THREE.BoxGeometry(.3, .08, wz + .2, 1, 1, 4), { color: 0x6a6a64 }, new V3(HAL.WX + .15, w.y0 - .04, (w.z0 + w.z1) / 2), null, { shadow: false });
    const corners = [[HAL.WX, w.y0, w.z0], [HAL.WX, w.y0, w.z1], [HAL.WX, w.y1, w.z1], [HAL.WX, w.y1, w.z0]];
    const floorP = corners.map((p) => { const t = p[1] / SUNH[1]; return [p[0] - SUNH[0] * t, .02, p[2] - SUNH[2] * t]; });
    const pos = [], col = [], idx = [];
    corners.concat(floorP).forEach((p, i) => { pos.push(...p); const c = i < 4 ? .85 : .05; col.push(c, c * .95, c * .82); });
    for (let i = 0; i < 4; i++) { const i2 = (i + 1) % 4; idx.push(i, i2, i2 + 4, i, i2 + 4, i + 4); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); sg.setIndex(idx);
    scene.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .075, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })));
    const rr = rng(w.id * 31 + 7);
    for (let i = 0; i < (isTouch ? 50 : 140); i++) { const t = rr(), py = w.y0 + rr() * wy, pz = w.z0 + rr() * wz, tt = py / SUNH[1] * t; shaftPts.push(new V3(HAL.WX - SUNH[0] * tt, py - SUNH[1] * tt, pz - SUNH[2] * tt)); }
  });
  // takstolar i stål
  for (const z of [-2.5, -7, -11.5, -16, -20.5]) {
    prop(new THREE.BoxGeometry(2 * X, .14, .14, 8, 1, 1), { color: steel }, new V3(0, 7.7, z), null, { shadow: false });
    prop(new THREE.BoxGeometry(2 * X, .12, .12, 8, 1, 1), { color: steel }, new V3(0, 8.38, z), null, { shadow: false });
    for (let i = 0; i < 10; i++) { const x0 = -X + i * 1.4, x1 = x0 + 1.4; rodProp([x0, i % 2 ? 8.38 : 7.7, z], [x1, i % 2 ? 7.7 : 8.38, z], .03, steel, "truss"); }
  }
  // ingångskorridor med två tavelplatser
  planar({ name: "korridorgolv", floor: true, O: [CX0, 0, CL], U: [1, 0, 0], V: [0, 0, -1], lu: CX1 - CX0, lv: CL, map: tx.floor, tu: 4, tv: 4 });
  planar({ O: [CX0, 0, CL], U: [0, 0, -1], V: [0, 1, 0], lu: CL, lv: CH, map: tx.corr, tu: 4, tv: CH });
  planar({ O: [CX1, 0, 0], U: [0, 0, 1], V: [0, 1, 0], lu: CL, lv: CH, map: tx.corr, tu: 4, tv: CH });
  planar({ O: [CX0, CH, 0], U: [1, 0, 0], V: [0, 0, 1], lu: CX1 - CX0, lv: CL, map: tx.ceil, tu: 4, tv: 4 });
  planar({ O: [CX1, 0, CL], U: [-1, 0, 0], V: [0, 1, 0], lu: CX1 - CX0, lv: CH, map: tx.corr, tu: 4, tv: CH });
  { const bar = new THREE.Mesh(new THREE.BoxGeometry(.06, .03, 2.9), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.9, 1.2) })); bar.position.set(4, CH - .05, 2.6); scene.add(bar); }
  // fristående visningsvägg mitt i hallen: betongskiva i en ram av svart stål, bilder på båda sidor
  { const fw = HAL.FW, sh = 0x161817;
    prop(new THREE.BoxGeometry(.26, fw.h, fw.z1 - fw.z0, 1, 6, 12), { color: 0x6a6762 }, new V3(0, fw.h / 2, (fw.z0 + fw.z1) / 2), null, { id: "fwall", collide: true });
    for (const z of [fw.z0, fw.z1]) prop(new THREE.BoxGeometry(.34, fw.h + .1, .14, 1, 6, 1), { color: sh }, new V3(0, (fw.h + .1) / 2, z), null, { id: "fwall" });
    prop(new THREE.BoxGeometry(.34, .12, fw.z1 - fw.z0 + .14, 1, 1, 12), { color: sh }, new V3(0, fw.h + .04, (fw.z0 + fw.z1) / 2), null, { id: "fwall" });
    for (const z of [fw.z0 + .07, fw.z1 - .07]) for (const sx of [-1, 1]) prop(new THREE.BoxGeometry(.5, .05, .3), { color: sh }, new V3(sx * .3, .025, z), null, { id: "fwall" }); }
  // två tunga bänkar i ek på stålben, under takljusen, och lampor som hänger lågt ner från takstolarna
  for (const bz of HAL.BENCH) {
    prop(worldUV(new THREE.BoxGeometry(2.8, .09, .5, 8, 1, 2), 1.5), { color: 0x9c7454, map: MATTEX.tra.diff }, new V3(0, .45, bz), null, { id: "hbench", collide: true }); benchSeats(0, bz, 2.8, .5, .48, true);
    for (const bx of [-1.15, 1.15]) { prop(new THREE.BoxGeometry(.06, .41, .46, 1, 2, 1), { color: 0x141615 }, new V3(bx, .205, bz), null, { id: "hbench" });
      prop(new THREE.BoxGeometry(.06, .06, .46), { color: 0x141615 }, new V3(bx, .03, bz), null, { id: "hbench" }); }
    for (const lx of [-1.4, 1.4]) industrialLamp(lx, HAL.LAMPY, bz, 7.63, 1.2);
  }
  // en traverskran som går på balkar längs väggarna, med krok och kätting
  { const ochre = 0x6a4c1c, sh = 0x2a2c2a, CZ = -12.6, KY = 3.9;
    for (const sx of [-1, 1]) { prop(worldUV(new THREE.BoxGeometry(.28, .42, L - .4, 1, 2, 24), 2), { color: 0x6e6a64, map: MATTEX.rost.diff }, new V3(sx * (X - .3), 6.5, -L / 2), null, { shadow: false });
      for (let z = -1.5; z > -L; z -= 4.5) prop(new THREE.BoxGeometry(.3, .5, .3), { color: sh }, new V3(sx * (X - .15), 6.05, z), null, { shadow: false }); }
    prop(worldUV(new THREE.BoxGeometry(2 * X - .6, .55, .4, 16, 2, 1), 2), { color: 0xc4a274, map: MATTEX.rost.diff }, new V3(0, 7.0, CZ), null, { shadow: false });
    for (const sx of [-1, 1]) prop(worldUV(new THREE.BoxGeometry(.4, .36, 1.6, 1, 1, 2), 2), { color: 0xc4a274, map: MATTEX.rost.diff }, new V3(sx * (X - .3), 6.9, CZ), null, { shadow: false });
    prop(worldUV(new THREE.BoxGeometry(.8, .4, .7), 2), { color: 0x9a8060, map: MATTEX.rost.diff }, new V3(-1.8, 6.55, CZ), null, { shadow: false });
    prop(new THREE.CylinderGeometry(.02, .02, 6.35 - KY - .3, 6), { color: 0x2b2a27 }, new V3(-1.8, (6.35 + KY + .3) / 2, CZ), null, { shadow: false });
    prop(new THREE.BoxGeometry(.24, .34, .16), { color: ochre }, new V3(-1.8, KY + .15, CZ), null, { shadow: false });
    prop(new THREE.TorusGeometry(.11, .028, 8, 18, Math.PI * 1.4), { color: 0x2b2a27 }, new V3(-1.8, KY - .12, CZ), [0, 0, Math.PI * .8], { shadow: false }); }
  placeModel("hylla", [-6.65, 0, -16.4], Math.PI / 2, { h: 1.9, shadow: true, collide: true });
  // industrirör: två ledningar högt längs högra väggen ovanför tavlorna, som går ner till golvet längst in med en ventil
  if (MODELS.ror) { const R = "modular_industrial_pipes_01_", seg = 1.95;
    for (const [y, zEnd, off] of [[5.62, -21.78, .2], [5.02, -21.3, .2]]) { // två ledningar rakt över varandra; de går ner var för sig i hörnet, en bit från dörren
      const x = X - off; let z = zEnd + .16;
      while (z < -.5) { const len = Math.min(seg, -.5 - z); placePart("ror", R + "pipe02", M4(x, y, z, Math.PI / 2, 0, 0), { sy: len / seg, id: "ror" }); z += len; }
      placePart("ror", R + "pipe06", M4(x, y - .18, zEnd, 0, -Math.PI / 2, 0), { id: "ror" });          // T-rör där ledningen vänder nedåt
      const yt = y - .18, yb = 1.12, n = Math.ceil((yt - yb) / seg), l = (yt - yb) / n;
      for (let i = 0; i < n; i++) placePart("ror", R + "pipe02", M4(x, yb + i * l, zEnd), { sy: l / seg, id: "ror" });
      placePart("ror", R + "pipe08", M4(x, .74, zEnd, 0, -.55, 0), { id: "ror" }); // ratten vänd ut mot rummet               // ventilen med rött ratt
      placePart("ror", R + "pipe01", M4(x, 0, zEnd), { sy: .74 / .86, id: "ror" });
      // rörklammor: en ring runt röret och en stång in i väggen, längs ledningen och på det lodräta röret
      const clamp1 = (cx, cy, cz, vert) => { prop(new THREE.TorusGeometry(.118, .013, 6, 22), { color: 0x2c2d2d }, new V3(cx, cy, cz), vert ? [Math.PI / 2, 0, 0] : null, { shadow: false });
        prop(new THREE.BoxGeometry(off - .1, .035, .035), { color: 0x2c2d2d }, new V3(X - (off - .1) / 2, cy, cz), null, { shadow: false }); };
      for (let zz = zEnd + 1.6; zz < -1; zz += 2.4) clamp1(x, y, zz, false);
      for (let yy = 2.1; yy < y - .6; yy += 1.5) clamp1(x, yy, zEnd, true);
    } }
  buildStands("berattelser", 0x56534f, 0x161717);
  opening({ C: [4, 0, CL], N: [0, 0, -1], U: [-1, 0, 0], w: 1.2, h: 2.3, to: "naturen", sign: ["02  NATUREN", "TILLBAKA"], glow: new THREE.Color(1.15, 1.2, 1.3) });
  opening({ C: [X, 0, -19], N: [-1, 0, 0], U: [0, 0, 1], w: 1.6, h: 2.8, to: "manniskorna", sign: ["04  MÄNNISKORNA", "GÅ VIDARE"], glow: new THREE.Color(1.2, .9, .6) });
  return { dust: shaftPts };
}
