// Promenaden på gatan in till foajén.
"use strict";
/* ================= gatan: entrén till sajten (?gata) =================
   Man går längs den regniga gatan utanför foajén medan den byggs, stannar under skylten EN BÄTTRE BILD,
   rullgardinen går upp när foajén är klar, och "Kliv in" går in genom dörrarna, vänder sig om när de går igen och sedan in i rummet. */
function streetIntro() {
  const ST = { dof: { focus: 8, ap: 0 }, on: true, ready: false, phase: "walk", t: 0, enterT: 0, onDoor: null, done: null, lift: 0, ext: null, step: 0, side: 1, endZ: -2.3 };
  const X0 = -15, ZW = 2.7, ZD = 4.3, WALK = 11.5, ease = (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, PU = .2;
  const bez = (u) => { const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; return [a * X0 + b * -2.5 + c * 0, a * ZW + b * ZW + c * ZD]; };
  let px = X0, pz = ZW, walked = 0; const uQ = new THREE.Quaternion(), uY = new THREE.Quaternion(), uR = new V3(), uUp = new V3(0, 1, 0);
  function pose(now) {
    let x, z, yaw, pitch, bobA = 0, y = EYE;
    if (ST.phase !== "enter") {
      const t = ST.phase === "wait" ? 1 : clamp(ST.t / WALK, 0, 1), u = t < .75 ? t / .75 * .85 : .85 + .15 * (1 - Math.pow(1 - (t - .75) / .25, 2));
      [x, z] = bez(u); const [ax, az] = bez(Math.min(1, u + .01)), hd = u < .99 ? Math.atan2(-(ax - x), -(az - z)) : 0;
      const turn = ease(clamp((t - .62) / .38, 0, 1)); yaw = hd + Math.atan2(Math.sin(0 - hd), Math.cos(0 - hd)) * turn + (1 - turn) * Math.sin(ST.t * .4) * .04; pitch = -.02 + turn * (PU + .02);
      if (ST.phase === "wait") { yaw = Math.sin(now / 2400) * .025; pitch = PU + Math.sin(now / 3100) * .012; }
      bobA = t < .92 ? 1 : (1 - t) * 12;
    } else {
      const e = ST.enterT, w = ease(clamp((e - .4) / 2.6, 0, 1)), tr = ease(clamp((e - 2.8) / 1.5, 0, 1)), tb = ease(clamp((e - 5.4) / 1.4, 0, 1));
      x = 0; z = ZD + (ST.endZ - ZD) * w; yaw = (tr + tb) * Math.PI; pitch = PU + (-.02 - PU) * ease(clamp(e / 1.6, 0, 1)) + .04 * tr * (1 - tb);
      bobA = w > 0 && w < 1 ? 1 : 0;
    }
    const d = Math.hypot(x - px, z - pz); px = x; pz = z; walked += d;
    if (d > 0 && bobA > .3) { ST.step += d; if (ST.step > 1.05) { ST.step = 0; ST.side = -ST.side; try { Sound.step(ST.side); } catch (e) {} } }
    y += reduceMotion ? 0 : Math.sin(walked * 3.6) * .016 * bobA;
    camera.position.set(x, y, z); camera.rotation.set(pitch, yaw, 0);
    // paraplyet i handen: duken över huvudet syns upptill, lutar bakåt när blicken går upp, fälls ner när man kliver in
    const U = ST.umb; if (U) { const low = ST.phase === "enter" ? ease(clamp(ST.enterT / 1.1, 0, 1)) : 0; U.visible = low < .99;
      if (U.visible) { const sy = Math.sin(yaw), cy = Math.cos(yaw), sw = Math.sin(walked * 1.8) * .012 * bobA;
        const UR = .26 + sw, UF = .1 - low * .35, UY = (isTouch ? -.06 : -.24) - low * 1.5;
        U.position.set(x + cy * UR - sy * UF, y + UY, z - sy * UR - cy * UF);
        uQ.setFromAxisAngle(uR.set(cy, 0, -sy), .06 + Math.max(0, pitch) * 1.5 + low * .6 + sw * 2); U.quaternion.copy(uQ).multiply(uY.setFromAxisAngle(uUp, yaw + .6)); } }
    // skärpan ligger på butiken och dörren; gatan bakom och marken närmast blir mjuk. Inne i foajén blir allt skarpt igen
    const fd = clamp(Math.hypot(x, y - 2.1, z - .3), 2.4, 30), A0 = isTouch ? .0045 : .0065, ap = ST.phase === "enter" ? A0 * (1 - ease(clamp((ST.enterT - 1.6) / 2.2, 0, 1))) : A0;
    ST.dof.focus += (fd - ST.dof.focus) * .12; ST.dof.ap = ap;
  }
  function tick(now, dt) {
    ST.t += dt;
    if (ST.phase === "walk" && ST.t >= WALK) { ST.phase = "wait"; if (ST.onDoor) { const f = ST.onDoor; ST.onDoor = null; f(); } }
    if (roomReady && ST.lift < 1) { ST.lift = Math.min(1, ST.lift + dt / 1.8); ST.ext.gate.lift(ease(ST.lift)); }
    if (ST.phase === "enter") { ST.enterT += dt; const e = ST.enterT;
      ST.ext.gate.door(1.35 * ease(clamp((e - .1) / 1.1, 0, 1)) * (1 - ease(clamp((e - 3.6) / 1.5, 0, 1))));
      if (e > 4.4 && !ST.sndIn) { ST.sndIn = true; Sound.setRoom("foajen"); } // dörrarna går igen: regnet tystnar, foajén och musiken tar över
      if (e > 6.9 && ST.done) { const f = ST.done; ST.done = null; f(); } }
    ST.ext.update(now); pose(now);
  }
  Object.assign(ST, {
    tick,
    attach: (ext) => { ST.ext = ext; ST.ready = true; ST.t = 0; ext.gate.lift(0); applyLook(SPECS.foajen); loader.classList.add("street"); ST.umb = ext.umbrella || null;
      if (!Sound.on) { Sound.room = "gata"; $("rainBtn").hidden = false; } else Sound.setRoom("gata");
      try { renderer.compile(scene, camera); } catch (e) {} }, // gatans alla shaders på en gång, inte en i taget när de syns
    atDoor: (f) => { if (ST.phase !== "walk") f(); else ST.onDoor = f; },
    skip: () => { if (ST.phase === "walk") ST.t = Math.max(ST.t, WALK - 1.2); },
    enter: (f) => { ST.phase = "enter"; ST.enterT = 0; ST.done = f; $("rainBtn").hidden = true; if (ST.lift < 1) { ST.lift = 1; ST.ext.gate.lift(1); } }
  });
  return ST;
}
