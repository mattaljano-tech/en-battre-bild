// Tavelväggen (index.html): välj foton, se dem som inramade tavlor i 3D och, i mobilen, på den egna väggen genom kameran.
// En tavla visas med den färdiga modellen i ar/ (tools/ar-modeller.py). Flera tavlor sätts ihop till en modell här i webbläsaren.
// Visningen och kameraläget sköts av Googles model-viewer, som hämtas först när väggen öppnas.
"use strict";
(function () {
  const $ = (id) => document.getElementById(id);
  const dlg = $("ar"); if (!dlg || typeof PHOTOS !== "object") return;
  const SIZES = [40, 60, 90];   // fotots långsida i cm. Ska stämma med STORLEKAR i tools/ar-modeller.py. Priser kan läggas till här senare.
  const MAX = 6;                // högst så här många tavlor på väggen
  const GAP = .08, RAM = .02, DJUP = .022; // avstånd mellan tavlorna, ramens bredd och djup (meter)
  const MV = "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js";
  const FM = typeof FOTOMATT === "object" ? FOTOMATT : {};
  const all = Object.keys(PHOTOS).map((key) => Object.assign({ key }, PHOTOS[key])).filter((p) => p.src);
  const byKey = (k) => all.find((p) => p.key === k);
  const stem = (src) => src.replace(/^img\/([^/]+)\.\w+$/, "$1");
  const small = (src) => src.replace(/^img\/([^/]+)\.\w+$/, "img/640/$1.webp");

  let wall = [], cm = 60, mv = null, mvReady = null, turn = 0, blobUrl = null, base = null, xrOK = false;
  if (window.vaggAR) window.vaggAR.supported().then((ok) => { xrOK = !!ok; if (ok && dlg.open && wall.length) { $("arGo").hidden = false; $("arNote").hidden = true; } }); // Android: eget kameraläge (js/vagg-ar.js)
  try { wall = JSON.parse(localStorage.getItem("vagg") || "[]").filter(byKey).slice(0, MAX); } catch (e) { wall = []; }
  const save = () => { try { localStorage.setItem("vagg", JSON.stringify(wall)); } catch (e) { /* privat läge: väggen glöms när sidan stängs */ } };

  // måtten på en tavla i meter: foto, passepartout och ram
  function dims(p) {
    const a = FM[p.key] || .75, L = cm / 100, w = a >= 1 ? L : L * a, h = a >= 1 ? L / a : L;
    const pp = Math.min(.08, Math.max(.04, .12 * Math.min(w, h))), W = w + 2 * pp, H = h + 2 * pp;
    return { w, h, W, H, OW: W + 2 * RAM, OH: H + 2 * RAM };
  }
  // tavlorna i rad: en rad upp till fyra, annars två rader. Allt centreras kring mitten.
  function layout() {
    const items = wall.map(byKey).map((p) => ({ p, d: dims(p) })), n = items.length;
    const rows = n <= 4 ? [items] : [items.slice(0, Math.ceil(n / 2)), items.slice(Math.ceil(n / 2))];
    const rw = rows.map((r) => r.reduce((s, it) => s + it.d.OW, 0) + GAP * (r.length - 1)), rh = rows.map((r) => Math.max(...r.map((it) => it.d.OH)));
    const totW = Math.max(...rw), totH = rh.reduce((s, x) => s + x, 0) + GAP * (rows.length - 1);
    let y = totH / 2;
    rows.forEach((r, i) => { let x = -rw[i] / 2; for (const it of r) { it.x = x + it.d.OW / 2; it.y = y - rh[i] / 2; x += it.d.OW + GAP; } y -= rh[i] + GAP; });
    return { items, totW, totH };
  }

  // modellen: en färdig fil för en tavla, annars en hopsatt glTF med alla tavlor
  async function model() {
    if (wall.length === 1) return "ar/" + stem(byKey(wall[0]).src) + "-" + cm + ".gltf";
    if (!base) { // geometrin (enhetskub och enhetsruta) lånas från en färdig tavla
      const [g, bin] = await Promise.all([fetch("ar/" + stem(byKey(wall[0]).src) + "-60.gltf").then((r) => { if (!r.ok) throw new Error("ar"); return r.json(); }), fetch("ar/enhet.bin").then((r) => { if (!r.ok) throw new Error("bin"); return r.arrayBuffer(); })]);
      let s = ""; for (const b of new Uint8Array(bin)) s += String.fromCharCode(b);
      base = { bufferViews: g.bufferViews, accessors: g.accessors, samplers: g.samplers, buffers: [{ uri: "data:application/octet-stream;base64," + btoa(s), byteLength: bin.byteLength }] };
    }
    const { items } = layout(), nodes = [{ name: "vagg", children: [] }], quad = { POSITION: 3, NORMAL: 4, TEXCOORD_0: 5 };
    const meshes = [{ primitives: [{ attributes: quad, indices: 6, material: 0 }] }, { primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 1 }] }];
    const materials = [{ name: "passepartout", pbrMetallicRoughness: { baseColorFactor: [.93, .92, .89, 1], metallicFactor: 0, roughnessFactor: 1 } }, { name: "ram", pbrMetallicRoughness: { baseColorFactor: [.03, .03, .03, 1], metallicFactor: 0, roughnessFactor: .55 } }];
    const textures = [], images = [];
    items.forEach((it, k) => { const d = it.d, i = nodes.length, n = (mesh, scale, translation) => ({ mesh, scale, translation });
      nodes[0].children.push(i);
      nodes.push({ name: it.p.key, translation: [it.x, it.y, 0], children: [1, 2, 3, 4, 5, 6, 7].map((j) => i + j) },
        n(2 + k, [d.w, d.h, 1], [0, 0, .0155]), n(0, [d.W, d.H, 1], [0, 0, .014]),
        n(1, [d.OW, RAM, DJUP], [0, (d.H + RAM) / 2, DJUP / 2]), n(1, [d.OW, RAM, DJUP], [0, -(d.H + RAM) / 2, DJUP / 2]),
        n(1, [RAM, d.H, DJUP], [-(d.W + RAM) / 2, 0, DJUP / 2]), n(1, [RAM, d.H, DJUP], [(d.W + RAM) / 2, 0, DJUP / 2]), n(1, [d.OW, d.OH, .004], [0, 0, .002]));
      meshes.push({ primitives: [{ attributes: quad, indices: 6, material: 2 + k }] });
      materials.push({ name: "foto", pbrMetallicRoughness: { baseColorTexture: { index: k }, metallicFactor: 0, roughnessFactor: 1 } });
      textures.push({ source: k, sampler: 0 }); images.push({ uri: new URL(it.p.src, location.href).href }); });
    const g = Object.assign({ asset: { version: "2.0", generator: "En bättre bild, tavelvägg" }, scene: 0, scenes: [{ nodes: [0] }], nodes, meshes, materials, textures, images }, base);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    return (blobUrl = URL.createObjectURL(new Blob([JSON.stringify(g)], { type: "model/gltf+json" })));
  }

  const loadMV = () => mvReady || (mvReady = new Promise((ok, fail) => { const sc = document.createElement("script"); sc.type = "module"; sc.src = MV; sc.onload = ok; sc.onerror = fail; document.head.append(sc); })
    .then(() => customElements.whenDefined("model-viewer")).catch((e) => { mvReady = null; throw e; }));

  /* ================= det som syns ================= */
  const cmText = (m) => Math.round(m * 100);
  function render() {
    const n = wall.length, wait = $("arWait"), my = ++turn;
    $("arGo").hidden = true; $("arNote").hidden = true;
    $("arSizes").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.cm === cm)));
    // tavlorna på väggen, med kryss för att ta bort
    const chips = $("arChips"); chips.textContent = "";
    wall.map(byKey).forEach((p) => { const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.setAttribute("aria-label", "Ta bort " + p.title + " från väggen");
      const im = document.createElement("img"); im.alt = ""; im.src = small(p.src); im.onerror = () => { im.onerror = null; im.src = p.src; }; const x = document.createElement("span"); x.textContent = "×"; b.append(im, x);
      b.addEventListener("click", () => { wall = wall.filter((k) => k !== p.key); save(); render(); }); chips.append(b); });
    $("arAdd").textContent = n ? "Välj bilder" : "Välj bilder till väggen";
    if (!n) { $("arT").textContent = "Din vägg"; $("arE").textContent = "Välj upp till " + MAX + " bilder och se hur de blir som tavlor."; if (mv) mv.hidden = true; wait.hidden = false; wait.textContent = "Väggen är tom."; return; }
    const { items, totW, totH } = layout(), d = items[0].d;
    $("arT").textContent = n === 1 ? items[0].p.title : "Din vägg";
    $("arE").textContent = n === 1 ? "Foto " + cmText(d.w) + " × " + cmText(d.h) + " cm. Med passepartout och ram blir tavlan ungefär " + cmText(d.OW) + " × " + cmText(d.OH) + " cm."
      : n + " tavlor med " + cm + " cm på fotots långsida. Tillsammans tar de ungefär " + cmText(totW) + " × " + cmText(totH) + " cm av väggen.";
    wait.hidden = false; wait.textContent = "Hämtar tavlorna …"; if (xrOK) $("arGo").hidden = false;
    loadMV().then(() => model()).then((url) => {
      if (my !== turn) return;
      if (!mv) { mv = document.createElement("model-viewer");
        for (const [k, v] of Object.entries({ ar: "", "ar-modes": "webxr scene-viewer quick-look", "ar-placement": "wall", "ar-scale": "fixed", "camera-controls": "", "interaction-prompt": "none", "shadow-intensity": ".6", "camera-orbit": "20deg 84deg auto", "touch-action": "none", alt: "Fotona som inramade tavlor" })) mv.setAttribute(k, v);
        mv.addEventListener("load", () => { $("arWait").hidden = true; $("arGo").hidden = !(xrOK || mv.canActivateAR); $("arNote").hidden = xrOK || mv.canActivateAR; });
        mv.addEventListener("error", () => { $("arWait").hidden = false; $("arWait").textContent = "Tavlorna gick inte att visa."; });
        $("arStage").append(mv); }
      mv.hidden = false; mv.src = url;
    }).catch(() => { if (my === turn) wait.textContent = "Det gick inte att hämta väggvisningen. Kontrollera uppkopplingen och försök igen."; });
    counter();
  }
  SIZES.forEach((s) => { const b = document.createElement("button"); b.type = "button"; b.dataset.cm = s; b.textContent = s + " cm"; b.addEventListener("click", () => { cm = s; render(); }); $("arSizes").append(b); });

  // välj bilder: alla foton, tryck för att lägga till eller ta bort
  const picker = $("arPicker"); let built = false;
  function pick() {
    if (!built) { built = true; const grid = $("arGrid");
      all.forEach((p) => { const b = document.createElement("button"); b.type = "button"; b.dataset.key = p.key;
        const im = document.createElement("img"); im.alt = p.title; im.loading = "lazy"; im.src = small(p.src); im.onerror = () => { im.onerror = null; im.src = p.src; }; b.append(im);
        b.addEventListener("click", () => { if (wall.includes(p.key)) wall = wall.filter((k) => k !== p.key); else if (wall.length < MAX) wall.push(p.key); else { $("arPickT").textContent = "Väggen är full. Ta bort en bild för att välja en ny."; return; } save(); marks(); }); grid.append(b); }); }
    marks(); picker.hidden = false; $("arDone").focus();
  }
  function marks() { $("arPickT").textContent = wall.length + " av " + MAX + " valda"; $("arGrid").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(wall.includes(b.dataset.key)))); }
  $("arAdd").addEventListener("click", pick);
  $("arDone").addEventListener("click", () => { picker.hidden = true; render(); });

  function show() { picker.hidden = true; if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); } render(); if (!wall.length) pick(); }
  $("arGo").addEventListener("click", () => {
    const other = () => { if (mv && mv.canActivateAR) mv.activateAR(); };
    if (!(xrOK && wall.length)) return other();
    // rutan måste stängas medan kameran är igång: en öppen ruta spärrar allt utanför sig, också knapparna ovanpå kamerabilden
    dlg.close();
    window.vaggAR.start(layout().items.map((it) => ({ src: it.p.src, x: it.x, y: it.y, d: it.d })), show).catch(() => { show(); other(); });
  });
  $("arClose").addEventListener("click", () => dlg.close());
  // knappen på sidan visar hur många bilder som ligger på väggen
  function counter() { const b = $("wallOpen"); if (b) b.textContent = wall.length ? "Din tavelvägg (" + wall.length + ")" : "Bygg din tavelvägg"; }
  if ($("wallOpen")) $("wallOpen").addEventListener("click", show);
  dlg.addEventListener("close", counter); counter();

  window.vagg = {
    // från bildvisningen: lägg bilden på väggen (om den inte redan hänger där) och visa väggen
    visa(p) { if (p && byKey(p.key) && !wall.includes(p.key)) { if (wall.length >= MAX) wall.pop(); wall.push(p.key); save(); } show(); },
  };
})();
