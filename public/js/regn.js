// Regn på fönsterrutorna i rummen: droppar som sitter kvar på glaset och stråk som rinner nerför det.
"use strict";

// droppar (eller rinnande stråk) på en duk för en ruta som är w × h meter.
// keep(u, v): false där det inte är glas, t.ex. igenspikade rutor (u åt höger, v uppifrån, båda 0…1)
function rainCanvas(w, h, seed, streaks, keep) {
  const span = streaks ? 2 : 1, ppm = Math.min(190, 2048 / Math.max(w, h * span)); // stråken ritas på dubbel höjd och rullar
  const cw = Math.round(w * ppm), ch = Math.round(h * span * ppm), c = cnv(cw, ch), x = c.getContext("2d"), q = rng(seed);
  const n = Math.round(w * h * span * (streaks ? 3 : 130));
  for (let i = 0; i < n; i++) {
    const px = q() * cw, py = q() * ch, rr = (streaks ? 1.8 + q() * 1.4 : .55 + Math.pow(q(), 4) * 2.6) * ppm / 190;
    if (keep && !keep(px / cw, (py % (h * ppm)) / (h * ppm))) continue;
    if (streaks) { const len = (40 + q() * 160) * ppm / 60, gr = x.createLinearGradient(0, py - len, 0, py);
      gr.addColorStop(0, "rgba(220,228,236,0)"); gr.addColorStop(1, "rgba(220,228,236,.35)");
      x.strokeStyle = gr; x.lineWidth = rr * .8; x.beginPath(); x.moveTo(px, py - len); x.bezierCurveTo(px + (q() - .5) * 6, py - len * .6, px + (q() - .5) * 6, py - len * .3, px, py); x.stroke(); }
    x.fillStyle = "rgba(30,36,44,.22)"; x.beginPath(); x.ellipse(px, py + rr * .25, rr, rr * 1.15, 0, 0, 7); x.fill();   // mörk kant nertill
    x.fillStyle = "rgba(225,232,240,.22)"; x.beginPath(); x.ellipse(px, py, rr * .82, rr * .95, 0, 0, 7); x.fill();      // droppen
    x.fillStyle = "rgba(255,255,255,.45)"; x.beginPath(); x.arc(px - rr * .3, py - rr * .35, rr * .28, 0, 7); x.fill();  // glans
  }
  return c;
}

// en ruta med regn: o = { w, h, pos: [x, y, z], rot: [rx, ry, rz], seed, run (stråk som rinner), keep }
// returnerar en funktion som flyttar stråken varje bildruta (eller null om inget rinner)
function rainPane(o) {
  const mk = (tex) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    p.position.set(...o.pos); p.rotation.set(...(o.rot || [0, 0, 0])); scene.add(p); return p; };
  mk(T(rainCanvas(o.w, o.h, o.seed, false, o.keep), true, false));
  if (!o.run) return null;
  const run = T(rainCanvas(o.w, o.h, o.seed + 3, true), true, true); run.repeat.set(1, .5);
  const pane = mk(run);
  if (o.keep) { // stråken rullar, så masken för igenspikade rutor läggs i shadern med rutans egna uv
    const mc = cnv(64, 64), mx = mc.getContext("2d");
    for (let i = 0; i < 64; i++) for (let j = 0; j < 64; j++) { mx.fillStyle = o.keep((i + .5) / 64, (j + .5) / 64) ? "#fff" : "#000"; mx.fillRect(i, j, 1, 1); }
    const mask = T(mc, false, false); mask.magFilter = THREE.NearestFilter;
    pane.material.onBeforeCompile = (sh) => {
      sh.uniforms.rainMask = { value: mask };
      sh.vertexShader = sh.vertexShader.replace("void main() {", "varying vec2 vRainUv;\nvoid main() {\n  vRainUv = uv;");
      sh.fragmentShader = sh.fragmentShader.replace("void main() {", "uniform sampler2D rainMask; varying vec2 vRainUv;\nvoid main() {")
        .replace("#include <map_fragment>", "#include <map_fragment>\n  diffuseColor.a *= texture2D(rainMask, vRainUv).g;");
    };
  }
  const speed = .03 + (o.seed % 7) * .002;
  return (now) => { run.offset.y = (now / 1000 * speed) % 1; };
}

// samlar rutorna i ett rum och ger en update-funktion till rummet
function rainPanes(list) {
  const ticks = list.map(rainPane).filter(Boolean);
  return (now) => { for (const f of ticks) f(now); };
}
