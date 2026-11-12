// Renderloopen.
"use strict";
/* ================= loop ================= */
let last = performance.now();
let frameEMA = 16, lastQ = 0, lastAim = 0, lastHover = 0, lowTier = false;
// ?debug visar bildfrekvens, upplösning och grafikkort
const dbg = /[?&]debug/.test(location.search) ? Object.assign(document.body.appendChild(document.createElement("div")), { style: "position:fixed;left:8px;top:40px;z-index:20;font:11px/1.4 monospace;color:#9fe;background:rgba(0,0,0,.6);padding:4px 6px;pointer-events:none;white-space:pre" }) : null;
let dbgT = 0, dbgN = 0, gpuName = "?";
if (dbg) { window.__scene = scene; window.__cam = camera; window.__pl = () => JSON.stringify({ x: +player.x.toFixed(2), z: +player.z.toFixed(2), yaw: +player.yaw.toFixed(2), pitch: +player.pitch.toFixed(2), eo: +player.eyeOff.toFixed(2), anim: !!tour.anim, locked }); window.__order = () => tourStops().map((st) => st.art.slot.key + "@" + st.v.x.toFixed(1) + "," + st.v.z.toFixed(1)); window.__dump = () => ({ key: currentKey, start: SPECS[currentKey].start, rects: walkRects(), arts: arts.filter((a) => PHOTOS[a.slot.key] && PHOTOS[a.slot.key].src).map((a) => ({ k: a.slot.key, C: a.slot.C.map((v) => +v.toFixed(2)), N: a.slot.N, w: +(a.w || 0).toFixed(2) })) }); }
if (dbg) { window.__sit = (i) => { sitDown(seats[i]); return seats.length; }; window.__stand = () => standUp(); }
if (dbg) window.__setView = (v) => { player.x = v[0]; player.z = v[1]; player.yaw = v[2]; player.pitch = v[3] || 0; };
try { const gl = renderer.getContext(), ext = gl.getExtension("WEBGL_debug_renderer_info"); if (ext) gpuName = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL); } catch (e) {}
// djupbilden till skärpedjupet: rummet och gatan (lager 0 och 1) i halv upplösning
const dofTmp = new THREE.Vector2();
function streetDof() {
  if (!dofPass) return; const D = STREET && STREET.on && STREET.dof; dofPass.enabled = !!(D && D.ap > .0005); if (!dofPass.enabled) return;
  renderer.getDrawingBufferSize(dofTmp); const w = Math.max(2, dofTmp.x >> 1), h = Math.max(2, dofTmp.y >> 1);
  if (!dofRT || dofRT.width !== w || dofRT.height !== h) { if (dofRT) dofRT.dispose(); dofRT = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }); }
  const mask = camera.layers.mask, bg = scene.background, cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
  camera.layers.set(0); camera.layers.enable(1); scene.overrideMaterial = dofDepthMat; scene.background = null;
  renderer.setRenderTarget(dofRT); renderer.setClearColor(0xffffff, 1); renderer.clear(); renderer.render(scene, camera);
  scene.overrideMaterial = null; scene.background = bg; camera.layers.mask = mask; renderer.setClearColor(cc, ca); renderer.setRenderTarget(null);
  const U = dofPass.uniforms; U.tDepth.value = dofRT.texture; U.focus.value = D.focus; U.aperture.value = D.ap; U.near.value = camera.near; U.far.value = camera.far; U.asp.value = dofTmp.x / dofTmp.y;
  U.maxblur.value = isTouch ? .0028 : .0042;
}
function frame(now) {
  const raw = now - last, dt = Math.min(.05, raw / 1000); last = now;
  // medan entréfilmen spelas ritas inte foajén bakom den: grafikkortet ska bara spela upp filmen, annars hackar den på mobilen
  if (FILM && FILM.on && !FILM.reveal) { requestAnimationFrame(frame); return; }
  if (STREET && STREET.on) { // entrén på gatan: kameran styrs av promenaden, foajén byggs under tiden
    if (STREET.ready) { const S0 = STREET; S0.tick(now, dt); if (S0.phase === "enter" && S0.enterT > 1.2) renderMirror(); streetDof(); if (composer) { finalPass.uniforms.time.value = now / 1000; composer.render(); } else renderer.render(scene, camera); }
    requestAnimationFrame(frame); return; }
  // håll bildfrekvensen jämn: sänk upplösningen om det går tungt, höj igen när det finns marginal
  if (raw < 120) frameEMA = frameEMA * .94 + raw * .06;
  if (dbg) { dbgN++; if (now - dbgT > 500) { const c = renderer.domElement; dbg.textContent = (dbgN * 1000 / (now - dbgT)).toFixed(0) + " fps · " + c.width + "×" + c.height + " · kvalitet " + quality.toFixed(2) + (lowTier ? " · låg nivå" : "") + "\n" + gpuName; dbgT = now; dbgN = 0; } }
  if (roomReady && !loading && now - lastQ > 1800) { lastQ = now;
    const minQ = lowTier ? .75 : isTouch ? .8 : .88;
    if (!lowTier && !isTouch && frameEMA > 24 && quality <= minQ + .001) { lowTier = true; if (bloomPass) bloomPass.enabled = false; }
    if (frameEMA > 26 && quality > minQ) { quality = Math.max(minQ, quality - .075); applyQuality(); }
    else if (frameEMA < 18 && quality < 1) { quality = Math.min(1, quality + .075); applyQuality(); } }
  if (roomReady) {
    if (entered && !loading) {
      if (tour.anim && !tour.anim.noBreak && (walkTarget || ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown"].some((k) => keys[k]))) tour.anim = null; // egen rörelse avbryter glidningen
      if (tour.anim) { const A = tour.anim; A.t = Math.min(1, A.t + Math.min(.25, raw / 1000) / A.T); const t = A.t, e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const qa = (1 - e) * (1 - e), qb = 2 * e * (1 - e), qc = e * e;
        const nx = qa * A.from.x + qb * A.ctl.x + qc * A.to.x, nz = qa * A.from.z + qb * A.ctl.z + qc * A.to.z, mv = Math.hypot(nx - player.x, nz - player.z);
        player.x = nx; player.z = nz;
        if (A.look) { // vänd dig i gångriktningen, gå, och vänd dig mot bilden när du är framme
          const sm = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
          const tx = 2 * (1 - e) * (A.ctl.x - A.from.x) + 2 * e * (A.to.x - A.ctl.x), tz = 2 * (1 - e) * (A.ctl.z - A.from.z) + 2 * e * (A.to.z - A.ctl.z);
          const hd = Math.hypot(tx, tz) > 1e-4 ? Math.atan2(-tx, -tz) : A.from.yaw;
          const raw1 = hd - A.from.yaw; A.d1 = A.d1 === null ? Math.atan2(Math.sin(raw1), Math.cos(raw1)) : A.d1 + Math.atan2(Math.sin(raw1 - A.d1), Math.cos(raw1 - A.d1));
          const wa = sm(0, .32, t), wb = sm(.62, 1, t), y1 = A.from.yaw + A.d1 * wa;
          player.yaw = y1 + Math.atan2(Math.sin(A.to.yaw - y1), Math.cos(A.to.yaw - y1)) * wb;
          const p1 = A.from.pitch + (-.03 - A.from.pitch) * wa, o1 = A.from.eyeOff * (1 - wa);
          player.pitch = p1 + (A.to.pitch - p1) * wb; player.eyeOff = o1 + (A.to.eyeOff - o1) * wb;
        } else { player.yaw = A.from.yaw + (A.to.yaw - A.from.yaw) * e; player.pitch = A.from.pitch + (A.to.pitch - A.from.pitch) * e; player.eyeOff = A.from.eyeOff + (A.to.eyeOff - A.from.eyeOff) * e; }
        if (mv > 0) { bob += mv * 3.6; stepAcc += mv; if (stepAcc > 1.05) { stepAcc = 0; stepSide = -stepSide; Sound.step(stepSide); } }
        if (t >= 1) tour.anim = null; }
      let f = 0, s = 0;
      if (keys.KeyW || keys.ArrowUp) f += 1; if (keys.KeyS || keys.ArrowDown) f -= 1; if (keys.KeyD) s += 1; if (keys.KeyA) s -= 1;
      if (keys.ArrowLeft) player.yaw += 1.7 * dt; if (keys.ArrowRight) player.yaw -= 1.7 * dt;
      if (sitting) { if (f || s || walkTarget) { walkTarget = null; standUp(); } f = 0; s = 0; } // går man, reser man sig först
      const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw); let dx = 0, dz = 0, speed = keys.ShiftLeft || keys.ShiftRight ? 3.4 : 1.8;
      if (f || s) { walkTarget = null; const l = Math.hypot(f, s); f /= l; s /= l; dx = (-sy * f + cy * s) * speed * dt; dz = (-cy * f - sy * s) * speed * dt; }
      else if (walkTarget) { const tx = walkTarget.x - player.x, tz = walkTarget.z - player.z, d = Math.hypot(tx, tz); if (d < .08) walkTarget = null; else { const st = Math.min(d, 1.6 * dt); dx = tx / d * st; dz = tz / d * st; } }
      let moved = 0;
      if (dx && !blocked(player.x + dx, player.z)) { player.x += dx; moved += Math.abs(dx); } else if (dx && walkTarget) walkTarget = null;
      if (dz && !blocked(player.x, player.z + dz)) { player.z += dz; moved += Math.abs(dz); } else if (dz && walkTarget) walkTarget = null;
      if (player.eyeOff && !tour.anim && !sitting && (moved > 0 || !tour.on)) { player.eyeOff *= Math.exp(-dt * 3); if (Math.abs(player.eyeOff) < .005) player.eyeOff = 0; } // går man själv sjunker blicken tillbaka
      if (moved > 0) { bob += moved * 3.6; stepAcc += moved; if (stepAcc > 1.05) { stepAcc = 0; stepSide = -stepSide; Sound.step(stepSide); } }
      if (rcStart && Math.hypot(player.x - rcStart.x, player.z - rcStart.z) > 2.5) hideRoomCard();
      if (!tour.anim) for (const ex of exits) if (player.x > ex.x0 && player.x < ex.x1 && player.z > ex.z0 && player.z < ex.z1) { goRoom(ex.to); break; }
    }
    if (entered && !locked && !isTouch && mouse && !drag && lb.hidden && !tour.on) {
      const nx = mouse.x / innerWidth * 2 - 1, ny = mouse.y / innerHeight * 2 - 1, E = .62;
      if (Math.abs(nx) > E) player.yaw -= Math.sign(nx) * Math.pow((Math.abs(nx) - E) / (1 - E), 1.5) * 1.9 * dt;
      if (Math.abs(ny) > .7) player.pitch = clamp(player.pitch - Math.sign(ny) * Math.pow((Math.abs(ny) - .7) / .3, 1.5) * .9 * dt, -.9, .9);
    }
    if (lookDX || lookDY) { const f = 1; const ax = lookDX * f, ay = lookDY * f; look(ax, ay, .0022); lookDX -= ax; lookDY -= ay; if (Math.abs(lookDX) < .01 && Math.abs(lookDY) < .01) { lookDX = 0; lookDY = 0; } }
    camera.position.set(player.x, EYE + player.eyeOff + (reduceMotion ? 0 : Math.sin(bob) * .016), player.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
    if (RT && RT.update) RT.update(now, dt);
    if (dustMat) dustMat.uniforms.time.value = now / 1000;
    if (marker && markerT > 0) { markerT = Math.max(0, markerT - dt * .9); marker.material.opacity = markerT; marker.scale.setScalar(1 + (1 - markerT) * .6); }
    if (!lb.hidden) { requestAnimationFrame(frame); return; } // fotot täcker allt: rita inte rummet bakom
    renderMirror();
    if (composer) { finalPass.uniforms.time.value = now / 1000; composer.render(); } else renderer.render(scene, camera);
    if (entered && locked && !loading) {
      if (now - lastAim > 120) { lastAim = now;
        const a = pickNDC(0, 0);
        if (a && ((a.art && a.dist < 9) || (a.exit && a.dist < 7) || (a.menu && a.dist < 7) || (a.seat && a.dist < 7 && !sitting))) {
          aimEl.innerHTML = ""; const ex = a.exit && exits.find((e) => e.to === a.exit);
          aimEl.append(a.seat ? "Sätt dig" : a.art ? PHOTOS[a.art.slot.key].title : a.menu ? a.title : (ex ? ex.title : SPECS[a.exit].name));
          const sm = document.createElement("small"); sm.textContent = a.seat ? "klicka för att sätta dig och chilla" : a.exit ? "klicka för att gå in" : "klicka för att öppna"; aimEl.append(sm); aimEl.hidden = false;
        } else aimEl.hidden = true; }
    } else aimEl.hidden = true;
  }
  requestAnimationFrame(frame);
}
