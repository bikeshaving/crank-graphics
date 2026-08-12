/// <reference lib="dom" />
import { suite } from "uvu";
import * as Assert from "uvu/assert";
import * as PIXI from "pixi.js";

import { createElement } from "@b9g/crank";
import {
	renderer,
	register,
	getRegisteredTags,
	clearRegisteredElements,
} from "../src/index.js";
import { PIXI_TAG_MAP } from "../src/generated/tag-mapping.js";

const test = suite("extended tags and register()");

let pixiApp: PIXI.Application;

test.before.each(async () => {
	pixiApp = new PIXI.Application();
	await pixiApp.init({
		width: 800,
		height: 600,
		backgroundColor: 0x1099bb,
	});
	pixiApp.stage.removeChildren();
});

test.after.each(() => {
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
		Assert.ok(tags.includes(tag), `Missing expected tag: ${tag}`);
	}

	// Abstract classes are not constructible
	Assert.not.ok(tags.includes("abstracttext"));
});

test("renderlayer creation", () => {
	renderer.render(<renderlayer />, pixiApp);

	const child = pixiApp.stage.children[0];
	Assert.ok(child instanceof PIXI.RenderLayer);
});

test("domcontainer creation", () => {
	renderer.render(<domcontainer x={10} y={20} />, pixiApp);

	const child = pixiApp.stage.children[0] as PIXI.DOMContainer;
	Assert.ok(child instanceof PIXI.DOMContainer);
	Assert.is(child.x, 10);
	Assert.is(child.y, 20);
});

test("rendercontainer creation", () => {
	renderer.render(<rendercontainer alpha={0.5} />, pixiApp);

	const child = pixiApp.stage.children[0] as PIXI.RenderContainer;
	Assert.ok(child instanceof PIXI.RenderContainer);
	Assert.is(child.alpha, 0.5);
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
	Assert.ok(child instanceof PIXI.MeshSimple);
	Assert.is(child.x, 5);
});

class SpinningBox extends PIXI.Container {
	spins = 0;

	spin(): void {
		this.spins++;
	}
}

test("register() adds a class under a dashed tag", () => {
	register("spinning-box", SpinningBox);

	Assert.ok(getRegisteredTags().includes("spinning-box"));

	renderer.render(
		<spinning-box x={30} y={40} spins={3} alpha={0.25} />,
		pixiApp,
	);

	const child = pixiApp.stage.children[0] as SpinningBox;
	Assert.ok(child instanceof SpinningBox);
	Assert.is(child.x, 30);
	Assert.is(child.y, 40);
	Assert.is(child.spins, 3);
	Assert.is(child.alpha, 0.25);
});

test("register() rejects a dashless tag name", () => {
	let message = "";
	try {
		register("spinningbox", SpinningBox);
	} catch (error) {
		message = (error as Error).message;
	}

	Assert.ok(message.includes("must contain a dash"));
	Assert.not.ok(getRegisteredTags().includes("spinningbox"));
});

test.run();
