import {renderer} from "../src/index.ts";
import * as THREE from "three";

// Create Three.js scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const threeRenderer = new THREE.WebGLRenderer({ antialias: true });

threeRenderer.setSize(800, 600);
threeRenderer.setClearColor(0x222222);
document.getElementById("game-container")!.appendChild(threeRenderer.domElement);

// Position camera
camera.position.z = 5;
camera.position.y = 2;
camera.lookAt(0, 0, 0);

// Create geometries
const boxGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const planeGeometry = new THREE.PlaneGeometry(10, 10);

// State
let rotation = 0;

// Component demonstrating texture registry
function* TextureScene() {
	while (true) {
		rotation += 0.01;

		yield (
			<scene>
				{/* Define textures with the texture registry */}
				<texture 
					id="checker" 
					texture={createCheckerTexture()} 
				/>
				
				<texture 
					id="gradient" 
					texture={createGradientTexture()} 
				/>
				
				<texture 
					id="noise" 
					texture={createNoiseTexture()} 
				/>

				{/* Use textures via url(#id) references */}
				<mesh
					geometry={boxGeometry}
					x={-2.5}
					y={0}
					z={0}
					rotationX={rotation}
					rotationY={rotation * 0.7}
				>
					<meshbasicmaterial map="url(#checker)" />
				</mesh>

				<mesh
					geometry={sphereGeometry}
					x={0}
					y={0}
					z={0}
					rotationY={rotation}
				>
					<meshbasicmaterial map="url(#gradient)" />
				</mesh>

				<mesh
					geometry={boxGeometry}
					x={2.5}
					y={0}
					z={0}
					rotationX={rotation * -0.5}
					rotationY={rotation}
				>
					<meshbasicmaterial map="url(#noise)" />
				</mesh>

				{/* Ground plane with checker texture */}
				<mesh
					geometry={planeGeometry}
					x={0}
					y={-2}
					z={0}
					rotationX={-Math.PI / 2}
				>
					<meshbasicmaterial 
						map="url(#checker)" 
						side={THREE.DoubleSide}
					/>
				</mesh>

				{/* Example of forward reference - texture defined after use */}
				<mesh
					geometry={sphereGeometry}
					x={0}
					y={2.5}
					z={0}
					scale={0.5}
					rotationY={rotation * 2}
				>
					<meshbasicmaterial map="url(#dynamic)" />
				</mesh>
				
				{/* Define the dynamic texture after it's referenced */}
				<texture 
					id="dynamic" 
					texture={createDynamicTexture(rotation)} 
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

// Helper functions to create procedural textures
function createCheckerTexture(): THREE.Texture {
	const canvas = document.createElement('canvas');
	canvas.width = 256;
	canvas.height = 256;
	const ctx = canvas.getContext('2d')!;
	
	const size = 32;
	for (let x = 0; x < canvas.width; x += size) {
		for (let y = 0; y < canvas.height; y += size) {
			ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? '#ffffff' : '#000000';
			ctx.fillRect(x, y, size, size);
		}
	}
	
	const texture = new THREE.CanvasTexture(canvas);
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(2, 2);
	return texture;
}

function createGradientTexture(): THREE.Texture {
	const canvas = document.createElement('canvas');
	canvas.width = 256;
	canvas.height = 256;
	const ctx = canvas.getContext('2d')!;
	
	// Create radial gradient
	const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
	gradient.addColorStop(0, '#ff0000');
	gradient.addColorStop(0.5, '#00ff00');
	gradient.addColorStop(1, '#0000ff');
	
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	return new THREE.CanvasTexture(canvas);
}

function createNoiseTexture(): THREE.Texture {
	const canvas = document.createElement('canvas');
	canvas.width = 256;
	canvas.height = 256;
	const ctx = canvas.getContext('2d')!;
	
	const imageData = ctx.createImageData(canvas.width, canvas.height);
	const data = imageData.data;
	
	for (let i = 0; i < data.length; i += 4) {
		const value = Math.random() * 255;
		data[i] = value;     // R
		data[i + 1] = value; // G
		data[i + 2] = value; // B
		data[i + 3] = 255;   // A
	}
	
	ctx.putImageData(imageData, 0, 0);
	return new THREE.CanvasTexture(canvas);
}

function createDynamicTexture(time: number): THREE.Texture {
	const canvas = document.createElement('canvas');
	canvas.width = 128;
	canvas.height = 128;
	const ctx = canvas.getContext('2d')!;
	
	// Animated pattern based on time
	const hue = (time * 50) % 360;
	ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	// Add some circles
	ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
	for (let i = 0; i < 5; i++) {
		const x = Math.sin(time + i) * 50 + 64;
		const y = Math.cos(time + i) * 50 + 64;
		ctx.beginPath();
		ctx.arc(x, y, 10, 0, Math.PI * 2);
		ctx.fill();
	}
	
	return new THREE.CanvasTexture(canvas);
}

// Animation loop
function animate() {
	requestAnimationFrame(animate);
	
	// Clear and render
	scene.clear();
	renderer.render(<TextureScene />, scene);
	
	// Render the scene
	threeRenderer.render(scene, camera);
}

// Start animation
animate();

// Add texture registry debug info to window
(window as any).getTextureInfo = () => {
	const registry = (window as any).__THREE_TEXTURE_REGISTRY__;
	if (registry) {
		console.log('Texture Registry Info:', registry.getDebugInfo());
		console.log('Registered IDs:', registry.getIds());
		console.log('Pending references:', registry.getPendingReferenceCount());
	}
};

console.log("Texture Registry Demo loaded!");
console.log("Commands:");
console.log("- getTextureInfo() - View texture registry status");