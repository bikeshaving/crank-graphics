/// <reference lib="dom" />
import {describe, test, expect, beforeEach} from "@b9g/libuild/test";
import * as THREE from "three";

import {renderer} from "../src/index.js";

describe("re-render patching", () => {
	let scene: THREE.Scene;

	beforeEach(() => {
		scene = new THREE.Scene();
	});

	test("the node keeps its identity across renders", () => {
		renderer.render(<group x={1} />, scene);
		const first = scene.children[0];

		renderer.render(<group x={2} />, scene);
		const second = scene.children[0];

		expect(second).toBe(first);
		expect(scene.children.length).toBe(1);
	});

	test("a shorthand transform prop updates in place", () => {
		renderer.render(<group x={1} y={2} z={3} />, scene);
		const group = scene.children[0] as THREE.Group;

		renderer.render(<group x={10} y={20} z={30} />, scene);

		expect(group.position.x).toBe(10);
		expect(group.position.y).toBe(20);
		expect(group.position.z).toBe(30);
	});

	test("a shorthand prop that disappears keeps its last value", () => {
		renderer.render(<group x={7} y={8} />, scene);
		const group = scene.children[0] as THREE.Group;

		renderer.render(<group y={9} />, scene);

		// The renderer writes props. It does not reset a prop that goes away.
		expect(group.position.x).toBe(7);
		expect(group.position.y).toBe(9);
	});

	test("the vector form and the shorthand form write the same state", () => {
		renderer.render(<group position={[1, 2, 3]} />, scene);
		const group = scene.children[0] as THREE.Group;
		expect(group.position.x).toBe(1);

		renderer.render(<group position={{x: 4, z: 6}} />, scene);
		expect(group.position.x).toBe(4);
		// A partial vector keeps the components that it omits.
		expect(group.position.y).toBe(2);
		expect(group.position.z).toBe(6);

		renderer.render(<group x={9} />, scene);
		expect(group.position.x).toBe(9);
		expect(group.position.y).toBe(2);
	});

	test("rotation and scale update through both forms", () => {
		renderer.render(<group rotationX={1} scaleX={2} />, scene);
		const group = scene.children[0] as THREE.Group;
		expect(group.rotation.x).toBe(1);
		expect(group.scale.x).toBe(2);

		renderer.render(<group rotation={[0.5, 0.5, 0.5]} scale={3} />, scene);
		expect(group.rotation.x).toBe(0.5);
		expect(group.rotation.z).toBe(0.5);
		expect(group.scale.x).toBe(3);
		expect(group.scale.y).toBe(3);
		expect(group.scale.z).toBe(3);
	});

	test("a rotation object with an order writes the order", () => {
		renderer.render(<group rotation={{x: 1, order: "ZYX"}} />, scene);
		const group = scene.children[0] as THREE.Group;

		expect(group.rotation.x).toBe(1);
		expect(group.rotation.order).toBe("ZYX");
	});

	test("a material color updates in place", () => {
		renderer.render(
			<mesh>
				<meshstandardmaterial color={0xff0000} />
			</mesh>,
			scene,
		);
		const mesh = scene.children[0] as THREE.Mesh;
		const material = mesh.material as THREE.MeshStandardMaterial;
		expect(material.color.getHex()).toBe(0xff0000);

		renderer.render(
			<mesh>
				<meshstandardmaterial color={0x00ff00} />
			</mesh>,
			scene,
		);

		// The same material object takes the new color.
		expect(mesh.material).toBe(material);
		expect(material.color.getHex()).toBe(0x00ff00);
	});

	test("a material flag updates in place", () => {
		renderer.render(
			<mesh>
				<meshbasicmaterial transparent={true} opacity={0.5} wireframe={false} />
			</mesh>,
			scene,
		);
		const material = (scene.children[0] as THREE.Mesh)
			.material as THREE.MeshBasicMaterial;

		renderer.render(
			<mesh>
				<meshbasicmaterial transparent={true} opacity={0.25} wireframe={true} />
			</mesh>,
			scene,
		);

		expect(material.opacity).toBe(0.25);
		expect(material.wireframe).toBe(true);
	});

	test("the args prop only applies at creation", () => {
		renderer.render(
			<mesh>
				<boxgeometry args={[2, 2, 2]} />
			</mesh>,
			scene,
		);
		const mesh = scene.children[0] as THREE.Mesh;
		const geometry = mesh.geometry as THREE.BoxGeometry;
		expect(geometry.parameters.width).toBe(2);

		renderer.render(
			<mesh>
				<boxgeometry args={[8, 8, 8]} />
			</mesh>,
			scene,
		);

		// The renderer patches an element. It does not create the object again,
		// so a new args value has no effect. Change the tag or the key to get a
		// new object.
		expect(mesh.geometry).toBe(geometry);
		expect((mesh.geometry as THREE.BoxGeometry).parameters.width).toBe(2);
	});

	test("a new key creates a new object with the new args", () => {
		renderer.render(
			<mesh>
				<boxgeometry key="a" args={[2, 2, 2]} />
			</mesh>,
			scene,
		);
		const mesh = scene.children[0] as THREE.Mesh;
		const first = mesh.geometry;

		renderer.render(
			<mesh>
				<boxgeometry key="b" args={[8, 8, 8]} />
			</mesh>,
			scene,
		);

		expect(mesh.geometry).not.toBe(first);
		expect((mesh.geometry as THREE.BoxGeometry).parameters.width).toBe(8);
	});

	test("a changed tag replaces the object", () => {
		renderer.render(<group x={1} />, scene);
		const group = scene.children[0];

		renderer.render(<mesh x={1} />, scene);

		expect(scene.children.length).toBe(1);
		expect(scene.children[0]).not.toBe(group);
		expect(scene.children[0]).toBeInstanceOf(THREE.Mesh);
	});
});
