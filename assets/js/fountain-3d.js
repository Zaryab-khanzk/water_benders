/* Water Benders — 3D tiered fountain · Three.js r128 · assets/js/fountain-3d.js
   Fixed full-page canvas: the camera flies around the fountain as you scroll.
   Pointer sways the central jet, click/tap makes it surge, scroll speed boosts the flow. */
(() => {
  'use strict';
  const canvas = document.getElementById('fountain-canvas');
  if (!canvas || !window.THREE) return;

  const AMBIENT = canvas.dataset.mode === 'ambient';          // sub-pages: calmer, fewer particles
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COUNT = AMBIENT ? 2200 : innerWidth < 768 ? 3200 : 7000;
  const G = -9.2, BASIN_Y = 1.0, BOWL_Y = 3.47, NOZ_Y = 3.8, NOZZLES = 24;
  const rnd = Math.random;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* ---------- renderer / scene ---------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) { canvas.style.display = 'none'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04070d, 0.02);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
  const fountain = new THREE.Group();
  scene.add(fountain);

  /* ---------- studio environment (gives stone + brass something to reflect) ---------- */
  {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#1d3652'); g.addColorStop(0.5, '#070d18'); g.addColorStop(1, '#02040a');
    x.fillStyle = g; x.fillRect(0, 0, 512, 256);
    x.fillStyle = '#9ffcf5'; x.fillRect(60, 50, 70, 26);
    x.fillStyle = '#ffffff'; x.fillRect(300, 40, 110, 18);
    x.fillStyle = '#5a7a9a'; x.fillRect(190, 90, 40, 60);
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping; tex.encoding = THREE.sRGBEncoding;
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromEquirectangular(tex).texture;
    tex.dispose(); pm.dispose();
  }

  /* ---------- lights ---------- */
  scene.add(new THREE.AmbientLight(0x2a4468, 0.55));
  const rim = new THREE.DirectionalLight(0xaad8ff, 1.3); rim.position.set(-6, 9, -7); scene.add(rim);
  const key = new THREE.PointLight(0x00d2c8, 2.2, 22); key.position.set(0, 4.8, 0);
  const under = new THREE.PointLight(0x00d2c8, 1.4, 10); under.position.set(0, 1.5, 0);
  fountain.add(key, under);

  /* ---------- fountain model ---------- */
  const stone = new THREE.MeshStandardMaterial({ color: 0x1a2330, metalness: 0.55, roughness: 0.3, envMapIntensity: 1.2 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb89a62, metalness: 1, roughness: 0.28, envMapIntensity: 1.5 });
  const lamp = new THREE.MeshBasicMaterial({ color: 0x00d2c8 });
  const lathe = (pts) => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), 128);
  const ring = (r, tube, y) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 14, 160), brass);
    m.rotation.x = Math.PI / 2; m.position.y = y; fountain.add(m);
  };

  // lower basin (plinth, wall, inner floor)
  fountain.add(new THREE.Mesh(lathe([
    [0.01, 0], [5, 0], [5, 0.3], [4.55, 0.42], [4.5, 1.2], [4.35, 1.35], [4.05, 1.35], [3.95, 1.2], [3.9, 0.8], [0.01, 0.8],
  ]), stone));
  // pedestal + upper bowl
  fountain.add(new THREE.Mesh(lathe([
    [0.01, 0.8], [1.1, 0.8], [1.0, 1.0], [0.6, 1.3], [0.42, 1.8], [0.42, 2.5], [0.75, 2.8], [1.6, 3.15],
    [2.2, 3.5], [2.2, 3.62], [2.08, 3.62], [2.0, 3.5], [1.7, 3.3], [0.01, 3.22],
  ]), stone));
  ring(4.2, 0.05, 1.37); ring(4.52, 0.04, 0.43); ring(2.14, 0.045, 3.64); ring(0.45, 0.05, 2.5); ring(0.62, 0.05, 1.3);

  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 0.5, 24), brass);
  nozzle.position.y = 3.55; fountain.add(nozzle);

  const spouts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 14, 10), brass, NOZZLES);
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 10, 8), lamp, 16);
  const d = new THREE.Object3D();
  for (let i = 0; i < NOZZLES; i++) {
    const a = (i / NOZZLES) * Math.PI * 2;
    d.position.set(Math.cos(a) * 1.55, 3.5, Math.sin(a) * 1.55); d.updateMatrix(); spouts.setMatrixAt(i, d.matrix);
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    d.position.set(Math.cos(a) * 4.2, 1.43, Math.sin(a) * 4.2); d.updateMatrix(); lamps.setMatrixAt(i, d.matrix);
  }
  fountain.add(spouts, lamps);

  // floor + soft ground glow
  const floor = new THREE.Mesh(new THREE.CircleGeometry(18, 64), new THREE.MeshStandardMaterial({ color: 0x05080e, metalness: 0.9, roughness: 0.4 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.01; fountain.add(floor);
  {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,210,200,0.35)'); g.addColorStop(0.5, 'rgba(0,120,140,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.02; fountain.add(glow);
  }

  /* ---------- rippling water surfaces (shader) ---------- */
  const waters = [];
  const makeWater = (radius, y, impact) => {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uEnergy: { value: 0.6 }, uImpact: { value: impact }, uColor: { value: new THREE.Color(0x00d2c8) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        varying vec2 vUv; uniform float uTime, uEnergy, uImpact; uniform vec3 uColor;
        void main(){
          float r = length(vUv - 0.5) * 2.0;
          float w  = sin(r * 42.0 - uTime * 2.2) * 0.5 + 0.5;
          float w2 = sin(r * 95.0 + uTime * 3.1 + sin(r * 13.0) * 2.0) * 0.5 + 0.5;
          float rip = mix(w, w2, 0.4);
          float k = (r - uImpact) * 16.0;
          float hit = exp(-k * k) * (0.6 + 0.4 * sin(uTime * 6.0 + r * 30.0));
          float edge = smoothstep(1.0, 0.9, r);
          vec3 col = vec3(0.0, 0.06, 0.09) + uColor * (0.16 * rip * uEnergy + 0.55 * hit * uEnergy) + vec3(0.0, 0.12, 0.12) * (1.0 - r);
          gl_FragColor = vec4(col, edge * (0.78 + 0.2 * rip));
        }`,
    });
    const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 96), mat);
    m.rotation.x = -Math.PI / 2; m.position.y = y; fountain.add(m); waters.push(mat);
  };
  makeWater(3.96, BASIN_Y, 0.84);   // lower basin — arcs land near 84% of the radius
  makeWater(1.94, BOWL_Y - 0.02, 0.18); // upper bowl — central jet lands near the middle

  /* ---------- particle water ---------- */
  const pos = new Float32Array(COUNT * 3), vel = new Float32Array(COUNT * 3);
  const size = new Float32Array(COUNT), alpha = new Float32Array(COUNT), floorY = new Float32Array(COUNT);
  const type = new Uint8Array(COUNT), home = new Uint8Array(COUNT);   // 0 centre jet · 1 arcs · 2 spill · 3 splash
  let wind = 0;

  function spawn(i, t, e) {
    const j = i * 3, a = rnd() * 6.2832;
    type[i] = t; alpha[i] = 0.55 + rnd() * 0.4;
    if (t === 0) {
      const v0 = Math.sqrt(-2 * G * 3.2 * (0.7 + 0.5 * e)) * (0.94 + rnd() * 0.12);
      pos[j] = Math.cos(a) * rnd() * 0.08; pos[j + 1] = NOZ_Y; pos[j + 2] = Math.sin(a) * rnd() * 0.08;
      vel[j] = (rnd() - 0.5) * 0.9; vel[j + 1] = v0; vel[j + 2] = (rnd() - 0.5) * 0.9;
      floorY[i] = BOWL_Y; size[i] = 0.07 + rnd() * 0.04;
    } else if (t === 1) {
      const k = (((rnd() * NOZZLES) | 0) / NOZZLES) * 6.2832, c = Math.cos(k), s = Math.sin(k);
      const vh = 1.35 * (0.9 + 0.2 * e) * (0.92 + rnd() * 0.16);
      pos[j] = c * 1.55; pos[j + 1] = 3.52; pos[j + 2] = s * 1.55;
      vel[j] = c * vh; vel[j + 1] = 4 * (0.9 + 0.2 * e) * (0.97 + rnd() * 0.06); vel[j + 2] = s * vh;
      floorY[i] = BASIN_Y; size[i] = 0.08 + rnd() * 0.03;
    } else {
      const c = Math.cos(a), s = Math.sin(a), vh = 0.45 + rnd() * 0.5;
      pos[j] = c * 2.16; pos[j + 1] = 3.62; pos[j + 2] = s * 2.16;
      vel[j] = c * vh; vel[j + 1] = 0.2 + rnd() * 0.4; vel[j + 2] = s * vh;
      floorY[i] = BASIN_Y; size[i] = 0.06 + rnd() * 0.03;
    }
  }

  function move(i, dt, e) {
    const j = i * 3;
    vel[j + 1] += G * dt;
    if (type[i] === 0) vel[j] += wind * dt;
    pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
    if (pos[j + 1] >= floorY[i]) return;
    if (type[i] !== 3 && rnd() < 0.35) {          // droplet hits the water → small splash
      type[i] = 3; pos[j + 1] = floorY[i];
      vel[j] = (rnd() - 0.5) * 1.3; vel[j + 1] = 1 + rnd() * 1.8; vel[j + 2] = (rnd() - 0.5) * 1.3;
      size[i] = 0.05 + rnd() * 0.03;
    } else spawn(i, home[i], e);
  }

  for (let i = 0; i < COUNT; i++) {
    const r = rnd(); home[i] = r < 0.28 ? 0 : r < 0.68 ? 1 : 2;
    spawn(i, home[i], 0.7);
    for (let n = (rnd() * 110) | 0; n--; ) move(i, 1 / 60, 0.7);   // pre-warm so the fountain starts already flowing
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  pGeo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uScale: { value: 800 }, uColor: { value: new THREE.Color(0x00d2c8) } },
    vertexShader: `
      attribute float aSize; attribute float aAlpha; uniform float uScale; varying float vAlpha;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uScale / -mv.z; vAlpha = aAlpha; }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vAlpha;
      void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(mix(uColor, vec3(0.9, 1.0, 1.0), a * a), a * vAlpha); }`,
  });
  const drops = new THREE.Points(pGeo, pMat); drops.frustumCulled = false; fountain.add(drops);

  // floating dust motes (depth + atmosphere)
  const MOTES = 420, mPos = new Float32Array(MOTES * 3);
  for (let i = 0; i < MOTES; i++) {
    const a = rnd() * 6.2832, r = 4 + rnd() * 12;
    mPos[i * 3] = Math.cos(a) * r; mPos[i * 3 + 1] = rnd() * 12; mPos[i * 3 + 2] = Math.sin(a) * r;
  }
  const mGeo = new THREE.BufferGeometry();
  mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
  mGeo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(MOTES).fill(0.06), 1));
  mGeo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(MOTES).fill(0.22), 1));
  const motes = new THREE.Points(mGeo, pMat); motes.frustumCulled = false; scene.add(motes);

  /* ---------- scroll camera path ---------- */
  const KEYS = AMBIENT
    ? [{ t: 0, p: [0, 4.2, 15], l: [0, 3, 0] }, { t: 1, p: [8, 6, 12], l: [0, 3, 0] }]
    : [
        { t: 0,   p: [0, 3.4, 13.5],   l: [0, 3.4, 0] },   // hero: front view
        { t: 0.3, p: [9, 5.2, 9.5],    l: [0, 3.0, 0] },   // orbit right
        { t: 0.6, p: [3.5, 11.5, 6.5], l: [0, 1.5, 0] },   // bird's-eye on the basin
        { t: 1,   p: [-8, 2.4, 8],     l: [0, 4.0, 0] },   // low angle looking up
      ];
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  function pathAt(t) {
    let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
    const a = KEYS[i], b = KEYS[i + 1], k = smooth(a.t, b.t, t);
    for (let n = 0; n < 3; n++) { camPos.setComponent(n, lerp(a.p[n], b.p[n], k)); camLook.setComponent(n, lerp(a.l[n], b.l[n], k)); }
  }

  /* ---------- input ---------- */
  let tx = 0, ty = 0, px = 0, py = 0, burst = 0;
  addEventListener('pointermove', (e) => { tx = (e.clientX / innerWidth) * 2 - 1; ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  addEventListener('pointerdown', (e) => { if (!AMBIENT && !e.target.closest('a,button,input,textarea,select,label')) burst = 1; });

  let lastW = 0, lastH = 0;
  function resize() {
    const w = innerWidth, h = innerHeight;
    if (w === lastW && Math.abs(h - lastH) < 120) return;   // ignore mobile URL-bar jitter
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = camera.aspect < 0.8 ? 50 : 38; camera.updateProjectionMatrix();
    pMat.uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360));
  }
  addEventListener('resize', resize); resize();

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  let prog = 0, act = 0, lastY = scrollY, shift = 0;

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.033), time = clock.elapsedTime;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const speed = Math.abs(scrollY - lastY) / Math.max(dt, 0.001); lastY = scrollY;
    const k = Math.min(1, dt * 3);

    prog = lerp(prog, clamp(scrollY / max, 0, 1), k);
    act = lerp(act, clamp(speed / 1600, 0, 1), Math.min(1, dt * 4));
    burst = Math.max(0, burst - dt * 0.8);
    px = lerp(px, tx, k); py = lerp(py, ty, k);

    const e = REDUCED ? 0.7 : clamp(0.62 + prog * 0.15 + act * 0.55 + burst * 0.5, 0.4, 1.3);
    wind = REDUCED ? 0 : px * 2.2;

    for (let i = 0; i < COUNT; i++) move(i, dt, e);
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.aSize.needsUpdate = true;
    pGeo.attributes.aAlpha.needsUpdate = true;

    for (let i = 1; i < MOTES * 3; i += 3) { mPos[i] += dt * 0.25; if (mPos[i] > 12) mPos[i] = 0; }
    mGeo.attributes.position.needsUpdate = true;

    waters.forEach((m) => { m.uniforms.uTime.value = time; m.uniforms.uEnergy.value = e; });
    key.intensity = 1.6 + e * 1.2;

    // camera: scroll path + pointer parallax; fountain slides right on wide screens so hero text stays clear
    pathAt(prog);
    const zoom = camera.aspect < 0.8 ? 1.3 : 1;
    camPos.sub(camLook).multiplyScalar(zoom).add(camLook);
    camera.position.set(camPos.x + px * 0.9, camPos.y - py * 0.5, camPos.z);
    camera.lookAt(camLook);

    const base = AMBIENT ? 4.2 : 3.0;
    shift = lerp(shift, camera.aspect > 1.1 ? base * lerp(1, 0.2, smooth(0.02, 0.22, prog)) : 0, k);
    fountain.position.x = shift;
    fountain.rotation.y = (REDUCED ? 0 : time * 0.06) + prog * Math.PI * 1.4;

    canvas.style.opacity = AMBIENT ? 0.55 : lerp(1, 0.4, smooth(innerHeight * 0.5, innerHeight * 1.3, scrollY));
    renderer.render(scene, camera);
  }
  frame();
})();