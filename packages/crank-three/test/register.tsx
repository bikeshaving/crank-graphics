/// <reference lib="dom" />
import {describe, test, expect, beforeEach, afterEach} from "@b9g/libuild/test";
import * as THREE from "three";

import {
	renderer,
	register,
	unregister,
	getRegisteredTagNames,
	type ThreeElementProps,
} from "../src/index.js";

class Turret extends THREE.Object3D {
	label = "";
	power = 0;
	color = new THREE.Color(0xffffff);
	args: Array<any> = [];

	constructor(...args: Array<any>) {
		super();
		this.args = args;
	}
}

class Widget {
	value = 0;
}

declare global {
	namespace JSX {
		interface IntrinsicElements {
			"my-turret": ThreeElementProps<Turret>;
			"my-widget": ThreeElementProps<Widget>;
		}
	}
}

describe("registered custom renderables", () => {
	let scene: THREE.Scene;

	beforeEach(() => {
		scene = new THREE.Scene();
		register("my-turret", Turret);
	});

	afterEach(() => {
		renderer.render(null, scene);
		unregister("my-turret");
		unregister("my-widget");
	});

	test("a registered tag appears in the tag list", () => {
		expect(getRegisteredTagNames()).toContain("my-turret");
	});

	test("a registered class joins the scene graph", () => {
		renderer.render(<my-turret label="alpha" />, scene);

		const turret = scene.children[0] as Turret;
		expect(turret).toBeInstanceOf(Turret);
		expect(turret.label).toBe("alpha");
	});

	test("the args prop reaches the constructor", () => {
		renderer.render(<my-turret args={[1, "two"]} />, scene);

		const turret = scene.children[0] as Turret;
		expect(turret.args).toEqual([1, "two"]);
	});

	test("a registered tag patches like a generated tag", () => {
		renderer.render(<my-turret label="one" power={1} x={2} />, scene);
		const turret = scene.children[0] as Turret;

		renderer.render(<my-turret label="two" power={5} x={8} />, scene);

		expect(scene.children[0]).toBe(turret);
		expect(turret.label).toBe("two");
		expect(turret.power).toBe(5);
		expect(turret.position.x).toBe(8);
	});

	test("a registered tag takes the common transform props", () => {
		renderer.render(
			<my-turret position={[1, 2, 3]} rotationY={0.5} scale={2} />,
			scene,
		);

		const turret = scene.children[0] as Turret;
		expect(turret.position.z).toBe(3);
		expect(turret.rotation.y).toBe(0.5);
		expect(turret.scale.x).toBe(2);
	});

	test("a color prop of a registered tag writes into the Color", () => {
		renderer.render(<my-turret color={0x00ff00} />, scene);

		const turret = scene.children[0] as Turret;
		expect(turret.color.getHex()).toBe(0x00ff00);
	});

	test("a registered tag holds children", () => {
		renderer.render(
			<my-turret>
				<mesh name="barrel" />
			</my-turret>,
			scene,
		);

		const turret = scene.children[0] as Turret;
		expect(turret.children.length).toBe(1);
		expect(turret.children[0].name).toBe("barrel");
	});

	test("a registered tag unmounts like a generated tag", () => {
		renderer.render(
			<group>
				<my-turret />
			</group>,
			scene,
		);
		const group = scene.children[0] as THREE.Group;
		const turret = group.children[0];

		renderer.render(<group />, scene);

		expect(group.children.length).toBe(0);
		expect(turret.parent).toBe(null);
	});

	test("a registered class that is not an Object3D takes props but no place in the graph", () => {
		register("my-widget", Widget as any);

		const value = renderer.render(<my-widget value={7} />, scene);

		// Three.js holds only an Object3D in its children.
		expect(scene.children.length).toBe(0);
		expect(value).toBeInstanceOf(Widget);
		expect((value as unknown as Widget).value).toBe(7);
	});

	test("unregister removes the tag", () => {
		unregister("my-turret");

		expect(getRegisteredTagNames()).not.toContain("my-turret");
		expect(() => renderer.render(<my-turret />, scene)).toThrow(
			/Unknown Three.js tag/,
		);
	});

	test("a registered tag needs a dash in its name", () => {
		expect(() => register("turret", Turret)).toThrow(/must contain a dash/);
	});

	test("register needs a class", () => {
		expect(() => register("bad-tag", undefined as any)).toThrow(
			/needs a class/,
		);
	});
});
