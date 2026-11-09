// Startar sidan. Laddas sist.
"use strict";
let STREET = null;
if (dbg) window.__street = () => STREET;

setupPost(); addEventListener("resize", resize); resize();
requestAnimationFrame(frame);
const startKey = SPECS[location.hash.slice(1)] ? location.hash.slice(1) : "foajen";
// första besöket i foajén börjar ute på gatan (?direkt hoppar över det)
if (startKey === "foajen" && !reduceMotion && GATA && !/[?&]direkt/.test(location.search)) { // första besöket börjar ute på gatan (?direkt hoppar över promenaden)
  STREET = streetIntro(); $("intro").classList.add("street"); $("skipBtn").hidden = false; }
goRoom(startKey, true).then((S) => {
  if (STREET) { $("introName").textContent = "En bättre bild"; $("introEyebrow").textContent = "Fotograf · Stockholm"; $("introText").textContent = "Kliv in i värmen. Foajén väntar, och där börjar vernissagen.";
    STREET.atDoor(() => { $("skipBtn").hidden = true; setTimeout(() => { $("intro").hidden = false; }, 300); }); return; }
  $("introName").textContent = S.name; $("introEyebrow").textContent = (S.num === "00" ? "Entré" : "Rum " + S.num) + " · " + S.sub; $("introText").textContent = S.intro;
  setTimeout(() => { $("intro").hidden = false; }, 250);
}).catch((e) => { console.error(e); });
$("rainBtn").addEventListener("click", (e) => { Sound.room = "gata"; Sound.set(true); e.currentTarget.hidden = true; e.currentTarget.blur(); });
$("skipBtn").addEventListener("click", () => { if (STREET) STREET.skip(); $("skipBtn").hidden = true; });
