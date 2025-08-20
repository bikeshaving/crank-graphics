import {renderer} from "../src/index.ts";
import * as THREE from "three";

// Create Three.js scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const threeRenderer = new THREE.WebGLRenderer({ antialias: true });

threeRenderer.setSize(800, 600);
threeRenderer.setClearColor(0x444444);
document.getElementById("game-container")!.appendChild(threeRenderer.domElement);

// Position camera
camera.position.z = 5;
camera.position.y = 1;

// State for tracking loading
let loadingState = {
	assetsLoading: 0,
	assetsLoaded: 0,
	errors: [] as string[],
	time: 0
};

// Component demonstrating AssetRegistry with onload events
function* AssetDemo() {
	// Use proper Crank component pattern with for-of iteration
	for (const props of this) {
		loadingState.time += 0.01;

		yield (
			<scene>
				{/* Define assets with onload/onerror handlers */}
				<asset 
					id="checkerTexture"
					src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSJ3aGl0ZSIvPgo8cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjMyIiB5PSIzMiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSJibGFjayIvPgo8L3N2Zz4K"
					type="texture"
					onload={(event) => {
						console.log('Checker texture loaded!', event);
						loadingState.assetsLoaded++;
					}}
					onerror={(event) => {
						console.error('Failed to load checker texture:', event);
						loadingState.errors.push(`Checker texture: ${event.error?.message}`);
					}}
				/>

				{/* Create a procedural texture directly */}
				<texture 
					id="gradientTexture"
					texture={createGradientTexture()}
					onload={(event) => {
						console.log('Gradient texture registered!', event);
						loadingState.assetsLoaded++;
					}}
				/>

				{/* Example of a failed asset load */}
				<asset 
					id="missingTexture"
					src="/nonexistent-texture.jpg"
					type="texture"
					onload={(event) => {
						console.log('Missing texture loaded (should not happen):', event);
					}}
					onerror={(event) => {
						console.log('Missing texture failed to load (expected):', event);
						loadingState.errors.push(`Missing texture: ${event.error?.message}`);
					}}
				/>

				{/* Use the assets via url(#id) references */}
				<mesh
					geometry={new THREE.BoxGeometry(1.5, 1.5, 1.5)}
					x={-2}
					y={0}
					z={0}
					rotationX={loadingState.time}
					rotationY={loadingState.time * 0.7}
				>
					<mesh-basic-material map="url(#checkerTexture)" />
				</mesh>

				<mesh
					geometry={new THREE.SphereGeometry(1, 32, 32)}
					x={2}
					y={0}
					z={0}
					rotationY={loadingState.time}
				>
					<mesh-basic-material map="url(#gradientTexture)" />
				</mesh>

				{/* This mesh will use the fallback texture since the asset failed to load */}
				<mesh
					geometry={new THREE.ConeGeometry(0.8, 1.5, 8)}
					x={0}
					y={-1}
					z={0}
					rotationZ={loadingState.time * 0.5}
				>
					<mesh-basic-material map="url(#missingTexture)" color={0xff4444} />
				</mesh>

				{/* Show loading status in 3D text (using geometry) */}
				<mesh
					geometry={new THREE.PlaneGeometry(4, 1)}
					x={0}
					y={2.5}
					z={0}
				>
					<mesh-basic-material 
						color={loadingState.assetsLoaded >= 2 ? 0x00ff00 : 0xffaa00}
						transparent={true}
						opacity={0.8}
					/>
				</mesh>

				{/* Lighting */}
				<ambient-light intensity={0.4} />
				<directional-light 
					intensity={0.8}
					x={5}
					y={5}
					z={5}
				/>
			</scene>
		);
	}
}

// Helper to create procedural gradient texture
function createGradientTexture(): THREE.Texture {
	const canvas = document.createElement('canvas');
	canvas.width = 256;
	canvas.height = 256;
	const ctx = canvas.getContext('2d')!;
	
	// Create diagonal gradient
	const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
	gradient.addColorStop(0, '#ff6b6b');
	gradient.addColorStop(0.5, '#4ecdc4');
	gradient.addColorStop(1, '#45b7d1');
	
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	const texture = new THREE.CanvasTexture(canvas);
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(2, 2);
	return texture;
}

// Create the component instance
let demoComponent: any;

// Animation loop
function animate() {
	requestAnimationFrame(animate);
	
	// Re-render component with updated state
	if (demoComponent) {
		demoComponent.refresh();
	}
	
	// Clear and render
	scene.clear();
	renderer.render(<AssetDemo ref={(ref: any) => demoComponent = ref} />, scene);
	
	// Render the scene
	threeRenderer.render(scene, camera);
}

// Update loading info display
function updateLoadingInfo() {
	const info = document.getElementById('loading-info');
	if (info) {
		const registry = (window as any).__THREE_ASSET_REGISTRY__;
		const debugInfo = registry?.getDebugInfo();
		
		info.innerHTML = `
			<div>Assets Loading: ${loadingState.assetsLoading}</div>
			<div>Assets Loaded: ${loadingState.assetsLoaded}</div>
			<div>Errors: ${loadingState.errors.length}</div>
			<div>Registry Assets: ${debugInfo?.totalAssets || 0}</div>
			<div>Pending References: ${debugInfo?.pendingReferences || 0}</div>
		`;
		
		if (loadingState.errors.length > 0) {
			info.innerHTML += '<div style="color: #ff4444; font-size: 12px;">' + 
				loadingState.errors.slice(-3).join('<br>') + '</div>';
		}
	}
}

// Start animation and status updates
animate();
setInterval(updateLoadingInfo, 500);

// Global debug functions
(window as any).getAssetInfo = () => {
	const registry = (window as any).__THREE_ASSET_REGISTRY__;
	if (registry) {
		console.log('Asset Registry Info:', registry.getDebugInfo());
		console.log('Registered IDs:', registry.getIds());
	}
};

(window as any).loadCustomAsset = (id: string, src: string) => {
	const registry = (window as any).__THREE_ASSET_REGISTRY__;
	if (registry) {
		registry.registerFromSource(id, src, undefined, {}, 
			(event: any) => console.log('Custom asset loaded:', event),
			(event: any) => console.error('Custom asset failed:', event)
		);
	}
};

console.log("AssetRegistry Demo loaded!");
console.log("Commands:");
console.log("- getAssetInfo() - View asset registry status");
console.log("- loadCustomAsset('myId', '/path/to/asset.jpg') - Load custom asset");