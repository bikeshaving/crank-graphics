import {renderer} from "../src/index.ts";
import * as THREE from "three";

// Create Three.js scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const threeRenderer = new THREE.WebGLRenderer({ antialias: true });

threeRenderer.setSize(800, 600);
threeRenderer.setClearColor(0x87CEEB); // Sky blue background
document.getElementById("game-container")!.appendChild(threeRenderer.domElement);

// Position camera
camera.position.z = 5;

// Create some basic geometries and materials
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const redMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const greenMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });

// Game state
let gameState = {
	isAnimating: true,
	currentShape: "box",
	rotation: 0,
	scale: 1,
	time: 0,
	objectPosition: { x: 0, y: 0, z: 0 },
};

// Component that shows animated 3D scene
function* AnimatedScene() {
	while (true) {
		if (gameState.isAnimating) {
			gameState.rotation += 0.02;
			gameState.scale = 1 + Math.sin(gameState.time * 0.05) * 0.3;
			gameState.time++;
			
			// Animate object position
			gameState.objectPosition.x = Math.sin(gameState.time * 0.01) * 2;
			gameState.objectPosition.y = Math.cos(gameState.time * 0.015) * 1.5;
		}

		const currentGeometry = gameState.currentShape === "box" ? boxGeometry : sphereGeometry;
		const currentMaterial = gameState.currentShape === "box" ? redMaterial : greenMaterial;

		yield (
			<scene>
				{/* Main animated object */}
				<mesh
					geometry={currentGeometry}
					material={currentMaterial}
					x={gameState.objectPosition.x}
					y={gameState.objectPosition.y}
					z={gameState.objectPosition.z}
					rotationX={gameState.rotation}
					rotationY={gameState.rotation * 0.7}
					scaleX={gameState.scale}
					scaleY={gameState.scale}
					scaleZ={gameState.scale}
				/>

				{/* Static background objects */}
				<mesh
					geometry={boxGeometry}
					material={blueMaterial}
					x={-3}
					y={-2}
					z={-2}
					rotationY={gameState.time * 0.005}
				/>

				<mesh
					geometry={sphereGeometry}
					material={greenMaterial}
					x={3}
					y={2}
					z={-1}
					rotationX={gameState.time * 0.003}
				/>

				<mesh
					geometry={boxGeometry}
					material={redMaterial}
					x={0}
					y={-3}
					z={-3}
					rotationZ={gameState.time * 0.004}
					scale={0.5}
				/>

				{/* Lighting */}
				<ambientlight intensity={0.4} />
				<directionallight 
					intensity={0.8}
					x={5}
					y={5}
					z={5}
				/>
			</scene>
		);
	}
}

// Animation loop
function animate() {
	requestAnimationFrame(animate);
	
	if (gameState.isAnimating) {
		// Clear the scene
		scene.clear();
		
		// Render Crank components into the scene
		renderer.render(<AnimatedScene />, scene);
	}
	
	// Render the scene with Three.js
	threeRenderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	threeRenderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the animation loop
animate();

// Global controls for the demo
(window as any).app = {
	toggleAnimation() {
		gameState.isAnimating = !gameState.isAnimating;
		console.log(`Animation ${gameState.isAnimating ? 'started' : 'paused'}`);
	},
	changeShape() {
		gameState.currentShape = gameState.currentShape === "box" ? "sphere" : "box";
		console.log(`Changed to ${gameState.currentShape}`);
	},
	resetPosition() {
		gameState.objectPosition = { x: 0, y: 0, z: 0 };
		gameState.rotation = 0;
		gameState.scale = 1;
		gameState.time = 0;
		console.log('Reset position');
	},
	getState() {
		return gameState;
	},
};

console.log("Three.js demo loaded!");
console.log("Available commands:");
console.log("- app.toggleAnimation() - Start/stop animation");
console.log("- app.changeShape() - Switch between box and sphere");
console.log("- app.resetPosition() - Reset object position");
console.log("- app.getState() - Get current state");