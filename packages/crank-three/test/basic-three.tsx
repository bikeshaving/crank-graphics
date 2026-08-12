/// <reference lib="dom" />
import {
	describe,
	test,
	expect,
	beforeEach,
	afterEach,
} from "@b9g/libuild/test";
import * as THREE from "three";

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

class Marker extends THREE.Object3D {
	label = "";
}

describe("basic three.js rendering", () => {
	let threeScene: THREE.Scene;

	beforeEach(() => {
		// Create a test Three.js scene
		threeScene = new THREE.Scene();
	});

	afterEach(() => {
		// Clean up scene
		threeScene.clear();
	});

	test("simple group", () => {
		renderer.render(<group />, threeScene);

		expect(threeScene.children.length).toBe(1);
		expect(threeScene.children[0]).toBeInstanceOf(THREE.Group);
	});

	test("group with position", () => {
		renderer.render(<group x={100} y={200} z={300} />, threeScene);

		const group = threeScene.children[0] as THREE.Group;
		expect(group.position.x).toBe(100);
		expect(group.position.y).toBe(200);
		expect(group.position.z).toBe(300);
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
		expect(parentGroup.children.length).toBe(2);

		const child1 = parentGroup.children[0] as THREE.Group;
		const child2 = parentGroup.children[1] as THREE.Group;

		expect(child1.position.x).toBe(50);
		expect(child1.position.y).toBe(50);
		expect(child1.position.z).toBe(10);
		expect(child2.position.x).toBe(100);
		expect(child2.position.y).toBe(100);
		expect(child2.position.z).toBe(20);
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
		expect(mesh).toBeInstanceOf(THREE.Mesh);

		// Check that geometry and material are present
		expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
		expect(mesh.material).toBeInstanceOf(THREE.MeshBasicMaterial);
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

		expect(threeScene.children.length).toBe(1);
		const childScene = threeScene.children[0] as THREE.Scene;
		expect(childScene).toBeInstanceOf(THREE.Scene);

		// Check that the nested scene has the camera and lights
		expect(childScene.children.length).toBe(3);
		expect(childScene.children[0]).toBeInstanceOf(THREE.PerspectiveCamera);
		expect(childScene.children[1]).toBeInstanceOf(THREE.AmbientLight);
		expect(childScene.children[2]).toBeInstanceOf(THREE.DirectionalLight);
	});

	test("object visibility", () => {
		renderer.render(<group visible={false} />, threeScene);

		const group = threeScene.children[0] as THREE.Group;
		expect(group.visible).toBe(false);
	});

	test("object rotation", () => {
		renderer.render(<group rotationX={Math.PI} rotationY={Math.PI/2} rotationZ={Math.PI/4} />, threeScene);

		const group = threeScene.children[0] as THREE.Group;
		expect(group.rotation.x).toBe(Math.PI);
		expect(group.rotation.y).toBe(Math.PI/2);
		expect(group.rotation.z).toBe(Math.PI/4);
	});

	test("object scale", () => {
		renderer.render(<group scaleX={2} scaleY={0.5} scaleZ={3} />, threeScene);

		const group = threeScene.children[0] as THREE.Group;
		expect(group.scale.x).toBe(2);
		expect(group.scale.y).toBe(0.5);
		expect(group.scale.z).toBe(3);
	});

	test("uniform scale", () => {
		renderer.render(<group scale={1.5} />, threeScene);

		const group = threeScene.children[0] as THREE.Group;
		expect(group.scale.x).toBe(1.5);
		expect(group.scale.y).toBe(1.5);
		expect(group.scale.z).toBe(1.5);
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

		expect(mesh).toBeInstanceOf(THREE.Mesh);
		expect(group.children[1]).toBeInstanceOf(THREE.SkinnedMesh);
		expect(group.children[2]).toBeInstanceOf(THREE.BatchedMesh);
		expect(group.children[3]).toBeInstanceOf(THREE.RectAreaLight);
		expect(group.children[4]).toBeInstanceOf(THREE.AxesHelper);
	});

	test("constructor args prop", () => {
		renderer.render(<mesh args={[new THREE.BoxGeometry(2, 3, 4)]} />, threeScene);

		const mesh = threeScene.children[0] as THREE.Mesh;
		const geometry = mesh.geometry as THREE.BoxGeometry;
		expect(geometry.parameters.width).toBe(2);
		expect(geometry.parameters.depth).toBe(4);
	});

	test("register a custom renderable", () => {
		register("custom-marker", Marker);

		try {
			renderer.render(<custom-marker label="here" x={5} />, threeScene);

			const marker = threeScene.children[0] as Marker;
			expect(marker).toBeInstanceOf(Marker);
			expect(marker.label).toBe("here");
			expect(marker.position.x).toBe(5);
		} finally {
			unregister("custom-marker");
		}
	});

	test("register rejects a dashless tag", () => {
		expect(() => register("marker", Marker)).toThrow(/must contain a dash/);
	});

});
