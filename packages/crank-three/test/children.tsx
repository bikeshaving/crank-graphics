/// <reference lib="dom" />
import {describe, test, expect, beforeEach} from "@b9g/libuild/test";
import * as THREE from "three";

import {renderer} from "../src/index.js";

function List({ids}: {ids: Array<string>}) {
	return (
		<group>
			{ids.map((id) => (
				<mesh key={id} name={id} />
			))}
		</group>
	);
}

function names(group: THREE.Object3D): Array<string> {
	return group.children.map((child) => child.name);
}

describe("children diffing", () => {
	let scene: THREE.Scene;

	beforeEach(() => {
		scene = new THREE.Scene();
	});

	test("a keyed list mounts in order", () => {
		renderer.render(<List ids={["a", "b", "c"]} />, scene);

		const group = scene.children[0] as THREE.Group;
		expect(names(group)).toEqual(["a", "b", "c"]);
	});

	test("a key keeps the object across a reorder", () => {
		renderer.render(<List ids={["a", "b", "c"]} />, scene);
		const group = scene.children[0] as THREE.Group;
		const byName = new Map(group.children.map((c) => [c.name, c]));

		renderer.render(<List ids={["c", "a", "b"]} />, scene);

		expect(group.children.length).toBe(3);
		for (const child of group.children) {
			expect(child).toBe(byName.get(child.name));
		}
	});

	test("a reorder does not sort the children of the object", () => {
		renderer.render(<List ids={["a", "b", "c"]} />, scene);
		const group = scene.children[0] as THREE.Group;

		renderer.render(<List ids={["c", "b", "a"]} />, scene);

		// Three.js draws by renderOrder and by depth, not by the order of the
		// children. The renderer keeps an object that stays in the tree where it
		// is instead of removing and adding it again.
		expect(names(group)).toEqual(["a", "b", "c"]);
	});

	test("an insert adds one object and keeps the others", () => {
		renderer.render(<List ids={["a", "b"]} />, scene);
		const group = scene.children[0] as THREE.Group;
		const a = group.children[0];
		const b = group.children[1];

		renderer.render(<List ids={["a", "x", "b"]} />, scene);

		expect(group.children.length).toBe(3);
		expect(names(group).sort()).toEqual(["a", "b", "x"]);
		expect(group.children.includes(a)).toBe(true);
		expect(group.children.includes(b)).toBe(true);
	});

	test("a removal detaches only the object that goes away", () => {
		renderer.render(<List ids={["a", "b", "c"]} />, scene);
		const group = scene.children[0] as THREE.Group;
		const b = group.children[1];

		renderer.render(<List ids={["a", "c"]} />, scene);

		expect(names(group)).toEqual(["a", "c"]);
		expect(b.parent).toBe(null);
	});

	test("an empty list detaches every child", () => {
		renderer.render(<List ids={["a", "b"]} />, scene);
		const group = scene.children[0] as THREE.Group;

		renderer.render(<List ids={[]} />, scene);

		expect(group.children.length).toBe(0);
	});

	test("a list without keys reuses the objects by position", () => {
		renderer.render(
			<group>
				<mesh name="first" />
				<mesh name="second" />
			</group>,
			scene,
		);
		const group = scene.children[0] as THREE.Group;
		const first = group.children[0];

		renderer.render(
			<group>
				<mesh name="renamed" />
				<mesh name="second" />
			</group>,
			scene,
		);

		expect(group.children[0]).toBe(first);
		expect(first.name).toBe("renamed");
	});

	test("nested groups keep their own children", () => {
		renderer.render(
			<group name="root">
				<group name="left">
					<mesh name="l1" />
				</group>
				<group name="right">
					<mesh name="r1" />
					<mesh name="r2" />
				</group>
			</group>,
			scene,
		);

		const root = scene.children[0] as THREE.Group;
		expect(names(root)).toEqual(["left", "right"]);
		expect(names(root.children[0])).toEqual(["l1"]);
		expect(names(root.children[1])).toEqual(["r1", "r2"]);
	});
});
