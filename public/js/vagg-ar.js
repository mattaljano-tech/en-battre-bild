// Tavelväggen i kameran på Android (WebXR). Används av js/vagg.js när telefonen klarar det; iPhone använder model-viewer.
//
// Telefonens egen väggsökning fungerar dåligt på släta väggar och i svagt ljus. Därför hänger tavlorna här alltid lodrätt
// (telefonen vet vad som är upp och ner), och bara två saker behöver bestämmas: avståndet till väggen och hur väggen är vriden.
// Hittar telefonen väggen används den. Annars ställs tavlorna rakt framför kameran, och besökaren hänger dem med ett tryck
// och finjusterar med knapparna. Storleken är alltid verklig, för telefonen mäter rummet i meter.
"use strict";
(function () {
  const $ = (id) => document.getElementById(id);
  const ui = $("xrUI"); if (!ui) return;
  const RAM = .02, DJUP = .022;
  let okPromise = null;
  const supported = () => okPromise || (okPromise = (navigator.xr && navigator.xr.isSessionSupported ? navigator.xr.isSessionSupported("immersive-ar").catch(() => false) : Promise.resolve(false)));

  // enhetskub (24 hörn) och enhetsruta (4 hörn med uv): [x, y, z, nx, ny, nz, u, v]
  function geometry() {
    const v = [], idx = [];
    for (let ax = 0; ax < 3; ax++) for (const s of [1, -1]) { const n = [0, 0, 0]; n[ax] = s; const u = (ax + 1) % 3, w = (ax + 2) % 3, st = v.length / 8;
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = [0, 0, 0]; p[ax] = .5 * s; p[u] = .5 * a; p[w] = .5 * b; v.push(p[0], p[1], p[2], n[0], n[1], n[2], 0, 0); }
      if (s > 0) idx.push(st, st + 1, st + 2, st, st + 2, st + 3); else idx.push(st, st + 2, st + 1, st, st + 3, st + 2); }
    const q = v.length / 8;
    v.push(-.5, -.5, 0, 0, 0, 1, 0, 1, .5, -.5, 0, 0, 0, 1, 1, 1, .5, .5, 0, 0, 0, 1, 1, 0, -.5, .5, 0, 0, 0, 1, 0, 0);
    idx.push(q, q + 1, q + 2, q, q + 2, q + 3);
    return { v: new Float32Array(v), idx: new Uint16Array(idx) }; // kuben: index 0–35, rutan: index 36–41
  }
  const mul = (a, b) => { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

  let session = null;
  // items: [{ src, x, y, d: { w, h, W, H, OW, OH } }] i meter, från layout() i vagg.js
  // onEnd anropas när kameraläget stängs
  async function start(items, onEnd) {
    if (session) return;
    const canvas = document.createElement("canvas"), gl = canvas.getContext("webgl2", { xrCompatible: true, alpha: true, antialias: true });
    if (!gl) throw new Error("webgl2");
    ui.hidden = false;
    // djupmätning (depth-sensing): telefonen mäter avståndet till det den ser, också på släta väggar där den inte hittar någon yta
    const base = { requiredFeatures: ["hit-test", "local"], domOverlay: { root: ui } };
    try { session = await navigator.xr.requestSession("immersive-ar", Object.assign({ optionalFeatures: ["dom-overlay", "depth-sensing"], depthSensing: { usagePreference: ["cpu-optimized"], dataFormatPreference: ["luminance-alpha", "float32"] } }, base)); }
    catch (e) { try { session = await navigator.xr.requestSession("immersive-ar", Object.assign({ optionalFeatures: ["dom-overlay"] }, base)); } catch (e2) { ui.hidden = true; throw e2; } }
    if (gl.makeXRCompatible) await gl.makeXRCompatible();
    session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });
    const ref = await session.requestReferenceSpace("local"), viewer = await session.requestReferenceSpace("viewer");
    let hits = null;
    try { hits = await session.requestHitTestSource({ space: viewer }); } catch (e) { hits = null; } // bara ytor telefonen själv har hittat

    // rita
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, "#version 300 es\nprecision highp float;\n" + src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, "layout(location=0) in vec3 p; layout(location=1) in vec3 n; layout(location=2) in vec2 t; uniform mat4 uMVP; uniform mat3 uR; out vec3 vn; out vec2 vt; void main(){ vn = uR * n; vt = t; gl_Position = uMVP * vec4(p, 1.); }"));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, "in vec3 vn; in vec2 vt; uniform sampler2D uT; uniform vec3 uCol, uL; uniform float uTex, uDim; out vec4 o; void main(){ vec3 c = uTex > .5 ? texture(uT, vt).rgb : uCol; float l = .6 + .4 * max(dot(normalize(vn), uL), 0.); o = vec4(c * l * uDim, 1.); }"));
    gl.linkProgram(prog);
    const U = {}; for (const k of ["uMVP", "uR", "uT", "uCol", "uL", "uTex", "uDim"]) U[k] = gl.getUniformLocation(prog, k);
    const g = geometry(), vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, g.v, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.idx, gl.STATIC_DRAW);
    // fotona: den mindre versionen räcker i kameran, originalet om den saknas
    for (const it of items) { it.tex = null; const im = new Image(), lite = it.src.replace(/^img\/([^/]+)\.\w+$/, "img/1200/$1.webp");
      im.onload = () => { if (!session) return; const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); it.tex = t; };
      im.onerror = () => { if (im.src.indexOf("/1200/") >= 0) im.src = it.src; }; im.src = lite; }

    // väggen: mittpunkt O, och n som pekar från väggen ut i rummet (alltid vågrät). Upp är alltid rakt upp.
    let O = [0, 0, -1.8], n = [0, 0, 1], placed = false, found = false, dist = 1.8, mpp = .002, lastText = "";
    let wn = null, wk = 0, wallAt = -1e9, t0 = -1; // väggen enligt djupmätningen: normal, läge och när den senast sågs

    // Mät väggen: avståndet i en vågrät rad mitt i bilden blir punkter i rummet, sedda uppifrån. En rät linje genom dem är väggen.
    // Ger { n, k } (väggens normal mot kameran och dess läge) när punkterna ligger i linje, annars bara { d } (avståndet rakt fram).
    function measure(xf, view) {
      let di = null; try { di = xf.getDepthInformation ? xf.getDepthInformation(view) : null; } catch (e) { di = null; }
      if (!di) return null;
      const P = view.projectionMatrix, c = view.transform.matrix; let pts = [], mid = 0;
      for (let i = 0; i < 15; i++) { const x = .15 + i * .05; let d = 0; try { d = di.getDepthInMeters(x, .5); } catch (e) { d = 0; }
        if (!(d > .3 && d < 8)) continue; if (i === 7) mid = d;
        const xv = (2 * x - 1 + P[8]) / P[0] * d, yv = P[9] / P[5] * d;
        pts.push([c[0] * xv + c[4] * yv - c[8] * d + c[12], c[2] * xv + c[6] * yv - c[10] * d + c[14]]); }
      if (pts.length < 7) return mid ? { d: mid } : null;
      let fit = null;
      for (let pass = 0; pass < 2; pass++) { // andra varvet utan punkter som sticker ut (en lampa, en dörrkarm)
        let mx = 0, mz = 0; for (const p of pts) { mx += p[0]; mz += p[1]; } mx /= pts.length; mz /= pts.length;
        let sxx = 0, szz = 0, sxz = 0; for (const p of pts) { const a = p[0] - mx, b = p[1] - mz; sxx += a * a; szz += b * b; sxz += a * b; }
        const ang = .5 * Math.atan2(2 * sxz, sxx - szz), nx = -Math.sin(ang), nz = Math.cos(ang); // normalen är vinkelrät mot linjen
        const res = pts.map((p) => (p[0] - mx) * nx + (p[1] - mz) * nz), rms = Math.sqrt(res.reduce((q, r) => q + r * r, 0) / pts.length);
        fit = { nx, nz, mx, mz, rms };
        const keep = pts.filter((p, i) => Math.abs(res[i]) < Math.max(.04, 2 * rms)); if (keep.length < 7 || keep.length === pts.length) break; pts = keep; }
      if (fit.rms > .06) return mid ? { d: mid } : null;
      let nx = fit.nx, nz = fit.nz; if ((c[12] - fit.mx) * nx + (c[14] - fit.mz) * nz < 0) { nx = -nx; nz = -nz; } // mot kameran
      return { n: [nx, 0, nz], k: nx * fit.mx + nz * fit.mz, d: mid };
    }
    const say = (t) => { if (t !== lastText) { lastText = t; $("xrHint").textContent = t; } };
    const setPlaced = (v) => { placed = v; $("xrPlace").textContent = v ? "Flytta" : "Häng här"; ui.classList.toggle("placed", v); };
    setPlaced(false);
    const right = () => norm([n[2], 0, -n[0]]); // upp × n
    const turn = (deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); n = norm([n[0] * c + n[2] * s, 0, -n[0] * s + n[2] * c]); };
    const onPlace = () => setPlaced(!placed);
    const onClose = () => session && session.end();
    const steps = { xrLeft: () => turn(-3), xrRight: () => turn(3), xrNear: () => { O = [O[0] + n[0] * .05, O[1], O[2] + n[2] * .05]; }, xrFar: () => { O = [O[0] - n[0] * .05, O[1], O[2] - n[2] * .05]; } };
    $("xrPlace").addEventListener("click", onPlace); $("xrClose").addEventListener("click", onClose);
    for (const k in steps) $(k).addEventListener("click", steps[k]);
    // knapparna ska inte räknas som ett tryck på skärmen
    const noSelect = (e) => e.preventDefault(); ui.querySelectorAll("button").forEach((b) => b.addEventListener("beforexrselect", noSelect));
    // dra med fingret för att flytta tavlorna längs väggen
    let drag = null;
    const down = (e) => { if (placed && !e.target.closest("button")) drag = [e.clientX, e.clientY]; };
    const move = (e) => { if (!drag || !placed) return; const dx = (e.clientX - drag[0]) * mpp, dy = (e.clientY - drag[1]) * mpp, r = right(); drag = [e.clientX, e.clientY]; O = [O[0] + r[0] * dx, O[1] - dy, O[2] + r[2] * dx]; };
    const up = () => { drag = null; };
    ui.addEventListener("pointerdown", down); ui.addEventListener("pointermove", move); ui.addEventListener("pointerup", up); ui.addEventListener("pointercancel", up);

    session.addEventListener("end", () => {
      $("xrPlace").removeEventListener("click", onPlace); $("xrClose").removeEventListener("click", onClose); for (const k in steps) $(k).removeEventListener("click", steps[k]);
      ui.querySelectorAll("button").forEach((b) => b.removeEventListener("beforexrselect", noSelect));
      ui.removeEventListener("pointerdown", down); ui.removeEventListener("pointermove", move); ui.removeEventListener("pointerup", up); ui.removeEventListener("pointercancel", up);
      ui.hidden = true; session = null; if (onEnd) onEnd();
    });

    function node(PV, R, tx, ty, tz, sx, sy, sz) { // lokalt: flytta och skala. Sedan ut på väggen: x längs väggen, y upp, z ut i rummet.
      const r = right(), M = new Float32Array([r[0] * sx, 0, r[2] * sx, 0, 0, sy, 0, 0, n[0] * sz, 0, n[2] * sz, 0,
        O[0] + r[0] * tx + n[0] * tz, O[1] + ty, O[2] + r[2] * tx + n[2] * tz, 1]);
      gl.uniformMatrix4fv(U.uMVP, false, mul(PV, M)); gl.uniformMatrix3fv(U.uR, false, R);
    }
    const cube = () => gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0), quad = () => gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 72);

    window.__vaggDebug = () => ({ found, dist: +dist.toFixed(2), yaw: +(Math.atan2(n[0], n[2]) * 180 / Math.PI).toFixed(1), O: O.map((v) => +v.toFixed(2)) }); // för felsökning
    session.requestAnimationFrame(function frame(time, xf) {
      if (!session) return; session.requestAnimationFrame(frame);
      const pose = xf.getViewerPose(ref), layer = session.renderState.baseLayer; if (!pose) return;
      const cm = pose.transform.matrix, cam = [cm[12], cm[13], cm[14]], fwd = [-cm[8], -cm[9], -cm[10]];
      if (!placed) {
        if (t0 < 0) t0 = time;
        // mot kameran, vågrätt: gäller när väggen inte hittas
        let facing = norm([-fwd[0], 0, -fwd[2]]); if (Math.abs(fwd[1]) > .95) facing = n;
        found = false;
        // 1. djupmätningen: fungerar även på släta väggar
        const m = measure(xf, pose.views[0]);
        if (m && m.n) { if (wn && time - wallAt < 1500) { wn = norm([wn[0] + (m.n[0] - wn[0]) * .25, 0, wn[2] + (m.n[2] - wn[2]) * .25]); wk += (m.k - wk) * .25; } else { wn = m.n; wk = m.k; } wallAt = time; }
        if (wn && time - wallAt < 1500) { const den = fwd[0] * wn[0] + fwd[2] * wn[2], t = (wk - cam[0] * wn[0] - cam[2] * wn[2]) / den;
          if (den < -.2 && t > .3 && t < 8) { O = [cam[0] + fwd[0] * t, cam[1] + fwd[1] * t, cam[2] + fwd[2] * t]; n = wn; dist = t; found = true; } }
        // 2. en yta som telefonen själv har hittat
        if (!found) { const res = hits ? xf.getHitTestResults(hits) : [], hp = res.length ? res[0].getPose(ref) : null;
          if (hp) { const h = hp.transform.matrix, hn = [h[4], h[5], h[6]], p = [h[12], h[13], h[14]], d = Math.hypot(p[0] - cam[0], p[1] - cam[1], p[2] - cam[2]);
            if (d > .3 && d < 8 && Math.abs(hn[1]) < .35) { dist = d; O = p; n = norm([hn[0], 0, hn[2]]); if (n[0] * facing[0] + n[2] * facing[2] < 0) n = [-n[0], 0, -n[2]]; found = true; } } }
        // 3. ingen vägg: rakt framför kameran, på det avstånd djupmätningen ger (om den ger något)
        if (!found) { if (m && m.d) dist += (m.d - dist) * .3; n = facing; O = [cam[0] + fwd[0] * dist, cam[1] + fwd[1] * dist, cam[2] + fwd[2] * dist]; }
        say(found ? "Väggen är hittad. Sikta dit tavlorna ska hänga och tryck på Häng här."
          : time - t0 < 7000 ? "Letar efter väggen … Rör mobilen långsamt i sidled, en halv meter räcker."
          : "Hittar inte väggen. Stå rakt framför den, tryck på Häng här och justera med knapparna.");
      } else say("Dra för att flytta tavlorna. Knapparna finjusterar om något hamnat snett.");

      gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.useProgram(prog); gl.bindVertexArray(vao); gl.uniform1i(U.uT, 0); gl.activeTexture(gl.TEXTURE0);
      const r = right(), R = new Float32Array([r[0], 0, r[2], 0, 1, 0, n[0], 0, n[2]]), L = norm([n[0] * .6 + r[0] * .3, .7, n[2] * .6 + r[2] * .3]);
      gl.uniform3f(U.uL, L[0], L[1], L[2]); gl.uniform1f(U.uDim, placed ? 1 : .92);
      for (const view of pose.views) { const vp = layer.getViewport(view); gl.viewport(vp.x, vp.y, vp.width, vp.height);
        const PV = mul(view.projectionMatrix, view.transform.inverse.matrix);
        mpp = 2 * Math.hypot(O[0] - cam[0], O[1] - cam[1], O[2] - cam[2]) / view.projectionMatrix[5] / (ui.clientHeight || innerHeight);
        for (const it of items) { const d = it.d;
          gl.uniform1f(U.uTex, 0); gl.uniform3f(U.uCol, .05, .05, .05); // ramen och bakstycket
          node(PV, R, it.x, it.y + (d.H + RAM) / 2, DJUP / 2, d.OW, RAM, DJUP); cube(); node(PV, R, it.x, it.y - (d.H + RAM) / 2, DJUP / 2, d.OW, RAM, DJUP); cube();
          node(PV, R, it.x - (d.W + RAM) / 2, it.y, DJUP / 2, RAM, d.H, DJUP); cube(); node(PV, R, it.x + (d.W + RAM) / 2, it.y, DJUP / 2, RAM, d.H, DJUP); cube();
          node(PV, R, it.x, it.y, .002, d.OW, d.OH, .004); cube();
          gl.uniform3f(U.uCol, .93, .92, .89); node(PV, R, it.x, it.y, .014, d.W, d.H, 1); quad(); // passepartout
          if (it.tex) { gl.uniform1f(U.uTex, 1); gl.bindTexture(gl.TEXTURE_2D, it.tex); } else gl.uniform3f(U.uCol, .2, .21, .21);
          node(PV, R, it.x, it.y, .0155, d.w, d.h, 1); quad(); } // fotot
      }
    });
  }
  window.vaggAR = { supported, start };
})();
