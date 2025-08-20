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
camera.position.z = 10;
camera.position.y = 5;

// Create geometries with different levels of detail
const highDetailGeometry = new THREE.SphereGeometry(1, 32, 32); // 1024 triangles
const mediumDetailGeometry = new THREE.SphereGeometry(1, 16, 16); // 256 triangles  
const lowDetailGeometry = new THREE.SphereGeometry(1, 8, 8); // 64 triangles
const billboardGeometry = new THREE.PlaneGeometry(2, 2); // 2 triangles

// Create materials
const highDetailMaterial = new THREE.MeshStandardMaterial({ 
	color: 0x00ff00, 
	wireframe: false 
});
const mediumDetailMaterial = new THREE.MeshBasicMaterial({ 
	color: 0xffff00,
	wireframe: false 
});
const lowDetailMaterial = new THREE.MeshBasicMaterial({ 
	color: 0xff0000,
	wireframe: true 
});
const billboardMaterial = new THREE.MeshBasicMaterial({ 
	color: 0xff00ff,
	transparent: true,
	opacity: 0.8
});

// State
let cameraDistance = 10;
let animationTime = 0;

// Component demonstrating LOD (Level of Detail)
function* LODDemo() {
	for (const props of this) {
		animationTime += 0.01;
		
		// Move camera back and forth to demonstrate LOD switching
		cameraDistance = 5 + Math.sin(animationTime * 0.3) * 15;
		camera.position.z = cameraDistance;
		camera.lookAt(0, 0, 0);

		yield (
			<scene>
				{/* LOD Object - automatically switches detail based on camera distance */}
				<l-o-d>
					{/* High detail - show when close (distance < 8) */}
					<mesh 
						geometry={highDetailGeometry}
						material={highDetailMaterial}
						// LOD distance is handled automatically by Three.js LOD class
					/>
					
					{/* Medium detail - show at medium distance (8-15) */}
					<mesh 
						geometry={mediumDetailGeometry}
						material={mediumDetailMaterial}
					/>
					
					{/* Low detail - show when far (15-25) */}
					<mesh 
						geometry={lowDetailGeometry}
						material={lowDetailMaterial}
					/>
					
					{/* Billboard - show when very far (>25) */}
					<mesh 
						geometry={billboardGeometry}
						material={billboardMaterial}
					/>
				</l-o-d>

				{/* Reference objects at different distances for comparison */}
				<mesh
					geometry={highDetailGeometry}
					material={new THREE.MeshBasicMaterial({ color: 0x444444, wireframe: true })}
					x={-5}
					y={0}
					z={0}
					scale={0.5}
				/>

				<mesh
					geometry={mediumDetailGeometry}
					material={new THREE.MeshBasicMaterial({ color: 0x444444, wireframe: true })}
					x={5}
					y={0}
					z={0}
					scale={0.5}
				/>

				{/* Grid to show distance */}
				<group>
					{Array.from({length: 10}, (_, i) => (
						<mesh
							key={i}
							geometry={new THREE.RingGeometry(i * 3, i * 3 + 0.1, 32)}
							material={new THREE.MeshBasicMaterial({ 
								color: 0x333333,
								transparent: true,
								opacity: 0.3
							})}
							rotationX={Math.PI / 2}
						/>
					))}
				</group>

				{/* Lighting */}
				<ambient-light intensity={0.4} />
				<directional-light 
					intensity={0.8}
					x={10}
					y={10}
					z={5}
				/>
			</scene>
		);
	}
}

// Create the component instance
let demoComponent: any;

// Animation loop
function animate() {
	requestAnimationFrame(animate);
	
	// Re-render component with updated camera
	if (demoComponent) {
		demoComponent.refresh();
	}
	
	// Clear and render
	scene.clear();
	renderer.render(<LODDemo ref={(ref: any) => demoComponent = ref} />, scene);
	
	// Render the scene
	threeRenderer.render(scene, camera);
}

// Update info display
function updateInfo() {
	const info = document.getElementById('lod-info');
	if (info) {
		// Calculate which LOD level should be active
		let activeLevel = "Billboard";
		if (cameraDistance < 8) activeLevel = "High Detail (32x32)";
		else if (cameraDistance < 15) activeLevel = "Medium Detail (16x16)";  
		else if (cameraDistance < 25) activeLevel = "Low Detail (8x8)";
		
		info.innerHTML = `
			<div><strong>LOD Demo</strong></div>
			<div>Camera Distance: ${cameraDistance.toFixed(1)}</div>
			<div>Active Level: ${activeLevel}</div>
			<div>Triangle Count:</div>
			<div style="margin-left: 10px;">
				High: 1024 triangles<br>
				Medium: 256 triangles<br>
				Low: 64 triangles<br>
				Billboard: 2 triangles
			</div>
		`;
	}
}

// Start animation
animate();
setInterval(updateInfo, 100);

console.log("LOD Demo loaded!");
console.log("Watch the sphere change detail as the camera moves back and forth");
console.log("Green = High detail, Yellow = Medium, Red wireframe = Low, Purple = Billboard");