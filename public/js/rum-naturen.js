// Rum 02: Naturen.
"use strict";
/* ================= 02 NATUREN ================= */
function buildNaturen() {
  const X = NAT.X, L = NAT.L, H = NAT.H, CW = NAT.CW, CL = NAT.CL, CH = NAT.CH;
  const tx = { wall: mat("puts", { color: 0xf2efe9 }), ceil: mat("puts", { color: 0xe4e1da, relief: .6 }), floor: mat("betonggolv", { color: 0xb4cff2 }), dwall: mat("betong", { color: 0x8a8a84 }), dfloor: mat("betonggolv", { color: 0x6c7d96 }) };
  planar({ name: "golv", floor: true, O: [-X, 0, 0], U: [1, 0, 0], V: [0, 0, -1], lu: 2 * X, lv: L, map: tx.floor, tu: 3, tv: 3 });
  planar({ name: "tak", O: [-X, H, -L], U: [1, 0, 0], V: [0, 0, 1], lu: 2 * X, lv: L, map: tx.ceil, tu: 3, tv: 3, holes: NAT.SK.map((s) => [[s.x0 + X, s.z0 + L], [s.x1 + X, s.z0 + L], [s.x1 + X, s.z1 + L], [s.x0 + X, s.z1 + L]]) });
  planar({ name: "västra väggen", O: [-X, 0, 0], U: [0, 0, -1], V: [0, 1, 0], lu: L, lv: H, map: tx.wall, tu: 3, tv: 3 });
  planar({ name: "östra väggen", O: [X, 0, -L], U: [0, 0, 1], V: [0, 1, 0], lu: L, lv: H, map: tx.wall, tu: 3, tv: 3 });
  planar({ name: "bortre väggen", O: [-X, 0, -L], U: [1, 0, 0], V: [0, 1, 0], lu: 2 * X, lv: H, map: tx.wall, tu: 3, tv: 3 });
  const a = X - CW, b = X + CW;
  planar({ name: "ingångsväggen", O: [X, 0, 0], U: [-1, 0, 0], V: [0, 1, 0], lu: 2 * X, lv: H, shape: [[0, 0], [a, 0], [a, CH], [b, CH], [b, 0], [2 * X, 0], [2 * X, H], [0, H]], map: tx.wall, tu: 3, tv: 3 });
  const shaftPts = [];
  NAT.SK.forEach((s) => {
    const dh = NAT.TOP - H, w = s.x1 - s.x0, d = s.z1 - s.z0;
    planar({ O: [s.x0, H, s.z0], U: [1, 0, 0], V: [0, 1, 0], lu: w, lv: dh, map: tx.ceil, tu: 3, tv: 3, res: 10 });
    planar({ O: [s.x1, H, s.z1], U: [-1, 0, 0], V: [0, 1, 0], lu: w, lv: dh, map: tx.ceil, tu: 3, tv: 3, res: 10 });
    planar({ O: [s.x0, H, s.z1], U: [0, 0, -1], V: [0, 1, 0], lu: d, lv: dh, map: tx.ceil, tu: 3, tv: 3, res: 10 });
    planar({ O: [s.x1, H, s.z0], U: [0, 0, 1], V: [0, 1, 0], lu: d, lv: dh, map: tx.ceil, tu: 3, tv: 3, res: 10 });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: REGN ? new THREE.Color(1.5, 1.6, 1.75) : new THREE.Color(2.3, 2.5, 2.8) })); glass.rotation.x = Math.PI / 2; glass.position.set((s.x0 + s.x1) / 2, NAT.TOP, (s.z0 + s.z1) / 2); scene.add(glass);
    for (let k = 1; k < w / NAT.PX - .01; k++) prop(new THREE.BoxGeometry(.07, .08, d, 1, 1, 4), { color: 0xe8e6e0 }, new V3(s.x0 + k * NAT.PX, NAT.TOP - .04, (s.z0 + s.z1) / 2), null, { shadow: false });
    for (let k = 1; k < d / NAT.PZ - .01; k++) prop(new THREE.BoxGeometry(w, .08, .07, 4, 1, 1), { color: 0xe8e6e0 }, new V3((s.x0 + s.x1) / 2, NAT.TOP - .04, s.z0 + k * NAT.PZ), null, { shadow: false });
    if (REGN) return; // mulet: inga solstrålar
    // solstrålen genom luften: ett genomskinligt prisma från fönstret ner till golvet
    const k = H / SUN[1], off = [-SUN[0] * k, -H, -SUN[2] * k];
    const top = [[s.x0, H, s.z0], [s.x1, H, s.z0], [s.x1, H, s.z1], [s.x0, H, s.z1]], bot = top.map((p) => [p[0] + off[0], .02, p[2] + off[2]]);
    const pos = [], col = [], idx = [];
    top.concat(bot).forEach((p, i) => { pos.push(...p); const c = i < 4 ? .9 : .06; col.push(c, c * .95, c * .82); });
    for (let i = 0; i < 4; i++) { const i2 = (i + 1) % 4; idx.push(i, i2, i2 + 4, i, i2 + 4, i + 4); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); sg.setIndex(idx);
    scene.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .085, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })));
    const rr = rng((s.z0 * 7) | 0);
    for (let i = 0; i < (isTouch ? 60 : 170); i++) { const t = rr(), px = s.x0 + rr() * w, pz = s.z0 + rr() * d; shaftPts.push(new V3(px + off[0] * t, H + off[1] * t, pz + off[2] * t)); }
  });
  // mörk korridor in
  planar({ name: "korridorgolv", floor: true, O: [-CW, 0, CL], U: [1, 0, 0], V: [0, 0, -1], lu: 2 * CW, lv: CL, map: tx.dfloor, tu: 3, tv: 3, color: 0x6a6862 });
  planar({ O: [-CW, 0, CL], U: [0, 0, -1], V: [0, 1, 0], lu: CL, lv: CH, map: tx.dwall, tu: 4, tv: 3.2 });
  planar({ O: [CW, 0, 0], U: [0, 0, 1], V: [0, 1, 0], lu: CL, lv: CH, map: tx.dwall, tu: 4, tv: 3.2 });
  planar({ O: [-CW, CH, 0], U: [1, 0, 0], V: [0, 0, 1], lu: 2 * CW, lv: CL, map: tx.dwall, tu: 4, tv: 3.2 });
  planar({ O: [CW, 0, CL], U: [-1, 0, 0], V: [0, 1, 0], lu: 2 * CW, lv: CH, map: tx.dwall, tu: 4, tv: 3.2 });
  prop(new THREE.BoxGeometry(.12, .06, 1.1, 1, 1, 4), { color: 0x9a9d98 }, new V3(0, CH - .04, 3.6), null, { shadow: false });
  { const t = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .96, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(.9, 2.6, 2.4) })); t.rotation.x = Math.PI / 2; t.position.set(0, CH - .09, 3.6); scene.add(t); }
  // bänk, växter, dörrar
  prop(worldUV(new THREE.BoxGeometry(.5, .06, 3.2, 2, 1, 8), 1.5), { color: 0xe8d0b0, map: MATTEX.tra.diff }, new V3(0, .45, -10), null, { id: "nbench", collide: true }); benchSeats(0, -10, 3.2, .5, .48, false);
  for (const dz of [-1.1, 1.1]) prop(worldUV(new THREE.BoxGeometry(.44, .42, .44, 2, 2, 2), 2), { color: 0xd8d8d2, map: MATTEX.betong.diff }, new V3(0, .21, -10 + dz), null, { id: "nbench" });
  plant(-4.9, -1.4, 2.0, 3); plant(4.9, -1.4, 1.7, 8); plant(5.3, -16.0, 2.1, 12);
  buildStands("naturen", 0xdedad2);
  opening({ C: [0, 0, CL], N: [0, 0, -1], U: [-1, 0, 0], w: 1.2, h: 2.2, to: "staden", sign: ["01  STADEN", "TILLBAKA"], glow: new THREE.Color(.35, .85, .8) });
  opening({ C: [X, 0, -17.5], N: [-1, 0, 0], U: [0, 0, 1], w: 1.6, h: 2.8, to: "berattelser", sign: ["03  BERÄTTELSER", "GÅ VIDARE"], glow: new THREE.Color(1.05, 1.0, .9) });
  // regn på takfönstren: dropparna ligger kvar på glaset
  const rain = REGN ? rainPanes(NAT.SK.map((s, i) => ({ w: s.x1 - s.x0, h: s.z1 - s.z0, pos: [(s.x0 + s.x1) / 2, NAT.TOP - .012, (s.z0 + s.z1) / 2], rot: [Math.PI / 2, 0, 0], seed: 61 + i * 10 }))) : null;
  return { dust: shaftPts, update: rain };
}
