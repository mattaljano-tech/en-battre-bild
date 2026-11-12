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
    const finish = () => { if (finished) return; finished = true; vit.classList.add("on");
      setTimeout(() => { F.on = false; done(); wrap.classList.add("gone"); setTimeout(() => wrap.remove(), 1600); }, 700); };
    D.addEventListener("timeupdate", () => { if (D.duration && D.currentTime > D.duration - .9) finish(); });
    D.addEventListener("ended", finish); D.addEventListener("error", finish);
    D.currentTime = 0; D.play().then(() => { show(D); W.pause(); }).catch(finish);
  };
  return F;
}
