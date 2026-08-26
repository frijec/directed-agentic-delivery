/* ============================================================
   CONSID · Abstract dithered section-break shapes for /viden/
   article pages. Ported infra (matcap loader, Bayer-dither post
   process, makeIllusScene) is a verbatim copy of index.html's own
   module script — kept as a SEPARATE module file rather than folded
   into assets/site.js, because site.js's initRail is called as a
   bare global from inline page <script>s and ES modules don't leak
   declarations to the global scope. The two shapes here (blobA,
   blobB) are new and non-representational — unlike every model in
   index.html, which is a direct port of a named object from the
   origami set — so they're not shared with that registry.
   ============================================================ */
import * as THREE from 'https://unpkg.com/three@0.169.0/build/three.module.js';

const REDUCED_ILLUS = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DITHER_GRID = 2, DITHER_PIXEL_RATIO = 1, DITHER_GAIN = 1.0, DITHER_BIAS = 0.0, DITHER_GAMMA = 0.55;
const DITHER_GRAYSCALE = 1;

const illusCss = getComputedStyle(document.documentElement);
const illusTok = n => illusCss.getPropertyValue(n).trim();

const illusRedraws = [];
// Article pages live one level below the repo root (/viden/<slug>.html).
const matcapTex = new THREE.TextureLoader().load(
  '../matcap.jpg',
  () => illusRedraws.forEach(fn => fn())
);
matcapTex.colorSpace = THREE.SRGBColorSpace;

const DITHER_FRAG = `
uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uGridSize;
uniform float uPixelSize;
uniform float uGain;
uniform float uBias;
uniform float uGamma;
uniform float uGrayscale;
uniform vec3 uInk;
varying vec2 vUv;

bool ditherOn(float brightness, vec2 cell) {
  if (brightness > 16.0 / 17.0) return false;
  if (brightness < 1.0 / 17.0) return true;
  vec2 p = mod(cell, 4.0);
  int x = int(p.x);
  int y = int(p.y);
  if (x == 0) {
    if (y == 0) return brightness < 16.0 / 17.0;
    if (y == 1) return brightness < 5.0 / 17.0;
    if (y == 2) return brightness < 13.0 / 17.0;
    return brightness < 1.0 / 17.0;
  } else if (x == 1) {
    if (y == 0) return brightness < 8.0 / 17.0;
    if (y == 1) return brightness < 12.0 / 17.0;
    if (y == 2) return brightness < 4.0 / 17.0;
    return brightness < 9.0 / 17.0;
  } else if (x == 2) {
    if (y == 0) return brightness < 14.0 / 17.0;
    if (y == 1) return brightness < 2.0 / 17.0;
    if (y == 2) return brightness < 15.0 / 17.0;
    return brightness < 3.0 / 17.0;
  } else {
    if (y == 0) return brightness < 6.0 / 17.0;
    if (y == 1) return brightness < 10.0 / 17.0;
    if (y == 2) return brightness < 7.0 / 17.0;
    return brightness < 11.0 / 17.0;
  }
}

void main() {
  vec2 fragCoord = vUv * uResolution;
  vec2 pixelCell = floor(fragCoord / uPixelSize);
  vec2 ditherCell = floor(fragCoord / uGridSize);
  vec3 colorSum = vec3(0.0);
  float alphaSum = 0.0;
  for (int i = 0; i < 3; i++) {
    for (int j = 0; j < 3; j++) {
      vec2 offs = (vec2(float(i), float(j)) + 0.5) / 3.0 * uPixelSize;
      vec4 s = texture2D(uScene, (pixelCell * uPixelSize + offs) / uResolution);
      colorSum += s.rgb * s.a;
      alphaSum += s.a;
    }
  }
  float avgAlpha = alphaSum / 9.0;
  vec3 avgColor = alphaSum > 0.001 ? colorSum / alphaSum : vec3(0.0);
  float lum = dot(avgColor, vec3(0.2126, 0.7152, 0.0722));
  float brightness = pow(clamp((lum - uBias) * uGain, 0.0, 1.0), uGamma);
  bool on = ditherOn(brightness, ditherCell);
  vec3 inkCol = mix(avgColor * 0.4, uInk, uGrayscale);
  float outA = min(1.0, avgAlpha * 1.7);
  gl_FragColor = on ? vec4(inkCol, outA) : vec4(0.0);
}
`;
const DITHER_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

function makeIllusScene(container, build, zoom) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.set(0, 0, 5);
  camera.zoom = zoom || 1.6;
  camera.updateProjectionMatrix();

  let target = new THREE.WebGLRenderTarget(1, 1, { colorSpace: THREE.SRGBColorSpace, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const ditherScene = new THREE.Scene();
  const ditherCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const ditherMat = new THREE.ShaderMaterial({
    vertexShader: DITHER_VERT,
    fragmentShader: DITHER_FRAG,
    uniforms: {
      uScene: { value: target.texture },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uGridSize: { value: DITHER_GRID },
      uPixelSize: { value: DITHER_GRID * DITHER_PIXEL_RATIO },
      uGain: { value: DITHER_GAIN },
      uBias: { value: DITHER_BIAS },
      uGamma: { value: DITHER_GAMMA },
      uGrayscale: { value: DITHER_GRAYSCALE },
      uInk: { value: new THREE.Color(illusTok('--crimson') || '#90263B') }
    },
    transparent: true
  });
  ditherScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ditherMat));

  function resize() {
    const w = container.clientWidth || 96, h = container.clientHeight || 96;
    const dpr = renderer.getPixelRatio();
    renderer.setSize(w, h);
    target.setSize(w * dpr, h * dpr);
    ditherMat.uniforms.uResolution.value.set(w * dpr, h * dpr);
    ditherMat.uniforms.uGridSize.value = DITHER_GRID * dpr;
    ditherMat.uniforms.uPixelSize.value = DITHER_GRID * DITHER_PIXEL_RATIO * dpr;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize, { passive: true });

  const update = build(scene) || null;

  let running = false, raf = null, lastT = performance.now();
  function frame() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (update && !REDUCED_ILLUS) update(dt);
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(ditherScene, ditherCamera);
    if (running) raf = requestAnimationFrame(frame);
  }
  function start() { if (running || REDUCED_ILLUS) return; running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); }

  frame();
  illusRedraws.push(frame);
  start();
  new IntersectionObserver(es => es.forEach(en => en.isIntersecting ? start() : stop()), { threshold: 0 }).observe(container);
}

const mat = () => new THREE.MeshMatcapMaterial({ matcap: matcapTex });

/* Two abstract, non-representational shapes — unlike every model in
   index.html's MODEL_BUILDERS (all direct ports of named origami-set
   objects), these exist only to break up long article text, so they
   deliberately read as pure form rather than an object. Alternated by
   the article template between section gaps. */
const SHAPE_ZOOM = { blobA: 2.35, blobB: 2.05 };
const SHAPE_BUILDERS = {
  // Jittered icosahedron — each vertex nudged outward/inward along its
  // own normal by a random amount, giving an irregular "rock" silhouette
  // instead of a perfect solid, which reads more as an abstract mark.
  blobA: scene => {
    const geo = new THREE.IcosahedronGeometry(0.62, 2);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const jitter = 1 + (Math.random() - 0.5) * 0.32;
      pos.setXYZ(i, v.x * 0.62 * jitter, v.y * 0.62 * jitter, v.z * 0.62 * jitter);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat());
    scene.add(mesh);
    return dt => { mesh.rotation.x += dt * 0.22; mesh.rotation.y += dt * 0.3; };
  },
  blobB: scene => {
    const mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(0.42, 0.14, 100, 12), mat());
    scene.add(mesh);
    return dt => { mesh.rotation.x += dt * 0.18; mesh.rotation.y += dt * 0.26; };
  }
};

Object.entries(SHAPE_BUILDERS).forEach(([name, build]) => {
  document.querySelectorAll(`[data-illus="${name}"]`).forEach(el => makeIllusScene(el, build, SHAPE_ZOOM[name]));
});
