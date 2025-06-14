import {OrbitControls} from './OrbitControls.js'
//import * as THREE from 'three';

const scene = new THREE.Scene();
// Set background color
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add lights to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 15);
scene.add(directionalLight);

// Enable shadows
renderer.shadowMap.enabled = true;
directionalLight.castShadow = true;

function degrees_to_radians(degrees) {
  var pi = Math.PI;
  return degrees * (pi/180);
}

// ========= Helpers =========
const Y_LINE = 0.11;            // lines slightly above floor
const COURT_LEN = 30;           // X‑size   (width)
const COURT_WID = 15;           // Z‑size   (length)
const HALF_LEN  = COURT_LEN/2;  // 15
const HALF_WID  = COURT_WID/2;  // 7.5

// Create basketball court
function createBasketballCourt() {
  // Court floor - just a simple brown surface
  const courtGeometry = new THREE.BoxGeometry(COURT_WID, 0.2, COURT_LEN);
  const courtMaterial = new THREE.MeshPhongMaterial({ color: 0xc68642,shininess: 50});
  const court = new THREE.Mesh(courtGeometry, courtMaterial);
  court.receiveShadow = true;
  scene.add(court);
  
  // Note: All court lines, hoops, and other elements have been removed
  // Students will need to implement these features
}

// Set camera position for better view
const cameraTranslate = new THREE.Matrix4();
cameraTranslate.makeTranslation(0, 15, 30);
camera.applyMatrix4(cameraTranslate);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
let isOrbitEnabled = true;

// Handle key events
function handleKeyDown(e) {
  if (e.key === "o") {
    isOrbitEnabled = !isOrbitEnabled;
  }
}

document.addEventListener('keydown', handleKeyDown);

//////////// NEW CODE :

function createCourtLines() {
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff });

  // Centre line (across Z at X=0)
  scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-HALF_WID, Y_LINE, 0),
      new THREE.Vector3( HALF_WID, Y_LINE, 0)
    ]), mat));

  // Centre circle
  const circlePts = Array.from({ length: 65 }, (_, i) => {
    const a = (i/64) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a)*1.8, Y_LINE, Math.sin(a)*1.8);
  });
  scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circlePts), mat));

  // 3‑pt arcs (one at each baseline Z ±7.5) – open toward centre (Z=0)
  const r = 6.75;
  [-HALF_LEN, HALF_LEN].forEach(z0 => {
    const pts = Array.from({ length: 65 }, (_, i) => {
      const t = -Math.PI/2 + (i/64)*Math.PI;  // –90° … 90°
      const x = Math.sin(t) * r;
      
      const z = z0 - Math.sign(z0) * Math.cos(t) * r; // push outward then flip inward
      return new THREE.Vector3(x, Y_LINE, z);
    });
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
  });
}


// ========= Hoops =========

function createHoop(zPos) {
  const group = new THREE.Group();
  const rimHeight = 3.05;

  // Backboard dimensions
  const boardW = 1.8;
  const boardH = 1.05;
  const boardT = 0.05;
  const boardCenterY = rimHeight;
  const armLen = 0.9;
  const poleHeight = 4;
  const boardZ = armLen + boardT/2;

  const canvas = document.createElement('canvas');
  canvas.width  = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // red, big two-line text at the top
  ctx.fillStyle    = '#ff0000';
  ctx.font         = 'bold 72px Arial';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';

  const x = canvas.width/2;
  const topMargin = 20;

  // line 1
  ctx.fillText('THE FINAL -', x, topMargin);
  // line 2 (just below line 1)
  ctx.fillText('Shay VS Daniel', x, topMargin + 72 + 10);
  
  const boardTexture = new THREE.CanvasTexture(canvas);

  const boardMat     = new THREE.MeshPhongMaterial({
    map:         boardTexture,
    transparent: true,
    opacity:     0.9
  });

    // backboard mesh
  const backboard = new THREE.Mesh(
    new THREE.BoxGeometry(boardW, boardH, boardT),
    boardMat
  );
  // position it just above the rim height
  backboard.position.set(0, rimHeight, boardZ);
  backboard.castShadow = backboard.receiveShadow = true;
  group.add(backboard);

  // Rim
  const rimR = 0.36;
  const rimTub = 0.02;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(rimR, rimTub, 16, 64),
    new THREE.MeshPhongMaterial({ color: 0xff6600 })
  );
  rim.rotation.x = Math.PI / 2;
  const boardFrontZ = boardZ + boardT / 2;
  const rimDistance = 0.35; 
  const rimZ        = boardFrontZ + rimDistance;
  rim.position.set(0, rimHeight, rimZ);
  rim.castShadow = true;
  group.add(rim);

  // Net
  const netGroup = new THREE.Group();
  const netSegments = 10;
  const netDepth = 0.35;
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });

  for (let i = 0; i < netSegments; i++) {
    const angle = (i / netSegments) * Math.PI * 2;
    const startX = Math.cos(angle) * rimR * 0.85;
    const startZ = Math.sin(angle) * rimR * 0.85;

    const points = [];
    for (let j = 0; j <= 6; j++) {
      const t = j / 6;
      const y = -t * netDepth;
      const taper = 1 - t * 0.4;
      const x = startX * taper;
      const z = startZ * taper;
      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, lineMaterial);
    netGroup.add(line);
  }

  netGroup.position.set(0, rimHeight, rimZ);
  group.add(netGroup);

  // Pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, poleHeight, 16),
    new THREE.MeshPhongMaterial({ color: 0x666666 })
  );
  pole.position.set(0, poleHeight / 2, 0); // Base is at (0,0,0)
  pole.castShadow = true;
  group.add(pole);

  // Support arm
  const supportArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, armLen),
    new THREE.MeshPhongMaterial({ color: 0x666666 })
  );
  supportArm.position.set(0, boardCenterY, armLen / 2);
  supportArm.castShadow = true;
  group.add(supportArm);

  // Position and orient the entire hoop group
   group.position.set(0,0,zPos);
   if (zPos > 0) group.rotation.y = Math.PI;
   scene.add(group);
   return group;
}

// ========= Basketball =========
function createStaticBall() {
  const r = 0.24;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(r,32,32), new THREE.MeshPhongMaterial({color:0xffa500}));
  ball.position.set(0, r+0.1, 0);
  ball.castShadow=true;
  scene.add(ball);
  // seams
  const seamMat = new THREE.MeshBasicMaterial({color:0x000000});
  ['x','z'].forEach(ax=>{
    const ring=new THREE.Mesh(new THREE.TorusGeometry(r,0.005,8,100), seamMat);
    ring.rotation[ax==='x'?'x':'z']=Math.PI/2;
    ball.add(ring);
  });
}

// ====== Bonus -Stadium Environment ======
function createBleachers() {
  const bleacherGroup = new THREE.Group();
  const levels = 4;
  const stepHeight = 0.4;
  const stepDepth = 1;
  const seatLength = COURT_LEN; // Z direction

  const bleacherOffset = 0.5; // extra space after court

  for (let i = 0; i < levels; i++) {
    const height = stepHeight * i;
    const xOffset = HALF_WID + bleacherOffset + i * stepDepth;

    // Far side (positive X)
    const bleacher = new THREE.Mesh(
      new THREE.BoxGeometry(seatLength, stepHeight, stepDepth),
      new THREE.MeshPhongMaterial({ color: 0xffffff })
    );
    bleacher.rotation.y = Math.PI / 2;
    bleacher.position.set(xOffset, height + stepHeight / 2, 0);
    bleacher.castShadow = bleacher.receiveShadow = true;
    bleacherGroup.add(bleacher);

    // Near side (negative X)
    const bleacher2 = bleacher.clone();
    bleacher2.position.x = -xOffset;
    bleacherGroup.add(bleacher2);
  }

  scene.add(bleacherGroup);
}

function create3DBanner() {
  const boardWidth = 6;
  const boardHeight = 2;
  const boardDepth = 0.3;

  // Scoreboard body
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(boardWidth, boardHeight, boardDepth),
    new THREE.MeshPhongMaterial({ color: 0x222222 }) // dark gray
  );
  board.position.set(0, 8, 0);
  board.castShadow = true;

  // Create texture using canvas
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#111'; // near-black background
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Centered "NBA" text in LED color
  ctx.fillStyle = '#39FF14'; // electric green
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NBA FINAL', canvas.width / 2, canvas.height / 2);

  // Apply as texture
  const texture = new THREE.CanvasTexture(canvas);
  const textMat = new THREE.MeshBasicMaterial({ map: texture });
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(boardWidth - 0.4, boardHeight - 0.4),
    textMat
  );
  screen.position.set(0, 0, boardDepth / 2 + 0.01);
  board.add(screen);

  scene.add(board);
}

// ========= Bonus - KeyAndFreeThrow =========
function createKeyAndFreeThrow() {
  const mat      = new THREE.LineBasicMaterial({ color: 0xffffff });
  const keyWidth = 4.9, keyLength = 4.1, ftRadius = keyWidth/2;
  const segments = 32;

  [ -HALF_LEN, HALF_LEN ].forEach(zBase => {
    const dir   = Math.sign(zBase);
    const zFree = zBase - dir*keyLength;

    // 1) draw the key rectangle
    const lanePts = [
      new THREE.Vector3(-keyWidth/2, Y_LINE, zBase),
      new THREE.Vector3( keyWidth/2, Y_LINE, zBase),
      new THREE.Vector3( keyWidth/2, Y_LINE, zFree),
      new THREE.Vector3(-keyWidth/2, Y_LINE, zFree),
      new THREE.Vector3(-keyWidth/2, Y_LINE, zBase)
    ];
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(lanePts),
      mat
    ));

    // 2) draw only the free-throw semicircle (big)
    const ftPts = [];
    for (let i = 0; i <= segments; i++) {
      const theta = Math.PI * (i / segments); // 0 → π
      const x     = Math.cos(theta) * ftRadius;
      const z     = zFree - dir * Math.sin(theta) * ftRadius;
      ftPts.push(new THREE.Vector3(x, Y_LINE, z));
    }
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(ftPts),
      mat
    ));
  });
}

// ========= UI =========
function setupUI() {
  // Score display (top-left)
  const scoreElement = document.createElement('div');
  scoreElement.id = 'scoreboard';
  scoreElement.style.position = 'absolute';
  scoreElement.style.top = '20px';
  scoreElement.style.left = '20px';
  scoreElement.style.color = 'white';
  scoreElement.style.fontSize = '16px';
  scoreElement.style.fontFamily = 'Arial, sans-serif';
  scoreElement.style.textAlign = 'left';
  scoreElement.innerHTML = `<h3>Score: <span id="score-value">0</span></h3>`;
  document.body.appendChild(scoreElement);

  // Instructions display (bottom-left)
  const instructionsElement = document.createElement('div');
  instructionsElement.id = 'controls';
  instructionsElement.style.position = 'absolute';
  instructionsElement.style.bottom = '20px';
  instructionsElement.style.left = '20px';
  instructionsElement.style.color = 'white';
  instructionsElement.style.fontSize = '16px';
  instructionsElement.style.fontFamily = 'Arial, sans-serif';
  instructionsElement.style.textAlign = 'left';
  instructionsElement.innerHTML = `
    <h3>Controls:</h3>
    <p>O - Toggle orbit camera</p>
    <p>← ↑ → ↓ – Move ball</p>
    <p>W / S – Adjust shot power</p>
    <p>SPACE – Shoot ball</p>
    <p>R – Reset Ball</p>
  `;
  document.body.appendChild(instructionsElement);
}

// Handle resize
function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleResize);

// ===== Initialize scene =====
// Create all elements
createBasketballCourt();
createCourtLines();
createHoop( HALF_LEN);
createHoop(-HALF_LEN);
createStaticBall();
createBleachers();
create3DBanner();
createKeyAndFreeThrow();
setupUI();

////////////

// Animation function
function animate() {
  requestAnimationFrame(animate);
  
  // Update controls
  controls.enabled = isOrbitEnabled;
  controls.update();
  
  renderer.render(scene, camera);
}

animate();