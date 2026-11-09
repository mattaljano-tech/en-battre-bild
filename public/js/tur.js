// Guidad tur och rumskortet.
"use strict";
/* ================= guidad tur: från bild till bild genom alla rum ================= */
const tour = { on: false, stops: [], i: -1, anim: null, only: null }; // only: turen gäller bara det här rummet
const tourEl = $("tour"), fadeEl = $("fade");
function segClear(ax, az, bx, bz) { const n = Math.ceil(Math.hypot(bx - ax, bz - az) / .2); for (let k = 1; k < n; k++) { const t = k / n; if (blocked(ax + (bx - ax) * t, az + (bz - az) * t)) return false; } return true; }
// var man ska stå för att se en bild: rakt framför, på ett avstånd som passar bildens storlek
// fri sikt från ögonhöjd till bilden, mätt mot rummets väggar och de fasta volymerna
const eyeFor = (C) => clamp(C[1] - EYE, -.3, .9);
function canSee(px, pz, C, N) {
  const tx = C[0] + N[0] * .15, ty = C[1], tz = C[2] + N[2] * .15, n = 40, ey = EYE + eyeFor(C);
  for (let k = 1; k < n; k++) { const t = k / n, x = px + (tx - px) * t, y = ey + (ty - ey) * t, z = pz + (tz - pz) * t;
    if (Math.min(SDF(x, y, z), objSDF(x, y, z, null)) < .04) return false; }
  return true;
}
// var man ska stå: rakt framför bilden på ett avstånd som passar storleken, där man kan stå och ser bilden fritt
function viewFor(art) {
  const C = art.slot.C, N = art.slot.N, fw = (art.w || 1) + .26, fh = (art.h || 1) + .26; // bilden med ram
  // avståndet där bilden med ram fyller ungefär 70 % av skärmen, oavsett om det är en bred skärm eller en stående mobil
  const tv = Math.tan(camera.fov * Math.PI / 360), th = tv * camera.aspect, ideal = clamp(Math.max(fw / 2 / (th * .7), fh / 2 / (tv * .7)), 1.1, 5.5);
  const ds = []; for (let d = 1.0; d <= 7; d += .1) ds.push(d); ds.sort((a, b) => Math.abs(a - ideal) - Math.abs(b - ideal));
  let best = null;
  for (const d of ds) { const x = C[0] + N[0] * d, z = C[2] + N[2] * d; if (!blocked(x, z) && canSee(x, z, C, N)) { best = { x, z }; break; } }
  if (!best) { const c = clampWalk(C[0] + N[0] * ideal, C[2] + N[2] * ideal); best = { x: c.x, z: c.z }; }
  const dx = C[0] - best.x, dz = C[2] - best.z, h = Math.max(.3, Math.hypot(dx, dz));
  const eo = eyeFor(C); // rakt framifrån: ögat i bildens höjd, blicken vågrät
  return { x: best.x, z: best.z, yaw: Math.atan2(-dx, -dz), pitch: clamp(Math.atan2(C[1] - EYE - eo, h), -.5, .5), eyeOff: eo };
}
// ordningen: ett varv som på museum. Från dörren åt vänster, längs vänster vägg in, kortväggen längst in,
// tillbaka längs höger vägg och sist väggen till höger om dörren. Skärmar mitt i rummet tas när man går förbi dem.
function tourStops() {
  const list = arts.filter((a) => PHOTOS[a.slot.key] && PHOTOS[a.slot.key].src).map((a) => ({ art: a, v: viewFor(a) }));
  const R = walkRects().reduce((m, r) => (r.x1 - r.x0) * (r.z1 - r.z0) > (m.x1 - m.x0) * (m.z1 - m.z0) ? r : m);
  const L = R.z1 - R.z0, W = R.x1 - R.x0, cx = (R.x0 + R.x1) / 2, near = .7;
  const pos = (st) => { const C = st.art.slot.C, N = st.art.slot.N, v = st.v;
    if (C[2] > R.z1 + .3 && v.z > R.z1) return -1000 + C[0];                 // i gången in: vänster sida först
    if (N[0] > .5 && C[0] < R.x0 + near) return R.z1 - C[2];                  // vänster vägg, inåt
    if (N[2] > .5 && C[2] < R.z0 + near) return L + (C[0] - R.x0);            // kortväggen längst in, vänster till höger
    if (N[0] < -.5 && C[0] > R.x1 - near) return L + W + (C[2] - R.z0);       // höger vägg, utåt
    if (N[2] < -.5 && C[2] > R.z1 - near) return C[0] < cx ? -(C[0] - R.x0) - 1 : 2 * L + W + (R.x1 - C[0]); // dörrväggen
    return v.x < cx ? R.z1 - v.z : L + W + (v.z - R.z0);                      // fristående: efter var man står och tittar
  };
  list.forEach((st) => { st.s = pos(st); });
  return list.sort((p, q) => p.s - q.s);
}
// sätt dig: glid till sittplatsen, sänk blicken till sitthöjd och vänd dig åt det håll platsen pekar
function sitDown(seat) {
  if (sitting || tour.on || loading || !seat.opts.length) return;
  const o = seat.opts.reduce((m, q) => Math.hypot(q.ox - player.x, q.oz - player.z) < Math.hypot(m.ox - player.x, m.oz - player.z) ? q : m);
  let dy = o.yaw - player.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); walkTarget = null; hideRoomCard(true);
  tour.anim = { t: 0, T: 1.3, look: false, noBreak: true, ctl: { x: (player.x + o.ox) / 2 * .5 + o.ox * .5, z: (player.z + o.oz) / 2 * .5 + o.oz * .5 },
    from: { x: player.x, z: player.z, yaw: player.yaw, pitch: player.pitch, eyeOff: player.eyeOff }, to: { x: o.x, z: o.z, yaw: player.yaw + dy, pitch: -.03, eyeOff: o.eye - EYE } };
  sitting = o; document.body.classList.add("sitting"); $("sitHint").textContent = isTouch ? "Du sitter · dra för att se dig omkring" : "Du sitter · W eller mellanslag reser dig"; $("sitBar").hidden = false; $("rooms").hidden = true;
}
function standUp(quiet) {
  if (!sitting) return; const o = sitting; sitting = null; document.body.classList.remove("sitting"); $("sitBar").hidden = true; if (entered && !tour.on) $("rooms").hidden = false;
  if (quiet) return;
  tour.anim = { t: 0, T: .9, look: false, noBreak: true, ctl: { x: (player.x + o.ox) / 2, z: (player.z + o.oz) / 2 },
    from: { x: player.x, z: player.z, yaw: player.yaw, pitch: player.pitch, eyeOff: player.eyeOff }, to: { x: o.ox, z: o.oz, yaw: player.yaw, pitch: -.02, eyeOff: 0 } };
}
$("standBtn").addEventListener("click", (e) => { e.currentTarget.blur(); standUp(); canvas.focus({ preventScroll: true }); });
function tourStart() { unlock(); hideRoomCard(true); standUp(true); tour.on = true; tour.only = null; tour.stops = []; tour.i = -1; goRoom("staden"); }
function tourStop(quiet) { tour.on = false; tour.only = null; tour.anim = null; tourEl.hidden = true; if (entered) { $("where").hidden = false; $("rooms").hidden = false; } if (!quiet) syncRcOpen(); }
// bara det här rummet: samma tur, men den slutar vid rummets sista bild
function roomTourStart() { if (loading || currentKey === "foajen") return; unlock(); hideRoomCard(true); standUp(true); tour.on = true; tour.only = currentKey; tourEnter(true); }

/* ================= rumskortet: välj tur eller alla bilder när man kommer in i ett rum ================= */
const rcEl = $("roomCard"); let rcStart = null;
const roomCount = () => currentKey && currentKey !== "foajen" && SPECS[currentKey] ? SPECS[currentKey].slots.filter((sl) => PHOTOS[sl.key] && PHOTOS[sl.key].src).length : 0;
function syncRcOpen() { $("rcOpen").hidden = !entered || tour.on || !rcEl.hidden || !roomCount(); }
function showRoomCard() {
  const n = roomCount(); if (!n || tour.on) { syncRcOpen(); return; }
  const S = SPECS[currentKey]; $("rcRoom").textContent = S.num; $("rcName").textContent = S.name; $("rcCount").textContent = n + (n === 1 ? " bild" : " bilder");
  rcEl.hidden = false; document.body.classList.add("rc"); $("rooms").hidden = true; rcStart = { x: player.x, z: player.z }; syncRcOpen();
}
function hideRoomCard(quiet) { if (rcEl.hidden) return; rcEl.hidden = true; document.body.classList.remove("rc"); rcStart = null; if (entered && !tour.on) $("rooms").hidden = false; if (!quiet) syncRcOpen(); }
$("rcTour").addEventListener("click", (e) => { e.currentTarget.blur(); roomTourStart(); });
$("rcAll").addEventListener("click", (e) => { e.currentTarget.blur(); hideRoomCard(); openPanel("rum"); });
$("rcClose").addEventListener("click", (e) => { e.currentTarget.blur(); hideRoomCard(); canvas.focus({ preventScroll: true }); });
$("rcOpen").addEventListener("click", (e) => { e.currentTarget.blur(); showRoomCard(); });
function tourEnter(now) {
  if (currentKey === "foajen") { tourStop(); return; }
  tour.stops = tourStops(); tour.i = -1; tour.anim = null; tourUI();
  if (tour.stops.length) setTimeout(() => { if (tour.on && tour.i < 0) tourGo(0); }, now ? 60 : reduceMotion ? 300 : 1000);
}
function tourGo(i) {
  if (!tour.stops.length) return;
  tour.i = clamp(i, 0, tour.stops.length - 1); const v = tour.stops[tour.i].v; walkTarget = null;
  if (reduceMotion || !segClear(player.x, player.z, v.x, v.z)) { // går inte att glida dit: tona till svart och flytta
    tour.anim = null; fadeEl.classList.add("on");
    setTimeout(() => { Object.assign(player, { x: v.x, z: v.z, yaw: v.yaw, pitch: v.pitch, eyeOff: v.eyeOff }); fadeEl.classList.remove("on"); }, reduceMotion ? 0 : 320);
  } else { let dy = v.yaw - player.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const dist = Math.hypot(v.x - player.x, v.z - player.z), from = { x: player.x, z: player.z, yaw: player.yaw, pitch: player.pitch, eyeOff: player.eyeOff };
    // gå en båge ut i rummet i stället för rakt i sidled längs väggen, så att man ser rummet mellan bilderna
    const R = walkRects().reduce((m, r) => (r.x1 - r.x0) * (r.z1 - r.z0) > (m.x1 - m.x0) * (m.z1 - m.z0) ? r : m);
    const mx = (from.x + v.x) / 2, mz = (from.z + v.z) / 2, rx = (R.x0 + R.x1) / 2 - mx, rz = Math.max(R.z0 + 2, Math.min(R.z1 - 2, mz)) - mz, rl = Math.hypot(rx, rz);
    let ctl = null;
    for (const k of [Math.min(1.6, dist * .35), Math.min(.8, dist * .18), 0]) {
      const c = k && rl > .3 ? { x: mx + rx / rl * k, z: mz + rz / rl * k } : { x: mx, z: mz }; let ok = true;
      for (let i = 1; i < 24 && ok; i++) { const u = i / 24, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d = u * u; if (blocked(a * from.x + b * c.x + d * v.x, a * from.z + b * c.z + d * v.z)) ok = false; }
      if (ok) { ctl = c; break; } }
    if (!ctl) { tour.anim = null; fadeEl.classList.add("on");
      setTimeout(() => { Object.assign(player, { x: v.x, z: v.z, yaw: v.yaw, pitch: v.pitch, eyeOff: v.eyeOff }); fadeEl.classList.remove("on"); }, 320); tourUI(); return; }
    const look = dist > 1.1; // korta kliv: vrid bara direkt mot bilden
    tour.anim = { t: 0, T: look ? clamp(dist / 1.25 + 1.1, 2.2, 5.5) : clamp(dist / 1.5, .9, 3.2), look, ctl, d1: null, from, to: { x: v.x, z: v.z, yaw: player.yaw + dy, pitch: v.pitch, eyeOff: v.eyeOff } }; }
  tourUI();
}
function tourNext() {
  if (loading) return;
  if (tour.i < tour.stops.length - 1) { tourGo(tour.i + 1); return; }
  const nx = SPECS[currentKey].next; tour.anim = null;
  if (tour.only) { const S = SPECS[currentKey]; tourStop(); toast("Det var alla bilder i " + S.name + ". Gå vidare själv eller välj ett rum nere till höger."); return; }
  if (!nx || nx === "foajen") { tourStop(); goRoom("foajen"); setTimeout(() => toast("Det var hela vernissagen. Tack för att du tittade!"), 1400); }
  else goRoom(nx);
}
function tourPrev() { if (!loading && tour.i > 0) tourGo(tour.i - 1); }
function tourUI() {
  if (!tour.on) return; tourEl.hidden = false; $("where").hidden = true; $("rooms").hidden = true;
  const S = SPECS[currentKey], n = tour.stops.length, last = tour.i >= n - 1;
  $("tourRoom").textContent = S.num + "  " + S.name;
  $("tourTitle").textContent = !n ? "Inga bilder här ännu" : tour.i >= 0 ? PHOTOS[tour.stops[tour.i].art.slot.key].title : "";
  $("tourCount").textContent = n && tour.i >= 0 ? (tour.i + 1) + " / " + n : "";
  $("tourPrev").disabled = tour.i <= 0;
  $("tourNext").textContent = n && !last ? "Nästa bild →" : tour.only ? "Klar ✓" : S.next === "foajen" ? "Avsluta turen →" : "Nästa: " + SPECS[S.next].name + " →";
}
$("tourNext").addEventListener("click", (e) => { e.currentTarget.blur(); tourNext(); });
$("tourPrev").addEventListener("click", (e) => { e.currentTarget.blur(); tourPrev(); });
$("tourEnd").addEventListener("click", () => { const only = tour.only; tourStop(); if (only) return; toast("Turen är avslutad. Gå runt fritt, eller välj ett rum nere till höger."); });
