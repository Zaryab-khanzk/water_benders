// assets/js/fountain-3d.js
(function () {
  const canvas = document.getElementById("fountain-canvas");
  if (!canvas) return;

  let scene, camera, renderer, particleSystem;
  const particleCount = 4000;
  let particles, velocities, initialPos;
  let scrollProgress = 0;

  function init() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 18);
    camera.lookAt(0, 2, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Fountain Pedestal Base Geometry
    const baseGeo = new THREE.CylinderGeometry(4, 5, 1, 32);
    const baseMat = new THREE.MeshBasicMaterial({ color: 0x111827, wireframe: true });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -2;
    scene.add(baseMesh);

    // Create Particles
    const geometry = new THREE.BufferGeometry();
    particles = new Float32Array(particleCount * 3);
    velocities = new Float32Array(particleCount * 3);
    initialPos = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      resetParticle(i);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(particles, 3));

    // Particle Shader-like material
    const material = new THREE.PointsMaterial({
      color: 0x00d2c8,
      size: 0.12,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    window.addEventListener("resize", onWindowResize);
    window.addEventListener("scroll", onScroll);
  }

  function resetParticle(i) {
    const index = i * 3;
    particles[index] = (Math.random() - 0.5) * 0.5;
    particles[index + 1] = -1.5;
    particles[index + 2] = (Math.random() - 0.5) * 0.5;

    initialPos[index] = particles[index];
    initialPos[index + 1] = particles[index + 1];
    initialPos[index + 2] = particles[index + 2];

    const angle = Math.random() * Math.PI * 2;
    // Speed increases based on scroll state
    const speed = 0.08 + Math.random() * 0.08 + scrollProgress * 0.08;
    
    velocities[index] = Math.cos(angle) * (0.02 + Math.random() * 0.03);
    velocities[index + 1] = speed;
    velocities[index + 2] = Math.sin(angle) * (0.02 + Math.random() * 0.03);
  }

  function onScroll() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = Math.min(window.scrollY / (maxScroll || 1), 1.5);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    requestAnimationFrame(animate);

    const positions = particleSystem.geometry.attributes.position.array;
    const gravity = -0.003;

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;

      positions[idx] += velocities[idx];
      positions[idx + 1] += velocities[idx + 1];
      positions[idx + 2] += velocities[idx + 2];

      velocities[idx + 1] += gravity; // Gravity pull

      // Reset when particle falls below floor
      if (positions[idx + 1] < -2) {
        resetParticle(i);
      }
    }

    particleSystem.geometry.attributes.position.needsUpdate = true;
    particleSystem.rotation.y += 0.002 + scrollProgress * 0.005;

    renderer.render(scene, camera);
  }

  init();
  animate();
})();