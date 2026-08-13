/// <reference lib="dom" />
import { describe, test, expect, beforeEach, afterEach } from "@b9g/libuild/test";
import * as PIXI from "pixi.js";

import { createElement } from "@b9g/crank";
import { renderer } from "../src/index.js";
import {
	textureRegistry,
	type TextureLoadEvent,
} from "../src/core/texture-registry.js";

// Every test uses its own source string, so the Assets cache of one test never
// decides the result of another.
function makeDataUri(width: number, color: string): string {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = width;
	const context = canvas.getContext("2d")!;
	context.fillStyle = color;
	context.fillRect(0, 0, width, width);
	return canvas.toDataURL("image/png");
}

async function makeBlobUrl(dataUri: string): Promise<string> {
	const response = await fetch(dataUri);
	return URL.createObjectURL(await response.blob());
}

function makeCanvasTexture(app: PIXI.Application, size: number): PIXI.Texture {
	const graphics = new PIXI.Graphics();
	graphics.rect(0, 0, size, size);
	graphics.fill(0x3366ff);
	const texture = app.renderer.generateTexture(graphics);
	graphics.destroy();
	return texture;
}

/** Wait for the registry event of one texture ID. */
function waitForEvent(
	type: "load" | "error",
	id: string,
	ms = 5000,
): Promise<TextureLoadEvent> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			textureRegistry.removeEventListener(type, handler as EventListener);
			reject(new Error(`Timed out waiting for the ${type} event of "${id}"`));
		}, ms);

		const handler = (event: TextureLoadEvent) => {
			if (event.textureId !== id) return;
			clearTimeout(timer);
			textureRegistry.removeEventListener(type, handler as EventListener);
			resolve(event);
		};

		textureRegistry.addEventListener(type, handler as EventListener);
	});
}

describe("asset loading", () => {
	let pixiApp: PIXI.Application;
	let rejections: unknown[];
	let onRejection: (event: PromiseRejectionEvent) => void;

	beforeEach(async () => {
		pixiApp = new PIXI.Application();
		await pixiApp.init({width: 200, height: 200});
		pixiApp.stage.removeChildren();
		textureRegistry.clear();
		textureRegistry.clearPendingReferences();

		rejections = [];
		onRejection = (event) => {
			rejections.push(event.reason);
		};
		window.addEventListener("unhandledrejection", onRejection);
	});

	afterEach(() => {
		window.removeEventListener("unhandledrejection", onRejection);
		// Destroy the app first. Its ticker must not render a sprite whose
		// texture the registry is about to destroy.
		if (pixiApp) {
			pixiApp.destroy(true, true);
		}
		textureRegistry.clear();
		textureRegistry.clearPendingReferences();
	});

	test("a src texture registers after the load, not during the render", async () => {
		const src = makeDataUri(2, "#ff0000");
		const loaded = waitForEvent("load", "async-one");

		renderer.render(<texture id="async-one" src={src} />, pixiApp);

		// The registration is asynchronous, so nothing is registered yet
		expect(textureRegistry.has("async-one")).toBeFalsy();

		await loaded;

		const info = textureRegistry.getInfo("async-one")!;
		expect(info.texture).not.toBe(PIXI.Texture.EMPTY);
		expect(info.texture.width).toBe(2);
		expect(info.source).toBe(src);
	});

	test("a sprite that waits for a src texture gets it when the load settles", async () => {
		const src = makeDataUri(4, "#00ff00");
		const loaded = waitForEvent("load", "async-two");

		renderer.render(
			<container>
				<texture id="async-two" src={src} />
				<sprite texture="url(#async-two)" />
			</container>,
			pixiApp,
		);

		const parent = pixiApp.stage.children[0] as PIXI.Container;
		const sprite = parent.children[1] as PIXI.Sprite;

		// Until the load settles the sprite holds the fallback and the
		// reference waits in the registry
		expect(sprite.texture).toBe(PIXI.Texture.EMPTY);
		expect(textureRegistry.getPendingReferenceCount()).toBe(1);

		await loaded;

		expect(sprite.texture).toBe(textureRegistry.getInfo("async-two")!.texture);
		expect(sprite.texture.width).toBe(4);
		expect(textureRegistry.getPendingReferenceCount()).toBe(0);
		expect(rejections.length).toBe(0);
	});

	test("the load event carries the ID and the texture, once", async () => {
		const src = makeDataUri(2, "#0000ff");
		const events: TextureLoadEvent[] = [];
		const handler = (event: TextureLoadEvent) => {
			events.push(event);
		};
		textureRegistry.addEventListener("load", handler as EventListener);

		const loaded = waitForEvent("load", "evented");
		renderer.render(<texture id="evented" src={src} />, pixiApp);
		const event = await loaded;

		expect(event.textureId).toBe("evented");
		expect(event.texture!.width).toBe(2);
		expect(event.detail.textureId).toBe("evented");
		expect(event.error).toBe(undefined);

		// A second render of the same element patches nothing, so no second event
		renderer.render(<texture id="evented" src={src} />, pixiApp);
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(events.length).toBe(1);
		textureRegistry.removeEventListener("load", handler as EventListener);
	});

	test("a texture prop fires the load event during the render", () => {
		const texture = makeCanvasTexture(pixiApp, 6);
		const events: TextureLoadEvent[] = [];
		const handler = (event: TextureLoadEvent) => {
			events.push(event);
		};
		textureRegistry.addEventListener("load", handler as EventListener);

		renderer.render(<texture id="direct" texture={texture} />, pixiApp);

		expect(events.length).toBe(1);
		expect(events[0].textureId).toBe("direct");
		expect(events[0].texture).toBe(texture);
		textureRegistry.removeEventListener("load", handler as EventListener);
	});

	test("a source that cannot load reports an error and falls back", async () => {
		const failed = waitForEvent("error", "broken");

		renderer.render(
			<container>
				<texture id="broken" src="/no/such/texture.png" />
				<sprite texture="url(#broken)" />
			</container>,
			pixiApp,
		);

		const event = await failed;
		expect(event.textureId).toBe("broken");
		expect(event.error).toBeTruthy();

		const info = textureRegistry.getInfo("broken")!;
		expect(info.texture).toBe(PIXI.Texture.EMPTY);
		expect(typeof info.metadata!.error).toBe("string");

		// The waiting sprite gets the fallback instead of waiting forever
		const parent = pixiApp.stage.children[0] as PIXI.Container;
		const sprite = parent.children[1] as PIXI.Sprite;
		expect(sprite.texture).toBe(PIXI.Texture.EMPTY);
		expect(textureRegistry.getPendingReferenceCount()).toBe(0);

		// The failure is handled inside the registry
		expect(rejections.length).toBe(0);
	});

	test("a malformed data URI fails the same way", async () => {
		const failed = waitForEvent("error", "malformed");

		renderer.render(
			<texture id="malformed" src="data:image/png;base64,not-base64!!" />,
			pixiApp,
		);

		await failed;

		expect(textureRegistry.getInfo("malformed")!.texture).toBe(
			PIXI.Texture.EMPTY,
		);
		expect(rejections.length).toBe(0);
	});

	test("two texture elements with the same ID: the last one wins", async () => {
		const first = makeCanvasTexture(pixiApp, 4);
		const second = makeCanvasTexture(pixiApp, 8);

		renderer.render(
			<container>
				<texture id="dup" texture={first} />
				<texture id="dup" texture={second} />
			</container>,
			pixiApp,
		);

		expect(textureRegistry.getIds()).toEqual(["dup"]);
		expect(textureRegistry.getInfo("dup")!.texture).toBe(second);
		// The replaced entry had no references, so unregister() destroyed it
		expect(first.destroyed).toBeTruthy();
		expect(second.destroyed).toBeFalsy();
	});

	test("a second source for an ID that is still loading is ignored", async () => {
		const src = makeDataUri(2, "#123456");
		const other = makeDataUri(16, "#654321");

		const firstLoad = textureRegistry.registerFromSource("racing", src);
		const secondLoad = textureRegistry.registerFromSource("racing", other);

		// The in-flight load wins: the second call returns the same promise
		const [a, b] = await Promise.all([firstLoad, secondLoad]);
		expect(a).toBe(b);
		expect(textureRegistry.getInfo("racing")!.source).toBe(src);
		expect(textureRegistry.getInfo("racing")!.texture.width).toBe(2);
	});

	test("unmounting a texture element while its load runs leaves no entry", async () => {
		const src = makeDataUri(2, "#abcdef");

		renderer.render(<texture id="cancelled" src={src} />, pixiApp);
		// Unmount before the load settles
		renderer.render(null, pixiApp);

		expect(textureRegistry.has("cancelled")).toBeFalsy();

		await new Promise((resolve) => setTimeout(resolve, 100));

		// The settled load must not resurrect the entry
		expect(textureRegistry.has("cancelled")).toBeFalsy();
		expect(textureRegistry.getIds()).toEqual([]);
		expect(rejections.length).toBe(0);
	});

	test("one source under two IDs makes two entries that share a texture", async () => {
		const src = makeDataUri(4, "#0f0f0f");

		const one = await textureRegistry.registerFromSource("share-a", src);
		const two = await textureRegistry.registerFromSource("share-b", src);

		expect(textureRegistry.getIds()).toEqual(["share-a", "share-b"]);
		// Pixi caches by source, so both entries hold the same texture object
		expect(one).toBe(two);

		// Unregistering the first entry destroys the texture that the second
		// entry still points to. Two IDs for one source are not independent.
		textureRegistry.unregister("share-a");
		expect(textureRegistry.getInfo("share-b")!.texture.destroyed).toBeTruthy();
	});

	test("changing the src of a mounted texture element does not reload it", async () => {
		const first = makeDataUri(2, "#ff00ff");
		const second = makeDataUri(16, "#00ffff");

		const loaded = waitForEvent("load", "static-src");
		renderer.render(<texture id="static-src" src={first} />, pixiApp);
		await loaded;

		const texture = textureRegistry.getInfo("static-src")!.texture;

		renderer.render(<texture id="static-src" src={second} />, pixiApp);
		await new Promise((resolve) => setTimeout(resolve, 100));

		// patch() skips texture definition elements, so the registration
		// happens at creation only. A src change needs a new element.
		expect(textureRegistry.getInfo("static-src")!.texture).toBe(texture);
		expect(textureRegistry.getInfo("static-src")!.texture.width).toBe(2);
		expect(textureRegistry.getInfo("static-src")!.source).toBe(first);
	});

	test("changing the id prop alone does not register the new ID", async () => {
		const src = makeDataUri(2, "#101010");

		const loaded = waitForEvent("load", "id-one");
		renderer.render(<texture id="id-one" src={src} />, pixiApp);
		await loaded;

		renderer.render(<texture id="id-two" src={src} />, pixiApp);
		await new Promise((resolve) => setTimeout(resolve, 100));

		// The element patches in place, and patch() skips texture definitions
		expect(textureRegistry.has("id-one")).toBeTruthy();
		expect(textureRegistry.has("id-two")).toBeFalsy();
	});

	test("a keyed texture element swaps the texture that a sprite reads", async () => {
		const first = makeDataUri(2, "#101010");
		const second = makeDataUri(16, "#202020");

		function scene(id: string, src: string) {
			return (
				<container>
					<texture key={id} id={id} src={src} />
					<sprite texture={`url(#${id})`} />
				</container>
			);
		}

		const firstLoaded = waitForEvent("load", "swap-one");
		renderer.render(scene("swap-one", first), pixiApp);
		await firstLoaded;

		const secondLoaded = waitForEvent("load", "swap-two");
		renderer.render(scene("swap-two", second), pixiApp);
		await secondLoaded;

		const parent = pixiApp.stage.children[0] as PIXI.Container;
		const sprite = parent.children[1] as PIXI.Sprite;
		expect(sprite.texture.width).toBe(16);
		// The key gives a new element, so the old one unmounts and unregisters
		expect(textureRegistry.has("swap-one")).toBeFalsy();
		expect(textureRegistry.has("swap-two")).toBeTruthy();
	});

	test("a blob URL loads like any other source", async () => {
		const blobUrl = await makeBlobUrl(makeDataUri(8, "#00ff88"));

		try {
			const loaded = waitForEvent("load", "blob");
			renderer.render(
				<container>
					<texture id="blob" src={blobUrl} />
					<sprite texture="url(#blob)" />
				</container>,
				pixiApp,
			);
			await loaded;

			const parent = pixiApp.stage.children[0] as PIXI.Container;
			const sprite = parent.children[1] as PIXI.Sprite;
			expect(sprite.texture.width).toBe(8);
			expect(sprite.texture).not.toBe(PIXI.Texture.EMPTY);
		} finally {
			URL.revokeObjectURL(blobUrl);
		}
	});

	test("a canvas texture passed by prop reaches a referencing sprite", () => {
		const texture = makeCanvasTexture(pixiApp, 12);

		renderer.render(
			<container>
				<texture id="canvas" texture={texture} />
				<sprite texture="url(#canvas)" />
			</container>,
			pixiApp,
		);

		const parent = pixiApp.stage.children[0] as PIXI.Container;
		const sprite = parent.children[1] as PIXI.Sprite;
		expect(sprite.texture).toBe(texture);
		expect(sprite.texture.width).toBe(12);
		expect(textureRegistry.getInfo("canvas")!.refCount).toBe(1);
	});

	test("a sprite that mounts after the load reads the texture at once", async () => {
		const src = makeDataUri(4, "#777777");

		function scene(withSprite: boolean) {
			return (
				<container>
					<texture id="ready" src={src} />
					{withSprite ? <sprite texture="url(#ready)" /> : null}
				</container>
			);
		}

		const loaded = waitForEvent("load", "ready");
		renderer.render(scene(false), pixiApp);
		await loaded;

		renderer.render(scene(true), pixiApp);

		const parent = pixiApp.stage.children[0] as PIXI.Container;
		const sprite = parent.children[1] as PIXI.Sprite;
		expect(sprite.texture.width).toBe(4);
		expect(textureRegistry.getPendingReferenceCount()).toBe(0);
	});
});
