import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  TextureLoader,
  WebGLRenderer,
} from 'three';

// Global mesh object of the cube
let boxMesh;
let scene;
let renderer;
let camera;

// Init scene
const initializeScene = () => {
  scene = new Scene();
  camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  renderer = new WebGLRenderer();
  renderer.setSize(window.innerWidth - 5, window.innerHeight - 5);
  document.body.appendChild(renderer.domElement);

  // Load textures
  const sunTexture = new TextureLoader().load( './assets/sun.png' );

  // Scene Objects
  const geometry = new BoxGeometry(5, 5, 5);
  const material = new MeshBasicMaterial({
    map: sunTexture,
    side: DoubleSide,
  });
  boxMesh = new Mesh(geometry, material);
  boxMesh.position.set(0, 0, 10.0);
  scene.add(boxMesh);

  camera.position.z = 100;
}

const animateScene = () => {
  requestAnimationFrame(animateScene);

  // boxMesh.rotation.x += 0.01;
  // boxMesh.rotation.y += 0.01;

  renderer.render(scene, camera);
};

// Inicialization
const init = () => {
  // Initialize the scene
  initializeScene();
  // Animate the scene
  animateScene();
}

// Let's make this work
init();
