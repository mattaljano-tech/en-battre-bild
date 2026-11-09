// Sittplatser, studiomonitorer, kamera och stativ.
"use strict";
/* ---------- systemkamera på stativ (modellerad efter en fullformats-DSLR, utan märke) ---------- */
function roundBox(w, h, d, r) { const sh = new THREE.Shape(), x = -w / 2 + r, y = -h / 2 + r, W = w - 2 * r, H = h - 2 * r;
  sh.moveTo(x, y - r); sh.lineTo(x + W, y - r); sh.quadraticCurveTo(x + W + r, y - r, x + W + r, y); sh.lineTo(x + W + r, y + H); sh.quadraticCurveTo(x + W + r, y + H + r, x + W, y + H + r);
  sh.lineTo(x, y + H + r); sh.quadraticCurveTo(x - r, y + H + r, x - r, y + H); sh.lineTo(x - r, y); sh.quadraticCurveTo(x - r, y - r, x, y - r);
  const g = new THREE.ExtrudeGeometry(sh, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r * .6, bevelSegments: 3, curveSegments: 6 }); g.translate(0, 0, -(d - 2 * r) / 2); return g; }
// sittplatser: en osynlig låda att klicka på, och ett eller flera sätt att sitta (där ögat hamnar, vart man tittar, var man reser sig)
// opts: [{ x, z, yaw, eye, ox, oz }] – den som ligger närmast besökaren väljs
function addSeat(cx, cy, cz, sx, sy, sz, ry, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshBasicMaterial()); m.visible = false;
  m.position.set(cx, cy, cz); m.rotation.y = ry || 0; m.updateMatrixWorld(true); scene.add(m);
  const seat = { opts }; m.userData.seat = seat; occluders.push(m); seats.push(seat); return seat;
}
// en bänk längs x (vänd åt ±z) eller längs z (vänd åt ±x): sitt på den sida man kommer ifrån, där man klickade
function benchSeats(cx, cz, len, wid, h, alongX) {
  const eye = h + .68, opts = [];
  for (const sd of [-1, 1]) for (const t of [-.3, 0, .3]) {
    if (alongX) opts.push({ x: cx + t * len, z: cz + sd * .05, yaw: sd > 0 ? 0 : Math.PI, eye, ox: cx + t * len, oz: cz + sd * (wid / 2 + .5) });
    else opts.push({ x: cx + sd * .05, z: cz + t * len, yaw: sd > 0 ? Math.PI / 2 : -Math.PI / 2, eye, ox: cx + sd * (wid / 2 + .5), oz: cz + t * len }); }
  return addSeat(cx, h / 2 + .1, cz, alongX ? len : wid + .1, h + .3, alongX ? wid + .1 : len, 0, opts);
}
// studiomonitorer: matt svart låda med baselement och diskant, på ett väggfäste som riktar dem ner mot rummets mitt
// [x, y, z på väggen, normal x, normal z], och punkten de pekar mot
const SPEAKERS = {
  foajen: { at: [[-6, 3.7, -9.6, 1, 0], [6, 3.7, -9.6, -1, 0]], aim: [0, 1.6, -5.5] },
  staden: { at: [[-6, 3.9, -5.6, 1, 0], [-6, 3.9, -16.6, 1, 0]], aim: [0, 1.6, -11] },
  naturen: { at: [[-6, 4.3, -7.6, 1, 0], [6, 4.3, -7.6, -1, 0]], aim: [0, 1.6, -11] },
  berattelser: { at: [[-7, 4.3, -7, 1, 0], [7, 4.3, -7, -1, 0]], aim: [0, 1.6, -11] }, // under rören
  manniskorna: { at: [[-4.2, 3.5, -16, 0, 1], [4.2, 3.5, -16, 0, 1]], aim: [0, 1.6, -7] } };
function buildSpeaker(x, y, z, nx, nz, aim, i) {
  const wy = Math.atan2(nx, nz), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = wy; scene.add(g); g.updateMatrixWorld(true);
  const id = "monitor" + i, svart = { color: 0x1a1a1b }, front = { color: 0x111112 }, stal = { color: 0x232425 }, alu = { color: 0x55575a }, massing = { color: 0x7d6038 };
  const tra = { color: 0x6e5242, map: MATTEX.morktra ? MATTEX.morktra.diff : null };
  const P = (geo, m, pos, rot, par) => prop(geo, m, new V3(...pos), rot || null, { parent: par || g, id, shadow: false });
  const W = .3, H = .48, D = .34;
  // fästet: väggplatta, en kraftig arm och ett U-ok som håller lådan i sidorna
  P(roundBox(.13, .24, .018, .006), stal, [0, 0, .009]);
  for (const sy of [-1, 1]) for (const sx of [-1, 1]) P(new THREE.CylinderGeometry(.009, .009, .008, 10), alu, [sx * .045, sy * .09, .02], [Math.PI / 2, 0, 0]);
  P(new THREE.CylinderGeometry(.022, .022, .2, 16), stal, [0, 0, .118], [Math.PI / 2, 0, 0]);
  const dx = aim[0] - x, dy = aim[1] - y, dz = aim[2] - z, h = Math.hypot(dx, dz);
  let yaw = Math.atan2(dx, dz) - wy; yaw = clamp(Math.atan2(Math.sin(yaw), Math.cos(yaw)), -.6, .6);
  const pitch = clamp(Math.atan2(dy, h), -.4, 0);
  const yk = new THREE.Group(); yk.position.set(0, 0, .225); yk.rotation.y = yaw; g.add(yk);
  P(new THREE.CylinderGeometry(.032, .032, .03, 20), stal, [0, 0, 0], [Math.PI / 2, 0, 0], yk);                // vridleden
  const ax = W / 2 + .03, pz = .05 + D / 2;
  P(new THREE.BoxGeometry(2 * ax + .03, .045, .03), stal, [0, 0, .02], null, yk);                              // okets rygg
  for (const sx of [-1, 1]) { P(new THREE.BoxGeometry(.022, .06, pz + .02), stal, [sx * ax, 0, .02 + pz / 2], null, yk);
    P(new THREE.CylinderGeometry(.03, .03, .018, 20), alu, [sx * (ax + .012), 0, pz], [0, 0, Math.PI / 2], yk); } // vredet på sidan
  const c = new THREE.Group(); c.position.set(0, 0, pz); c.rotation.x = -pitch; yk.add(c);
  // lådan: svart kropp, gavlar i valnöt, en något indragen front
  P(roundBox(W - .04, H, D, .014), svart, [0, 0, 0], null, c);
  for (const sx of [-1, 1]) P(worldUV(roundBox(.026, H + .006, D + .006, .008), .6), tra, [sx * (W / 2 - .013), 0, 0], null, c);
  const f = D / 2;
  P(roundBox(W - .05, H - .02, .012, .004), front, [0, 0, f - .002], null, c);
  const fz = f + .005;
  // baselementet: borstad ring, gummikant, konan i djup och dammkåpa
  const wy0 = -.07;
  P(new THREE.TorusGeometry(.118, .007, 8, 56), alu, [0, wy0, fz], null, c);
  P(new THREE.TorusGeometry(.104, .013, 10, 56), front, [0, wy0, fz - .006], null, c);
  { const cone = new THREE.CylinderGeometry(.095, .034, .04, 48, 1, true); cone.rotateX(-Math.PI / 2); P(cone, { color: 0x232325, side: THREE.DoubleSide }, [0, wy0, fz - .028], null, c); }
  { const cap = new THREE.SphereGeometry(.036, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2); cap.rotateX(Math.PI / 2); cap.scale(1, 1, .5); P(cap, { color: 0x2f2f31 }, [0, wy0, fz - .048], null, c); }
  P(new THREE.TorusGeometry(.124, .0025, 6, 56), massing, [0, wy0, fz + .002], null, c);
  // diskanten i en vågledare, med en mässingsring
  const ty = .14;
  P(new THREE.CylinderGeometry(.072, .04, .022, 48, 1, true), { color: 0x0e0e0f, side: THREE.DoubleSide }, [0, ty, fz - .01], [Math.PI / 2, 0, 0], c);
  P(new THREE.CircleGeometry(.04, 32), front, [0, ty, fz - .021], null, c);
  { const d = new THREE.SphereGeometry(.02, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2); d.rotateX(Math.PI / 2); P(d, { color: 0x7d7a73 }, [0, ty, fz - .021], null, c); }
  P(new THREE.TorusGeometry(.074, .003, 6, 48), massing, [0, ty, fz], null, c);
  // två runda basportar längst ner och en liten lysdiod
  for (const sx of [-1, 1]) { P(new THREE.TorusGeometry(.019, .004, 6, 24), alu, [sx * .055, -.205, fz], null, c); P(new THREE.CircleGeometry(.019, 24), { color: 0x030303 }, [sx * .055, -.205, fz - .002], null, c); }
  { const led = new THREE.Mesh(new THREE.CircleGeometry(.004, 12), new THREE.MeshBasicMaterial({ color: 0xffd8a0 })); led.position.set(0, -.205, fz + .001); c.add(led); }
}
function buildCamera(x, y, z, yaw) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; scene.add(g);
  const id = "camera", grain = MATTEX.lader.diff, body = { color: 0x1e1e1e }, plast = { color: 0x1c1c1c }, gummi = { color: 0x101010 }, metall = { color: 0x8c8c88 };
  const P = (geo, m, pos, rot) => prop(geo, m, new V3(...pos), rot || null, { parent: g, id, shadow: false });
  P(roundBox(.144, .086, .062, .009), body, [0, 0, 0]);                                    // huset
  P(roundBox(.036, .1, .078, .012), body, [.056, -.004, -.008]);                           // greppet
  { const sh = new THREE.Shape(); sh.moveTo(-.036, 0); sh.lineTo(.036, 0); sh.lineTo(.022, .034); sh.lineTo(-.022, .034); sh.closePath();
    const pg = new THREE.ExtrudeGeometry(sh, { depth: .05, bevelEnabled: true, bevelThickness: .004, bevelSize: .003, bevelSegments: 2 }); pg.translate(0, 0, -.025);
    P(pg, body, [0, .041, -.004]); }                                                        // prismahuset
  P(new THREE.BoxGeometry(.022, .004, .02), metall, [0, .08, -.004]);                      // blixtskon
  P(new THREE.CylinderGeometry(.016, .016, .012, 24), plast, [-.048, .049, .004]);          // lägesratten
  P(new THREE.CylinderGeometry(.012, .012, .006, 20), plast, [.05, .047, .012]);            // inställningsratt
  P(new THREE.CylinderGeometry(.006, .007, .006, 16), metall, [.058, .051, -.014]);         // avtryckaren
  P(new THREE.BoxGeometry(.03, .002, .018), { color: 0x0a0c0c }, [.04, .044, .012]);       // topp-displayen
  { const lcd = new THREE.Mesh(new THREE.PlaneGeometry(.075, .05), new THREE.MeshBasicMaterial({ color: 0x030405 })); lcd.position.set(-.012, -.006, .0315); g.add(lcd); }
  P(roundBox(.028, .022, .016, .005), gummi, [0, .046, .034]);                              // ögonmusslan
  for (const sx of [-1, 1]) P(new THREE.BoxGeometry(.006, .012, .01), metall, [sx * .074, .028, .006]);
  // objektivet framåt (−z): fattning, zoomring, fokusring och motljusskydd
  const L = (r1, r2, len, m, z0, seg) => { const c = new THREE.CylinderGeometry(r2, r1, len, seg || 40, 1); c.rotateX(Math.PI / 2); P(c, m, [0, -.004, z0 - len / 2]); };
  L(.03, .03, .008, metall, -.031); L(.036, .036, .03, plast, -.039); L(.039, .039, .036, { color: 0x151515, map: MATTEX.panel.diff }, -.069, 64);
  L(.037, .037, .014, plast, -.105); L(.04, .04, .022, { color: 0x171717, map: MATTEX.panel.diff }, -.119, 64); L(.04, .041, .01, plast, -.141);
  { const hood = new THREE.CylinderGeometry(.043, .056, .045, 40, 1, true); hood.rotateX(Math.PI / 2); P(hood, { color: 0x121212, side: THREE.DoubleSide }, [0, -.004, -.171]); }
  { const glass = new THREE.Mesh(new THREE.CircleGeometry(.036, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(.05, .08, .12) })); glass.position.set(0, -.004, -.1505); glass.rotation.y = Math.PI; g.add(glass);
    const gl2 = new THREE.Mesh(new THREE.RingGeometry(.012, .02, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(.35, .2, .55), transparent: true, opacity: .35 })); gl2.position.set(.006, .002, -.1508); gl2.rotation.y = Math.PI; g.add(gl2); }
  return g;
}
function buildTripod(x, z, topY) {
  const id = "tripod", kol = { color: 0x2a2a2a, map: MATTEX.panel.diff }, alu = { color: 0x55565a }, svart = { color: 0x151515 };
  prop(new THREE.CylinderGeometry(.05, .045, .05, 24), svart, new V3(x, topY - .2, z), null, { id, shadow: false });       // spindeln
  prop(new THREE.CylinderGeometry(.013, .013, .26, 12), alu, new V3(x, topY - .07, z), null, { id, shadow: false });       // mittpelaren
  for (let k = 0; k < 3; k++) { const a = k * 2.094 + .5, ex = Math.cos(a), ez = Math.sin(a), top = [x + ex * .04, topY - .2, z + ez * .04], mid = [x + ex * .3, (topY - .2) * .5, z + ez * .3], foot = [x + ex * .55, .015, z + ez * .55];
    rodProp(top, mid, .016, 0, id, kol); rodProp(mid, foot, .011, 0, id, kol);
    prop(new THREE.CylinderGeometry(.02, .02, .03, 12), svart, new V3(...mid), null, { id, shadow: false });                 // låsringen
    prop(new THREE.SphereGeometry(.016, 10, 8), { color: 0x0e0e0e }, new V3(...foot), null, { id, shadow: false }); }
  prop(new THREE.SphereGeometry(.028, 20, 14), alu, new V3(x, topY + .03, z), null, { id, shadow: false });                // kulleden
  prop(new THREE.CylinderGeometry(.03, .034, .03, 20), svart, new V3(x, topY, z), null, { id, shadow: false });
  prop(new THREE.BoxGeometry(.06, .012, .05), svart, new V3(x, topY + .06, z), null, { id, shadow: false });               // snabbfästet
}
