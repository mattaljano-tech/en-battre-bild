// Öppningar mellan rummen, menytavlor och blanka golv.
"use strict";
/* ================= öppningar och menytavlor ================= */
// öppning till ett annat rum: djup mörk portal där ljuset från nästa rum lyser igenom
let floorGlowTex = null;
// öppning till ett annat rum: ett riktigt hål i väggen med en kort passage bakom som ljusnar mot nästa rum
function opening(o) {
  const N = new V3(...o.N), U = new V3(...o.U), up = new V3(0, 1, 0), base = new V3(o.C[0], 0, o.C[2]), w = o.w, h = o.h, id = "open-" + o.to;
  // ta upp hålet i den vägg öppningen sitter i
  for (const sf of surfaces) {
    if (sf.kind !== "plane" || sf.floor) continue;
    const n = new V3(...sf.N), O = new V3(...sf.O); if (n.dot(N) < .99 || Math.abs(base.clone().sub(O).dot(n)) > .03) continue;
    const Uw = new V3(...sf.U), Vw = new V3(...sf.V), du = base.clone().sub(O).dot(Uw), dv = base.clone().sub(O).dot(Vw), su = U.dot(Uw);
    const u0 = du - su * w / 2, u1 = du + su * w / 2, ua = Math.min(u0, u1), ub = Math.max(u0, u1);
    if (ua < 0 || ub > sf.lu) continue;
    sf.holes = (sf.holes || []).concat([[[ua, dv + .003], [ub, dv + .003], [ub, dv + h], [ua, dv + h]]]);
    sf.g.dispose(); sf.g = planarGeo(sf); break;
  }
  const g = new THREE.Group(); g.matrixAutoUpdate = false; g.matrix.makeBasis(U, up, N).setPosition(base); scene.add(g);
  // karm i svart stål
  const d = .26, fc = 0x151616;
  for (const sx of [-1, 1]) prop(new THREE.BoxGeometry(.12, h + .12, d, 1, 6, 1), { color: fc }, new V3(sx * (w / 2 + .06), (h + .12) / 2, d / 2 - .1), null, { parent: g, id, shadow: false });
  prop(new THREE.BoxGeometry(w + .24, .12, d, 4, 1, 1), { color: fc }, new V3(0, h + .06, d / 2 - .1), null, { parent: g, id, shadow: false });
  // passagen: golv, väggar och tak som går från mörkt vid öppningen till ljust längst in
  const D = 2.6, a = w / 2, seg = 10, col = o.glow, pos = [], cl = [], idx = [];
  const uv = [], TS = MATDEF.betong[1], BK = 2.4; // betong 008 i passagen; ljuset förstärkt så att texturen inte gör den mörk
  const strip = (P0, P1, k0, k1, tint) => { // P(t) = P0/P1 längs djupet; k = ljus vid t=0 / t=1
    const s0 = pos.length / 3, across = P0[1] === P1[1] ? 0 : 1;
    for (let i = 0; i <= seg; i++) { const t = i / seg, z = -t * D, f = (k0 + (k1 - k0) * t * t) * BK;
      for (const P of [P0, P1]) { pos.push(P[0], P[1], z); uv.push(t * D / TS, P[across] / TS + (o.C[0] + o.C[2]) * .37); cl.push(col.r * f * tint, col.g * f * tint, col.b * f * tint); } }
    for (let i = 0; i < seg; i++) { const q = s0 + i * 2; idx.push(q, q + 1, q + 3, q, q + 3, q + 2); }
  };
  strip([-a, 0], [a, 0], .05, .62, 1);          // golv
  strip([-a, h], [a, h], .015, .3, .9);         // tak
  strip([-a, 0], [-a, h], .03, .45, .95);       // vänster vägg
  strip([a, 0], [a, h], .03, .45, .95);         // höger vägg
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); pg.setAttribute("color", new THREE.Float32BufferAttribute(cl, 3)); pg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); pg.setIndex(idx);
  const pm = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ vertexColors: true, map: MATTEX.betong ? MATTEX.betong.diff : null, side: THREE.DoubleSide })); g.add(pm);
  // längst in: ljuset från nästa rum, med en mörkare karm så att man anar ett rum till
  const end = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(1.15) })); end.position.set(0, h / 2, -D); g.add(end);
  for (const sx of [-1, 1]) { const j = new THREE.Mesh(new THREE.PlaneGeometry(w * .22, h), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(.4), map: MATTEX.betong ? MATTEX.betong.diff : null })); j.position.set(sx * w * .39, h / 2, -D + .01); g.add(j); }
  { const j = new THREE.Mesh(new THREE.PlaneGeometry(w, h * .16), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(.34), map: MATTEX.betong ? MATTEX.betong.diff : null })); j.position.set(0, h * .92, -D + .01); g.add(j); }
  // ett lysrör i passagens tak
  { const bar = new THREE.Mesh(new THREE.BoxGeometry(.05, .03, D * .55), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(1.6) })); bar.position.set(0, h - .03, -D * .55); g.add(bar); }
  [pm, end].forEach((m) => { m.userData.exit = o.to; occluders.push(m); });
  // ljuset från passagen faller ut på golvet framför
  if (!floorGlowTex) floorGlowTex = T(radial([[0, "rgba(255,255,255,.55)"], [.5, "rgba(255,255,255,.18)"], [1, "rgba(255,255,255,0)"]], 128), false, false);
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.7, 1.6), new THREE.MeshBasicMaterial({ map: floorGlowTex, color: col.clone().multiplyScalar(.35), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  fg.rotation.x = -Math.PI / 2; fg.position.set(0, .006, .55); g.add(fg);
  const spos = base.clone().addScaledVector(up, o.signY || h + .42).addScaledVector(N, o.signOff || .02);
  if (o.signOff) { const sw = o.signW || 1.3, bk = prop(new THREE.BoxGeometry(sw + .06, sw / 4 + .06, o.signOff, 2, 2, 1), { color: 0x0e0f0f }, base.clone().addScaledVector(up, o.signY).addScaledVector(N, o.signOff / 2 - .005), null, { shadow: false }); bk.lookAt(bk.position.clone().add(N)); }
  decal(signCanvas([{ text: o.sign[0], font: '800 110px "Big Shoulders Display", "Arial Narrow", sans-serif', y: 104, track: 12, fit: true },
    { text: o.sign[1], font: '500 40px "IBM Plex Mono", monospace', y: 196, track: 6, alpha: .75, fit: true }],
    { w: 1024, h: 256, bg: "#14302f", fg: "#ece9e0", border: "rgba(236,233,224,.6)", bw: 5, wear: true }), o.signW || 1.3, (o.signW || 1.3) / 4, spos, N, { boost: 1.3, minL: .07 });
  const pts = [base.clone().addScaledVector(U, w / 2 + .1), base.clone().addScaledVector(U, -w / 2 - .1), base.clone().addScaledVector(U, w / 2 + .1).addScaledVector(N, .5), base.clone().addScaledVector(U, -w / 2 - .1).addScaledVector(N, .5)];
  exits.push({ x0: Math.min(...pts.map((p) => p.x)), x1: Math.max(...pts.map((p) => p.x)), z0: Math.min(...pts.map((p) => p.z)), z1: Math.max(...pts.map((p) => p.z)), to: o.to, title: o.sign[0].replace(/\s+/g, " ") });
}
function menuBoard(kind, title, sub, C, N, w, h) {
  const n = new V3(...N), pos = new V3(...C);
  const mesh = decal(boardCanvas(title, sub), w, h, pos.clone().addScaledVector(n, .05), n, { boost: 1.25, minL: .07 });
  mesh.userData.menu = kind; mesh.userData.title = title; occluders.push(mesh);
  const back = prop(new THREE.BoxGeometry(w + .1, h + .1, .05, 2, 2, 1), { color: 0x0e0f0f }, pos.clone().addScaledVector(n, .025), null, { shadow: false });
  back.lookAt(back.position.clone().add(n));
}

// blanka golv: scenen speglas i golvet, suddas av golvets egen struktur och syns mest i flack vinkel (Fresnel)
let floorMirror = null;
const MIRROR_SHADER = { uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, tNor: { value: null }, tArm: { value: null }, norScale: { value: 2.5 }, strength: { value: .25 } },
  vertexShader: "uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW; void main(){ vUv = textureMatrix * vec4(position, 1.); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
  fragmentShader: ["uniform sampler2D tDiffuse; uniform sampler2D tNor; uniform sampler2D tArm; uniform float norScale; uniform float strength; varying vec4 vUv; varying vec3 vW;",
    "void main(){ vec2 tuv = vW.xz / norScale; vec3 n = texture2D(tNor, tuv).xyz * 2. - 1.; float rough = texture2D(tArm, tuv).g;",
    "vec4 p = vUv; p.xy += n.xy * .012 * vUv.w; float b = .007 * vUv.w * (.4 + rough * 1.6);",
    "vec3 c = texture2DProj(tDiffuse, p).rgb * .4 + (texture2DProj(tDiffuse, p + vec4(b, 0., 0., 0.)).rgb + texture2DProj(tDiffuse, p - vec4(b, 0., 0., 0.)).rgb + texture2DProj(tDiffuse, p + vec4(0., b, 0., 0.)).rgb + texture2DProj(tDiffuse, p - vec4(0., b, 0., 0.)).rgb) * .15;",
    "vec3 V = normalize(cameraPosition - vW); float fr = .02 + .98 * pow(1. - max(V.y, 0.), 5.);", // som på riktigt: ingen spegling rakt ner, tydlig först i flackt motljus långt bort
    "float fog = exp(-length(cameraPosition - vW) * .05);",
    "vec2 q = vUv.xy / vUv.w; float edge = vUv.w > 0. ? smoothstep(0., .1, q.x) * smoothstep(1., .9, q.x) * smoothstep(0., .1, q.y) * smoothstep(1., .9, q.y) : 0.;", "c = min(c, vec3(1.3)); gl_FragColor = vec4(c * strength * fr * (1. - rough * .5) * fog * edge, 1.); }"].join("\n") };
let mirrorRT = null, mirrorCam = null; const mirrorTM = new THREE.Matrix4(), mirrorBias = new THREE.Matrix4().set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1), mirrorClip = [new THREE.Plane(new V3(0, 1, 0), -.012)];
function addFloorMirror(S) {
  const M = S.look.mirror; if (!M || isTouch) return; // mobilen: ingen spegling, då räcker kraften till skarp bild
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const r of S.walk) { x0 = Math.min(x0, r.x0); x1 = Math.max(x1, r.x1); z0 = Math.min(z0, r.z0); z1 = Math.max(z1, r.z1); }
  x0 -= .45; x1 += .45; z0 -= .45; z1 = Math.min(z1 + .45, .05);
  const pr = Math.min(devicePixelRatio || 1, 1.5), k = isTouch ? .35 : .5;
  if (!mirrorRT) mirrorRT = new THREE.WebGLRenderTarget(Math.round(innerWidth * pr * k), Math.round(innerHeight * pr * k), { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: THREE.HalfFloatType });
  if (!mirrorCam) mirrorCam = new THREE.PerspectiveCamera();
  const t = MATTEX[M.mat], u = THREE.UniformsUtils.clone(MIRROR_SHADER.uniforms);
  u.tDiffuse.value = mirrorRT.texture; u.textureMatrix.value = mirrorTM; u.tNor.value = t.nor; u.tArm.value = t.arm; u.norScale.value = MATDEF[M.mat][1]; u.strength.value = M.k;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.ShaderMaterial({ uniforms: u, vertexShader: MIRROR_SHADER.vertexShader, fragmentShader: MIRROR_SHADER.fragmentShader,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -3 }));
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, .001, (z0 + z1) / 2); m.frustumCulled = false; scene.add(m); floorMirror = m;
}
// rita scenen sedd underifrån (kameran speglad i golvet) till en textur som golvet sedan visar
function renderMirror() {
  if (!floorMirror) return;
  mirrorCam.copy(camera); mirrorCam.layers.set(0); mirrorCam.position.y = -camera.position.y; mirrorCam.rotation.set(-camera.rotation.x, camera.rotation.y, 0, "YXZ"); mirrorCam.updateMatrixWorld();
  floorMirror.visible = false; const old = renderer.getRenderTarget();
  renderer.setRenderTarget(mirrorRT); renderer.clippingPlanes = mirrorClip; renderer.clear(); renderer.render(scene, mirrorCam);
  renderer.clippingPlanes = []; renderer.setRenderTarget(old); floorMirror.visible = true;
  mirrorTM.copy(mirrorBias).multiply(mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse);
}
const STEEL = () => ({ color: 0x8a8a8a, map: MATTEX.rost2.diff }); // slitet, målat stål
// föremål med fotograferat material: UV i meter så att texturen inte töjs ut på långa balkar
function worldUV(geo, sc) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const [a, b] = ax > .5 ? [p.getZ(i), p.getY(i)] : ay > .5 ? [p.getX(i), p.getZ(i)] : [p.getX(i), p.getY(i)]; uv.setXY(i, a / sc, b / sc); }
  return geo;
}
