/// <reference lib="dom" />
import { suite } from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";
import * as THREE from "three";

import { createElement } from "@b9g/crank";
import {
	renderer,
	register,
	unregister,
	type ThreeElementProps,
} from "../src/index.js";

declare global {
	namespace JSX {
		interface IntrinsicElements {
			"custom-marker": ThreeElementProps<Marker>;
		}
	}
}

const test = suite("basic three.js rendering");

let threeScene: THREE.Scene;

test.before.each(() => {
	// Create a test Three.js scene
	threeScene = new THREE.Scene();
});

test.after.each(() => {
	// Clean up scene
	threeScene.clear();
});

test("simple group", () => {
	renderer.render(<group />, threeScene);
	
	Assert.is(threeScene.children.length, 1);
	Assert.ok(threeScene.children[0] instanceof THREE.Group);
});

test("group with position", () => {
	renderer.render(<group x={100} y={200} z={300} />, threeScene);
	
	const group = threeScene.children[0] as THREE.Group;
	Assert.is(group.position.x, 100);
	Assert.is(group.position.y, 200);
	Assert.is(group.position.z, 300);
});

test("nested groups", () => {
	renderer.render(
		<group>
			<group x={50} y={50} z={10} />
			<group x={100} y={100} z={20} />
		</group>,
		threeScene
	);
	
	const parentGroup = threeScene.children[0] as THREE.Group;
	Assert.is(parentGroup.children.length, 2);
	
	const child1 = parentGroup.children[0] as THREE.Group;
	const child2 = parentGroup.children[1] as THREE.Group;
	
	Assert.is(child1.position.x, 50);
	Assert.is(child1.position.y, 50);
	Assert.is(child1.position.z, 10);
	Assert.is(child2.position.x, 100);
	Assert.is(child2.position.y, 100);
	Assert.is(child2.position.z, 20);
});

test("mesh with geometry and material", () => {
	// Create geometry and material separately first
	const geometry = new THREE.BoxGeometry(1, 1, 1);
	const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
	
	renderer.render(
		<mesh geometry={geometry} material={material} />,
		threeScene
	);
	
	const mesh = threeScene.children[0] as THREE.Mesh;
	Assert.ok(mesh instanceof THREE.Mesh);
	
	// Check that geometry and material are present
	Assert.ok(mesh.geometry instanceof THREE.BoxGeometry);
	Assert.ok(mesh.material instanceof THREE.MeshBasicMaterial);
});

test("scene with camera and light", () => {
	renderer.render(
		<scene>
			<perspectivecamera x={0} y={0} z={5} />
			<ambientlight />
			<directionallight x={1} y={1} z={1} />
		</scene>,
		threeScene
	);
	
	Assert.is(threeScene.children.length, 1);
	const childScene = threeScene.children[0] as THREE.Scene;
	Assert.ok(childScene instanceof THREE.Scene);
	
	// Check that the nested scene has the camera and lights
	Assert.is(childScene.children.length, 3);
	Assert.ok(childScene.children[0] instanceof THREE.PerspectiveCamera);
	Assert.ok(childScene.children[1] instanceof THREE.AmbientLight);
	Assert.ok(childScene.children[2] instanceof THREE.DirectionalLight);
});

test("object visibility", () => {
	renderer.render(<group visible={false} />, threeScene);
	
	const group = threeScene.children[0] as THREE.Group;
	Assert.is(group.visible, false);
});

test("object rotation", () => {
	renderer.render(<group rotationX={Math.PI} rotationY={Math.PI/2} rotationZ={Math.PI/4} />, threeScene);
	
	const group = threeScene.children[0] as THREE.Group;
	Assert.is(group.rotation.x, Math.PI);
	Assert.is(group.rotation.y, Math.PI/2);
	Assert.is(group.rotation.z, Math.PI/4);
});

test("object scale", () => {
	renderer.render(<group scaleX={2} scaleY={0.5} scaleZ={3} />, threeScene);
	
	const group = threeScene.children[0] as THREE.Group;
	Assert.is(group.scale.x, 2);
	Assert.is(group.scale.y, 0.5);
	Assert.is(group.scale.z, 3);
});

test("uniform scale", () => {
	renderer.render(<group scale={1.5} />, threeScene);
	
	const group = threeScene.children[0] as THREE.Group;
	Assert.is(group.scale.x, 1.5);
	Assert.is(group.scale.y, 1.5);
	Assert.is(group.scale.z, 1.5);
});

test("expanded tag catalog", () => {
	renderer.render(
		<group>
			<mesh>
				<torusknotgeometry />
				<meshphysicalmaterial />
			</mesh>
			<skinnedmesh />
			<batchedmesh args={[1, 16, 16]} />
			<rectarealight />
			<axeshelper />
		</group>,
		threeScene,
	);

	const group = threeScene.children[0] as THREE.Group;
	const mesh = group.children[0] as THREE.Mesh;

	Assert.ok(mesh instanceof THREE.Mesh);
	Assert.ok(group.children[1] instanceof THREE.SkinnedMesh);
	Assert.ok(group.children[2] instanceof THREE.BatchedMesh);
	Assert.ok(group.children[3] instanceof THREE.RectAreaLight);
	Assert.ok(group.children[4] instanceof THREE.AxesHelper);
});

test("constructor args prop", () => {
	renderer.render(<mesh args={[new THREE.BoxGeometry(2, 3, 4)]} />, threeScene);

	const mesh = threeScene.children[0] as THREE.Mesh;
	const geometry = mesh.geometry as THREE.BoxGeometry;
	Assert.is(geometry.parameters.width, 2);
	Assert.is(geometry.parameters.depth, 4);
});

class Marker extends THREE.Object3D {
	label = "";
}

test("register a custom renderable", () => {
	register("custom-marker", Marker);

	try {
		renderer.render(<custom-marker label="here" x={5} />, threeScene);

		const marker = threeScene.children[0] as Marker;
		Assert.ok(marker instanceof Marker);
		Assert.is(marker.label, "here");
		Assert.is(marker.position.x, 5);
	} finally {
		unregister("custom-marker");
	}
});

test("register rejects a dashless tag", () => {
	Assert.throws(() => register("marker", Marker), /must contain a dash/);
});

test.run();