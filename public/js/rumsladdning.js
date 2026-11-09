// Ladda ett rum: rensa, bygg, baka och visa. Dammet i ljuset.
"use strict";
const BUILD = { foajen: buildFoajen, staden: buildStaden, naturen: buildNaturen, berattelser: buildHall, manniskorna: buildManniskorna };

/* ---------- damm: bara i ljuskäglor och solstrålar ---------- */
let dust = null, dustBase = null, dustPh = null, dustMat = null;
function buildDust(extra) {
  const spots = LIGHTS.filter((L) => L.type === "spot" && !L.noDust), per = isTouch ? 14 : 34, r = rng(31), pts = [];
  spots.forEach((L) => { const p = new V3(...L.p), d = new V3(...L.d), tmp = new V3(1, 0, 0); if (Math.abs(d.x) > .9) tmp.set(0, 1, 0);
    const a = new V3().crossVectors(d, tmp).normalize(), b = new V3().crossVectors(d, a), tan = Math.tan(Math.acos(L.cosO)) * .85;
    for (let i = 0; i < per; i++) { const t = .35 + r() * 2.2, rad = t * tan * Math.sqrt(r()), ang = r() * 6.283;
      pts.push(p.clone().addScaledVector(d, t).addScaledVector(a, Math.cos(ang) * rad).addScaledVector(b, Math.sin(ang) * rad)); } });
  LIGHTS.filter((L) => L.type === "tube").forEach((L) => { for (let i = 0; i < (isTouch ? 2 : 4); i++) pts.push(new V3(L.p[0] + (r() - .5) * 1.0, L.p[1] - .2 - r() * 1.6, L.p[2] + (r() - .5) * .6)); });
  (extra || []).forEach((p) => pts.push(p));
  if (!pts.length) return;
  const n = pts.length, pos = new Float32Array(n * 3), ph = new Float32Array(n);
  pts.forEach((p, i) => { pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; ph[i] = r() * 100; });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("phase", new THREE.BufferAttribute(ph, 1));
  dustMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, size: { value: .016 }, scale: { value: 500 }, color: { value: new THREE.Color(1.6, 1.45, 1.25) }, map: { value: null } }]),
    vertexShader: ["attribute float phase; uniform float time; uniform float size; uniform float scale;", "#include <fog_pars_vertex>", "void main(){",
      "  vec3 p = position + vec3(sin(time*.21+phase)*.06, sin(time*.13+phase*1.7)*.08, cos(time*.17+phase)*.06);",
      "  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);", "  gl_PointSize = size * scale / -mvPosition.z;", "  gl_Position = projectionMatrix * mvPosition;", "#include <fog_vertex>", "}"].join("\n"),
    fragmentShader: ["uniform sampler2D map; uniform vec3 color;", "#include <fog_pars_fragment>", "void main(){", "  float a = texture2D(map, gl_PointCoord).a;", "  gl_FragColor = vec4(color, a * .7);", "#include <fog_fragment>", "}"].join("\n"),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true
  });
  dustMat.uniforms.map.value = T(radial([[0, "rgba(255,255,255,1)"], [.4, "rgba(255,255,255,.35)"], [1, "rgba(255,255,255,0)"]], 64), false, false);
  dustMat.uniforms.scale.value = innerHeight * basePR() * quality / 2;
  dust = new THREE.Points(g, dustMat); scene.add(dust);
}
// slå ihop alla fasta, bakade föremål med samma material till ett enda objekt (färre ritanrop, jämnare bildfrekvens)
function mergeProps() {
  const groups = new Map();
  for (const p of props) {
    const m = p.mesh; if (!m.parent || m.userData.keep) continue;
    const mat = m.material; if (!mat || !mat.isMeshBasicMaterial || !m.geometry.attributes.color) continue;
    const key = (mat.map ? mat.map.uuid : "-") + "|" + (mat.alphaTest || 0) + "|" + mat.side + "|" + (mat.transparent ? 1 : 0) + "|" + mat.opacity + "|" + mat.depthWrite + "|" + mat.fog + "|" + mat.blending;
    if (!groups.has(key)) groups.set(key, { mat, list: [] });
    groups.get(key).list.push(m);
  }
  for (const [, gr] of groups) {
    if (gr.list.length < 2) continue;
    const hasUV = !!gr.mat.map, parts = []; let total = 0;
    for (const m of gr.list) { m.updateWorldMatrix(true, false); const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(m.matrixWorld); parts.push({ g, c: m.material.color }); total += g.attributes.position.count; }
    const Pp = new Float32Array(total * 3), C = new Float32Array(total * 3), UV = hasUV ? new Float32Array(total * 2) : null; let o = 0;
    for (const { g, c } of parts) {
      const n = g.attributes.position.count, col = g.attributes.color.array; Pp.set(g.attributes.position.array, o * 3);
      for (let i = 0; i < n; i++) { C[(o + i) * 3] = col[i * 3] * c.r; C[(o + i) * 3 + 1] = col[i * 3 + 1] * c.g; C[(o + i) * 3 + 2] = col[i * 3 + 2] * c.b; }
      if (hasUV && g.attributes.uv) UV.set(g.attributes.uv.array, o * 2);
      o += n; g.dispose();
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(Pp, 3)); geo.setAttribute("color", new THREE.BufferAttribute(C, 3)); if (hasUV) geo.setAttribute("uv", new THREE.BufferAttribute(UV, 2)); geo.computeBoundingSphere();
    scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, map: gr.mat.map, alphaTest: gr.mat.alphaTest, side: gr.mat.side, transparent: gr.mat.transparent, opacity: gr.mat.opacity, depthWrite: gr.mat.depthWrite, fog: gr.mat.fog, blending: gr.mat.blending })));
    for (const m of gr.list) { m.parent.remove(m); m.geometry.dispose(); m.material.dispose(); }
  }
}

/* ================= ladda ett rum: rensa, bygg, baka, visa ================= */
let RT = null, currentKey = null, roomReady = false, loading = false, fontsReady = false;
function clearScene() {
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { ["map", "lightMap", "alphaMap"].forEach((k) => { if (m[k]) m[k].dispose(); }); m.dispose(); });
  });
  while (scene.children.length) scene.remove(scene.children[0]);
  if (camera.far !== 70) { camera.far = 70; camera.updateProjectionMatrix(); }
  floorMirror = null;
  [surfaces, props, occluders, photoMeshes, colliders, decals, exits, arts, tubeMats, seats].forEach((a) => { a.length = 0; });
  dust = null; dustBase = null; dustPh = null; dustMat = null; floorGlowTex = null; flickerDark = null; marker = null; glowTexC = null; leafTexC = null; plantShadowTex = null; RT = null;
}
async function buildRoom(key) {
  if (!fontsReady) {
    progress(.02, "Laddar typsnitt…");
    try { await Promise.race([Promise.all([document.fonts.load('800 150px "Big Shoulders Display"'), document.fonts.load('700 64px "Big Shoulders Display"'), document.fonts.load('500 24px "IBM Plex Mono"'), document.fonts.load('300 150px Jost'), document.fonts.load('400 56px Jost'), document.fonts.load('italic 500 50px Archivo')]), new Promise((r) => setTimeout(r, 2500))]); } catch (e) {}
    fontsReady = true;
  }
  const S = useRoom(key);
  progress(.05, "Laddar fotografier…");
  const tl = new THREE.TextureLoader(), photoTex = {};
  await Promise.all(S.slots.map((sl) => new Promise((res) => {
    const P = PHOTOS[sl.key]; if (!P.src) { photoTex[sl.key] = null; return res(); }
    tl.load(P.src, (t) => { t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; photoTex[sl.key] = t; res(); }, undefined, () => { photoTex[sl.key] = null; res(); });
  })));
  progress(.12, "Bygger rummet…"); await nextFrame();
  await loadMats(); await loadModels(ROOM_MODELS[key] || []);
  RT = BUILD[key]() || {};
  (FLOOR_MARKS[key] || []).forEach(floorMark);
  { const SP = SPEAKERS[key]; if (SP) SP.at.forEach((a, i) => buildSpeaker(a[0], a[1], a[2], a[3], a[4], SP.aim, i)); }
  // tom plats: ett passepartout som visar att här kommer ett foto
  const emptySlot = (light, asp) => { const W = Math.round(1000 * asp), c = cnv(W, 1000), x = c.getContext("2d"), cx = W / 2; x.fillStyle = light ? "#d9d5cc" : "#1c1d1c"; x.fillRect(0, 0, W, 1000);
    x.strokeStyle = light ? "rgba(30,30,28,.35)" : "rgba(236,233,224,.3)"; x.lineWidth = 3; x.setLineDash([14, 12]); x.strokeRect(70, 70, W - 140, 860); x.setLineDash([]);
    x.fillStyle = light ? "rgba(30,30,28,.6)" : "rgba(236,233,224,.55)"; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = '800 92px "Big Shoulders Display", "Arial Narrow", sans-serif'; if (x.letterSpacing !== undefined) x.letterSpacing = "10px"; x.fillText("LEDIG", cx, 450); x.fillText("PLATS", cx, 550);
    x.font = '500 26px "IBM Plex Mono", monospace'; if (x.letterSpacing !== undefined) x.letterSpacing = "4px"; x.fillText("HÄR KOMMER ETT FOTO", cx, 660); return T(c, true, false); };
  S.slots.forEach((slot) => { if (!photoTex[slot.key]) photoTex[slot.key] = emptySlot(PHOTOS[slot.key].tone === "light", slot.w ? 1.5 : .72); });
  S.slots.forEach((slot) => { const t = photoTex[slot.key]; const aspect = slot.aspect || (t ? t.image.width / t.image.height : .72); const a = frameFor(slot, aspect, S); a.s.map = t; a.tex = t; });
  fixtures(S);
  const total = surfaces.reduce((s, x) => s + (x.kind === "plane" ? x.lu * x.lv : x.arcLen * Math.abs(x.z1 - x.z0)) * x.res * x.res, 0) + props.length * 40;
  let done = 0, lastYield = performance.now();
  const tick = async (amount) => { done += amount; if (performance.now() - lastYield > 40) { progress(.15 + .8 * Math.min(1, done / total), "Räknar ljus och skuggor…"); await nextFrame(); lastYield = performance.now(); } };
  for (const s of surfaces) {
    const area = (s.kind === "plane" ? s.lu * s.lv : s.arcLen * Math.abs(s.z1 - s.z0)) * s.res * s.res; let prev = 0;
    const lm = await bakeSurface(s, async (f) => { await tick((f - prev) * area); prev = f; });
    await tick((1 - prev) * area);
    const mesh = surfaceMesh(s, lm);
    if (s.isPhoto) { mesh.userData.art = arts.find((a) => a.s === s); photoMeshes.push(mesh); }
  }
  for (const p of props) { bakeProp(p); await tick(40); }
  if (RT.afterBake) RT.afterBake();
  mergeProps(); lightDecals(); addFloorMirror(S); // dammet är borttaget i alla rum
  progress(1, "Klart.");
  return S;
}
function applyLook(S) {
  const L = S.look; scene.fog = new THREE.FogExp2(L.fog, L.density); scene.background = new THREE.Color(L.bg);
  renderer.toneMappingExposure = L.exposure;
  if (finalPass) finalPass.uniforms.exposure.value = L.exposure;
  if (bloomPass) { bloomPass.strength = L.bloom; bloomPass.threshold = L.thr; }
}
async function goRoom(key, first) {
  if (key === "vernissage") { // öppningen i foajén leder till menyn; backa ut spelaren ur öppningen så den inte triggas igen
    walkTarget = null; for (const k in keys) keys[k] = false;
    if (currentKey === "foajen" && player.z < -10.6) player.z = -10.4;
    if (panel.hidden && lb.hidden) openPanel("vernissage"); return;
  }
  if (loading || !SPECS[key] || (key === currentKey && !first)) return;
  loading = true; walkTarget = null; for (const k in keys) keys[k] = false; aimEl.hidden = true;
  hideRoomCard(true); standUp(true); if (tour.on && tour.only) tourStop(true);
  const S = SPECS[key];
  $("ldEyebrow").textContent = S.eyebrow || ("En bättre bild · Rum " + S.num + " av 4"); $("ldName").textContent = S.name; progress(0, "Förbereder rummet…");
  loader.classList.remove("done");
  if (!first) await new Promise((r) => setTimeout(r, reduceMotion ? 50 : 650));
  roomReady = false;
  try { clearScene(); currentKey = key; await buildRoom(key); }
  catch (err) { stepEl.textContent = "Något gick fel när rummet byggdes: " + (err && err.message ? err.message : err); loading = false; throw err; }
  player.x = S.start.x; player.z = S.start.z; player.yaw = S.start.yaw; player.pitch = -.02; player.eyeOff = 0; bob = 0;
  applyLook(S);
  // förvärm: skicka alla texturer och shaders till grafikkortet nu, under laddningen,
  // annars laddas de först när de syns och då hackar det när man vänder sig
  try { const off = []; scene.traverse((o) => { if (o.frustumCulled) { o.frustumCulled = false; off.push(o); } });
    camera.position.set(player.x, EYE, player.z); camera.rotation.set(0, player.yaw, 0); camera.updateMatrixWorld();
    renderer.compile(scene, camera); if (composer) composer.render(); else renderer.render(scene, camera);
    renderMirror(); // spegelns shadervarianter (med klipplan) kompileras nu, inte när man börjar gå
    off.forEach((o) => { o.frustumCulled = true; }); } catch (e) { console.warn(e); }
  $("roomNum").textContent = S.num; $("roomName").textContent = S.name;
  document.querySelectorAll("#rooms button").forEach((b) => b.setAttribute("aria-current", b.dataset.room === key ? "true" : "false"));
  if (location.hash.slice(1) !== key) { try { location.hash = key; } catch (e) {} }
  Sound.setRoom(STREET && STREET.on ? "gata" : key);
  // varje rum får börja om med full kvalitet: ett tungt rum ska inte göra de andra suddiga
  quality = 1; lowTier = false; frameEMA = 16; if (bloomPass && !isTouch) bloomPass.enabled = true; applyQuality();
  roomReady = true; loading = false;
  setTimeout(() => loader.classList.add("done"), 200);
  if (tour.on) tourEnter(); else if (entered) showRoomCard();
  return S;
}
