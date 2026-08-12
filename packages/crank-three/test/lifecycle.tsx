/// <reference lib="dom" />
import {describe, test, expect, beforeEach} from "@b9g/libuild/test";
import * as THREE from "three";

import {renderer, assetRegistry} from "../src/index.js";

/** Count the calls to dispose() on an object. Three.js has no such counter. */
function spyOnDispose(target: {dispose: () => void}): () => number {
	let calls = 0;
	const original = target.dispose.bind(target);
	target.dispose = () => {
		calls++;
		original();
	};

	return () => calls;
}

describe("unmount and disposal", () => {
	let scene: THREE.Scene;

	beforeEach(() => {
		scene = new THREE.Scene();
	});

	test("an unmounted object leaves the scene graph", () => {
		renderer.render(
			<group>
				<mesh name="gone" />
			</group>,
			scene,
		);
		const group = scene.children[0] as THREE.Group;
		const mesh = group.children[0];

		renderer.render(<group />, scene);

		expect(group.children.length).toBe(0);
		expect(mesh.parent).toBe(null);
	});

	test("unmounting the root leaves the scene empty", () => {
		renderer.render(<group />, scene);
		expect(scene.children.length).toBe(1);

		renderer.render(null, scene);

		expect(scene.children.length).toBe(0);
	});

	test("the renderer does not dispose a geometry or a material that you own", () => {
		const geometry = new THREE.BoxGeometry(1, 1, 1);
		const material = new THREE.MeshBasicMaterial();
		const geometryCalls = spyOnDispose(geometry);
		const materialCalls = spyOnDispose(material);

		renderer.render(
			<group>
				<mesh geometry={geometry} material={material} />
			</group>,
			scene,
		);
		renderer.render(<group />, scene);

		// Your objects stay usable after the element goes away.
		expect(geometryCalls()).toBe(0);
		expect(materialCalls()).toBe(0);
	});

	test("the renderer does not dispose a resource that an element created", () => {
		renderer.render(
			<group>
				<mesh>
					<boxgeometry />
					<meshstandardmaterial />
				</mesh>
			</group>,
			scene,
		);
		const mesh = (scene.children[0] as THREE.Group).children[0] as THREE.Mesh;
		const geometryCalls = spyOnDispose(mesh.geometry);
		const materialCalls = spyOnDispose(mesh.material as THREE.Material);

		renderer.render(<group />, scene);

		// Disposal of GPU memory stays with you. Call dispose() yourself.
		expect(geometryCalls()).toBe(0);
		expect(materialCalls()).toBe(0);
	});

	test("a replaced material is not disposed", () => {
		renderer.render(
			<mesh>
				<meshbasicmaterial key="one" />
			</mesh>,
			scene,
		);
		const mesh = scene.children[0] as THREE.Mesh;
		const calls = spyOnDispose(mesh.material as THREE.Material);

		renderer.render(
			<mesh>
				<meshstandardmaterial key="two" />
			</mesh>,
			scene,
		);

		expect(calls()).toBe(0);
	});

	test("an unmounted texture element leaves the registry, and the asset is disposed", () => {
		const texture = new THREE.Texture();
		const calls = spyOnDispose(texture);

		renderer.render(
			<group>
				<texture id="lifecycle-tex" texture={texture} />
			</group>,
			scene,
		);
		expect(assetRegistry.has("lifecycle-tex")).toBe(true);

		renderer.render(<group />, scene);

		// The registry owns what it holds, so it disposes the asset. This is the
		// one place where the renderer disposes an object that you made.
		expect(assetRegistry.has("lifecycle-tex")).toBe(false);
		expect(calls()).toBe(1);
	});

	test("a texture element holds an invisible placeholder object", () => {
		renderer.render(
			<group>
				<texture id="lifecycle-hidden" texture={new THREE.Texture()} />
				<mesh />
			</group>,
			scene,
		);

		const group = scene.children[0] as THREE.Group;
		// The element makes an empty Group so that the tree keeps its shape.
		// The group draws nothing.
		expect(group.children.length).toBe(2);
		const placeholder = group.children[0];
		expect(placeholder).toBeInstanceOf(THREE.Group);
		expect(placeholder.visible).toBe(false);
		expect(group.children[1]).toBeInstanceOf(THREE.Mesh);

		renderer.render(<group />, scene);
		expect(assetRegistry.has("lifecycle-hidden")).toBe(false);
	});

	test("a deep tree unmounts every level", () => {
		renderer.render(
			<group>
				<group>
					<group>
						<mesh name="deep" />
					</group>
				</group>
			</group>,
			scene,
		);
		const outer = scene.children[0] as THREE.Group;
		const middle = outer.children[0] as THREE.Group;
		const inner = middle.children[0] as THREE.Group;
		const mesh = inner.children[0];

		renderer.render(<group />, scene);

		// Every level detaches, from the leaf to the root of the subtree.
		expect(outer.children.length).toBe(0);
		expect(inner.parent).toBe(null);
		expect(inner.children.length).toBe(0);
		expect(mesh.parent).toBe(null);
	});
});
