const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1220);
scene.fog = new THREE.Fog(0x0a1220, 18, 70);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 250);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();
const keys = {};
const raycaster = new THREE.Raycaster();
const aimTarget = new THREE.Vector2(0, 0);

const world = {
  health: 100,
  score: 0,
  wave: 1,
  lastShot: 0,
  canShoot: true,
  gameOver: false,
  enemies: [],
  obstacles: [],
  projectiles: [],
};

const player = {
  height: 1.7,
  speed: 8,
  velocity: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  radius: 0.6,
  attackCooldown: 0.22,
};

const ui = {
  health: document.getElementById('health'),
  score: document.getElementById('score'),
  wave: document.getElementById('wave'),
  status: document.getElementById('status-text'),
  overlay: document.getElementById('overlay'),
  startButton: document.getElementById('start-button'),
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateHud() {
  ui.health.textContent = Math.max(0, world.health);
  ui.score.textContent = world.score;
  ui.wave.textContent = world.wave;
}

function setStatus(text) {
  ui.status.textContent = text;
}

function resetPlayer() {
  camera.position.set(0, player.height, 13);
  player.yaw = 0;
  player.pitch = 0;
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

function createLighting() {
  const hemi = new THREE.HemisphereLight(0xaecbff, 0x0d1322, 1.5);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xfff4cf, 1.5);
  dir.position.set(5, 18, 8);
  scene.add(dir);
}

function createArena() {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x2b3547, roughness: 0.95, metalness: 0.08 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const borderMaterial = new THREE.MeshStandardMaterial({ color: 0x101827, roughness: 0.9 });

  const walls = [
    { size: [80, 5, 2], pos: [0, 2.5, -40] },
    { size: [80, 5, 2], pos: [0, 2.5, 40] },
    { size: [2, 5, 80], pos: [-40, 2.5, 0] },
    { size: [2, 5, 80], pos: [40, 2.5, 0] },
  ];

  walls.forEach((wall) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...wall.size), borderMaterial);
    mesh.position.set(...wall.pos);
    scene.add(mesh);
  });

  const cratePositions = [
    [-8, 1, -7], [8, 1, -10], [-12, 1, 5], [14, 1, 12], [0, 1, -15], [-18, 1, -18], [18, 1, 8], [22, 1, -4]
  ];

  cratePositions.forEach(([x, y, z], index) => {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 2.2, 3.5),
      new THREE.MeshStandardMaterial({
        color: index % 2 === 0 ? 0x4a576d : 0x5b697c,
        roughness: 0.8,
      })
    );
    crate.position.set(x, y, z);
    scene.add(crate);
    world.obstacles.push(crate);
  });
}

function createEnemy(position) {
  const mesh = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.7, 1.7, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0xff5233, roughness: 0.65, metalness: 0.15 })
  );
  body.castShadow = true;
  mesh.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xf6c9a7, roughness: 0.8 })
  );
  head.position.y = 1.5;
  mesh.add(head);

  mesh.position.copy(position);
  mesh.userData.enemy = {
    mesh,
    health: 100,
    speed: 2.6 + Math.random() * 1.1,
    attackTimer: 0,
    radius: 0.9,
    baseY: position.y,
  };

  scene.add(mesh);
  world.enemies.push(mesh.userData.enemy);
}

function spawnWave() {
  world.enemies.forEach((enemy) => {
    scene.remove(enemy.mesh);
  });
  world.enemies = [];

  const count = 5 + world.wave * 2;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.7;
    const radius = 18 + Math.random() * 18;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    createEnemy(new THREE.Vector3(x, 0, z));
  }

  setStatus(`Wave ${world.wave} incoming`);
  updateHud();
}

function shoot() {
  if (world.gameOver || !world.canShoot) return;

  const now = performance.now();
  if (now - world.lastShot < player.attackCooldown * 1000) return;
  world.lastShot = now;

  raycaster.setFromCamera(aimTarget, camera);
  const hitTargets = [];

  world.enemies.forEach((enemy) => {
    const intersections = raycaster.intersectObject(enemy.mesh, true);
    if (intersections.length > 0) {
      hitTargets.push({ enemy, distance: intersections[0].distance });
    }
  });

  if (hitTargets.length > 0) {
    hitTargets.sort((a, b) => a.distance - b.distance);
    const target = hitTargets[0].enemy;
    target.health -= 35;

    if (target.health <= 0) {
      scene.remove(target.mesh);
      world.score += 10;
      world.enemies = world.enemies.filter((enemy) => enemy !== target);

      if (world.enemies.length === 0) {
        world.wave += 1;
        spawnWave();
      }
    }

    updateHud();
  }
}

function handlePlayerMovement(delta) {
  const moveInput = new THREE.Vector3();

  if (keys.KeyW) moveInput.z -= 1;
  if (keys.KeyS) moveInput.z += 1;
  if (keys.KeyA) moveInput.x -= 1;
  if (keys.KeyD) moveInput.x += 1;

  if (moveInput.lengthSq() > 0) {
    moveInput.normalize();

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const desired = new THREE.Vector3();
    desired.addScaledVector(forward, moveInput.z);
    desired.addScaledVector(right, moveInput.x);
    desired.normalize();

    const moveAmount = player.speed * delta;
    camera.position.addScaledVector(desired, moveAmount);
  }

  camera.position.x = clamp(camera.position.x, -34, 34);
  camera.position.z = clamp(camera.position.z, -34, 34);
  camera.position.y = player.height;
}

function damagePlayer(amount) {
  if (world.gameOver) return;
  world.health -= amount;
  if (world.health <= 0) {
    world.health = 0;
    world.gameOver = true;
    setStatus('Mission failed. Press R to restart');
    ui.overlay.classList.add('visible');
  }
  updateHud();
}

function updateEnemies(delta) {
  const playerPos = camera.position.clone();

  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const enemy = world.enemies[i];
    const enemyPos = enemy.mesh.position;
    const toPlayer = new THREE.Vector3().subVectors(playerPos, enemyPos);
    toPlayer.y = 0;
    const distance = toPlayer.length();

    if (distance > 0.001) {
      toPlayer.normalize();
      enemy.mesh.position.addScaledVector(toPlayer, enemy.speed * delta);
    }

    enemy.mesh.lookAt(playerPos.x, enemy.mesh.position.y, playerPos.z);

    enemy.attackTimer -= delta;
    if (distance < 1.8 && enemy.attackTimer <= 0) {
      damagePlayer(12);
      enemy.attackTimer = 0.85;
    }
  }
}

function handlePointerLock() {
  if (document.pointerLockElement === renderer.domElement) {
    setStatus('Engage enemy forces');
  }
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.033);

  if (!world.gameOver) {
    handlePlayerMovement(delta);
    updateEnemies(delta);
  }

  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function startGame() {
  world.gameOver = false;
  world.health = 100;
  world.score = 0;
  world.wave = 1;
  ui.overlay.classList.remove('visible');
  resetPlayer();
  spawnWave();
  updateHud();
}

document.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if (event.code === 'KeyR' && world.gameOver) {
    startGame();
  }
});

document.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== renderer.domElement || world.gameOver) return;
  player.yaw -= event.movementX * 0.0022;
  player.pitch -= event.movementY * 0.0018;
  player.pitch = clamp(player.pitch, -1.4, 1.4);
});

document.addEventListener('mousedown', (event) => {
  if (event.button !== 0) return;
  if (document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
    return;
  }

  shoot();
});

document.addEventListener('pointerlockchange', handlePointerLock);
ui.startButton.addEventListener('click', () => {
  renderer.domElement.requestPointerLock();
  startGame();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

createLighting();
createArena();
resetPlayer();
updateHud();
setStatus('Click to lock pointer and start');
animate();
