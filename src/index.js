import {
  Audio,
  AudioListener,
  AudioLoader,
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

import Physics from 'physicsjs';

// Global mesh object of the cube
let sunMesh;
let scene;
let renderer;
let camera;
let audioListener;
let ambientMusic;
let toggleMusic = true;
let groundMesh;
let directionalLight;

// Physics Practice Part
Physics(function (world) {
  // bounds of the window
  var viewportBounds = Physics.aabb(0, 0, window.innerWidth, window.innerHeight),
    edgeBounce,
    renderer;

  // create a renderer
  renderer = Physics.renderer('canvas', {
    el: 'viewport'
  });

  // add the renderer
  world.add(renderer);
  // render on each step
  world.on('step', () => (world.render()));

  // constrain objects to these bounds
  edgeBounce = Physics.behavior('edge-collision-detection', {
    aabb: viewportBounds,
    restitution: 0.2,
    cof: 0.8,
  });

  // resize events
  window.addEventListener('resize', () => {
    // as of 0.7.0 the renderer will auto resize... so we just take the values from the renderer
    viewportBounds = Physics.aabb(0, 0, renderer.width, renderer.height);
    // update the boundaries
    edgeBounce.setAABB(viewportBounds);
  }, true);

  const lerp = (a, b, p) => {
    return (b - a) * p + a;
  };

  const treeStyles = {
    strokeStyle: '#000000',
    lineCap: 'round',
    lineWidth: 1,
  };

  const leafStyles = {
    fillStyle: '#00FDF1',
  };

  // create a fractal tree
  const generateTree = (origin, depth, branchLength, segmentCoef, theta) => {
    const nodes = [];
    const constraints = Physics.behavior('verlet-constraints', { iterations: 2 });

    // set up the base and root to define an angle constraint upwards to keep the tree upright
    const base = Physics.body('rectangle', {
      x: origin.x,
      y: origin.y,
      width: 300,
      height: 50,
      treatment: 'static',
      hidden: true,
      mass: 100,
    });

    const root = Physics.body('circle', {
      x: origin.x,
      y: origin.y - 10,
      radius: 0.5,
      treatment: 'static',
      hidden: true,
      mass: 100,
    });

    nodes.push(base, root);

    // recursive function to create branches
    const branch = (parent, i, nMax, branchVec) => {
      var particle = Physics.body('circle',
        {
          radius: 30,
          hidden: true,
          mass: 0.04 * branchVec.normSq(),
        });
      particle.state.pos.clone(parent.state.pos).vadd(branchVec);
      nodes.push(particle);

      constraints.distanceConstraint(parent, particle, 0.7);

      if (i < nMax) {
        var trans = Physics.transform(false, -theta, particle.state.pos);
        var a = branch(particle, i + 1, nMax, branchVec.rotate( trans ).mult( segmentCoef * segmentCoef ).clone());
        var b = branch(particle, i + 1, nMax, branchVec.rotate( trans.setRotation( 2 * theta ) ).clone());

        var jointStrength = lerp(0.7, 0, i/nMax);
        constraints.angleConstraint(parent, particle, a, jointStrength);
        constraints.angleConstraint(parent, particle, b, jointStrength);
      } else {

        var leaf = Physics.body('circle',
          {
            radius: 5,
            width: 20,
            height: 5,
            mass: 1,
            angle: Math.random(),
            styles: leafStyles,
          });
        leaf.state.pos.clone(particle.state.pos);
        constraints.distanceConstraint(particle, leaf, .1);
        leaf.leaf = true;
        leaf.attached = true;
        nodes.push(leaf);
      }

      return particle;
    };

    const firstBranch = branch(root, 0, depth, Physics.vector(0, -branchLength));
    constraints.angleConstraint(base, root, firstBranch, 1);

    // add the constraints to the array so that the whole shebang can be added with world.add
    nodes.push(constraints);
    nodes.constraints = constraints;
    return nodes;
  };

  // create the palm tree
  const createPalmTree = () => {
    const tree = generateTree.apply(this, [
      {
        x: renderer.width / 2,
        y: renderer.height - 100,
      },
      8,
      100,
      0.92,
      (Math.PI / 2) / 4],
    );
    world.add(tree);

    // handle detaching the leaves
    world.on('integrate:positions', function () {
      const constrs = tree.constraints.getConstraints().distanceConstraints;
      let c;
      let threshold = 0.35;
      let leaf;

      for (var i = 0, l = constrs.length; i < l; ++i) {
        c = constrs[i];

        if (c.bodyA.leaf) {
          leaf = c.bodyA;
        } else if (c.bodyB.leaf) {
          leaf = c.bodyB;
        } else {
          leaf = false;
        }

        if (leaf && (leaf.state.vel.norm() > threshold && Math.random() > 0.99 || Math.random() > 0.9999)) {
          tree.constraints.remove(c);
          leaf.state.vel.zero();
          leaf.attached = false;
        }
      }

      // higher priority than constraint resolution
    }, null, 100);

    // render the branches
    world.on('render-trees', (ctx) => {
      var constrs = tree.constraints.getConstraints().distanceConstraints, c;

      for (var i = 0, l = constrs.length; i < l; ++i) {
        c = constrs[i];
        treeStyles.lineWidth = '' + c.targetLength * c.targetLength * 0.0056;
        renderer.drawLine(c.bodyA.state.pos, c.bodyB.state.pos, treeStyles, ctx);
      }
    });
  };

  createPalmTree();

  renderer.addLayer('trees', null, { zIndex: 0 }).render = function() {
    this.ctx.clearRect(0, 0, this.el.width, this.el.height);
    world.emit('render-trees', this.ctx);
  };

  // add wind
  Physics.behavior('wind', function(parent) {
    return {
      init: function(options) {
        parent.init.call(this, options);

        this.theta = 0;
        this.jitter = options.jitter || 1;
        this.radius = options.radius || 100;
        this.strength = options.strength || 0.000005;
        this.ground = options.ground;
      },
      behave: function(data) {
        var bodies = data.bodies,
          scratch = Physics.scratchpad(),
          dir = scratch.vector(),
          tmp = scratch.vector(),
          filter = this.filterType,
          body,
          mul = this.jitter * Math.PI * 2,
          r = this.radius * this.strength,
          cutoff = this.ground - 20;

        for (var i = 0, l = bodies.length; i < l; i++) {
          body = bodies[i];
          this.theta += (Math.random() - 0.5) * mul;
          if (body.leaf) {
            if (body.attached) {
              tmp.zero();
            } else {
              tmp.set(Math.random()-0.5, Math.random()-0.5).mult(r * 1000);
            }

            if (cutoff && body.state.pos.get(1) < cutoff) {
              body.applyForce(dir.clone({ x: Math.cos( this.theta ) * r, y: Math.sin( this.theta ) * r - (0.0004 - 0.00004) * body.mass }), tmp);
            }
          }

          // constrain angular velocity
          body.state.angular.vel = Math.min(Math.max(body.state.angular.vel, -0.01), 0.01);
        }

        scratch.done();
      }
    };
  });

  // add some fun interaction
  var attractor = Physics.behavior('attractor', {
    order: 0,
    strength: 0.002
  });
  world.on({
    'interact:poke': function(pos) {
      world.wakeUpAll();
      attractor.position(pos);
      world.add(attractor);
    },
    'interact:move': function(pos) {
      attractor.position(pos);
    },
    'interact:release': function() {
      world.wakeUpAll();
      world.remove(attractor);
    },
  });

  // add things to the world
  world.add([
    Physics.integrator('verlet', { drag: 0.003 }),
    Physics.behavior('interactive', { el: renderer.el }),
    Physics.behavior('constant-acceleration'),
    Physics.behavior('body-impulse-response'),
    Physics.behavior('wind', { ground: renderer.height }),
    edgeBounce,
  ]);

  // subscribe to ticker to advance the simulation
  Physics.util.ticker.on(function(time) {
    world.step( time );
  });
});


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
    new PlaneGeometry(45, 45, 0),
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
};

// Let's make this work
init();
