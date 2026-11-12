// Gatufilmen: entrén till sajten, renderad i Blender.
"use strict";
/* Man går uppför Södergatan i regnet, viker av mot det gamla tryckeriet och stannar vid valvgången med mässingsskylten.
   Där väntar en filmslinga (regnet faller) tills man klickar Kliv in. Då går man ner för trappan, dörren öppnas och
   det varma ljuset tar över. Foajén byggs bakom filmen under tiden. ?direkt hoppar över, ?gammalgata visar den gamla 3D-gatan. */
function filmIntro() {
  const F = { on: true, going: false };
  const wrap = document.createElement("div"); wrap.className = "film"; wrap.id = "film";
  const probe = document.createElement("video"), ext = probe.canPlayType('video/mp4; codecs="avc1.640028"') ? "mp4" : "webm"; // H.264 där det finns, annars VP9
  const mk = (src, loop) => { const v = document.createElement("video"); v.muted = true; v.defaultMuted = true; v.playsInline = true;
    v.setAttribute("playsinline", ""); v.setAttribute("muted", ""); v.preload = "auto"; v.loop = !!loop; v.src = src + "." + ext; wrap.appendChild(v); return v; };
  const A = mk("film/gatan-in"), W = mk("film/gatan-vanta", true), D = mk("film/gatan-dorr");
  A.poster = "film/gatan-start.jpg"; W.poster = "film/gatan-dorren.jpg"; A.classList.add("on");
  const vit = document.createElement("div"); vit.className = "filmvit"; wrap.appendChild(vit);
  document.body.appendChild(wrap);
  const show = (v) => [A, W, D].forEach((x) => x.classList.toggle("on", x === v));
  let atDoor = false, cb = null;
  function reachDoor() {
    if (atDoor) return; atDoor = true;
    const swap = () => { show(W); A.pause(); };
    W.currentTime = 0; W.play().then(swap).catch(swap);
    if (cb) { const f = cb; cb = null; f(); }
  }
  A.addEventListener("ended", reachDoor); A.addEventListener("error", reachDoor);
  A.play().catch(reachDoor); // spelar inte filmen automatiskt (t.ex. strömsparläge): stå vid dörren direkt
  F.atDoor = (f) => { if (atDoor) f(); else cb = f; };
  F.skip = reachDoor;
  F.enter = (done) => {
    if (F.going) return; F.going = true; reachDoor();
    let finished = false;
    const finish = () => { if (finished) return; finished = true; vit.classList.add("on"); F.reveal = true; // foajén börjar ritas under det svarta
      setTimeout(() => { F.on = false; done(); wrap.classList.add("gone"); setTimeout(() => wrap.remove(), 1600); }, 700); };
    D.addEventListener("timeupdate", () => { if (D.duration && D.currentTime > D.duration - .9) finish(); });
    D.addEventListener("ended", finish); D.addEventListener("error", finish);
    D.currentTime = 0; D.play().then(() => { show(D); W.pause(); }).catch(finish);
  };
  return F;
}

// foajén inifrån: samma ståldörr som i filmen (mörkt grågrön, litet fönster, mässingshandtag) i en vägg av betong
// där glasentrén satt. Man har just kommit in genom den, så den sitter bakom en när foajén tonar fram.
function soderDorr() {
  const x0 = FOY.EX0, x1 = FOY.EX1, EH = FOY.EH, DW = 1.0, DH = 2.15, lin = (h) => new THREE.Color(h).convertSRGBToLinear();
  const add = (geo, m, x, y, z, ry) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (ry) o.rotation.y = ry; scene.add(o); return o; };
  const shape = new THREE.Shape(); shape.moveTo(x0, 0); shape.lineTo(x1, 0); shape.lineTo(x1, EH); shape.lineTo(x0, EH); shape.lineTo(x0, 0);
  const hole = new THREE.Path(); hole.moveTo(-DW / 2 - .05, 0); hole.lineTo(DW / 2 + .05, 0); hole.lineTo(DW / 2 + .05, DH + .05); hole.lineTo(-DW / 2 - .05, DH + .05); hole.lineTo(-DW / 2 - .05, 0); shape.holes.push(hole);
  // ett igenmurat parti i tegel, indraget i väggen, precis som valvgången man kom ifrån; ljuset faller av mot golv, tak och kanter
  const wm = MATTEX.tegel || MATTEX.radtegel || MATTEX.betong6 || MATTEX.betong, wq = +(new URLSearchParams(location.search).get("dorrvagg") || .5), RZ = .22;
  const g = worldUV(new THREE.ShapeGeometry(shape, 1), 2.2), P = g.attributes.position, cols = [];
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i);
    const k = wq * (.45 + .55 * Math.sin(Math.PI * Math.min(1, y / EH * .95 + .05))) * (.7 + .3 * Math.cos(Math.PI / 2 * x / x1)); cols.push(k, k * .97, k * .94); }
  g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  add(g, new THREE.MeshBasicMaterial({ map: wm && wm.diff, vertexColors: true }), 0, 0, RZ, Math.PI);
  const rev = new THREE.MeshBasicMaterial({ color: lin(0x2a2826) });                                        // smygen runt det indragna partiet
  for (const sx of [x0, x1]) add(new THREE.BoxGeometry(.04, EH, RZ), rev, sx, EH / 2, RZ / 2);
  add(new THREE.BoxGeometry(x1 - x0, .04, RZ), rev, 0, EH, RZ / 2);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(.04, DH + .05, RZ), rev, sx * (DW / 2 + .05), (DH + .05) / 2, RZ / 2);
  const steel = new THREE.MeshBasicMaterial({ color: lin(0x1a1c1c) }), door = new THREE.MeshBasicMaterial({ color: lin(0x2b342f) }), brass = new THREE.MeshBasicMaterial({ color: lin(0xa07c38) });
  add(new THREE.BoxGeometry(DW + .2, .07, .1), steel, 0, DH + .085, RZ - .04);                                   // överstycket
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(.06, DH + .05, .1), steel, sx * (DW / 2 + .02), (DH + .05) / 2, RZ - .04);
  add(new THREE.BoxGeometry(DW - .02, DH - .02, .06), door, 0, DH / 2, RZ - .03);                              // dörrbladet, samma mörkt grågröna som i filmen
  add(new THREE.PlaneGeometry(.3, .5), new THREE.MeshBasicMaterial({ color: lin(0x4a3c2c) }), 0, 1.6, RZ - .062, Math.PI); // det lilla fönstret ut mot valvgången
  add(new THREE.BoxGeometry(.03, .03, .05), brass, -DW / 2 + .15, 1.0, RZ - .08);                               // handtaget: samma sida som i filmen, sett inifrån
  add(new THREE.BoxGeometry(.16, .025, .025), brass, -DW / 2 + .2, 1.0, RZ - .105);
  return { door: () => {}, lift: () => {} };
}
