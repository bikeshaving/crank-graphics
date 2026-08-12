/// <reference lib="dom" />
import {describe, test, expect, beforeEach} from "@b9g/libuild/test";
import * as THREE from "three";

import {renderer} from "../src/index.js";

describe("mesh assembly", () => {
	let scene: THREE.Scene;

	beforeEach(() => {
		scene = new THREE.Scene();
	});

	test("a geometry child and a material child configure the mesh", () => {
		renderer.render(
			<mesh>
				<torusknotgeometry />
				<meshphysicalmaterial color={0x00ff00} />
			</mesh>,
			scene,
		);

		const mesh = scene.children[0] as THREE.Mesh;
		expect(mesh.geometry).toBeInstanceOf(THREE.TorusKnotGeometry);
		expect((mesh.material as any).isMeshPhysicalMaterial).toBe(true);
		expect((mesh.material as THREE.MeshPhysicalMaterial).color.getHex()).toBe(
			0x00ff00,
		);
	});

	test("a resource child is a property, not a child of the scene graph", () => {
		renderer.render(
			<mesh>
				<boxgeometry />
				<meshbasicmaterial />
			</mesh>,
			scene,
		);

		const mesh = scene.children[0] as THREE.Mesh;
		// Three.js holds a geometry and a material as properties. Only an
		// Object3D belongs to the children of an object.
		expect(mesh.children.length).toBe(0);
	});

	test("a prop beats nothing, and a child beats the default", () => {
		const geometry = new THREE.SphereGeometry(1);

		renderer.render(<mesh geometry={geometry} />, scene);
		const mesh = scene.children[0] as THREE.Mesh;
		expect(mesh.geometry).toBe(geometry);

		renderer.render(
			<mesh>
				<boxgeometry />
			</mesh>,
			scene,
		);
		expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
	});

	test("a new material child replaces the old material", () => {
		renderer.render(
			<mesh>
				<meshbasicmaterial key="basic" />
			</mesh>,
			scene,
		);
		const mesh = scene.children[0] as THREE.Mesh;
		const first = mesh.material;

		renderer.render(
			<mesh>
				<meshstandardmaterial key="standard" />
			</mesh>,
			scene,
		);

		expect(mesh.material).not.toBe(first);
		expect((mesh.material as any).isMeshStandardMaterial).toBe(true);
		expect(mesh).toBe(scene.children[0]);
	});

	test("a material child that goes away leaves the last material", () => {
		renderer.render(
			<mesh>
				<meshstandardmaterial />
			</mesh>,
			scene,
		);
		const mesh = scene.children[0] as THREE.Mesh;
		const material = mesh.material;

		renderer.render(<mesh />, scene);

		// Three.js needs a material to render. The renderer keeps the last one
		// instead of leaving the mesh without one.
		expect(mesh.material).toBe(material);
	});

	test("a points object takes a points material", () => {
		renderer.render(
			<points>
				<buffergeometry />
				<pointsmaterial size={4} />
			</points>,
			scene,
		);

		const points = scene.children[0] as THREE.Points;
		expect(points).toBeInstanceOf(THREE.Points);
		expect((points.material as any).isPointsMaterial).toBe(true);
		expect((points.material as THREE.PointsMaterial).size).toBe(4);
	});

	test("a group ignores a material child", () => {
		renderer.render(
			<group>
				<meshbasicmaterial />
			</group>,
			scene,
		);

		const group = scene.children[0] as THREE.Group;
		expect(group).toBeInstanceOf(THREE.Group);
		expect("material" in group).toBe(false);
		expect(group.children.length).toBe(0);
	});

	test("a nested mesh stays a child of the scene graph", () => {
		renderer.render(
			<group>
				<mesh>
					<boxgeometry />
					<meshbasicmaterial />
				</mesh>
			</group>,
			scene,
		);

		const group = scene.children[0] as THREE.Group;
		expect(group.children.length).toBe(1);
		expect(group.children[0]).toBeInstanceOf(THREE.Mesh);
	});
});
