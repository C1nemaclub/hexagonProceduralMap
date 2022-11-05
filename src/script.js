import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { PMREMGenerator } from 'three/src/extras/PMREMGenerator.js';
import { ACESFilmicToneMapping, sRGBEncoding } from 'three';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Debug

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color('#FFEECC');

//Plane
// const mapWidth = 20;
// const mapHeight = 20;
// const tileGeometry = new THREE.BoxGeometry(1, 1, 1);

// for (let i = 0; i < mapWidth; i++) {
//   for (let j = 0; j < mapHeight; j++) {
//     let randomColor = Math.floor(Math.random() * 16777215).toString(16);
//     const tileMaterial = new THREE.MeshBasicMaterial({
//       color: `#${randomColor}`,
//     });
//     const newTile = new THREE.Mesh(tileGeometry, tileMaterial);
//     newTile.position.x = 1 * i;
//     newTile.position.z = 1 * j;
//     newTile.position.y = 1 * Math.random() * (Math.random() * 1);
//     newTile.material.wireframe = true;
//     scene.add(newTile);
//   }
// }

// Lights

const pointLight = new THREE.PointLight(0xffffff, 0.1);
pointLight.position.x = 2;
pointLight.position.y = 3;
pointLight.position.z = 4;
scene.add(pointLight);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

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

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(0, 0, 50);
scene.add(camera);

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

const FloatType = THREE.FloatType;
let envmap;
const asyncloading = async () => {
  let pmrem = new PMREMGenerator(renderer);
  let envmapTexture = await new RGBELoader()
    .setDataType(FloatType)
    .loadAsync('/assets/envmap.hdr');
  envmap = pmrem.fromEquirectangular(envmapTexture).texture;

  makeHex(3, new THREE.Vector2(0, 0));
  for (let i = -10; i < 10; i++) {
    for (let j = -10; j < 10; j++) {
      makeHex(3, tileToPosition(i, j));
    }
  }

  let hexagonMesh = new THREE.Mesh(
    hexagonGeometries,
    new THREE.MeshStandardMaterial({
      envMap: envmap,
      flatShading: true,
    })
  );

  scene.add(hexagonMesh);
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
};
asyncloading();

function tileToPosition(tileX, tileY) {
  return new THREE.Vector2((tileX + (tileY % 2) * 0.5) * 1.77, tileY * 1.535);
}

let hexagonGeometries = new THREE.BoxGeometry(0, 0, 0);
const hexGeometry = (height, position) => {
  let geo = new THREE.CylinderGeometry(1, 1, height, 6, 1, false);
  geo.translate(position.x, height * 0.5, position.y);

  return geo;
};

function makeHex(height, position) {
  let geo = hexGeometry(height, position);
  hexagonGeometries = mergeBufferGeometries([hexagonGeometries, geo]);
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
