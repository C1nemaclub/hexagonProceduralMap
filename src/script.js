import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { PMREMGenerator } from 'three/src/extras/PMREMGenerator.js';
import { ACESFilmicToneMapping, Color, sRGBEncoding } from 'three';
import {
  mergeBufferGeometries,
  ShapeBufferGeometry,
} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SimplexNoise } from 'simplex-noise';

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color('#FFEECC');

/**
 * Sizes
 */

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  1000
);
//camera.position.set(0, 0, 50);
camera.position.set(-17, 31, 33);
scene.add(camera);

window.addEventListener('resize', () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = ACESFilmicToneMapping;
renderer.outputEncoding = sRGBEncoding;
renderer.physicallyCorrectLights = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const FloatType = THREE.FloatType;
let envmap;
const MAX_HEIGHT = 20;
const STONE_HEIGHT = MAX_HEIGHT * 0.8;
const DIRT_HEIGHT = MAX_HEIGHT * 0.7;
const GRASS_HEIGHT = MAX_HEIGHT * 0.5;
const SAND_HEIGHT = MAX_HEIGHT * 0.3;
const DIRT2_HEIGHT = MAX_HEIGHT * 0;

const asyncloading = async () => {
  let pmrem = new PMREMGenerator(renderer);
  let envmapTexture = await new RGBELoader()
    .setDataType(FloatType)
    .loadAsync('/assets/envmap.hdr');
  envmap = pmrem.fromEquirectangular(envmapTexture).texture;

  let textures = {
    dirt: await new THREE.TextureLoader().loadAsync('assets/textures/dirt.png'),
    dirt2: await new THREE.TextureLoader().loadAsync(
      'assets/textures/dirt2.jpg'
    ),
    grass: await new THREE.TextureLoader().loadAsync(
      'assets/textures/grass.jpg'
    ),
    sand: await new THREE.TextureLoader().loadAsync('assets/textures/sand.jpg'),
    water: await new THREE.TextureLoader().loadAsync(
      'assets/textures/water.jpg'
    ),
    stone: await new THREE.TextureLoader().loadAsync(
      'assets/textures/stone.png'
    ),
  };

  const simplex = new SimplexNoise();

  for (let i = -15; i < 15; i++) {
    for (let j = -15; j < 15; j++) {
      let position = tileToPosition(i, j);
      if (position.length() > 16) continue;

      let noise = simplex.noise2D(i * 0.1, j * 0.1) * 1 * 0.5;
      if (noise < 0) {
        noise = Math.abs(noise);
      }
      noise = Math.pow(noise, 0.5);

      makeHex(noise * MAX_HEIGHT, position);
    }
  }

  let stoneMesh = hexMesh(stoneGeo, textures.stone);
  let grassMesh = hexMesh(grassGeo, textures.grass);
  let dirt2Mesh = hexMesh(dirt2Geo, textures.dirt2);
  let dirtMesh = hexMesh(dirtGeo, textures.dirt);
  let sandMesh = hexMesh(sandGeo, textures.sand);
  scene.add(stoneMesh, grassMesh, dirt2Mesh, dirtMesh, sandMesh);

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
};
asyncloading();
const light = new THREE.PointLight(
  new Color('#FFCBBE').convertSRGBToLinear().convertSRGBToLinear(),
  80,
  200
);
light.position.set(10, 20, 10);

light.castShadow = true;
light.shadow.mapSize.width = 512;
light.shadow.mapSize.height = 512;
light.shadow.camera.near = 0.5;
light.shadow.camera.far = 500;
scene.add(light);

function tileToPosition(tileX, tileY) {
  return new THREE.Vector2((tileX + (tileY % 2) * 0.5) * 1.77, tileY * 1.535);
}

let stoneGeo = new THREE.BoxGeometry(0, 0, 0);
let dirtGeo = new THREE.BoxGeometry(0, 0, 0);
let dirt2Geo = new THREE.BoxGeometry(0, 0, 0);
let sandGeo = new THREE.BoxGeometry(0, 0, 0);
let grassGeo = new THREE.BoxGeometry(0, 0, 0);

const hexGeometry = (height, position) => {
  let geo = new THREE.CylinderGeometry(1, 1, height, 6, 1, false);
  geo.translate(position.x, height * 0.5, position.y);

  return geo;
};

function makeHex(height, position) {
  let geo = hexGeometry(height, position);
  if (height > STONE_HEIGHT) {
    stoneGeo = mergeBufferGeometries([geo, stoneGeo]);
  } else if (height > DIRT_HEIGHT) {
    dirtGeo = mergeBufferGeometries([geo, dirtGeo]);
  } else if (height > GRASS_HEIGHT) {
    grassGeo = mergeBufferGeometries([geo, grassGeo]);
  } else if (height > SAND_HEIGHT) {
    sandGeo = mergeBufferGeometries([geo, sandGeo]);
  } else if (height > DIRT2_HEIGHT) {
    dirt2Geo = mergeBufferGeometries([geo, dirt2Geo]);
  }
}

function hexMesh(geo, map) {
  let mat = new THREE.MeshPhysicalMaterial({
    envMap: envmap,
    envMapIntensity: 0.135,
    flatShading: true,
    map,
  });
  let mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const clock = new THREE.Clock();

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  // Update Orbital Controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
