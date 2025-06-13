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

// Instructions display
const instructionsElement = document.createElement('div');
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
`;
document.body.appendChild(instructionsElement);

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
  const boardBottom = rimHeight + 0.15;
  const boardCenterY = boardBottom + boardH / 2;

  // Backboard mesh at origin
  const backboard = new THREE.Mesh(
    new THREE.BoxGeometry(boardW, boardH, boardT),
    new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
  );
  backboard.position.set(0, boardCenterY, 0);
  backboard.receiveShadow = true;
  backboard.castShadow = true;
  group.add(backboard);

  // Rim (torus) - proper regulation size
  const rimR = 0.23; // FIXED: Regulation rim radius (18 inch diameter = 0.46m diameter = 0.23m radius)
  const rimTub = 0.02;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(rimR, rimTub, 16, 64),
    new THREE.MeshPhongMaterial({ color: 0xff6600 })
  );
  rim.rotation.x = Math.PI / 2;
  // Position rim 6 inches (0.15m) out from the front face of the backboard
  const frontFace = boardT / 2;
  rim.position.set(0, rimHeight, frontFace + 0.15);
  rim.castShadow = true;
  group.add(rim);

  // More visible net using thicker lines
  const netGroup = new THREE.Group();
  const netSegments = 10;
  const netDepth = 0.35;
  
  const lineMaterial = new THREE.LineBasicMaterial({ 
    color: 0xffffff, 
    transparent: false, // FIXED: Made net more visible
    linewidth: 3 // FIXED: Thicker lines
  });

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
  
  netGroup.position.set(0, rimHeight, frontFace + 0.15);
  group.add(netGroup);

  // Support pole positioned BEHIND the backboard
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 4, 16),
    new THREE.MeshPhongMaterial({ color: 0x666666 })
  );
  pole.position.set(0, 2, -(boardT / 2 + 0.8));
  pole.castShadow = true;
  group.add(pole);

  // Support arm
  const supportArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.9),
    new THREE.MeshPhongMaterial({ color: 0x666666 })
  );
  supportArm.position.set(0, boardCenterY, -(boardT / 2 + 0.35));
  supportArm.castShadow = true;
  group.add(supportArm);

  // Position and orient the entire hoop group
  group.position.set(0, 0, zPos);
  if (zPos > 0) group.rotation.y = Math.PI;

  scene.add(group);
  return group;
}

// function createHoop(zPos) {
//   // Backboard – faces centre court
//   const bb = new THREE.Mesh(
//     new THREE.BoxGeometry(1.8, 1.05, 0.05),
//     new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
//   );
//   bb.position.set(0, 3.575, zPos);
//   bb.rotation.y = zPos > 0 ? Math.PI : 0; // flip 180° for far basket
//   bb.castShadow = bb.receiveShadow = true;
//   scene.add(bb);

//   // Rim
//   const rim = new THREE.Mesh(
//     new THREE.TorusGeometry(0.45, 0.02, 16, 100),
//     new THREE.MeshPhongMaterial({ color: 0xff8c00 })
//   );
//   rim.rotation.x = Math.PI/2;
//   rim.position.set(0, 3.05, zPos + (zPos > 0 ? -0.2 : 0.2));
//   rim.castShadow = true;
//   scene.add(rim);

//   // Net – 8 vertical segments
//   const netMat = new THREE.LineBasicMaterial({ color: 0xffffff });
//   for (let i=0;i<8;i++){
//     const a = (i/8)*Math.PI*2;
//     const x = Math.cos(a)*0.45;
//     const yT= 3.05 + Math.sin(a)*0.45;
//     const p1=new THREE.Vector3(x, yT, zPos);
//     const p2=new THREE.Vector3(x, yT-0.6, zPos);
//     scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1,p2]), netMat));
//   }

//   // Pole
//   const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,3.5,16), new THREE.MeshPhongMaterial({color:0x666666}));
//   pole.position.set( zPos>0? -1:1 ,1.75, zPos + (zPos>0? -0.8:0.8));
//   pole.rotation.y = Math.PI/2; // tilt toward court depth
//   pole.castShadow=true;
//   scene.add(pole);

//   // Arm connecting pole to board
//   const arm = new THREE.Mesh(new THREE.BoxGeometry(1,0.1,0.1), new THREE.MeshPhongMaterial({color:0x666666}));
//   arm.position.set(0,3.05, zPos + (zPos>0? -0.5:0.5));
//   arm.castShadow=true;
//   scene.add(arm);
// }

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

// ========= UI =========
function setupUI(){
  const div=document.createElement('div');
  div.style.position='absolute';div.style.top='20px';div.style.right='20px';div.style.color='#fff';
  div.innerHTML='<b>Controls</b><br>O – toggle orbit';
  document.body.appendChild(div);
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