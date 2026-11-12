// Renderaren, ytor och föremål med bakat ljus, och delar som alla rum använder.
"use strict";
/* ================= renderer ================= */
const canvas = $("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isTouch ? 1.4 : 1.6));
renderer.outputEncoding = THREE.sRGBEncoding;
let maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const POST = !!(THREE.EffectComposer && THREE.RenderPass && THREE.ShaderPass && THREE.CopyShader);
renderer.toneMapping = POST ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x020303);
scene.fog = new THREE.FogExp2(0x050808, .021);
const camera = new THREE.PerspectiveCamera(64, 1, .05, 70); camera.rotation.order = "YXZ"; camera.layers.enable(1); camera.layers.enable(2); // lager 1: saker som inte syns i golvspeglingen

const LMAX = 6; // ljuskartor lagrar 0…LMAX
const RES = isTouch ? 9 : 16;  // texlar per meter i ljuskartorna

/* ================= ytor med bakad ljuskarta ================= */
const surfaces = [], props = [], occluders = [], photoMeshes = [], seats = [];
function planar(o) {
  if (o.map && o.map.pbr) { const m = o.map; o = Object.assign({}, o, { map: m.map, nor: m.nor, arm: m.arm, relK: m.relK, layer: m.layer, color: m.color, tu: o.keepUV ? o.tu : m.s, tv: o.keepUV ? o.tv : m.s }); }
  const U = o.U, V = o.V, N = [U[1] * V[2] - U[2] * V[1], U[2] * V[0] - U[0] * V[2], U[0] * V[1] - U[1] * V[0]];
  const s = Object.assign({ kind: "plane", N, g: planarGeo(o), res: o.res || RES, ex: o.ex || null }, o); surfaces.push(s); return s;
}
function planarGeo(o) {
  const U = o.U, V = o.V;
  const pts = o.shape || [[0, 0], [o.lu, 0], [o.lu, o.lv], [0, o.lv]];
  const shp = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v))); (o.holes || []).forEach((hp) => shp.holes.push(new THREE.Path(hp.map(([u, v]) => new THREE.Vector2(u, v)))));
  const g = new THREE.ShapeGeometry(shp, 24);
  const pos = g.attributes.position, n = pos.count, P = new Float32Array(n * 3), UV = new Float32Array(n * 2), UV2 = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { const u = pos.getX(i), v = pos.getY(i);
    for (let k = 0; k < 3; k++) P[i * 3 + k] = o.O[k] + U[k] * u + V[k] * v;
    UV[i * 2] = o.uvFn ? o.uvFn(u, v)[0] : u / (o.tu || 1); UV[i * 2 + 1] = o.uvFn ? o.uvFn(u, v)[1] : v / (o.tv || 1);
    UV2[i * 2] = u / o.lu; UV2[i * 2 + 1] = v / o.lv; }
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.BufferAttribute(UV, 2)); g.setAttribute("uv2", new THREE.BufferAttribute(UV2, 2));
  g.deleteAttribute("normal"); g.computeBoundingSphere(); return g;
}
function arc(o) { // halvellips: x = cx + a cosθ, y = cy + b sinθ, längs z
  const SU = 56, n = (SU + 1) * 2, P = new Float32Array(n * 3), UV = new Float32Array(n * 2), UV2 = new Float32Array(n * 2), idx = [];
  const cum = [0]; for (let i = 1; i <= SU; i++) { const t0 = o.th0 + (o.th1 - o.th0) * (i - 1) / SU, t1 = o.th0 + (o.th1 - o.th0) * i / SU;
    cum.push(cum[i - 1] + Math.hypot(o.a * (Math.cos(t1) - Math.cos(t0)), o.b * (Math.sin(t1) - Math.sin(t0)))); }
  const arcLen = cum[SU];
  for (let i = 0; i <= SU; i++) { const th = o.th0 + (o.th1 - o.th0) * i / SU, x = o.cx + o.a * Math.cos(th), y = o.cy + o.b * Math.sin(th);
    for (let j = 0; j < 2; j++) { const z = j ? o.z1 : o.z0, k = i * 2 + j; P[k * 3] = x; P[k * 3 + 1] = y; P[k * 3 + 2] = z; UV[k * 2] = cum[i] / o.tu; UV[k * 2 + 1] = (o.z0 - z) / o.tv; UV2[k * 2] = i / SU; UV2[k * 2 + 1] = j; } }
  for (let i = 0; i < SU; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.BufferAttribute(UV, 2)); g.setAttribute("uv2", new THREE.BufferAttribute(UV2, 2)); g.setIndex(idx); g.computeBoundingSphere();
  const s = Object.assign({ kind: "arc", g, arcLen, res: o.res || RES }, o); surfaces.push(s); return s;
}

async function bakeSurface(s, onRow) {
  let w, h;
  if (s.kind === "plane") { w = Math.max(4, Math.min(1024, Math.ceil(s.lu * s.res))); h = Math.max(4, Math.min(1024, Math.ceil(s.lv * s.res))); }
  else { w = Math.max(4, Math.min(1024, Math.ceil(s.arcLen * s.res))); h = Math.max(4, Math.min(1024, Math.ceil(Math.abs(s.z1 - s.z0) * s.res))); }
  const buf = new Float32Array(w * h * 3);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const fu = (i + .5) / w, fv = (j + .5) / h; let px, py, pz, nx, ny, nz;
      if (s.kind === "plane") { const u = fu * s.lu, v = fv * s.lv; px = s.O[0] + s.U[0] * u + s.V[0] * v; py = s.O[1] + s.U[1] * u + s.V[1] * v; pz = s.O[2] + s.U[2] * u + s.V[2] * v; nx = s.N[0]; ny = s.N[1]; nz = s.N[2]; }
      else { const th = s.th0 + (s.th1 - s.th0) * fu, c = Math.cos(th), sn = Math.sin(th); px = s.cx + s.a * c; py = s.cy + s.b * sn; pz = s.z0 + (s.z1 - s.z0) * fv;
        nx = -s.b * c; ny = -s.a * sn; nz = 0; const l = Math.hypot(nx, ny); nx /= l; ny /= l; }
      const L = shade(px + nx * .01, py + ny * .01, pz + nz * .01, nx, ny, nz, s.ex), k = (j * w + i) * 3;
      buf[k] = L[0]; buf[k + 1] = L[1]; buf[k + 2] = L[2];
    }
    if (j % 6 === 5) await onRow(j / h);
  }
  // mjuka upp (3×3), koda med gamma för att undvika bandning i mörkret
  const c = cnv(w, h), x = c.getContext("2d"), img = x.createImageData(w, h), d = img.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = clamp(i + di, 0, w - 1), jj = clamp(j + dj, 0, h - 1), k = (jj * w + ii) * 3, wt = (di || dj) ? 1 : 4; r += buf[k] * wt; g += buf[k + 1] * wt; b += buf[k + 2] * wt; n += wt; }
    const o = ((h - 1 - j) * w + i) * 4;
    d[o] = Math.pow(clamp(r / n / LMAX, 0, 1), 1 / 2.2) * 255; d[o + 1] = Math.pow(clamp(g / n / LMAX, 0, 1), 1 / 2.2) * 255; d[o + 2] = Math.pow(clamp(b / n / LMAX, 0, 1), 1 / 2.2) * 255; d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}
function surfaceMesh(s, lm) {
  const m = new THREE.MeshBasicMaterial({ map: s.map || null, color: s.color || 0xffffff, lightMap: lm, lightMapIntensity: LMAX, side: THREE.DoubleSide });
  if (s.nor) pbrPatch(m, s);
  const mesh = new THREE.Mesh(s.g, m); scene.add(mesh); s.mesh = mesh; mesh.userData.floor = !!s.floor; if (s.occlude !== false) occluders.push(mesh); return mesh;
}

/* ================= föremål med bakat vertexljus ================= */
let uid = 0;
function aabbOf(obj) { obj.updateWorldMatrix(true, true); const b = new THREE.Box3().setFromObject(obj); const c = b.getCenter(new V3()), s = b.getSize(new V3()); return { c: [c.x, c.y, c.z], h: [s.x / 2, s.y / 2, s.z / 2] }; }
// lägg till ett föremål: bakas senare. shadow: kastar skugga i bakningen
function prop(geo, matOpts, pos, rot, o) {
  o = o || {};
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial(Object.assign({ vertexColors: true }, matOpts)));
  mesh.position.copy(pos); if (rot) mesh.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0, rot[3] || "XYZ");
  if (o.parent) o.parent.add(mesh); else scene.add(mesh);
  const id = o.id || ("p" + (uid++));
  props.push({ mesh, id, self: o.selfShade !== false, cache: !!o.cache, extra: !!o.extra });
  if (o.shadow !== false) { const bb = aabbOf(mesh); OBJ.push({ c: bb.c, h: bb.h, id }); }
  if (o.collide) { const bb = aabbOf(mesh); colliders.push({ x0: bb.c[0] - bb.h[0], x1: bb.c[0] + bb.h[0], z0: bb.c[2] - bb.h[2], z1: bb.c[2] + bb.h[2] }); }
  return mesh;
}
function bakeProp(p) {
  const m = p.mesh; m.updateWorldMatrix(true, false);
  const g = m.geometry, pos = g.attributes.position, nor = g.attributes.normal, n = pos.count, col = new Float32Array(n * 3);
  const nm = new THREE.Matrix3().getNormalMatrix(m.matrixWorld), v = new V3(), nn = new V3(), cache = p.cache ? new Map() : null;
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld); nn.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
    let L;
    if (cache) { const key = Math.round(v.x * 25) + "," + Math.round(v.y * 25) + "," + Math.round(v.z * 25) + "," + Math.round(nn.x * 2) + "," + Math.round(nn.y * 2) + "," + Math.round(nn.z * 2);
      L = cache.get(key); if (!L) { L = shade(v.x + nn.x * .012, v.y + nn.y * .012, v.z + nn.z * .012, nn.x, nn.y, nn.z, p.id); cache.set(key, L); } }
    else L = shade(v.x + nn.x * .012, v.y + nn.y * .012, v.z + nn.z * .012, nn.x, nn.y, nn.z, p.id);
    col[i * 3] = L[0]; col[i * 3 + 1] = L[1]; col[i * 3 + 2] = L[2];
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
}
const colliders = [];
const exits = [];

/* ---------- material för föremål ---------- */
const PC = { steel: 0x2a2c2c, black: 0x111212, frame: 0x0b0b0b, wood: 0xb07a42, rail: 0x6e6a64, sleeper: 0x2e2621, white: 0xe4e1d8, door: 0x3a3f3d, pale: 0x8b8e8a };

/* ---------- fotona i tjocka svarta ramar ---------- */
const arts = [];
// ramlister: svartbetsad ek, ljus ek eller smal svart metall med passepartout (?ram= för att jämföra)
const RAM = {
  svart: { fw: .085, bevel: .014, color: 0x22272e, map: () => MATTEX.morktra && MATTEX.morktra.diff, grain: .9, fillet: 0x6c665e },
  ek: { fw: .085, bevel: .014, color: 0xaeb6c0, map: () => MATTEX.tra && MATTEX.tra.diff, grain: 1.4, fillet: 0x2a2724 },
  metall: { fw: .03, bevel: .006, color: 0x262728, map: () => MATTEX.rost2 && MATTEX.rost2.diff, grain: 3, fillet: 0, mat: .045, matCol: 0x2e2c29 } };
const RAMQ = new URLSearchParams(location.search).get("ram"), RAM_ROOM = { manniskorna: "metall" }; // ram per rum, svartbetsad ek annars
function frameFor(slot, aspect, S) {
  let w, h; if (slot.h) { h = slot.h; w = h * aspect; } else { w = slot.w; h = w / aspect; }
  if (slot.maxW && w > slot.maxW) { w = slot.maxW; h = w / aspect; } // på en skiva: alltid luft runt bilden
  const C = slot.C, U = slot.U, Vv = [0, 1, 0], N = slot.N;
  const g = new THREE.Group(); g.matrixAutoUpdate = false;
  g.matrix.makeBasis(new V3(...U), new V3(...Vv), new V3(...N)).setPosition(new V3(...C)); scene.add(g);
  const RS = RAM[RAMQ || RAM_ROOM[currentKey] || "svart"] || RAM.svart, fd = .075, id = "frame-" + slot.key, mat = RS.mat || 0;
  // passepartout: en ljus kartong mellan list och bild
  if (mat) { const mw = w + mat * 2, mh = h + mat * 2;
    const ms = new THREE.Shape([new THREE.Vector2(-mw / 2, -mh / 2), new THREE.Vector2(mw / 2, -mh / 2), new THREE.Vector2(mw / 2, mh / 2), new THREE.Vector2(-mw / 2, mh / 2)]);
    ms.holes.push(new THREE.Path([new THREE.Vector2(-w / 2, -h / 2), new THREE.Vector2(-w / 2, h / 2), new THREE.Vector2(w / 2, h / 2), new THREE.Vector2(w / 2, -h / 2)]));
    const mg = new THREE.ExtrudeGeometry(ms, { depth: .004, bevelEnabled: true, bevelThickness: .002, bevelSize: .002, bevelSegments: 1 });
    prop(mg, { color: RS.matCol || 0xeeebe3 }, new V3(0, 0, fd - .032), null, { parent: g, shadow: false, id }); }
  const iw = w / 2 + mat, ih = h / 2 + mat, fw = RS.fw;
  // listen: en ram i ett stycke med gerade hörn och fasade kanter, ådringen följer varje sida
  const sh = new THREE.Shape([new THREE.Vector2(-iw - fw, -ih - fw), new THREE.Vector2(iw + fw, -ih - fw), new THREE.Vector2(iw + fw, ih + fw), new THREE.Vector2(-iw - fw, ih + fw)]);
  sh.holes.push(new THREE.Path([new THREE.Vector2(-iw, -ih), new THREE.Vector2(-iw, ih), new THREE.Vector2(iw, ih), new THREE.Vector2(iw, -ih)]));
  const bv = RS.bevel, fg = new THREE.ExtrudeGeometry(sh, { depth: fd - bv * 2, bevelEnabled: true, bevelThickness: bv, bevelSize: bv * .8, bevelSegments: 3, curveSegments: 1 });
  { const pa = fg.attributes.position, uv = fg.attributes.uv, sc = RS.grain;
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), side = Math.abs(x) / (iw + fw) > Math.abs(y) / (ih + fw);
      uv.setXY(i, (side ? y : x) / sc + (side ? 3.1 : 0), (side ? x : y) / sc * .25 + z * 2); } }
  const fm = prop(fg, { color: RS.color, map: RS.map() }, new V3(0, 0, bv), null, { parent: g, shadow: false, id });
  { const bb = aabbOf(fm); OBJ.push({ c: bb.c, h: bb.h, id }); }
  // ett tunt inre steg närmast bilden, i en annan ton
  if (RS.fillet) { const f2 = new THREE.Shape([new THREE.Vector2(-iw - .012, -ih - .012), new THREE.Vector2(iw + .012, -ih - .012), new THREE.Vector2(iw + .012, ih + .012), new THREE.Vector2(-iw - .012, ih + .012)]);
    f2.holes.push(new THREE.Path([new THREE.Vector2(-iw, -ih), new THREE.Vector2(-iw, ih), new THREE.Vector2(iw, ih), new THREE.Vector2(iw, -ih)]));
    prop(new THREE.ExtrudeGeometry(f2, { depth: fd - .028, bevelEnabled: false }), { color: RS.fillet }, new V3(0, 0, .004), null, { parent: g, shadow: false, id }); }
  if (typeof GLASS !== "undefined" && GLASS[currentKey]) {
    // fasad kant i passepartoutens snitt: den ljusa kärnan i en riktig kartong
    if (mat) { const b = .005, cs = new THREE.Shape([new THREE.Vector2(-w / 2 - b, -h / 2 - b), new THREE.Vector2(w / 2 + b, -h / 2 - b), new THREE.Vector2(w / 2 + b, h / 2 + b), new THREE.Vector2(-w / 2 - b, h / 2 + b)]);
      cs.holes.push(new THREE.Path([new THREE.Vector2(-w / 2, -h / 2), new THREE.Vector2(-w / 2, h / 2), new THREE.Vector2(w / 2, h / 2), new THREE.Vector2(w / 2, -h / 2)]));
      prop(new THREE.ExtrudeGeometry(cs, { depth: .003, bevelEnabled: false }), { color: 0xf3efe6 }, new V3(0, 0, fd - .0305), null, { parent: g, shadow: false, id, extra: true }); }
    // tavlans skugga mot väggen: spotlighten sitter snett ovanför, så skuggan faller lite nedåt
    const ow = w + 2 * (mat + fw), oh = h + 2 * (mat + fw), pad = .09, sc = cnv(128, 128), sx = sc.getContext("2d");
    sx.filter = "blur(10px)"; sx.fillStyle = "#000"; sx.fillRect(128 * pad / (ow + 2 * pad) + 4, 128 * pad / (oh + 2 * pad) + 4, 128 * ow / (ow + 2 * pad) - 8, 128 * oh / (oh + 2 * pad) - 8);
    const st = T(sc, false, false), sm = new THREE.Mesh(new THREE.PlaneGeometry(ow + 2 * pad, oh + 2 * pad), new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: st, transparent: true, opacity: .5, depthWrite: false }));
    sm.position.set(0, -.04, .002); sm.renderOrder = 1; g.add(sm);
  }
  const depth = fd - .03, O = [C[0] - U[0] * w / 2 + N[0] * depth, C[1] - h / 2, C[2] - U[2] * w / 2 + N[2] * depth];
  const s = planar({ name: "foto " + slot.key, O, U, V: Vv, lu: w, lv: h, tu: w, tv: h, res: isTouch ? 30 : 48, color: PHOTOS[slot.key].src ? 0xffffff : 0x1a1b1a });
  s.slot = slot; s.isPhoto = true;
  const label = signCanvas([
    { text: PHOTOS[slot.key].title.toUpperCase(), font: '800 68px "Big Shoulders Display", "Arial Narrow", sans-serif', y: 86, x: 34, track: 4 },
    { text: "EN BÄTTRE BILD · RUM " + S.num + " " + S.name.toUpperCase(), font: '500 24px "IBM Plex Mono", monospace', y: 160, x: 36, track: 2, alpha: .7 }
  ], { w: 640, h: 220, bg: "#d9d5cb", fg: "#141514", align: "left" });
  const lp = new THREE.Mesh(new THREE.PlaneGeometry(.32, .11), new THREE.MeshBasicMaterial({ map: T(label, true, false) }));
  const lpos = slot.labelBelow ? new V3(...C).add(new V3(0, -h / 2 - mat - fw - .16, 0)).add(new V3(...N).multiplyScalar(.012)) // under bilden, på skivan
    : new V3(...C).add(new V3(...U).multiplyScalar(w / 2 + mat + fw + .25)).add(new V3(0, -h / 2 - mat + .06, 0)).add(new V3(...N).multiplyScalar(.012));
  lp.position.copy(lpos); lp.lookAt(lpos.clone().add(new V3(...N))); scene.add(lp);
  const art = { slot, s, w, h, label: lp, labelPos: lpos }; arts.push(art); return art;
}

/* ---------- skyltar och graffiti (ljus sätts från bakningen) ---------- */
const decals = [];
function decal(canvas, w, h, pos, normal, o) {
  o = o || {};
  const m = new THREE.MeshBasicMaterial({ map: T(canvas, true, false), transparent: !!o.transparent, depthWrite: !o.transparent, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); mesh.position.copy(pos); mesh.lookAt(pos.clone().add(normal)); scene.add(mesh);
  decals.push({ mesh, pos: pos.clone(), n: normal.clone(), boost: o.boost || 1, minL: o.minL || 0 }); return mesh;
}
/* ---------- vägvisning: slitna stenciltexter målade på golvet ---------- */
const HP = Math.PI / 2;
const FLOOR_INK = { foajen: "#24221f", naturen: "#2a2926" }; // mörk färg på ljusa golv, ljus på mörka
// bara vid utgångarna: först när man har gått runt i rummet visar golvet vägen vidare
const FLOOR_MARKS = {
  foajen: [{ x: 0, z: -3.3, yaw: 0, text: "VERNISSAGEN", sub: "FYRA RUM  ·  TA TUREN", arrow: 0 }],
  staden: [{ x: 0, z: -18.9, yaw: 0, text: "02 NATUREN", sub: "GÅ VIDARE", arrow: 0, w: 1.2 }],
  naturen: [{ x: 3.4, z: -17.5, yaw: 0, text: "03 BERÄTTELSER", sub: "GÅ VIDARE", arrow: -HP, w: 1.2 }],
  berattelser: [{ x: 4.2, z: -19, yaw: 0, text: "04 MÄNNISKORNA", sub: "GÅ VIDARE", arrow: -HP, w: 1.2 }],
  manniskorna: [{ x: 0, z: -1.7, yaw: Math.PI, text: "00 FOAJÉN", sub: "TILLBAKA TILL ENTRÉN", arrow: 0 }]
};
// arrow: vinkel på pilen i radianer (0 = rakt fram, -π/2 = höger); yaw: åt vilket håll texten läses
function floorMark(o) {
  const W = 1024, H = 640, c = cnv(W, H), x = c.getContext("2d"), r = rng(Math.round(o.x * 31 + o.z * 17) + 7);
  x.fillStyle = o.ink || FLOOR_INK[currentKey] || "#ece6d6"; x.textAlign = "center"; x.textBaseline = "alphabetic";
  // pilen: grov stencilpil
  x.save(); x.translate(W / 2, 150); x.rotate(-(o.arrow || 0));
  x.beginPath(); x.moveTo(0, -120); x.lineTo(95, -10); x.lineTo(34, -10); x.lineTo(34, 115); x.lineTo(-34, 115); x.lineTo(-34, -10); x.lineTo(-95, -10); x.closePath(); x.fill(); x.restore();
  let fs = 190; const setF = () => { x.font = `800 ${fs}px "Big Shoulders Display", "Arial Narrow", sans-serif`; if (x.letterSpacing !== undefined) x.letterSpacing = Math.round(fs * .06) + "px"; }; setF();
  while (x.measureText(o.text).width > W * .94 && fs > 80) { fs -= 6; setF(); }
  x.fillText(o.text, W / 2, 452);
  x.font = '700 64px "IBM Plex Mono", monospace'; if (x.letterSpacing !== undefined) x.letterSpacing = "10px"; x.fillText(o.sub, W / 2, 560);
  // stencilbryggor genom bokstäverna och slitage: fläckar och repor där färgen har gått bort
  x.globalCompositeOperation = "destination-out";
  for (const yb of [395, 520]) { x.fillStyle = "rgba(0,0,0,.9)"; for (let i = 0; i < 6; i++) x.fillRect(80 + r() * 860, yb + r() * 12, 4, 30); }
  for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(0,0,0,${.25 + r() * .7})`; const sz = r() < .94 ? 1 + r() * 3.5 : 5 + r() * 10; x.beginPath(); x.arc(r() * W, r() * H, sz, 0, Math.PI * 2); x.fill(); }
  x.strokeStyle = "rgba(0,0,0,.8)"; for (let i = 0; i < 18; i++) { x.lineWidth = 1 + r() * 3; x.beginPath(); const sx = r() * W, sy = r() * H; x.moveTo(sx, sy); x.lineTo(sx + (r() - .5) * 400, sy + (r() - .5) * 60); x.stroke(); }
  const gr = x.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 620); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.3)"); x.fillStyle = gr; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = "source-over";
  const w = o.w || 1.5, tex = T(c, true, false); tex.anisotropy = maxAniso;
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: o.ink || FLOOR_INK[currentKey] ? .72 : .66, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w * H / W), m); mesh.rotation.order = "YXZ"; mesh.rotation.set(-HP, o.yaw || 0, 0);
  mesh.position.set(o.x, .008, o.z); scene.add(mesh);
  const dark = !!(o.ink || FLOOR_INK[currentKey]); decals.push({ mesh, pos: new V3(o.x, .05, o.z), n: new V3(0, 1, 0), boost: dark ? .55 : currentKey === "berattelser" ? 2.2 : 1.1, minL: dark ? .05 : .1 });
}
function lightDecals() {
  for (const d of decals) { const L = shade(d.pos.x + d.n.x * .02, d.pos.y, d.pos.z + d.n.z * .02, d.n.x, d.n.y, d.n.z, null); d.mesh.material.color.setRGB(Math.max(d.minL, L[0] * d.boost), Math.max(d.minL * .95, L[1] * d.boost), Math.max(d.minL * .9, L[2] * d.boost)); }
  for (const a of arts) { const p = a.labelPos, n = a.s.N; const L = shade(p.x + n[0] * .02, p.y, p.z + n[2] * .02, n[0], n[1], n[2], null); a.label.material.color.setRGB(L[0], L[1], L[2]); }
}

const tubeMats = [];
let flickerDark = null;

/* ================= gemensamt för alla rum ================= */
// armaturer för spotlights: huvud, lins och stång upp i taket
function fixtures(S) {
  LIGHTS.filter((L) => L.type === "spot" && L.fx !== "none").forEach((L) => {
    const p = new V3(...L.p), dir = new V3(...L.d);
    const head = prop(new THREE.CylinderGeometry(.05, .07, .2, 16, 2), { color: PC.black }, p, null, { shadow: false });
    head.quaternion.setFromUnitVectors(new V3(0, -1, 0), dir);
    if (L.fx !== "head") { const top = S.ceil(p.x, p.z); if (top - p.y > .12) prop(new THREE.CylinderGeometry(.007, .007, top - p.y - .08, 4), { color: PC.black }, new V3(p.x, (top + p.y + .08) / 2, p.z), null, { shadow: false }); }
    const lens = new THREE.Mesh(new THREE.CircleGeometry(.05, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.6, 4) }));
    const lp = p.clone().add(dir.clone().multiplyScalar(.101)); lens.position.copy(lp); lens.lookAt(lp.clone().add(dir)); scene.add(lens);
  });
}
let glowTexC = null, leafTexC = null;
function glow(x, y, z, s, color, op) {
  if (!glowTexC) glowTexC = T(radial([[0, "rgba(255,230,190,1)"], [.25, "rgba(255,210,160,.35)"], [1, "rgba(255,200,150,0)"]], 128), false, false);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexC, color, transparent: true, opacity: op || .6, blending: THREE.AdditiveBlending, depthWrite: false }));
  sp.position.set(x, y, z); sp.scale.set(s, s, 1); scene.add(sp); return sp;
}
function rodProp(a, b, r, color, id, matOpts) {
  const A = new V3(...a), B = new V3(...b), d = B.clone().sub(A), len = d.length();
  const m = prop(new THREE.CylinderGeometry(r, r, len, 8, 2), matOpts || { color }, A.clone().add(B).multiplyScalar(.5), null, { id, shadow: false });
  m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); return m;
}
// fristående skivor för tavlor: en skiva på en låg sockel, med en tunn kant i svart stål
function buildStands(room, col, edge) {
  for (const s of STANDS[room]) {
    const along = s.ax === "z", id = "stand" + s.x + s.z, sx = along ? s.w : s.t, sz = along ? s.t : s.w;
    prop(room === "staden" ? worldUV(new THREE.BoxGeometry(sx, s.h, sz, along ? 8 : 1, 6, along ? 1 : 8), 2.5) : new THREE.BoxGeometry(sx, s.h, sz, along ? 8 : 1, 6, along ? 1 : 8), room === "staden" ? { color: 0xb8b8b2, map: MATTEX.betong.diff } : { color: col }, new V3(s.x, s.h / 2 + .08, s.z), null, { id, collide: true });
    prop(new THREE.BoxGeometry(sx * .96, .08, sz * .7), { color: 0x1a1b1b }, new V3(s.x, .04, s.z), null, { id, shadow: false });
    if (edge) prop(new THREE.BoxGeometry(along ? sx + .04 : sx + .03, .05, along ? sz + .03 : sz + .04), { color: edge }, new V3(s.x, s.h + .1, s.z), null, { id, shadow: false });
  }
}
// industrilampa: stor kupa i mörkt stål med vit emalj inuti, sladd hela vägen upp
function industrialLamp(lx, ly, lz, ceilY, sc) {
  sc = sc || 1; const steelC = 0x1f2221, R = .34 * sc;
  prop(new THREE.CylinderGeometry(.06, .06, .03, 16), { color: steelC }, new V3(lx, ceilY - .015, lz), null, { shadow: false });
  prop(new THREE.CylinderGeometry(.007, .007, ceilY - ly - .42 * sc, 5), { color: 0x0e0e0e }, new V3(lx, (ceilY + ly + .42 * sc) / 2, lz), null, { shadow: false });
  prop(new THREE.CylinderGeometry(.035 * sc, .045 * sc, .14 * sc, 14), { color: steelC }, new V3(lx, ly + .37 * sc, lz), null, { shadow: false });
  prop(new THREE.CylinderGeometry(.06 * sc, .06 * sc, .06 * sc, 16), { color: 0x6b6a64 }, new V3(lx, ly + .29 * sc, lz), null, { shadow: false });
  const dome = new THREE.SphereGeometry(R, 32, 12, 0, Math.PI * 2, 0, Math.PI * .46); dome.scale(1, .78, 1);
  prop(dome, { color: steelC, side: THREE.DoubleSide }, new V3(lx, ly - .02, lz), null, { shadow: false });
  const inner = new THREE.Mesh(new THREE.SphereGeometry(R * .956, 32, 12, 0, Math.PI * 2, 0, Math.PI * .46), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.2, .85), side: THREE.BackSide }));
  inner.scale.set(1, .78, 1); inner.position.set(lx, ly - .02, lz); scene.add(inner);
  prop(new THREE.TorusGeometry(R * .985, .008, 6, 40), { color: 0x2a2d2c }, new V3(lx, ly - .02 + R * .78 * Math.cos(Math.PI * .46), lz), [Math.PI / 2, 0, 0], { shadow: false });
  const b = new THREE.Mesh(new THREE.SphereGeometry(.075 * sc, 18, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.3, 1.5) })); b.scale.set(.85, 1, .85); b.position.set(lx, ly + .15 * sc, lz); scene.add(b);
}
let plantShadowTex = null;
function plant(x, z, h, seed) {
  const k = h >= 2.05 ? "vaxt1" : "vaxt2"; // den stora (100 000 blad-trianglar) bara på ett ställe per rum
  if (MODELS[k]) { // krukväxt från Poly Haven: ljuset mäts nere vid krukan och uppe i bladen
    const hh = k === "vaxt1" ? 1.95 : 1.32, sh = (y) => shade(x, y, z, 0, 1, 0, null), lo = sh(.3), hi = sh(hh);
    placeModel(k, [x, 0, z], seed * 1.7, { h: hh, flat: { y0: .1, y1: hh, lo, hi }, flatOnly: /leaves|stem/ }); // ingen lådskugga i bakningen: bara den runda skuggan nedan
    { // mjuk kontaktskugga under krukan
      // mörk precis under krukan, sedan en mjuk övergång ut mot golvet
      if (!plantShadowTex) plantShadowTex = T(radial(Array.from({ length: 17 }, (_, i) => { const t = i / 16, a = t < .3 ? .88 - t * .4 : .76 * Math.exp(-Math.pow((t - .3) / .3, 2) * 2.2); return [t, "rgba(0,0,0," + (t >= 1 ? 0 : a).toFixed(3) + ")"]; }), 256), false, false);
      const sm = new THREE.Mesh(new THREE.PlaneGeometry(k === "vaxt1" ? 2.0 : 1.75, k === "vaxt1" ? 2.0 : 1.75), new THREE.MeshBasicMaterial({ map: plantShadowTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
      sm.rotation.x = -Math.PI / 2; sm.position.set(x, .004, z); scene.add(sm); }
    colliders.push({ x0: x - .35, x1: x + .35, z0: z - .35, z1: z + .35 }); return; }
  if (!leafTexC) leafTexC = T(leafCanvas(), true, false);
  prop(new THREE.CylinderGeometry(.3, .24, .55, 28, 2), { color: 0x8f8b84 }, new V3(x, .275, z), null, { collide: true });
  const pr = rng(seed);
  prop(new THREE.CylinderGeometry(.016, .02, h - .5, 6, 3), { color: 0x4a3a28 }, new V3(x, .5 + (h - .5) / 2, z), null, { shadow: false });
  for (let k = 0; k < 42; k++) prop(new THREE.PlaneGeometry(.22, .44, 1, 2).translate(0, .22, 0), { color: 0xffffff, map: leafTexC, alphaTest: .5, side: THREE.DoubleSide },
    new V3(x + (pr() - .5) * .1, .7 + pr() * (h - .65), z + (pr() - .5) * .1), [-.5 - pr() * .9, pr() * 6.283, 0, "YXZ"], { shadow: false });
}
const bottleProfiles = [
  [[0, 0], [.04, 0], [.04, .19], [.018, .23], [.013, .25], [.013, .31], [0, .31]],
  [[0, 0], [.035, 0], [.035, .22], [.012, .26], [.012, .33], [0, .33]],
  [[0, 0], [.045, 0], [.045, .14], [.03, .17], [.015, .19], [.015, .24], [0, .24]],
  [[0, 0], [.032, 0], [.034, .2], [.01, .25], [.01, .29], [0, .29]]
];
function bottles(x, y, z0, z1, seed) {
  const br = rng(seed), geos = bottleProfiles.map((pts) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 16));
  const cols = [[.9, .45, .12], [.55, .3, .1], [.2, .4, .2], [.75, .85, .8], [.6, .12, .1], [.9, .6, .2], [.15, .32, .32]];
  for (let z = z0; z < z1; z += .13 + br() * .07) { if (br() < .12) continue;
    const c = cols[(br() * cols.length) | 0], m = new THREE.Mesh(geos[(br() * geos.length) | 0], new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0] * 1.3, c[1] * 1.3, c[2] * 1.3), transparent: true, opacity: .88 }));
    m.position.set(x + (br() - .5) * .06, y, z); m.scale.setScalar(.9 + br() * .25); scene.add(m); }
}
// fristående bokstäver i mörkt stål, bakbelysta så att ljuset faller som en gloria på väggen
// skylt: ren vit text i tunn Jost, stor rad och en mindre rad under
function haloSign(text, sub, C, N, width) {
  const W = 4096, Hh = 1024, mask = cnv(W, Hh), m = mask.getContext("2d");
  m.fillStyle = "#fff"; m.textAlign = "center"; m.textBaseline = "alphabetic";
  let fs = 420; const setF = () => { m.font = `300 ${fs}px Jost, "Futura", "Century Gothic", sans-serif`; if (m.letterSpacing !== undefined) m.letterSpacing = Math.round(fs * .2) + "px"; }; setF();
  while (m.measureText(text).width > W * .9 && fs > 160) { fs -= 10; setF(); }
  const ls = Math.round(fs * .2), mw = m.measureText(text).width; m.fillText(text, W / 2 + ls / 2, Hh * .58);
  // undertexten: små versaler, högerställd under huvudtextens högra kant
  const right = W / 2 + mw / 2 - ls / 2, sls = 34;
  m.font = '400 78px Jost, "Futura", "Century Gothic", sans-serif'; if (m.letterSpacing !== undefined) m.letterSpacing = sls + "px";
  m.textAlign = "right"; m.fillText(sub.toUpperCase(), right + sls, Hh * .58 + 150);
  const tex = T(mask, true, false); tex.anisotropy = maxAniso;
  const Nv = new V3(...N), pos = new V3(...C), Hs = width / 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(.95, .94, .91), transparent: true, alphaTest: .04, depthWrite: false });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(width, Hs), mat); p.position.copy(pos).addScaledVector(Nv, .02); p.lookAt(p.position.clone().add(Nv)); scene.add(p);
}
function cageLamp(x, y, z, ceilY) {
  const cm = new THREE.MeshBasicMaterial({ color: 0x0c0c0c });
  const rod = (a, b, r) => { const A = new V3(...a), B = new V3(...b), d = B.clone().sub(A), mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), cm); mesh.position.copy(A).add(B).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); scene.add(mesh); };
  rod([x, y + .2, z], [x, ceilY, z], .005);
  for (const [yy, rr] of [[y + .15, .07], [y + .07, .1], [y - .03, .1], [y - .11, .06]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(rr, .004, 6, 24), cm); t.rotation.x = Math.PI / 2; t.position.set(x, yy, z); scene.add(t); }
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    rod([x + c * .07, y + .15, z + s * .07], [x + c * .1, y + .07, z + s * .1], .003); rod([x + c * .1, y + .07, z + s * .1], [x + c * .1, y - .03, z + s * .1], .003); rod([x + c * .1, y - .03, z + s * .1], [x + c * .06, y - .11, z + s * .06], .003); }
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.055, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.9, .8) })); bulb.scale.set(1, 1.35, 1); bulb.position.set(x, y + .02, z); scene.add(bulb);
  glow(x, y + .02, z, .8, 0xffa850, .5);
}
function stool(x, z, seatCol) {
  const seatY = .76, id = "stool" + z;
  prop(new THREE.CylinderGeometry(.2, .19, .07, 28, 1), { color: seatCol || 0x6a3b1f }, new V3(x, seatY, z), null, { id });
  for (let k = 0; k < 4; k++) { const ang = k * Math.PI / 2 + Math.PI / 4; rodProp([x + Math.cos(ang) * .13, seatY - .05, z + Math.sin(ang) * .13], [x + Math.cos(ang) * .23, 0, z + Math.sin(ang) * .23], .013, 0x1b1c1c, id); }
  const ring = prop(new THREE.TorusGeometry(.19, .009, 8, 40), { color: 0xb48a4a }, new V3(x, .3, z), [Math.PI / 2, 0, 0], { id, shadow: false });
  colliders.push({ x0: x - .2, x1: x + .2, z0: z - .2, z1: z + .2 });
}
