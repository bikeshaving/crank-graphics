/// <reference lib="dom" />
import { describe, test, expect, beforeEach, afterEach } from "@b9g/libuild/test";
import * as PIXI from "pixi.js";

import { createElement, type Context } from "@b9g/crank";
import {
	renderer,
	register,
	clearRegisteredElements,
	collectParentTextStyles,
} from "../src/index.js";
import { textureRegistry } from "../src/core/texture-registry.js";
import { TEXT_PARENT } from "../src/core/symbols.js";

function makeTexture(app: PIXI.Application): PIXI.Texture {
	const graphics = new PIXI.Graphics();
	graphics.rect(0, 0, 8, 8);
	graphics.fill(0x00ff00);
	const texture = app.renderer.generateTexture(graphics);
	graphics.destroy();
	return texture;
}

describe("unmount and cleanup", () => {
	let pixiApp: PIXI.Application;

	beforeEach(async () => {
		pixiApp = new PIXI.Application();
		await pixiApp.init({width: 800, height: 600});
		pixiApp.stage.removeChildren();
	});

	afterEach(() => {
		if (pixiApp) {
			pixiApp.destroy(true, true);
		}
	});

	test("rendering null clears the stage", () => {
		renderer.render(
			<container>
				<sprite label="one" />
				<sprite label="two" />
			</container>,
			pixiApp,
		);

		const parent = pixiApp.stage.children[0] as PIXI.Container;
		const child = parent.children[0];

		renderer.render(null, pixiApp);

		expect(pixiApp.stage.children.length).toBe(0);
		expect(parent.parent).toBe(null);
		// The adapter detaches nodes. It does not destroy them, so a node that
		// leaves the tree stays usable.
		expect(parent.destroyed).toBeFalsy();
		expect(child.destroyed).toBeFalsy();
	});

	test("a texture passed by the user survives the unmount of its sprite", () => {
		const texture = makeTexture(pixiApp);

		renderer.render(<sprite texture={texture} />, pixiApp);
		const sprite = pixiApp.stage.children[0] as PIXI.Sprite;
		expect(sprite.texture).toBe(texture);

		renderer.render(null, pixiApp);

		expect(pixiApp.stage.children.length).toBe(0);
		expect(texture.destroyed).toBeFalsy();
		expect(sprite.destroyed).toBeFalsy();

		texture.destroy(true);
	});

	test("a subtree that unmounts leaves the deeper children detached", () => {
		let ctx!: Context;
		let show = true;

		function* Toggle(this: Context) {
			ctx = this;
			while (true) {
				yield show ? (
					<container label="group">
						<sprite label="leaf" />
					</container>
				) : (
					<sprite label="replacement" />
				);
			}
		}

		renderer.render(<Toggle />, pixiApp);
		const group = pixiApp.stage.children[0] as PIXI.Container;
		const leaf = group.children[0];

		show = false;
		ctx.refresh();

		expect(pixiApp.stage.children.length).toBe(1);
		expect(pixiApp.stage.children[0].label).toBe("replacement");
		expect(group.parent).toBe(null);
		expect(leaf.destroyed).toBeFalsy();
	});
});

describe("the virtual texture element", () => {
	let pixiApp: PIXI.Application;

	beforeEach(async () => {
		pixiApp = new PIXI.Application();
		await pixiApp.init({width: 800, height: 600});
		pixiApp.stage.removeChildren();
		textureRegistry.clear();
		textureRegistry.clearPendingReferences();
	});

	afterEach(() => {
		textureRegistry.clear();
		textureRegistry.clearPendingReferences();
		if (pixiApp) {
			pixiApp.destroy(true, true);
		}
	});

	test("a texture element registers its texture and stays invisible", () => {
		const texture = makeTexture(pixiApp);

		renderer.render(<texture id="logo" texture={texture} />, pixiApp);

		const node = pixiApp.stage.children[0] as PIXI.Container;
		expect(textureRegistry.has("logo")).toBeTruthy();
		expect(node.visible).toBeFalsy();
		expect(node instanceof PIXI.Container).toBeTruthy();
		expect(textureRegistry.getInfo("logo")!.texture).toBe(texture);
	});

	test("a sprite reads a texture that an earlier element registered", () => {
		const texture = makeTexture(pixiApp);

		renderer.render(
			<container>
				<texture id="early" texture={texture} />
				<sprite texture="url(#early)" />
			</container>,
			pixiApp,
		);

		const parent = pixiApp.stage.children[0] as PIXI.Container;
		const sprite = parent.children[1] as PIXI.Sprite;
		expect(sprite.texture).toBe(texture);
	});

	test("a forward reference resolves when the texture mounts later", () => {
		const texture = makeTexture(pixiApp);

		renderer.render(
			<container>
				<sprite texture="url(#late)" />
				<texture id="late" texture={texture} />
			</container>,
			pixiApp,
		);

		// finalize() resolves the references that the property applier deferred
		const parent = pixiApp.stage.children[0] as PIXI.Container;
		const sprite = parent.children[0] as PIXI.Sprite;
		expect(sprite.texture).toBe(texture);
		expect(textureRegistry.getPendingReferenceCount()).toBe(0);
	});

	test("a reference with no texture element stays pending", () => {
		renderer.render(<sprite texture="url(#missing)" />, pixiApp);

		const sprite = pixiApp.stage.children[0] as PIXI.Sprite;
		expect(sprite.texture).toBe(PIXI.Texture.EMPTY);
		expect(textureRegistry.getPendingReferenceCount()).toBe(1);
	});

	test("unmounting a texture element unregisters the texture", () => {
		const texture = makeTexture(pixiApp);

		renderer.render(
			<container>
				<texture id="scoped" texture={texture} />
				<sprite texture="url(#scoped)" />
			</container>,
			pixiApp,
		);

		expect(textureRegistry.has("scoped")).toBeTruthy();

		renderer.render(null, pixiApp);

		expect(textureRegistry.has("scoped")).toBeFalsy();
		// A sprite acquired the texture, so the reference count protects it
		// from the destroy that unregister() performs at a count of zero.
		expect(texture.destroyed).toBeFalsy();

		texture.destroy(true);
	});

	test("unregister destroys a texture that no node acquired", () => {
		const texture = makeTexture(pixiApp);

		renderer.render(<texture id="orphan" texture={texture} />, pixiApp);
		expect(textureRegistry.getInfo("orphan")!.refCount).toBe(0);

		renderer.render(null, pixiApp);

		expect(textureRegistry.has("orphan")).toBeFalsy();
		expect(texture.destroyed).toBeTruthy();
	});
});

describe("registered elements over time", () => {
	let pixiApp: PIXI.Application;

	class Meter extends PIXI.Container {
		level = 0;
	}

	beforeEach(async () => {
		pixiApp = new PIXI.Application();
		await pixiApp.init({width: 800, height: 600});
		pixiApp.stage.removeChildren();
		register("my-meter", Meter);
	});

	afterEach(() => {
		clearRegisteredElements();
		if (pixiApp) {
			pixiApp.destroy(true, true);
		}
	});

	test("a registered element patches in place", () => {
		renderer.render(<my-meter level={1} x={10} />, pixiApp);
		const node = pixiApp.stage.children[0] as Meter;
		expect(node.level).toBe(1);

		renderer.render(<my-meter level={7} x={20} />, pixiApp);

		expect(pixiApp.stage.children[0]).toBe(node);
		expect(node.level).toBe(7);
		expect(node.x).toBe(20);
	});

	test("a registered element takes children and unmounts", () => {
		renderer.render(
			<my-meter level={2}>
				<sprite label="needle" />
			</my-meter>,
			pixiApp,
		);

		const node = pixiApp.stage.children[0] as Meter;
		expect(node.children.length).toBe(1);
		expect(node.children[0].label).toBe("needle");

		renderer.render(null, pixiApp);

		expect(pixiApp.stage.children.length).toBe(0);
		expect(node.parent).toBe(null);
	});

	test("a registered element handles events like a generated tag", () => {
		let calls = 0;
		const onClick = () => {
			calls++;
		};

		renderer.render(<my-meter onClick={onClick} />, pixiApp);
		const node = pixiApp.stage.children[0] as Meter;

		renderer.render(<my-meter onClick={onClick} level={1} />, pixiApp);

		expect(node.listenerCount("click")).toBe(1);
		node.emit("click", {} as any);
		expect(calls).toBe(1);
	});
});

describe("text style inheritance", () => {
	test("a text child inherits size, family and fill from its text parent", () => {
		const parent = new PIXI.Text({
			text: "parent",
			style: {fontSize: 40, fontFamily: "Courier", fill: 0x00ff00},
		});
		const child = new PIXI.Text({text: "child"});
		(child as any)[TEXT_PARENT] = parent;

		const styles = collectParentTextStyles(child);

		expect(styles.fontSize).toBe(40);
		expect(styles.fontFamily).toBe("Courier");
		expect(styles.fill).toBe(0x00ff00);

		parent.destroy();
		child.destroy();
	});

	test("a normal weight and style are not inherited", () => {
		const parent = new PIXI.Text({
			text: "parent",
			style: {fontSize: 30, fontWeight: "normal", fontStyle: "normal"},
		});
		const child = new PIXI.Text({text: "child"});
		(child as any)[TEXT_PARENT] = parent;

		const styles = collectParentTextStyles(child);

		expect("fontWeight" in styles).toBeFalsy();
		expect("fontStyle" in styles).toBeFalsy();

		parent.destroy();
		child.destroy();
	});

	test("a bold parent passes its weight down", () => {
		const parent = new PIXI.Text({
			text: "parent",
			style: {fontSize: 30, fontWeight: "bold", fontStyle: "italic"},
		});
		const child = new PIXI.Text({text: "child"});
		(child as any)[TEXT_PARENT] = parent;

		const styles = collectParentTextStyles(child);

		expect(styles.fontWeight).toBe("bold");
		expect(styles.fontStyle).toBe("italic");

		parent.destroy();
		child.destroy();
	});

	test("a text with no text parent inherits nothing", () => {
		const container = new PIXI.Container();
		const child = new PIXI.Text({text: "child"});
		container.addChild(child);

		expect(collectParentTextStyles(child)).toEqual({});

		container.destroy({children: true});
	});
});
