/// <reference lib="dom" />
import { describe, test, expect, beforeEach, afterEach } from "@b9g/libuild/test";
import * as PIXI from "pixi.js";

import { createElement } from "@b9g/crank";
import {
	renderer,
	register,
	getRegisteredTags,
	clearRegisteredElements,
} from "../src/index.js";
import { PIXI_TAG_MAP } from "../src/generated/tag-mapping.js";

describe("extended tags and register()", () => {
	let pixiApp: PIXI.Application;

	beforeEach(async () => {
		pixiApp = new PIXI.Application();
		await pixiApp.init({
			width: 800,
			height: 600,
			backgroundColor: 0x1099bb,
		});
		pixiApp.stage.removeChildren();
	});

	afterEach(() => {
		clearRegisteredElements();
		if (pixiApp) {
			pixiApp.destroy(true, true);
		}
	});

	test("the catalog covers the Pixi 8 container hierarchy", () => {
		const tags = Object.keys(PIXI_TAG_MAP).filter((tag) => tag !== "texture");
		const expected = [
			"meshplane",
			"meshrope",
			"meshsimple",
			"perspectivemesh",
			"domcontainer",
			"renderlayer",
			"rendercontainer",
		];

		for (const tag of expected) {
			expect(tags.includes(tag)).toBeTruthy();
		}

		// Abstract classes are not constructible
		expect(tags.includes("abstracttext")).toBeFalsy();
	});

	test("renderlayer creation", () => {
		renderer.render(<renderlayer />, pixiApp);

		const child = pixiApp.stage.children[0];
		expect(child instanceof PIXI.RenderLayer).toBeTruthy();
	});

	test("domcontainer creation", () => {
		renderer.render(<domcontainer x={10} y={20} />, pixiApp);

		const child = pixiApp.stage.children[0] as PIXI.DOMContainer;
		expect(child instanceof PIXI.DOMContainer).toBeTruthy();
		expect(child.x).toBe(10);
		expect(child.y).toBe(20);
	});

	test("rendercontainer creation", () => {
		renderer.render(<rendercontainer alpha={0.5} />, pixiApp);

		const child = pixiApp.stage.children[0] as PIXI.RenderContainer;
		expect(child instanceof PIXI.RenderContainer).toBeTruthy();
		expect(child.alpha).toBe(0.5);
	});

	test("meshsimple creation", () => {
		const graphics = new PIXI.Graphics();
		graphics.rect(0, 0, 50, 50);
		graphics.fill(0x00ff00);
		const texture = pixiApp.renderer.generateTexture(graphics);
		const vertices = new Float32Array([0, 0, 100, 0, 100, 100, 0, 100]);

		renderer.render(
			<meshsimple texture={texture} vertices={vertices} x={5} />,
			pixiApp,
		);

		const child = pixiApp.stage.children[0] as PIXI.MeshSimple;
		expect(child instanceof PIXI.MeshSimple).toBeTruthy();
		expect(child.x).toBe(5);
	});

	class SpinningBox extends PIXI.Container {
		spins = 0;

		spin(): void {
			this.spins++;
		}
	}

	test("register() adds a class under a dashed tag", () => {
		register("spinning-box", SpinningBox);

		expect(getRegisteredTags().includes("spinning-box")).toBeTruthy();

		renderer.render(
			<spinning-box x={30} y={40} spins={3} alpha={0.25} />,
			pixiApp,
		);

		const child = pixiApp.stage.children[0] as SpinningBox;
		expect(child instanceof SpinningBox).toBeTruthy();
		expect(child.x).toBe(30);
		expect(child.y).toBe(40);
		expect(child.spins).toBe(3);
		expect(child.alpha).toBe(0.25);
	});

	test("register() rejects a dashless tag name", () => {
		let message = "";
		try {
			register("spinningbox", SpinningBox);
		} catch (error) {
			message = (error as Error).message;
		}

		expect(message.includes("must contain a dash")).toBeTruthy();
		expect(getRegisteredTags().includes("spinningbox")).toBeFalsy();
	});
});
