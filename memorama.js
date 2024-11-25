import * as THREE from "three";
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
let scene, camera, renderer, raycaster;
let cards = [];
let flippedCards = [];
let pairsFound = 0;
const totalPairs = 6;

const cardsModels = [
  'Cards/CARTA1A.obj',
  'Cards/CARTA2A.obj',
  'Cards/CARTA3A.obj',
  'Cards/CARTA4A.obj',
  'Cards/CARTA5A.obj',
  'Cards/CARTA6A.obj'
];

const counterpartModels = [
  'Cards/CARTA1B.obj',
  'Cards/CARTA2B.obj',
  'Cards/CARTA3B.obj',
  'Cards/CARTA4B.obj',
  'Cards/CARTA5B.obj',
  'Cards/CARTA6B.obj'
];

init();

function init() 
{
  // Crear escena, cámara y renderizador
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 10;
  camera.position.set(0, 0, 10); 
  camera.lookAt(0, 0, 0);
  

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('game').appendChild(renderer.domElement);

  raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Agregar luces
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Luz ambiental tenue
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // Luz direccional
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  loadBackground();

  // Seleccionar pares aleatorios
  const selectedPairs = selectRandomPairs(totalPairs);

  // Crear instancias de OBJLoader y MTLLoader
  const objLoader = new OBJLoader();
  const mtlLoader = new MTLLoader();

  // Cargar modelos y materiales para cada par
  selectedPairs.forEach((pair, index) => {
      const [modelPath, counterpartPath] = pair;

      // Cargar carta principal
      loadModelWithMaterial(
          mtlLoader,
          objLoader,
          modelPath.replace('.obj', '.mtl'), // Suponemos que el MTL tiene el mismo nombre y ubicación
          modelPath,
          index,
          false // false indica que no es contraparte
      );

      // Cargar contraparte
      loadModelWithMaterial(
          mtlLoader,
          objLoader,
          counterpartPath.replace('.obj', '.mtl'),
          counterpartPath,
          index,
          true // true indica que es contraparte
      );
  });

  // Agregar eventos de redimensionar y clic
  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('click', (event) => onClick(event, mouse), false);

  // Iniciar animación
  animate();
}


function loadBackground() {
  const backgroundPath = 'tablero.obj'; // Ruta al archivo OBJ del fondo
  const backgroundMaterialPath = 'tablero.mtl'; // Ruta al archivo MTL si aplica

  const objLoader = new OBJLoader();
  const mtlLoader = new MTLLoader();

  mtlLoader.load(backgroundMaterialPath, (materials) => {
    materials.preload();
    objLoader.setMaterials(materials);

    objLoader.load(backgroundPath, (object) => {
      // Configura el modelo del fondo
      object.traverse((child) => {
        if (child.isMesh) {
          child.userData.isBackground = true; // Etiqueta para diferenciarlo
        }
      });
      // Ajustar posición y escala
      object.position.set(0, 0, -15); // Asegúrate de que esté detrás de las cartas
      object.scale.set(2, .8, 15);// Escala para que llene el fondo
      scene.add(object);
    });
  });
}


function loadModelWithMaterial(mtlLoader, objLoader, mtlPath, objPath, pairIndex, isCounterpart) {
  mtlLoader.load(mtlPath, (materials) => {
    materials.preload();
    objLoader.setMaterials(materials);

    objLoader.load(objPath, (object) => {
      object.traverse((child) => {
        if (child.isMesh) {
          child.userData = { flipped: false, pairIndex };
        }
      });
      setupCard(object, pairIndex, isCounterpart);
    });
  });
}

// Función para seleccionar pares aleatorios
function selectRandomPairs(numPairs) {
  const pairs = [];
  const indices = [...Array(cardsModels.length).keys()];
  shuffleArray(indices);

  for (let i = 0; i < numPairs; i++) {
    pairs.push([cardsModels[indices[i]], counterpartModels[indices[i]]]);
  }
  return pairs;
}

// Configurar las cartas
function setupCard(object, pairIndex, isCounterpart) {
  object.userData = { flipped: false, pairIndex };
  console.log(`Setting up card. PairIndex: ${pairIndex}, IsCounterpart: ${isCounterpart}`);
  const columns = 3; // Número de columnas en la cuadrícula
  const rows = Math.ceil(cardsModels.length / columns); // Calculamos las filas necesarias
  const spacing = 6.5; // Separación entre cartas

  // Calcula el ancho y alto total de la cuadrícula
  const gridWidth = (columns - 1) * spacing;
  const gridHeight = (rows - 1) * spacing;

  // Calcula las posiciones de las cartas, centrando la cuadrícula
  const x = (pairIndex % columns) * spacing - gridWidth / 2 + (isCounterpart ? spacing / 2 : 0);
  const y = Math.floor(pairIndex / columns) * -spacing + gridHeight / 2;

  // Configura la posición en el eje Z para evitar superposición
  const z = isCounterpart ? 0.1 : 0; // Contrapartes ligeramente más cerca para evitar encimarse

  // Configura la posición y escala del modelo
  object.position.set(x, y, z);
  object.scale.set(1.5, 1.5, 1.5);

  // Agrega la carta a la escena y al arreglo global
  scene.add(object);
  cards.push(object);
}

// Manejar clics del ratón
function onClick(event, mouse) {
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(cards);

  if (intersects.length > 0) {
    const clickedCard = intersects[0].object;

    console.log(clickedCard.userData);
    if (!clickedCard.userData.flipped && flippedCards.length < 2) {
      flipCard(clickedCard);
      flippedCards.push(clickedCard);

      if (flippedCards.length === 2) {
        setTimeout(checkForMatch, 1000);
      }
    }
  }
}
// Voltear una carta
function flipCard(card) {
  gsap.to(card.rotation, { y: card.rotation.y + Math.PI, duration: 0.5 });
  card.userData.flipped = !card.userData.flipped;
}
// Verificar si hay un par
function checkForMatch() 
{
  const [card1, card2] = flippedCards;
  console.log(`Checking match: Card1 PairIndex=${card1.userData.pairIndex}, Card2 PairIndex=${card2.userData.pairIndex}`);

  if (card1.userData.pairIndex === card2.userData.pairIndex) {
    pairsFound++;
    console.log(`Pair matched! Total pairs found: ${pairsFound}`);
    if (pairsFound === totalPairs) {
      alert('Ganaste, eres un crack');
    }
  } 
  else 
  {
    console.log('No match found.');
    flipCard(card1);
    flipCard(card2);
  }
  flippedCards = [];
}
// Animación principal
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
// Ajustar la ventana del navegador
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
// Barajar arreglo
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}