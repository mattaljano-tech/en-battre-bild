// Efterbehandling: ACES, bloom och skärpedjup.
"use strict";
/* ================= efterbehandling ================= */
let composer = null, finalPass = null, bloomPass = null, dofPass = null, dofRT = null, dofDepthMat = null;
function setupPost() {
  if (!POST) return;
  try {
    const opts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    const rt = (renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget && !isTouch && (devicePixelRatio || 1) < 1.3) ? new THREE.WebGLMultisampleRenderTarget(innerWidth, innerHeight, opts) : new THREE.WebGLRenderTarget(innerWidth, innerHeight, opts);
    if (rt.samples !== undefined) rt.samples = 2;
    composer = new THREE.EffectComposer(renderer, rt);
    composer.addPass(new THREE.RenderPass(scene, camera));
    // skärpedjup för gatan: oskärpa efter avståndet från fokus, mätt i en djupbild (lager 2 – regn, sken och glas – räknas inte)
    dofPass = new THREE.ShaderPass({
      uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, focus: { value: 5 }, aperture: { value: 0 }, maxblur: { value: .009 }, near: { value: .05 }, far: { value: 70 }, asp: { value: 1 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      defines: { NT: isTouch ? 16 : 28 },
      fragmentShader: [
        "#include <packing>",
        "uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform float focus, aperture, maxblur, near, far, asp; varying vec2 vUv;",
        "float dist(vec2 uv){ return -perspectiveDepthToViewZ(unpackRGBAToDepth(texture2D(tDepth, uv)), near, far); }",
        "float coc(float z){ float k = z > focus ? (z - focus) / max(z, .01) : (focus - z) / max(z, .01) * .25; return min(k * aperture, maxblur); }",
        "void main(){",
        "  float c = coc(dist(vUv)); vec4 base = texture2D(tDiffuse, vUv);",
        "  if (c < .0004) { gl_FragColor = base; return; }",
        "  vec3 acc = base.rgb; float wsum = 1.0;",
        "  for (int i = 1; i < NT; i++) { float fi = float(i), r = sqrt(fi / float(NT - 1)) * c, a = fi * 2.39996;",
        "    vec2 uv = vUv + vec2(cos(a) * r / asp, sin(a) * r); float sc = coc(dist(uv));",
        "    float w = mix(.12, 1.0, smoothstep(r * .4, r * .9, sc)); acc += texture2D(tDiffuse, uv).rgb * w; wsum += w; }",
        "  gl_FragColor = vec4(acc / wsum, base.a);",
        "}"].join("\n") });
    dofPass.enabled = false; composer.addPass(dofPass);
    dofDepthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); dofDepthMat.blending = THREE.NoBlending;
    if (!isTouch && THREE.UnrealBloomPass) { bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .62, .55, 1.15); composer.addPass(bloomPass); }
    finalPass = new THREE.ShaderPass({
      uniforms: { tDiffuse: { value: null }, exposure: { value: 1.18 }, time: { value: 0 }, res: { value: new THREE.Vector2(1, 1) } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: [
        "uniform sampler2D tDiffuse; uniform float exposure; uniform float time; uniform vec2 res; varying vec2 vUv;",
        "vec3 RRTAndODTFit(vec3 v){ vec3 a = v*(v+0.0245786)-0.000090537; vec3 b = v*(0.983729*v+0.4329510)+0.238081; return a/b; }",
        "vec3 aces(vec3 c){ const mat3 I = mat3(0.59719,0.07600,0.02840, 0.35458,0.90834,0.13383, 0.04823,0.01566,0.83777);",
        "  const mat3 O = mat3(1.60475,-0.10208,-0.00327, -0.53108,1.10813,-0.07276, -0.07367,-0.00605,1.07602);",
        "  c *= exposure/0.6; c = I*c; c = RRTAndODTFit(c); c = O*c; return clamp(c,0.0,1.0); }",
        "void main(){",
        "  vec2 d = vUv - 0.5; float r2 = dot(d,d); float ca = 0.005*r2;",
        "  vec3 col = vec3(texture2D(tDiffuse, vUv - d*ca).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv + d*ca).b);",
        "  col = aces(col);",
        "  float l = dot(col, vec3(0.2126,0.7152,0.0722));",
        "  col = mix(col, col*vec3(0.9,1.03,1.04), 1.0 - smoothstep(0.0,0.35,l));",
        "  col *= 1.0 - 0.42*smoothstep(0.32, 0.98, length(d*vec2(1.0,0.85))*1.25);",
        "  col = pow(col, vec3(1.0/2.2));",
        "  float n = fract(sin(dot(vUv*res + fract(time)*91.7, vec2(12.9898,78.233)))*43758.5453);",
        "  col += (n-0.5)*0.035;",
        "  gl_FragColor = vec4(col, 1.0);",
        "}"
      ].join("\n")
    });
    composer.addPass(finalPass);
  } catch (e) { composer = null; renderer.toneMapping = THREE.ACESFilmicToneMapping; }
}
let quality = 1;
const basePR = () => { const dpr = devicePixelRatio || 1; if (isTouch) return Math.min(dpr, 1.6); return Math.max(.85, Math.min(dpr, 1.25, 3000 / innerWidth, 1700 / innerHeight)); };
function applyQuality() {
  const pr = basePR() * quality; renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false);
  if (composer) { composer.setPixelRatio(pr); composer.setSize(innerWidth, innerHeight); finalPass.uniforms.res.value.set(innerWidth * pr, innerHeight * pr); }
  if (dustMat) dustMat.uniforms.scale.value = innerHeight * pr / 2;
}
function resize() { camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 1 ? clamp(2 * Math.atan(Math.tan(31 * Math.PI / 180) / camera.aspect) * 180 / Math.PI, 78, 96) : 64; /* stående mobil: vidare vy så man ser väggarna */ camera.updateProjectionMatrix(); applyQuality(); }
