// Start: hjälpfunktioner för sidan och laddningsmätaren.
"use strict";
const $ = (id) => document.getElementById(id);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = matchMedia("(pointer: coarse)").matches;
const loader = $("loader"), stepEl = $("step"), barFill = $("barFill");
function progress(p, msg) { barFill.style.width = Math.round(p * 100) + "%"; if (msg) stepEl.textContent = msg + " " + Math.round(p * 100) + " %"; }
if (!window.THREE) { stepEl.textContent = "3D kunde inte laddas. Ladda om sidan."; throw new Error("Three.js kunde inte laddas"); }
const V3 = THREE.Vector3;
const nextFrame = () => new Promise((r) => setTimeout(r, 0));
