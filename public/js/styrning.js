// Rörelse, styrning, ljuslådan och panelerna.
"use strict";
/* ================= rörelse och styrning ================= */
const EYE = 1.62;
const player = { x: -1.4, z: -1.5, yaw: -.2, pitch: -.02, eyeOff: 0 }; // eyeOff: turen lyfter blicken till bildens mitt
let sitting = null; // sittplatsen man sitter på
let walkTarget = null, entered = false, locked = false, bob = 0, stepAcc = 0, stepSide = 1;
const walkRects = () => (currentKey ? SPECS[currentKey].walk : []);
function blocked(px, pz) {
  if (!walkRects().some((r) => px >= r.x0 && px <= r.x1 && pz >= r.z0 && pz <= r.z1)) return true;
  const Rr = .28; for (const b of colliders) { const cx = Math.max(b.x0, Math.min(px, b.x1)), cz = Math.max(b.z0, Math.min(pz, b.z1)); if ((px - cx) ** 2 + (pz - cz) ** 2 < Rr * Rr) return true; }
  return false;
}
function clampWalk(x, z) {
  let best = null, bd = 1e9;
  for (const r of walkRects()) { const cx = clamp(x, r.x0, r.x1), cz = clamp(z, r.z0, r.z1), d = (cx - x) ** 2 + (cz - z) ** 2; if (d < bd) { bd = d; best = { x: cx, z: cz }; } }
  return best || { x, z };
}
const keys = {};
addEventListener("keydown", (e) => {
  if (!entered) return;
  if (tour.on && lb.hidden && panel.hidden && (e.code === "ArrowRight" || e.code === "ArrowLeft")) { e.preventDefault(); if (!e.repeat) (e.code === "ArrowRight" ? tourNext : tourPrev)(); return; }
  // tangenter på en knapp hör till knappen, inte till rummet
  if (e.target && e.target.tagName === "BUTTON" && (e.code === "Enter" || e.code === "Space" || e.code === "NumpadEnter")) return;
  keys[e.code] = true; if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  if (e.code === "Escape") { if (!lb.hidden) closeLB(); else closePanel(); }
  if ((e.code === "KeyE" || e.code === "Enter") && lb.hidden) { const a = pickNDC(0, 0); if (a && a.art) openArt(a.art); else if (a && a.menu) openPanel(a.menu); else if (a && a.seat && a.dist < 7 && !sitting) sitDown(a.seat); else if (a && a.exit && a.dist < 6) goRoom(a.exit); }
  if (e.code === "Space" && sitting && !e.repeat) standUp();
  if (e.code === "KeyM") Sound.set(!Sound.on);
  if (!tour.on && lb.hidden && panel.hidden && !loading && roomCount() && (e.code === "KeyT" || e.code === "KeyB") && !e.repeat) { if (e.code === "KeyT") roomTourStart(); else { hideRoomCard(); openPanel("rum"); } }
});
addEventListener("keyup", (e) => { keys[e.code] = false; });
addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
document.addEventListener("pointerlockchange", () => { locked = document.pointerLockElement === canvas; updateHint(); });
function lock() { if (isTouch) return; try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
function unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
function look(dx, dy, k) { player.yaw -= dx * k; player.pitch = clamp(player.pitch - dy * k, -1.2, 1.2); }

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pickNDC(x, y) {
  if (!roomReady) return null;
  ndc.set(x, y); ray.setFromCamera(ndc, camera); ray.far = 30;
  const hit = ray.intersectObjects(occluders, false)[0]; if (!hit) return null;
  const u = hit.object.userData;
  if (u.art) return { art: u.art, dist: hit.distance };
  if (u.exit) return { exit: u.exit, dist: hit.distance };
  if (u.menu) return { menu: u.menu, title: u.title, dist: hit.distance };
  if (u.seat) return { seat: u.seat, dist: hit.distance };
  if (u.floor) return { floor: hit.point };
  return null;
}
const pickAt = (cx, cy) => pickNDC(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);
function handleTap(cx, cy) {
  const p = pickAt(cx, cy); if (!p) return;
  if (p.art) { if (p.dist < 9 || isTouch) openArt(p.art); else walkTo(p.art.s.N, p.art); return; }
  if (p.exit) { goRoom(p.exit); return; }
  if (p.menu) { openPanel(p.menu); return; }
  if (p.seat) { sitDown(p.seat); return; }
  if (p.floor) setWalk(p.floor.x, p.floor.z);
}
function setWalk(x, z) { walkTarget = clampWalk(x, z); showMarker(walkTarget.x, walkTarget.z); }
function walkTo(n, art) { const c = art.s; setWalk(c.O[0] + c.U[0] * art.w / 2 + n[0] * 2.4, c.O[2] + c.U[2] * art.w / 2 + n[2] * 2.4); }

let drag = null, mouse = null, lockFailed = false;
let lookDX = 0, lookDY = 0;
canvas.addEventListener("mousemove", (e) => { if (!locked) return; const mx = e.movementX, my = e.movementY; if (Math.abs(mx) > 260 || Math.abs(my) > 260) return; lookDX += mx; lookDY += my; });
canvas.addEventListener("pointerdown", (e) => {
  if (!entered) return; canvas.focus({ preventScroll: true });
  if (locked) { const a = pickNDC(0, 0); if (a && a.art) { if (a.dist < 9) { openArt(a.art); unlock(); } else walkTo(a.art.s.N, a.art); } else if (a && a.exit) goRoom(a.exit); else if (a && a.menu) openPanel(a.menu); else if (a && a.seat && a.dist < 7) sitDown(a.seat); else if (a && a.floor) setWalk(a.floor.x, a.floor.z); return; }
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), touch: e.pointerType === "touch" };
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
});
canvas.addEventListener("pointermove", (e) => {
  if (drag && drag.id === e.pointerId) { look(e.clientX - drag.x, e.clientY - drag.y, drag.touch ? .0048 : .0032); drag.x = e.clientX; drag.y = e.clientY; }
  else if (!locked && entered && e.pointerType === "mouse") { mouse = { x: e.clientX, y: e.clientY }; const t = performance.now(); if (t - lastHover > 90) { lastHover = t; const p = pickAt(e.clientX, e.clientY); canvas.style.cursor = p && (p.art || p.exit || p.menu || p.floor || p.seat) ? "pointer" : "default"; } }
});
canvas.addEventListener("pointerleave", () => { mouse = null; });
canvas.addEventListener("pointerup", (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  const touch = drag.touch, moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy), quick = performance.now() - drag.t < (touch ? 700 : 450); drag = null;
  if (moved < (touch ? 16 : 8) && quick) {
    if (touch || lockFailed) return handleTap(e.clientX, e.clientY);
    const p = pickAt(e.clientX, e.clientY);
    if (p && p.art && p.dist < 9) openArt(p.art); else if (p && p.exit) goRoom(p.exit); else if (p && p.menu) openPanel(p.menu); else lock();   // ett klick tar tillbaka musstyrningen
  }
});
canvas.addEventListener("pointercancel", () => { drag = null; });
["touchstart", "touchmove"].forEach((ev) => canvas.addEventListener(ev, (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false }));
document.addEventListener("pointerlockerror", () => { lockFailed = true; updateHint(); });

let marker = null, markerT = 0;
function showMarker(x, z) {
  if (!marker) { marker = new THREE.Mesh(new THREE.RingGeometry(.16, .2, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(.6, 1.6, 1.5), transparent: true, depthWrite: false })); marker.rotation.x = -Math.PI / 2; scene.add(marker); }
  marker.position.set(x, .012, z); markerT = 1;
}

/* ---------- UI ---------- */
const lb = $("lightbox"), aimEl = $("aim");
function openArt(art) { openPhoto(art.slot.key); }
function openPhoto(key) {
  const P = PHOTOS[key];
  if (!P.src) { toast("Den här platsen väntar på ett foto."); return; }
  unlock(); lb.classList.toggle("light", P.tone === "light");
  $("lbImg").src = P.src; $("lbImg").alt = P.title; $("lbTitle").textContent = P.title; $("lbMeta").textContent = P.meta; lb.hidden = false; document.body.classList.add("viewing"); $("lbClose").focus();
}
function closeLB() { if (lb.hidden) return; lb.hidden = true; lbClosedAt = performance.now(); canvas.focus({ preventScroll: true }); setTimeout(() => { if (lb.hidden && panel.hidden) document.body.classList.remove("viewing"); }, 700); }
$("lbClose").addEventListener("click", closeLB); lb.addEventListener("click", closeLB);
const panel = $("panel");
function openPanel(kind) {
  unlock(); const b = $("panelBody"); b.innerHTML = "";
  const para = (t, cls) => { const e = document.createElement("p"); e.textContent = t; if (cls) e.className = cls; b.append(e); };
  const head = (eb, t) => { $("panelEyebrow").textContent = eb; $("panelTitle").textContent = t; };
  if (kind === "vernissage") {
    head("Foajén · Vernissage", "Vernissage");
    para("Fyra rum med fotografier, ett varv. Ta hela turen från början, eller välj ett rum att börja i. Skyltarna GÅ VIDARE leder dig runt och tillbaka hit.");
    para("Turen tar dig från bild till bild i alla fyra rummen. Du bläddrar själv i din egen takt.");
    const tour = document.createElement("button"); tour.type = "button"; tour.className = "btn tourgo"; tour.textContent = "Ta turen →";
    tour.addEventListener("click", () => { closePanel(); tourStart(); }); b.append(tour);
    const h3 = document.createElement("h3"); h3.textContent = "Eller börja i"; b.append(h3);
    const list = document.createElement("div"); list.className = "tour"; b.append(list);
    for (const k of ["staden", "naturen", "berattelser", "manniskorna"]) { const S = SPECS[k], bt = document.createElement("button"); bt.type = "button";
      const n = document.createElement("span"); n.className = "n"; n.textContent = S.num;
      const t = document.createElement("span"); t.className = "t"; const nb = document.createElement("b"); nb.textContent = S.name; const sb = document.createElement("small"); sb.textContent = S.sub; t.append(nb, sb);
      const ar = document.createElement("span"); ar.className = "ar"; ar.textContent = "→";
      bt.append(n, t, ar); bt.addEventListener("click", () => { closePanel(); goRoom(k); }); list.append(bt); }
  } else if (kind === "galleri") {
    head("Foajén · Galleri", "Galleri"); para("Alla bilder från rummen. Tryck på en bild för att se den i full storlek.");
    for (const k of ["foajen", "staden", "naturen", "berattelser", "manniskorna"]) {
      const S = SPECS[k], h3 = document.createElement("h3"); h3.textContent = S.num + "  " + S.name; b.append(h3);
      const grid = document.createElement("div"); grid.className = "grid"; b.append(grid);
      S.slots.filter((sl) => PHOTOS[sl.key].src).forEach((sl) => { const Ph = PHOTOS[sl.key], bt = document.createElement("button"); bt.type = "button";
        const im = document.createElement("img"); im.src = Ph.src; im.alt = Ph.title; im.loading = "lazy"; const sp = document.createElement("span"); sp.textContent = Ph.title;
        bt.append(im, sp); bt.addEventListener("click", () => openPhoto(sl.key)); grid.append(bt); });
      const go = document.createElement("button"); go.type = "button"; go.className = "chip go"; go.textContent = "Gå till " + S.name + " →"; go.addEventListener("click", () => { closePanel(); goRoom(k); }); b.append(go);
    }
  } else if (kind === "rum") {
    const S = SPECS[currentKey]; head(S.num + " · " + S.name, S.name); para(S.sub + ". Tryck på en bild för att se den i full storlek.");
    const tg = document.createElement("button"); tg.type = "button"; tg.className = "btn tourgo"; tg.textContent = "Ta turen i rummet →";
    tg.addEventListener("click", () => { closePanel(); roomTourStart(); }); b.append(tg);
    const grid = document.createElement("div"); grid.className = "grid"; b.append(grid);
    S.slots.filter((sl) => PHOTOS[sl.key] && PHOTOS[sl.key].src).forEach((sl) => { const Ph = PHOTOS[sl.key], bt = document.createElement("button"); bt.type = "button";
      const im = document.createElement("img"); im.src = Ph.src; im.alt = Ph.title; im.loading = "lazy"; const sp = document.createElement("span"); sp.textContent = Ph.title;
      bt.append(im, sp); bt.addEventListener("click", () => openPhoto(sl.key)); grid.append(bt); });
  } else if (kind === "om") {
    head("Foajén · Om", "En bättre bild"); para("Fotografi i staden, i naturen och bilder som bär en berättelse.");
    para("Här kommer din presentation: vem du är, hur du arbetar och vad du helst fotograferar. Skicka texten så lägger jag in den.", "placeholder");
    { const e = document.createElement("p"); e.className = "credit"; e.append("3D-modeller: material och möbler från Poly Haven (CC0). Bilarna på gatan: ");
      const a = document.createElement("a"); a.href = "https://sketchfab.com/3d-models/generic-passenger-car-pack-20f9af9b8a404d5cb022ac6fe87f21f5"; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Generic passenger car pack";
      const u = document.createElement("a"); u.href = "https://sketchfab.com/comrade1280"; u.target = "_blank"; u.rel = "noopener"; u.textContent = "Comrade1280";
      const l = document.createElement("a"); l.href = "http://creativecommons.org/licenses/by/4.0/"; l.target = "_blank"; l.rel = "noopener"; l.textContent = "CC BY 4.0";
      e.append(a, " av ", u, ", licensierad under ", l, ". Husen på andra sidan gatan: ");
      const h1 = document.createElement("a"); h1.href = "https://sketchfab.com/3d-models/old-building-pack-lowpoly-081eccb97be8429c83b2e9fb407727e7"; h1.target = "_blank"; h1.rel = "noopener"; h1.textContent = "Old Building Pack | Lowpoly";
      const h2 = document.createElement("a"); h2.href = "https://sketchfab.com/3d-models/old-concrete-building-pack-lowpoly-4387dbb08a37418e8c07c992a5a9500a"; h2.target = "_blank"; h2.rel = "noopener"; h2.textContent = "Old Concrete Building Pack | Lowpoly";
      const fu = document.createElement("a"); fu.href = "https://sketchfab.com/Fridqeir"; fu.target = "_blank"; fu.rel = "noopener"; fu.textContent = "Fridqeir";
      const l2 = l.cloneNode(true), lu = document.createElement("a"); lu.href = "https://sketchfab.com/ivan.anton.albarracin"; lu.target = "_blank"; lu.rel = "noopener"; lu.textContent = "lupas";
      const h3 = document.createElement("a"); h3.href = "https://sketchfab.com/3d-models/brick-shop-building-lowpoly-548d4a0e62b54efcab4483fb6d0c3611"; h3.target = "_blank"; h3.rel = "noopener"; h3.textContent = "Brick Shop Building | Lowpoly";
      e.append(h1, ", ", h2, " och ", h3, " av ", fu, ", licensierade under ", l2, ". Gatlyktorna: simple collection of low poly street lights av ", lu, " (CC BY 4.0). Övergångsstället: textur ur Low road av Yarelon (CC BY 4.0). Höghusen i fjärran: Low Poly Night City Building Skyline av 99.Miles (CC BY 4.0). Paraplyet: Elegant umbrella av Araon (CC BY 4.0). Gatuprylarna: City Props Collection av TampaJoey."); b.append(e); }
  } else if (kind === "priser") {
    head("Foajén · Priser", "Priser"); para("Priser och paket kommer snart.");
    para("Skicka dina paket och priser, så blir det här en tydlig prislista.", "placeholder");
  } else {
    head("Foajén · Kontakt", "Kontakt"); para("Vill du boka en fotografering? Kontaktuppgifterna kommer här snart.");
    para("Skicka e-post, telefon och gärna Instagram, så blir det här en bokningssida.", "placeholder");
  }
  panel.hidden = false; document.body.classList.add("viewing"); panel.scrollTop = 0; $("panelClose").focus();
}
function closePanel() { if (panel.hidden) return; panel.hidden = true; lbClosedAt = performance.now(); canvas.focus({ preventScroll: true }); setTimeout(() => { if (lb.hidden) document.body.classList.remove("viewing"); }, 700); }
$("panelClose").addEventListener("click", closePanel);
let toastTimer; function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), 3800); }
function updateHint() {
  $("hint").textContent = isTouch ? "Dra med ett finger för att se dig om · tryck på golvet för att gå dit · tryck på ett foto eller en dörr"
    : locked ? "Musen tittar · klicka på golvet för att gå dit, på ett foto för att öppna det eller på en dörr · W A S D går · Esc släpper musen"
    : lockFailed ? "För musen mot skärmkanten för att vända dig · klicka på golvet för att gå · W A S D eller piltangenter"
    : "Klicka i rummet för att styra med musen igen · eller för musen mot kanten för att vända dig";
  $("cross").hidden = !locked;
}
function enter(withSound) {
  if (STREET && STREET.on) { // kliv in från gatan: dörrarna går upp, man går in, vänder sig om när de går igen och sedan in i foajén
    if (STREET.going || !roomReady) return; STREET.going = true; if (withSound) Sound.set(true); $("intro").classList.add("gone"); $("skipBtn").hidden = true;
    STREET.enter(() => { const z = STREET.endZ; STREET.on = false; STREET = null; if (dofPass) dofPass.enabled = false;
      Object.assign(player, { x: 0, z, yaw: 0, pitch: -.02, eyeOff: 0 }); bob = 0; lookDX = lookDY = 0; enter(false); });
    return; }
  entered = true; $("intro").classList.add("gone"); $("where").hidden = false; $("rooms").hidden = false; updateHint(); if (roomReady && !loading) showRoomCard();
  if (withSound) Sound.set(true);
  setTimeout(() => { $("intro").hidden = true; }, 800);
}
$("enterSound").addEventListener("click", () => { enter(true); lock(); });
$("enterQuiet").addEventListener("click", () => { enter(false); lock(); });
document.querySelectorAll("#rooms button").forEach((b) => b.addEventListener("click", () => { b.blur(); canvas.focus({ preventScroll: true }); goRoom(b.dataset.room); }));
addEventListener("hashchange", () => { const k = location.hash.slice(1); if (SPECS[k] && k !== currentKey) goRoom(k); });
