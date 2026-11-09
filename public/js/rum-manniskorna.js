// Rum 04: Människorna (ateljén).
"use strict";
/* ================= 04 MÄNNISKORNA: gammal fotoateljé ================= */
function buildManniskorna() {
  const X = MAN.X, L = MAN.L, H = MAN.H, CW = MAN.CW, CL = MAN.CL, CH = MAN.CH;
  const tx = { brick: mat("kalk", { color: 0xfffaf2 }), dark: mat("mork", { color: 0x56585c }), raw: mat("betong", { color: 0xb4bcc8 }), floor: mat("betonggolv", { color: 0xb8cce8 }), ceil: mat("mork", { color: 0x2c2c2e, relief: .4 }), paper: T((() => { const c = cnv(256, 256), x = c.getContext("2d"); x.fillStyle = "#dedad2"; x.fillRect(0, 0, 256, 256); grain(x, 256, 256, 6, 3); return c; })()) };
  planar({ name: "golv", floor: true, O: [-X, 0, 0], U: [1, 0, 0], V: [0, 0, -1], lu: 2 * X, lv: L, map: tx.floor, tu: 4, tv: 4 });
  planar({ name: "tak", O: [-X, H, -L], U: [1, 0, 0], V: [0, 0, 1], lu: 2 * X, lv: L, map: tx.ceil, tu: 4, tv: 4 });
  planar({ name: "fönsterväggen", O: [-X, 0, 0], U: [0, 0, -1], V: [0, 1, 0], lu: L, lv: H, map: tx.brick, tu: 4, tv: 3, holes: MAN.WIN.map((w) => [[-w.z1, w.y0], [-w.z0, w.y0], [-w.z0, w.y1], [-w.z1, w.y1]]) });
  planar({ name: "östra väggen", O: [X, 0, -L], U: [0, 0, 1], V: [0, 1, 0], lu: L, lv: H, map: tx.dark, tu: 4, tv: 3 });
  planar({ name: "bortre väggen", O: [-X, 0, -L], U: [1, 0, 0], V: [0, 1, 0], lu: 2 * X, lv: H, map: tx.raw, tu: 4, tv: 3 });
  planar({ name: "ingångsväggen", O: [X, 0, 0], U: [-1, 0, 0], V: [0, 1, 0], lu: 2 * X, lv: H, shape: [[0, 0], [X - CW, 0], [X - CW, CH], [X + CW, CH], [X + CW, 0], [2 * X, 0], [2 * X, H], [0, H]], map: tx.brick, tu: 4, tv: 3 });
  // korridoren in
  planar({ name: "korridorgolv", floor: true, O: [-CW, 0, CL], U: [1, 0, 0], V: [0, 0, -1], lu: 2 * CW, lv: CL, map: tx.floor, tu: 4, tv: 4 });
  planar({ O: [-CW, 0, CL], U: [0, 0, -1], V: [0, 1, 0], lu: CL, lv: CH, map: tx.brick, tu: 4, tv: 3 });
  planar({ O: [CW, 0, 0], U: [0, 0, 1], V: [0, 1, 0], lu: CL, lv: CH, map: tx.brick, tu: 4, tv: 3 });
  planar({ O: [-CW, CH, 0], U: [1, 0, 0], V: [0, 0, 1], lu: 2 * CW, lv: CL, map: tx.ceil, tu: 4, tv: 4 });
  planar({ O: [CW, 0, CL], U: [-1, 0, 0], V: [0, 1, 0], lu: 2 * CW, lv: CH, map: tx.brick, tu: 4, tv: 3 });
  { const bar = new THREE.Mesh(new THREE.BoxGeometry(.06, .03, 2.9), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.9, 1.2) })); bar.position.set(0, CH - .05, 2.4); scene.add(bar); }
  opening({ C: [0, 0, CL], N: [0, 0, -1], U: [-1, 0, 0], w: 1.2, h: 2.2, to: "foajen", sign: ["00  FOAJÉN", "TILLBAKA TILL ENTRÉN"], glow: new THREE.Color(1.1, .82, .55) });
  // fabriksfönster mot norr: frostat dagsljus bakom smala stålspröjs
  const steel = 0x1d1e1c;
  MAN.WIN.forEach((w, wi) => {
    const wz = w.z1 - w.z0, wy = w.y1 - w.y0, c = cnv(256, 320), x = c.getContext("2d"), r = rng(41 + wi);
    const g = x.createLinearGradient(0, 0, 0, 320); g.addColorStop(0, "#f2f4f5"); g.addColorStop(1, "#d5d9d6"); x.fillStyle = g; x.fillRect(0, 0, 256, 320);
    for (let i = 0; i < 20; i++) { x.fillStyle = `rgba(150,160,155,${r() * .15})`; x.fillRect((i % 4) * 64, (i / 4 | 0) * 64, 64, 64); }
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(wz, wy), new THREE.MeshBasicMaterial({ map: T(c, true, false), color: new THREE.Color(2.1, 2.05, 1.95) }));
    gl.rotation.y = Math.PI / 2; gl.position.set(-X - .03, (w.y0 + w.y1) / 2, (w.z0 + w.z1) / 2); scene.add(gl);
    for (let k = 0; k <= 4; k++) prop(new THREE.BoxGeometry(.07, wy, .06, 1, 4, 1), { color: steel }, new V3(-X + .03, (w.y0 + w.y1) / 2, w.z0 + k * wz / 4), null, { shadow: false });
    for (let k = 0; k <= 5; k++) prop(new THREE.BoxGeometry(.07, .06, wz, 1, 1, 4), { color: steel }, new V3(-X + .03, w.y0 + k * wy / 5, (w.z0 + w.z1) / 2), null, { shadow: false });
    prop(new THREE.BoxGeometry(.3, .07, wz + .2, 1, 1, 4), { color: 0x6b5a48 }, new V3(-X + .15, w.y0 - .035, (w.z0 + w.z1) / 2), null, { shadow: false }); // fönsterbänk i trä
    const corners = [[-X, w.y0, w.z0], [-X, w.y0, w.z1], [-X, w.y1, w.z1], [-X, w.y1, w.z0]], pos = [], col = [], idx = [];
    corners.concat(corners.map((p) => { const t2 = p[1] / SUNM[1]; return [p[0] - SUNM[0] * t2, .02, p[2] - SUNM[2] * t2]; })).forEach((p, i) => { pos.push(...p); const k = i < 4 ? .9 : .05; col.push(k, k * .9, k * .74); });
    for (let i = 0; i < 4; i++) { const i2 = (i + 1) % 4; idx.push(i, i2, i2 + 4, i, i2 + 4, i + 4); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); sg.setIndex(idx);
    scene.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .03, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
  });
  // takbjälkar i trä
  for (let z = -1.5; z > -L; z -= 3) prop(new THREE.BoxGeometry(2 * X, .3, .24, 8, 1, 1), { color: 0x161616 }, new V3(0, H - .15, z), null, { shadow: false });
  // upphängningslist i mässing längs långväggarna, med en tunn vajer ner till varje tavla
  // på fönsterväggen tar listen slut vid varje fönster och börjar igen efter, med en liten ändknopp
  for (const sx of [-1, 1]) {
    const cuts = sx < 0 ? MAN.WIN.map((w) => [w.z0 - .18, w.z1 + .18]).sort((a, b) => b[1] - a[1]) : [];
    let z = -.15; const segs = [];
    for (const [c0, c1] of cuts) { if (c1 < z) segs.push([c1, z]); z = c0; }
    segs.push([-L + .15, z]);
    for (const [z0, z1] of segs) { if (z1 - z0 < .3) continue;
      prop(new THREE.BoxGeometry(.03, .05, z1 - z0), { color: 0xb08a4a }, new V3(sx * (X - .03), 3.25, (z0 + z1) / 2), null, { shadow: false });
      for (const ze of [z0, z1]) prop(new THREE.SphereGeometry(.022, 12, 8), { color: 0xb08a4a }, new V3(sx * (X - .035), 3.25, ze), null, { shadow: false }); }
  }
  SPECS.manniskorna.slots.forEach((sl) => { if (Math.abs(Math.abs(sl.C[0]) - X) > .01) return; const sx = Math.sign(sl.C[0]); for (const dz of [-.3, .3]) rodProp([sx * (X - .03), 3.22, sl.C[2] + dz], [sx * (X - .05), sl.C[1] + sl.h / 2 + .1, sl.C[2] + dz * .4], .0025, 0x9a9a96); });
  // ett tungt sammetsdraperi bakom fotohörnet, i veck från en svart stång
  { const W = 5.2, Hh = H - .35, seg = 160, g = new THREE.PlaneGeometry(W, Hh, seg, 1), pp = g.attributes.position;
    for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), u = (x + W / 2) / W; pp.setZ(i, .09 * Math.sin(u * 46) + .035 * Math.sin(u * 113 + 1.3)); }
    g.computeVertexNormals();
    prop(g, { color: 0x6e5a62, map: MATTEX.mork.diff, side: THREE.DoubleSide }, new V3(0, Hh / 2, -L + .22), null, { id: "draperi", shadow: false });
    rodProp([-W / 2 - .2, H - .3, -L + .22], [W / 2 + .2, H - .3, -L + .22], .022, 0x141414); }
  // fotohörnan: bakgrundspapper på rulle, pall, två softboxar och en kamera på stativ
  prop(new THREE.CylinderGeometry(.07, .07, 3.0, 16), { color: 0x2a2a28 }, new V3(0, 3.1, -15.62), [0, 0, Math.PI / 2], { shadow: false });
  for (const sx of [-1.55, 1.55]) prop(new THREE.CylinderGeometry(.015, .015, 3.1, 6), { color: 0x1a1a1a }, new V3(sx, 1.55, -15.62), null, { shadow: false });
  planar({ name: "bakgrundspapper", O: [-1.4, .35, -15.6], U: [1, 0, 0], V: [0, 1, 0], lu: 2.8, lv: 2.7, map: tx.paper, tu: 2, tv: 2, res: RES });
  planar({ O: [-1.4, .004, -15.25], U: [1, 0, 0], V: [0, .7071, -.7071], lu: 2.8, lv: .495, map: tx.paper, tu: 2, tv: 2, res: RES });
  planar({ O: [-1.4, .004, -13.5], U: [1, 0, 0], V: [0, 0, -1], lu: 2.8, lv: 1.75, map: tx.paper, tu: 2, tv: 2, res: RES });
  colliders.push({ x0: -1.6, x1: 1.6, z0: -15.8, z1: -13.4 });
  placeModel("pall", [MAN_STOOL[0], 0, MAN_STOOL[2]], .4, { h: 1.0, id: "stool", shadow: true });
  MAN_SOFT.forEach(([px, py, pz]) => {
    for (let k = 0; k < 3; k++) { const a = k * 2.094 + .5; rodProp([px, .9, pz], [px + Math.cos(a) * .45, 0, pz + Math.sin(a) * .45], .014, 0, "stand", STEEL()); }
    rodProp([px, .9, pz], [px, py, pz], .02, 0, "stand", STEEL());
    const g = new THREE.Group(); g.position.set(px, py, pz); scene.add(g); g.lookAt(MAN_STOOL[0], MAN_STOOL[1], MAN_STOOL[2]);
    const bg = new THREE.CylinderGeometry(.42, .07, .45, 4, 4, true); bg.rotateY(Math.PI / 4); bg.rotateX(Math.PI / 2);
    prop(bg, { color: 0x34302e, map: MATTEX.lader.diff, side: THREE.DoubleSide }, new V3(0, 0, 0), null, { parent: g, shadow: false, id: "softbox" });
    const dif = new THREE.Mesh(new THREE.PlaneGeometry(.59, .59), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.85, 1.75) })); dif.position.z = .226; g.add(dif);
    colliders.push({ x0: px - .4, x1: px + .4, z0: pz - .4, z1: pz + .4 });
  });
  { const cx = 0, cz = -10.6; buildTripod(cx, cz, 1.42); buildCamera(cx, 1.42 + .085, cz, 0); colliders.push({ x0: cx - .5, x1: cx + .5, z0: cz - .5, z1: cz + .5 }); }
  // ett gammalt arbetsbord och en växt vid fönstren
  for (const sx of [-1.6, 1.6]) placeModel("vagg", [sx, 2.2, -.13], Math.PI, { h: .34, glow: /bulb/, glowCol: [4.5, 3.2, 1.7] });
  buildLounge();
  return {};
}
// gammalt läder: konjaksbrunt med mörkare veck och slitna, ljusare partier
function leatherTex(seed) {
  const S = 512, c = cnv(S, S), x = c.getContext("2d"), r = rng(seed);
  x.fillStyle = "#6a3a20"; x.fillRect(0, 0, S, S);
  blotches(x, S, S, 120, seed, ["60,28,14", "150,96,60", "110,58,30"], 10, 90, .08, .3);
  for (let i = 0; i < 90; i++) { x.strokeStyle = `rgba(40,18,8,${.12 + r() * .25})`; x.lineWidth = .6 + r() * 1.2; x.beginPath(); let px = r() * S, py = r() * S; x.moveTo(px, py);
    for (let k = 0; k < 4; k++) { px += (r() - .5) * 40; py += (r() - .5) * 18; x.lineTo(px, py); } x.stroke(); }
  grain(x, S, S, 14, seed + 1); return T(c);
}
// stor gammal matta: blekt röd botten, mörkblå bård och ett mönster i mitten, sliten
function rugTex(seed) {
  const W = 800, Hh = 920, c = cnv(W, Hh), x = c.getContext("2d"), r = rng(seed);
  x.fillStyle = "#5c2a24"; x.fillRect(0, 0, W, Hh);
  // fältet: ett tätt rutmönster av små romber, nött och ojämnt
  for (let yy = 120; yy < Hh - 120; yy += 26) for (let xx = 120; xx < W - 120; xx += 26) { x.fillStyle = `rgba(${r() > .5 ? "150,118,80" : "30,34,48"},${.18 + r() * .2})`;
    x.save(); x.translate(xx + ((yy / 26) % 2) * 13, yy); x.rotate(.785); x.fillRect(-4, -4, 8, 8); x.restore(); }
  const band = (m, col, w) => { x.strokeStyle = col; x.lineWidth = w; x.strokeRect(m, m, W - 2 * m, Hh - 2 * m); };
  band(26, "#222a38", 46); band(64, "#8c7452", 5); band(92, "#2b2f3c", 26); band(110, "#8c7452", 3);
  for (let k = 0; k <= 36; k++) { const t = k / 36; for (const yy of [26, Hh - 26]) { x.fillStyle = "rgba(160,132,92,.7)"; x.save(); x.translate(26 + t * (W - 52), yy); x.rotate(.785); x.fillRect(-7, -7, 14, 14); x.restore(); } }
  x.save(); x.translate(W / 2, Hh / 2);
  for (const [rx, ry, col] of [[200, 270, "rgba(34,40,56,.85)"], [165, 225, "rgba(110,44,34,.9)"], [120, 165, "rgba(140,116,82,.75)"], [80, 110, "rgba(43,47,60,.85)"], [40, 55, "rgba(92,42,36,.9)"]]) { x.fillStyle = col; x.beginPath();
    for (let a = 0; a < 6.29; a += .05) { const k2 = 1 + .07 * Math.cos(a * 8); x.lineTo(Math.cos(a) * rx * k2, Math.sin(a) * ry * k2); } x.closePath(); x.fill(); }
  x.restore();
  // slitage: ljusa nötta stråk, mörka fläckar och blekning mot fönstret
  for (let i = 0; i < 420; i++) { x.fillStyle = `rgba(${r() > .45 ? "190,160,120" : "25,18,16"},${r() * .14})`; x.fillRect(r() * W, r() * Hh, 6 + r() * 40, 1 + r() * 4); }
  blotches(x, W, Hh, 60, seed + 4, ["200,175,140", "30,20,18"], 30, 180, .08, .22);
  x.fillStyle = "rgba(40,30,26,.22)"; x.fillRect(0, 0, W, Hh);
  grain(x, W, Hh, 22, seed + 2);
  if (MATTEX.matta) { x.globalCompositeOperation = "overlay"; x.globalAlpha = .35; for (let ty = 0; ty < Hh; ty += 230) for (let tx = 0; tx < W; tx += 230) x.drawImage(MATTEX.matta.diff.image, tx, ty, 230, 230); x.globalCompositeOperation = "source-over"; x.globalAlpha = 1; }
  return T(c, true, false);
}
// soffa eller fåtölj i gammalt läder. Byggs vänd mot +z och vrids sedan på plats.
function leatherSeat(cx, cz, yaw, W, seats, mat, id) {
  const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = yaw; scene.add(g);
  const D = .92, leg = 0x2a1a10, P = (geo, pos, rot) => prop(geo, mat, new V3(...pos), rot || null, { parent: g, id });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) prop(new THREE.CylinderGeometry(.03, .025, .08, 10), { color: leg }, new V3(sx * (W / 2 - .1), .04, sz * (D / 2 - .1)), null, { parent: g, id, shadow: false });
  P(new THREE.BoxGeometry(W, .3, D, 4, 2, 2), [0, .23, 0]);
  const sw = (W - .44) / seats;
  for (let k = 0; k < seats; k++) P(new THREE.BoxGeometry(sw - .02, .16, D - .26, 3, 1, 3), [-W / 2 + .22 + sw * (k + .5), .46, .1]);
  P(new THREE.BoxGeometry(W - .08, .52, .24, 6, 3, 1), [0, .64, -D / 2 + .13], [-.12, 0, 0]);
  for (const sx of [-1, 1]) {
    P(new THREE.BoxGeometry(.22, .34, D, 1, 2, 3), [sx * (W / 2 - .11), .53, 0]);
    P(new THREE.CylinderGeometry(.13, .13, D, 16, 2), [sx * (W / 2 - .11), .7, 0], [Math.PI / 2, 0, 0]);
  }
  P(new THREE.CylinderGeometry(.11, .11, W - .08, 16, 3), [0, .92, -D / 2 + .1], [0, 0, Math.PI / 2]);
  return g;
}
function buildLounge() {
  const { x: lx, z: lz, lampY } = MAN_LOUNGE, leather = { color: 0xe8d8cc, map: MATTEX.lader.diff };
  // mattan
  planar({ name: "matta", floor: true, O: [lx - 1.8, .008, lz + 2.2], U: [1, 0, 0], V: [0, 0, -1], lu: 3.6, lv: 4.4, map: (() => { const c = cnv(512, 512), x = c.getContext("2d"); x.drawImage(MATTEX.matta.diff.image, 0, 0, 512, 512); x.globalCompositeOperation = "screen"; x.fillStyle = "#6a625c"; x.fillRect(0, 0, 512, 512); return T(c); })(), tu: 1.2, tv: 1.2, res: RES });
  // soffan vänd mot bordet, två fåtöljer på andra sidan
  // riktiga möbler: en soffa mot bordet och två fåtöljer på andra sidan (faller tillbaka på de enkla om modellerna saknas)
  // fyra fåtöljer två och två mot varandra, lätt vinklade in mot bordet
  for (const [dx, dz, yaw] of [[-.88, -1.62, .48], [.88, -1.62, -.48], [-.88, 1.62, Math.PI - .48], [.88, 1.62, Math.PI + .48]]) {
    if (!placeModel("fatolj", [lx + dx, 0, lz + dz], yaw, { w: 1.06, id: "chair" + dx + dz, shadow: true })) leatherSeat(lx + dx, lz + dz, yaw, .98, 1, leather, "chair" + dx + dz);
    colliders.push({ x0: lx + dx - .55, x1: lx + dx + .55, z0: lz + dz - .55, z1: lz + dz + .55 });
    { const fx = Math.sin(yaw), fz = Math.cos(yaw), cx = lx + dx, cz = lz + dz; // fåtöljen tittar åt +z vid yaw 0
      addSeat(cx, .5, cz, 1, 1.05, 1, yaw, [{ x: cx + fx * .06, z: cz + fz * .06, yaw: yaw + Math.PI, eye: 1.08, ox: cx + fx * .95, oz: cz + fz * .95 }]); } }
  // soffbordet i industristil, med böcker
  const tb = placeModel("bord", [lx, 0, lz], 0, { h: .46, stretch: 1.9, id: "ctable", shadow: true });
  colliders.push({ x0: lx - .8, x1: lx + .8, z0: lz - .35, z1: lz + .35 });
  if (tb) [[.24, .05, .32, 0x26343a, .1], [.22, .04, .3, 0x8a6a3a, -.15], [.2, .035, .27, 0x5a1e1a, .3]].reduce((y, [w, h, d, col, rot]) => {
    prop(new THREE.BoxGeometry(w, h, d), { color: col }, new V3(lx - .3, y + h / 2, lz + .05), [0, rot, 0], { id: "books" }); return y + h; }, tb.top);
  // en gammal ljuskrona i kätting från taket ovanför soffbordet
  // två moderna pendlar i glas, lågt och i olika höjd över soffbordet
  for (const [dx, dz, y] of MAN_PENDANTS) { const pl = placeModel("pendel", [lx + dx, y, lz + dz], 0, { h: .95, cutAbove: .545, glass: /glass/, glassCol: [1.4, 1.25, 1.05], glow: /globe/, glowCol: [5, 3.6, 2] });
    if (pl) rodProp([lx + dx, pl.top - .01, lz + dz], [lx + dx, MAN.H, lz + dz], .004, 0x111111); }
}
