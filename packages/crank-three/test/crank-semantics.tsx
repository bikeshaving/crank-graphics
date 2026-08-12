/// <reference lib="dom" />
import {describe, test, expect, beforeEach} from "@b9g/libuild/test";
import * as THREE from "three";
import type {Context} from "@b9g/crank";

import {renderer} from "../src/index.js";

describe("crank semantics", () => {
	let scene: THREE.Scene;

	beforeEach(() => {
		scene = new THREE.Scene();
	});

	test("a function component renders its elements", () => {
		function Ship({x}: {x: number}) {
			return <group name="ship" x={x} />;
		}

		renderer.render(<Ship x={3} />, scene);

		const group = scene.children[0] as THREE.Group;
		expect(group.name).toBe("ship");
		expect(group.position.x).toBe(3);
	});

	test("ctx.refresh patches the same object", () => {
		let ctx!: Context;
		let angle = 0;

		function* Spinner(this: Context) {
			ctx = this;
			while (true) {
				yield <group name="spinner" rotationY={angle} />;
			}
		}

		renderer.render(<Spinner />, scene);
		const group = scene.children[0] as THREE.Group;
		expect(group.rotation.y).toBe(0);

		angle = 1.5;
		ctx.refresh();

		expect(scene.children.length).toBe(1);
		expect(scene.children[0]).toBe(group);
		expect(group.rotation.y).toBe(1.5);
	});

	test("a generator component runs its cleanup on unmount", () => {
		let cleaned = false;

		function* Temporary() {
			try {
				while (true) {
					yield <group name="temporary" />;
				}
			} finally {
				cleaned = true;
			}
		}

		renderer.render(<Temporary />, scene);
		expect(scene.children.length).toBe(1);

		renderer.render(null, scene);

		expect(cleaned).toBe(true);
		expect(scene.children.length).toBe(0);
	});

	test("a fragment puts every child in the parent", () => {
		renderer.render(
			<group>
				<>
					<mesh name="a" />
					<mesh name="b" />
				</>
				<mesh name="c" />
			</group>,
			scene,
		);

		const group = scene.children[0] as THREE.Group;
		expect(group.children.map((child) => child.name)).toEqual(["a", "b", "c"]);
	});

	test("an event prop adds one listener across renders", () => {
		let calls = 0;
		const handler = () => calls++;

		renderer.render(<group onCustom={handler} />, scene);
		renderer.render(<group onCustom={handler} />, scene);
		renderer.render(<group onCustom={handler} />, scene);

		const group = scene.children[0] as THREE.Group;
		group.dispatchEvent({type: "custom"} as any);

		expect(calls).toBe(1);
	});

	test("a new event handler replaces the old one", () => {
		let first = 0;
		let second = 0;

		renderer.render(<group onCustom={() => first++} />, scene);
		const group = scene.children[0] as THREE.Group;
		group.dispatchEvent({type: "custom"} as any);
		expect(first).toBe(1);

		renderer.render(<group onCustom={() => second++} />, scene);
		group.dispatchEvent({type: "custom"} as any);

		expect(first).toBe(1);
		expect(second).toBe(1);
	});

	test("the renderer reads back the object of the element", () => {
		const value = renderer.render(<group name="read-me" />, scene);

		expect(value).toBe(scene.children[0]);
		expect((value as THREE.Group).name).toBe("read-me");
	});

	test("a ref prop gives the object to the callback", () => {
		let seen: THREE.Object3D | undefined;

		renderer.render(
			<group ref={(node: THREE.Object3D) => (seen = node)} />,
			scene,
		);

		expect(seen).toBe(scene.children[0]);
	});

	test("a component swap replaces the objects of the old component", () => {
		function Red() {
			return <mesh name="red" />;
		}

		function Blue() {
			return <group name="blue" />;
		}

		renderer.render(<Red />, scene);
		expect(scene.children[0]).toBeInstanceOf(THREE.Mesh);

		renderer.render(<Blue />, scene);

		expect(scene.children.length).toBe(1);
		expect(scene.children[0]).toBeInstanceOf(THREE.Group);
		expect((scene.children[0] as THREE.Group).name).toBe("blue");
	});
});
