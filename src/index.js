import {
  AmbientLight,
  Audio,
  AudioListener,
  AudioLoader,
  Camera,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  TextureLoader,
  WebGLRenderer,
} from 'three';

// Global mesh object of the cube
let sunMesh;
let scene;
let renderer;
let camera;
let audioListener;
let ambientMusic;
let toggleMusic = true;
let groundMesh;
let ambientLight;
let directionalLight;

// Init scene
const initializeScene = () => {
  // instantiate a listener
  audioListener = new AudioListener();
  scene = new Scene();
  camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.add(audioListener);
  renderer = new WebGLRenderer();
  renderer.setSize(window.innerWidth - 5, window.innerHeight - 5);

  // Render canvas on document container
  document.getElementById("renderView").appendChild(renderer.domElement);

  // Load music
  ambientMusic = new Audio(audioListener);
  scene.add(ambientMusic);
  // load a sound and set it as the Audio object's buffer
  const audioLoader = new AudioLoader();
  audioLoader.load( './dist/assets/song1.mp3', (buffer) => {
  	ambientMusic.setBuffer(buffer);
  	ambientMusic.setLoop(true);
  	ambientMusic.setVolume(0.5);
  	ambientMusic.play();
  });

  // Load textures
  const sunTexture = new TextureLoader().load( './dist/assets/sun.png' );
  const spaceTexture = new TextureLoader().load( './dist/assets/space2.jpg' );
  const gridTexture = new TextureLoader().load( './dist/assets/grid.png' );

  // SCENE OBJECTS ----------------------------------------------------
  // Lights
  directionalLight = new DirectionalLight(0xed0be5, 5.0);
  directionalLight.position.set(0.0, 0.0, 1.0);

  // Space background
  const backgroundMesh = new Mesh(
    new PlaneGeometry(34, 34, 0),
    new MeshBasicMaterial({
        map: spaceTexture,
    }),
  );
  backgroundMesh.position.set(0, 0, 10.0);

  groundMesh = new Mesh(
    new PlaneGeometry(34, 34, 0),
    new MeshLambertMaterial({
        side: DoubleSide,
        map: gridTexture,
    }),
  );
  groundMesh.position.set(0, -8, 32.0);
  groundMesh.rotation.x = 1.85;

  // Sun
  const sunGeo = new PlaneGeometry(20, 20, 20);
  const sunMat = new MeshBasicMaterial({
    map: sunTexture,
    side: DoubleSide,
    transparent: true,
  });
  sunMesh = new Mesh(sunGeo, sunMat);
  sunMesh.position.set(0, 3.5, 15.0);

  // render objects
  scene.add(backgroundMesh);
  scene.add(groundMesh);
  scene.add(sunMesh);
  scene.add(directionalLight);

  camera.position.z = 40;

  // Event listeners
  document.getElementById('musicButton')
  .addEventListener("click", onMusicToggle, false);
};


// EVENTS --------------------------------------------------------------
const onMusicToggle = (event) => {
    if (toggleMusic) {
      ambientMusic.pause();
      toggleMusic = false;
      event.target.children[0].classList.remove("fa-pause");
      event.target.children[0].classList.add("fa-play");
    } else {
      ambientMusic.play();
      toggleMusic = true;
      event.target.children[0].classList.remove("fa-play");
      event.target.children[0].classList.add("fa-pause");
    }
};


const animateScene = () => {
  requestAnimationFrame(animateScene);

  //groundMesh.rotation.x += 0.01;
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
