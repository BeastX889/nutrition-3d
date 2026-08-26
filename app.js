import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ─── renderer / scene / camera ───────────────────────────────────────────────
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x07090f, 0.0055);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 600);
camera.position.set(0, 26, 78);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.getElementById('scene').appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
document.getElementById('labels').appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 8;
controls.maxDistance = 160;

// ─── lights ──────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x8890b0, 0.55));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
keyLight.position.set(30, 50, 40);
scene.add(keyLight);
const coreLight = new THREE.PointLight(0xa78bfa, 900, 200, 1.8);
scene.add(coreLight);

// ─── starfield ───────────────────────────────────────────────────────────────
{
  const g = new THREE.BufferGeometry();
  const N = 2600, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 180 + Math.random() * 220;
    const t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
    pos[i*3]   = r * Math.sin(p) * Math.cos(t);
    pos[i*3+1] = r * Math.cos(p);
    pos[i*3+2] = r * Math.sin(p) * Math.sin(t);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x7c88b8, size: 0.7, sizeAttenuation: true, transparent: true, opacity: 0.8 })));
}

// ─── galaxy group (rotates as one) ──────────────────────────────────────────
const galaxy = new THREE.Group();
scene.add(galaxy);

// glowing core
const core = new THREE.Mesh(
  new THREE.SphereGeometry(3.2, 48, 48),
  new THREE.MeshStandardMaterial({ color: 0x2a2050, emissive: 0xa78bfa, emissiveIntensity: 1.5, roughness: 0.3 })
);
galaxy.add(core);
const coreHalo = new THREE.Mesh(
  new THREE.SphereGeometry(4.6, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.10, side: THREE.BackSide })
);
galaxy.add(coreHalo);
{
  const el = document.createElement('div');
  el.className = 'node-label hub';
  el.style.color = '#c9b8ff';
  el.textContent = 'NUTRITION';
  const lab = new CSS2DObject(el);
  lab.position.set(0, 5.6, 0);
  core.add(lab);
}

// ─── build nutrient nodes ────────────────────────────────────────────────────
const HUB_R = 34;                       // distance of each group hub from core
const groupKeys = Object.keys(GROUPS);  // macros, vitamins, minerals
const pickables = [];                   // meshes for raycasting
const nodeById = {};

groupKeys.forEach((gk, gi) => {
  const G = GROUPS[gk];
  const angle = gi * (Math.PI * 2 / 3) - Math.PI / 2;
  const hubPos = new THREE.Vector3(Math.cos(angle) * HUB_R, 0, Math.sin(angle) * HUB_R);

  // hub marker (small glowing sphere + ring)
  const hub = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 32, 32),
    new THREE.MeshStandardMaterial({ color: G.hex, emissive: G.hex, emissiveIntensity: 1.2, roughness: 0.35 })
  );
  hub.position.copy(hubPos);
  galaxy.add(hub);

  const hubLab = document.createElement('div');
  hubLab.className = 'node-label hub';
  hubLab.style.color = G.color;
  hubLab.textContent = G.name;
  const hl = new CSS2DObject(hubLab);
  hl.position.set(0, 3.2, 0);
  hub.add(hl);

  // faint connective line core → hub
  galaxy.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), hubPos]),
    new THREE.LineBasicMaterial({ color: G.hex, transparent: true, opacity: 0.18 })
  ));

  // nutrients of this group on a fibonacci sphere around the hub
  const members = NUTRIENTS.filter(n => n.group === gk);
  const CLUSTER_R = 8.5 + members.length * 0.45;
  members.forEach((n, i) => {
    const k = i + 0.5;
    const phi = Math.acos(1 - 2 * k / members.length);
    const theta = Math.PI * (1 + Math.sqrt(5)) * k;
    const local = new THREE.Vector3(
      CLUSTER_R * Math.sin(phi) * Math.cos(theta),
      CLUSTER_R * Math.cos(phi) * 0.72,
      CLUSTER_R * Math.sin(phi) * Math.sin(theta)
    );
    const pos = hubPos.clone().add(local);

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(n.size, 36, 36),
      new THREE.MeshStandardMaterial({ color: G.hex, emissive: G.hex, emissiveIntensity: 0.35, roughness: 0.4, metalness: 0.1 })
    );
    mesh.position.copy(pos);
    mesh.userData = { nutrient: n, group: G, baseScale: 1 };
    galaxy.add(mesh);
    pickables.push(mesh);
    nodeById[n.id] = mesh;

    // label
    const el = document.createElement('div');
    el.className = 'node-label';
    el.textContent = n.name.split('·')[0].trim();
    const lab = new CSS2DObject(el);
    lab.position.set(0, n.size + 0.4, 0);
    mesh.add(lab);

    // thin line hub → nutrient
    galaxy.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([hubPos, pos]),
      new THREE.LineBasicMaterial({ color: G.hex, transparent: true, opacity: 0.10 })
    ));
  });
});

// ─── UI: sidebar list ────────────────────────────────────────────────────────
const listEl = document.getElementById('nutrient-list');
groupKeys.forEach(gk => {
  const G = GROUPS[gk];
  const title = document.createElement('div');
  title.className = 'group-title';
  title.innerHTML = `<span class="sw" style="background:${G.color}"></span>${G.name}`;
  listEl.appendChild(title);
  NUTRIENTS.filter(n => n.group === gk).forEach(n => {
    const item = document.createElement('div');
    item.className = 'n-item';
    item.dataset.id = n.id;
    item.innerHTML = `<span class="sym" style="color:${G.color}">${n.symbol}</span>${n.name.split('·')[0].trim()}`;
    item.onclick = () => selectNutrient(n.id);
    listEl.appendChild(item);
  });
});

// ─── UI: detail panel ────────────────────────────────────────────────────────
const detail = document.getElementById('detail');
const dScroll = document.getElementById('d-scroll');
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;');

function renderDetail(n) {
  const G = GROUPS[n.group];
  const li = arr => arr.map(x => `<li>${esc(x)}</li>`).join('');
  dScroll.innerHTML = `
    <span class="d-group" style="color:${G.color}"><span class="sw" style="width:7px;height:7px;border-radius:50%;background:${G.color}"></span>${G.name}</span>
    <div class="d-name">${esc(n.name)}</div>
    <div class="d-tag">${esc(n.tagline)}</div>
    <div class="d-chips">
      <div class="chip"><b>Daily need (RDA)</b>${esc(n.rda)}</div>
      ${n.energy ? `<div class="chip"><b>Energy</b>${esc(n.energy)}</div>` : ''}
    </div>
    <p class="d-desc">${esc(n.description)}</p>
    <div class="d-sec" style="--nc:${G.color}"><h4>⚙️ What it does</h4><ul>${li(n.functions)}</ul></div>
    <div class="d-sec" style="--nc:${G.color}"><h4>🍽️ Best food sources</h4><ul>${li(n.sources)}</ul></div>
    <div class="d-sec" style="--nc:#ff8fa8"><h4>⚠️ Deficiency signs</h4><ul>${li(n.deficiency)}</ul></div>
    <div class="d-warn"><b>Too much?</b> ${esc(n.excess)}</div>
    <div class="d-fact"><b>💡 Did you know:</b> ${esc(n.fact)}</div>`;
  dScroll.scrollTop = 0;
  detail.classList.add('open');
}
document.getElementById('d-close').onclick = () => { detail.classList.remove('open'); clearSelection(); };

// ─── selection & camera fly-to ───────────────────────────────────────────────
let selected = null;
let flyTarget = null;   // {camPos, lookAt, t}

function selectNutrient(id) {
  const mesh = nodeById[id];
  if (!mesh) return;
  if (selected) selected.material.emissiveIntensity = 0.35;
  selected = mesh;
  mesh.material.emissiveIntensity = 1.2;

  document.querySelectorAll('.n-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));
  renderDetail(mesh.userData.nutrient);

  // world position of node (galaxy may be rotated)
  const world = new THREE.Vector3();
  mesh.getWorldPosition(world);
  const dir = world.clone().sub(new THREE.Vector3(0,0,0)).normalize();
  const camPos = world.clone().add(dir.multiplyScalar(10)).add(new THREE.Vector3(0, 3.5, 0));
  flyTarget = { camPos, lookAt: world.clone(), t: 0 };
  spin = false; updateSpinBtn();
  document.getElementById('hint').classList.add('gone');
}

function clearSelection() {
  if (selected) { selected.material.emissiveIntensity = 0.35; selected = null; }
  document.querySelectorAll('.n-item').forEach(el => el.classList.remove('active'));
}

document.getElementById('btn-reset').onclick = () => {
  detail.classList.remove('open'); clearSelection();
  flyTarget = { camPos: new THREE.Vector3(0, 26, 78), lookAt: new THREE.Vector3(0,0,0), t: 0 };
};

// ─── raycasting: hover + click ───────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = null;
let downXY = null;

renderer.domElement.addEventListener('pointermove', e => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
});
renderer.domElement.addEventListener('pointerdown', e => { downXY = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!downXY) return;
  const moved = Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]);
  downXY = null;
  if (moved > 6) return;              // was a drag, not a click
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickables)[0];
  if (hit) selectNutrient(hit.object.userData.nutrient.id);
});

// ─── search ──────────────────────────────────────────────────────────────────
document.getElementById('search').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('.n-item').forEach(el => {
    const n = NUTRIENTS.find(x => x.id === el.dataset.id);
    const hay = (n.name + ' ' + n.symbol + ' ' + n.tagline).toLowerCase();
    el.classList.toggle('dim', q && !hay.includes(q));
  });
  pickables.forEach(m => {
    const n = m.userData.nutrient;
    const hay = (n.name + ' ' + n.symbol + ' ' + n.tagline).toLowerCase();
    const match = !q || hay.includes(q);
    m.material.opacity = match ? 1 : 0.12;
    m.material.transparent = !match;
    m.children[0].element.style.opacity = match ? 1 : 0.15;
  });
});
document.getElementById('search').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const first = [...document.querySelectorAll('.n-item')].find(el => !el.classList.contains('dim'));
    if (first) selectNutrient(first.dataset.id);
  }
});

// ─── toggles ─────────────────────────────────────────────────────────────────
let spin = true;
const spinBtn = document.getElementById('btn-spin');
function updateSpinBtn(){ spinBtn.classList.toggle('active', spin); }
spinBtn.onclick = () => { spin = !spin; updateSpinBtn(); };
document.getElementById('btn-list').onclick = () => document.getElementById('sidebar').classList.toggle('hidden');
document.getElementById('enter').onclick = () => document.getElementById('intro').classList.add('gone');
setTimeout(() => document.getElementById('hint')?.classList.add('gone'), 12000);

// ─── resize ──────────────────────────────────────────────────────────────────
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});

// ─── main loop ───────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.elapsedTime;

  if (spin && !flyTarget) galaxy.rotation.y += dt * 0.05;
  core.scale.setScalar(1 + Math.sin(t * 1.6) * 0.04);
  coreHalo.scale.setScalar(1 + Math.sin(t * 1.6 + 0.6) * 0.07);

  // gentle bob on selected node
  if (selected) selected.scale.setScalar(1 + Math.sin(t * 3) * 0.06);

  // hover highlight
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickables)[0];
  const target = hit ? hit.object : null;
  if (hovered !== target) {
    if (hovered && hovered !== selected) { hovered.material.emissiveIntensity = 0.35; hovered.scale.setScalar(1); }
    hovered = target;
    if (hovered && hovered !== selected) { hovered.material.emissiveIntensity = 0.9; hovered.scale.setScalar(1.15); }
    renderer.domElement.style.cursor = hovered ? 'pointer' : 'grab';
  }

  // camera fly animation
  if (flyTarget) {
    flyTarget.t = Math.min(1, flyTarget.t + dt * 1.1);
    const k = 1 - Math.pow(1 - flyTarget.t, 3);   // ease-out cubic
    camera.position.lerp(flyTarget.camPos, k * 0.12 + 0.02);
    controls.target.lerp(flyTarget.lookAt, k * 0.12 + 0.02);
    if (flyTarget.t >= 1 && camera.position.distanceTo(flyTarget.camPos) < 0.15) flyTarget = null;
  }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();
