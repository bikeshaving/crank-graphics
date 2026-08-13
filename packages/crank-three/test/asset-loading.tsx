/// <reference lib="dom" />
import {describe, test, expect, beforeEach, afterEach} from "@b9g/libuild/test";
import * as THREE from "three";
import type {Context} from "@b9g/crank";

import {renderer, assetRegistry} from "../src/index.js";

// A 1x1 PNG. Every load in this file stays inside the page: a data URI, an
// object URL, or a path that does not exist.
const PNG =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const MISSING = "/no-such-directory/no-such-file.png";

function blobUrlFor(): string {
	const canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = 1;
	const context = canvas.getContext("2d")!;
	context.fillStyle = "#ff0000";
	context.fillRect(0, 0, 1, 1);
	return canvas.toDataURL("image/png");
}

/** Wait until a condition holds, or fail after the timeout. */
async function until(
	condition: () => boolean,
	message: string,
	timeout = 3000,
): Promise<void> {
	const start = Date.now();
	while (!condition()) {
		if (Date.now() - start > timeout) {
			throw new Error(`Timed out: ${message}`);
		}

		await new Promise((resolve) => setTimeout(resolve, 10));
	}
}

function materialOf(object: THREE.Object3D): THREE.MeshBasicMaterial {
	return (object as THREE.Mesh).material as THREE.MeshBasicMaterial;
}

describe("asset loading", () => {
	let scene: THREE.Scene;

	beforeEach(() => {
		scene = new THREE.Scene();
	});

	afterEach(() => {
		renderer.render(null, scene);
		assetRegistry.clear();
	});

	// ---------------------------------------------------------------------
	// Asset type detection
	// ---------------------------------------------------------------------

	test("a file extension gives the asset type", async () => {
		await assetRegistry.registerFromSource("t-gltf", "/model.gltf");
		await assetRegistry.registerFromSource("t-glb", "/model.glb");
		await assetRegistry.registerFromSource("t-obj", "/model.obj");
		await assetRegistry.registerFromSource("t-mp3", "/sound.mp3");
		await assetRegistry.registerFromSource("t-wav", "/sound.wav");
		await assetRegistry.registerFromSource("t-unknown", "/data.xyz");

		expect(assetRegistry.getInfo("t-gltf")?.type).toBe("gltf");
		expect(assetRegistry.getInfo("t-glb")?.type).toBe("glb");
		expect(assetRegistry.getInfo("t-obj")?.type).toBe("obj");
		expect(assetRegistry.getInfo("t-mp3")?.type).toBe("audio");
		expect(assetRegistry.getInfo("t-wav")?.type).toBe("audio");
		// An extension that the registry does not know is a custom asset.
		expect(assetRegistry.getInfo("t-unknown")?.type).toBe("custom");
	});

	test("a query string and a fragment are not part of the extension", async () => {
		await assetRegistry.registerFromSource("t-query", `${MISSING}?v=2`);
		await assetRegistry.registerFromSource("t-hash", `${MISSING}#frag`);

		expect(assetRegistry.getInfo("t-query")?.type).toBe("texture");
		expect(assetRegistry.getInfo("t-hash")?.type).toBe("texture");
	});

	test("a data URI takes its type from its MIME type", async () => {
		await assetRegistry.registerFromSource("t-data", PNG);

		expect(assetRegistry.getInfo("t-data")?.type).toBe("texture");
		expect(assetRegistry.getInfo("t-data")?.asset).toBeInstanceOf(THREE.Texture);
	});

	test("a source without a type needs the type prop", async () => {
		const url = URL.createObjectURL(new Blob(["x"], {type: "image/png"}));

		try {
			await assetRegistry.registerFromSource("t-blob", url);
			// An object URL carries no extension and no MIME type, so the
			// registry cannot detect it. Pass type="texture" for such a source.
			expect(assetRegistry.getInfo("t-blob")?.type).toBe("custom");

			await assetRegistry.registerFromSource("t-blob-typed", url, "texture");
			expect(assetRegistry.getInfo("t-blob-typed")?.type).toBe("texture");
		} finally {
			URL.revokeObjectURL(url);
		}
	});

	test("an explicit type beats detection", async () => {
		await assetRegistry.registerFromSource("t-forced", "/thing.mp3", "custom");

		expect(assetRegistry.getInfo("t-forced")?.type).toBe("custom");
	});

	// ---------------------------------------------------------------------
	// The loading transition
	// ---------------------------------------------------------------------

	test("a src load is asynchronous, and the reference waits", async () => {
		renderer.render(
			<group>
				<texture id="slow" src={PNG} />
				<mesh>
					<meshbasicmaterial map="url(#slow)" />
				</mesh>
			</group>,
			scene,
		);

		const group = scene.children[0] as THREE.Group;
		const material = materialOf(group.children[1]);
		const placeholder = material.map!;

		// The load has not finished, so the material holds a blank placeholder.
		expect(assetRegistry.has("slow")).toBe(false);
		expect(placeholder).toBeInstanceOf(THREE.Texture);
		expect(placeholder.image).toBe(null);

		await until(() => assetRegistry.has("slow"), "the texture never loaded");

		// The registry holds the real texture with its image.
		const loaded = assetRegistry.getInfo("slow")!.asset as THREE.Texture;
		expect(loaded.image).toBeDefined();
		expect(loaded.image.width).toBe(1);
	});

	test("the next render gives the material the loaded texture", async () => {
		function Tree() {
			return (
				<group>
					<texture id="settle" src={PNG} />
					<mesh>
						<meshbasicmaterial map="url(#settle)" />
					</mesh>
				</group>
			);
		}

		renderer.render(<Tree />, scene);
		const group = scene.children[0] as THREE.Group;
		const material = materialOf(group.children[1]);
		const version = material.version;

		await until(() => assetRegistry.has("settle"), "the texture never loaded");

		// A load that settles does not render again by itself. The reference
		// resolves during the next render.
		expect(material.map).not.toBe(assetRegistry.getInfo("settle")!.asset);

		renderer.render(<Tree />, scene);

		expect(material.map).toBe(assetRegistry.getInfo("settle")!.asset);
		// The renderer marks the material for a recompile.
		expect(material.version).toBeGreaterThan(version);
	});

	test("onload with ctx.refresh completes the picture", async () => {
		let ctx!: Context;

		function* Scene(this: Context) {
			ctx = this;
			while (true) {
				yield (
					<group>
						<texture id="refreshed" src={PNG} onload={() => ctx.refresh()} />
						<mesh>
							<meshbasicmaterial map="url(#refreshed)" />
						</mesh>
					</group>
				);
			}
		}

		renderer.render(<Scene />, scene);
		const group = scene.children[0] as THREE.Group;
		const material = materialOf(group.children[1]);

		await until(
			() => material.map === assetRegistry.getInfo("refreshed")?.asset,
			"the refresh never applied the texture",
		);

		expect((material.map as THREE.Texture).image.width).toBe(1);
	});

	// ---------------------------------------------------------------------
	// Load events
	// ---------------------------------------------------------------------

	test("onload fires one time with the asset", async () => {
		const events: Array<any> = [];

		function Tree() {
			return (
				<texture id="once" src={PNG} onload={(event: any) => events.push(event)} />
			);
		}

		renderer.render(<Tree />, scene);
		await until(() => events.length > 0, "onload never fired");

		renderer.render(<Tree />, scene);
		renderer.render(<Tree />, scene);
		await new Promise((resolve) => setTimeout(resolve, 50));

		// A re-render patches the element. It does not register the asset again.
		expect(events.length).toBe(1);
		expect(events[0].type).toBe("load");
		expect(events[0].assetId).toBe("once");
		expect(events[0].asset).toBeInstanceOf(THREE.Texture);
	});

	test("an asset that is already an object fires onload during the render", () => {
		const events: Array<any> = [];
		const texture = new THREE.Texture();

		renderer.render(
			<texture
				id="ready"
				texture={texture}
				onload={(event: any) => events.push(event)}
			/>,
			scene,
		);

		// No loader runs, so the event is synchronous.
		expect(events.length).toBe(1);
		expect(events[0].asset).toBe(texture);
	});

	test("onLoad in camel case works as well", async () => {
		let calls = 0;

		renderer.render(
			<texture id="camel" src={PNG} onLoad={() => calls++} />,
			scene,
		);
		await until(() => calls > 0, "onLoad never fired");

		expect(calls).toBe(1);
	});

	// ---------------------------------------------------------------------
	// Failure
	// ---------------------------------------------------------------------

	test("a load that fails fires onerror and registers a fallback", async () => {
		const events: Array<any> = [];

		renderer.render(
			<texture
				id="broken"
				src={MISSING}
				onerror={(event: any) => events.push(event)}
			/>,
			scene,
		);

		await until(() => events.length > 0, "onerror never fired");

		expect(events[0].type).toBe("error");
		expect(events[0].assetId).toBe("broken");
		expect(events[0].error).toBeDefined();

		// The registry keeps a blank texture, so a reference still gets an object.
		const info = assetRegistry.getInfo("broken")!;
		expect(info.asset).toBeInstanceOf(THREE.Texture);
		expect(info.asset.image).toBe(null);
		// The loader of a texture rejects with an event, not with an Error, so
		// the registry keeps the text of whatever arrives.
		expect(typeof info.metadata?.error).toBe("string");
		expect(info.source).toBe(MISSING);
	});

	test("a failed load leaves no pending load behind", async () => {
		await assetRegistry.registerFromSource("stats-broken", MISSING);

		const info = assetRegistry.getDebugInfo();
		expect(assetRegistry.has("stats-broken")).toBe(true);
		expect(info.loadingAssets).toBe(0);
	});

	test("a failed load raises no unhandled rejection", async () => {
		const rejections: Array<any> = [];
		const listener = (event: PromiseRejectionEvent) => {
			rejections.push(event.reason);
		};

		window.addEventListener("unhandledrejection", listener);
		try {
			renderer.render(<texture id="quiet" src={MISSING} />, scene);
			await until(() => assetRegistry.has("quiet"), "the load never settled");
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(rejections.length).toBe(0);
		} finally {
			window.removeEventListener("unhandledrejection", listener);
		}
	});

	test("a reference to a failed asset gets the fallback on the next render", async () => {
		function Tree() {
			return (
				<group>
					<texture id="fallback-ref" src={MISSING} />
					<mesh>
						<meshbasicmaterial map="url(#fallback-ref)" />
					</mesh>
				</group>
			);
		}

		renderer.render(<Tree />, scene);
		await until(
			() => assetRegistry.has("fallback-ref"),
			"the load never settled",
		);
		renderer.render(<Tree />, scene);

		const group = scene.children[0] as THREE.Group;
		expect(materialOf(group.children[1]).map).toBe(
			assetRegistry.getInfo("fallback-ref")!.asset,
		);
	});

	test("a reference to an id that never arrives stays pending", () => {
		renderer.render(
			<mesh>
				<meshbasicmaterial map="url(#never)" />
			</mesh>,
			scene,
		);

		// The renderer keeps the reference and warns on every render that
		// follows, because a definition may still arrive.
		const info = assetRegistry.getDebugInfo();
		expect(info.pendingReferences).toBeGreaterThan(0);
		expect(materialOf(scene.children[0]).map).toBeInstanceOf(THREE.Texture);
	});

	// ---------------------------------------------------------------------
	// Duplicate ids, racing loads, and cache behavior
	// ---------------------------------------------------------------------

	test("two elements with one id leave the last one registered", () => {
		const first = new THREE.Texture();
		const second = new THREE.Texture();

		renderer.render(
			<group>
				<texture id="twice" texture={first} />
				<texture id="twice" texture={second} />
			</group>,
			scene,
		);

		expect(assetRegistry.getInfo("twice")?.asset).toBe(second);
	});

	test("a second load of the same id in flight reuses the first load", async () => {
		const first = assetRegistry.registerFromSource("race", PNG);
		const second = assetRegistry.registerFromSource("race", MISSING);

		// The registry keys a load by id, so the second call joins the first one
		// and its source is dropped. One load runs, not two.
		expect(assetRegistry.getDebugInfo().loadingAssets).toBe(1);

		await Promise.all([first, second]);
		expect(assetRegistry.getInfo("race")?.source).toBe(PNG);
		expect((assetRegistry.getInfo("race")?.asset as THREE.Texture).image)
			.toBeDefined();
	});

	test("one source under two ids gives two entries", async () => {
		await Promise.all([
			assetRegistry.registerFromSource("copy-a", PNG),
			assetRegistry.registerFromSource("copy-b", PNG),
		]);

		const a = assetRegistry.getInfo("copy-a")!.asset;
		const b = assetRegistry.getInfo("copy-b")!.asset;

		// The registry caches by id, not by source. Each id loads its own object.
		expect(a).toBeInstanceOf(THREE.Texture);
		expect(b).toBeInstanceOf(THREE.Texture);
		expect(a).not.toBe(b);
	});

	test("unmounting during a load leaves the registry clean", async () => {
		renderer.render(
			<group>
				<texture id="abandoned" src={PNG} />
			</group>,
			scene,
		);
		expect(assetRegistry.has("abandoned")).toBe(false);

		// The element goes away while its load is in flight.
		renderer.render(<group />, scene);
		await new Promise((resolve) => setTimeout(resolve, 200));

		// The result of a stale load never comes back into the registry.
		expect(assetRegistry.has("abandoned")).toBe(false);
		expect(scene.children.length).toBe(1);
	});

	test("a registration after an unmount wins over the stale load", async () => {
		const replacement = new THREE.Texture();

		assetRegistry.registerFromSource("replaced", PNG);
		assetRegistry.unregister("replaced");
		assetRegistry.register("replaced", replacement, "texture");

		await new Promise((resolve) => setTimeout(resolve, 200));

		expect(assetRegistry.getInfo("replaced")?.asset).toBe(replacement);
	});

	test("a src that changes on a mounted element does not load again", async () => {
		function Tree({src}: {src: string}) {
			return <texture id="static-src" src={src} />;
		}

		renderer.render(<Tree src={PNG} />, scene);
		await until(() => assetRegistry.has("static-src"), "the load never settled");
		const loaded = assetRegistry.getInfo("static-src")!.asset;

		renderer.render(<Tree src={MISSING} />, scene);
		await new Promise((resolve) => setTimeout(resolve, 100));

		// An asset element registers at creation only. Change the key of the
		// element to load another source.
		expect(assetRegistry.getInfo("static-src")?.asset).toBe(loaded);
		expect(assetRegistry.getInfo("static-src")?.source).toBe(PNG);
	});

	test("a new key on the element loads the new source", async () => {
		function Tree({src, name}: {src: string; name: string}) {
			return <texture key={name} id="keyed-src" src={src} />;
		}

		renderer.render(<Tree name="one" src={PNG} />, scene);
		await until(() => assetRegistry.has("keyed-src"), "the load never settled");
		const first = assetRegistry.getInfo("keyed-src")!.asset;

		const url = blobUrlFor();
		renderer.render(<Tree name="two" src={url} />, scene);
		await until(
			() => assetRegistry.getInfo("keyed-src")?.source === url,
			"the second source never registered",
			4000,
		);

		const info = assetRegistry.getInfo("keyed-src")!;
		expect(info.asset).not.toBe(first);
		expect(info.asset).toBeInstanceOf(THREE.Texture);
	});

	// ---------------------------------------------------------------------
	// Asset types without a loader
	// ---------------------------------------------------------------------

	test("a model source has no loader yet, and gives an empty group", async () => {
		const events: Array<any> = [];

		renderer.render(
			<asset
				id="ship"
				src="/models/ship.glb"
				onerror={(event: any) => events.push(event)}
			/>,
			scene,
		);

		await until(() => events.length > 0, "onerror never fired");

		expect(events[0].error.message).toMatch(/No loader available/);
		const info = assetRegistry.getInfo("ship")!;
		expect(info.type).toBe("glb");
		// An empty group stands in until a GLTFLoader is wired up.
		expect(info.asset).toBeInstanceOf(THREE.Group);
		expect(info.asset.children.length).toBe(0);
	});

	test("an obj source and a gltf source behave the same way", async () => {
		await assetRegistry.registerFromSource("m-obj", "/models/thing.obj");
		await assetRegistry.registerFromSource("m-gltf", "/models/thing.gltf");

		expect(assetRegistry.getInfo("m-obj")?.asset).toBeInstanceOf(THREE.Group);
		expect(assetRegistry.getInfo("m-gltf")?.asset).toBeInstanceOf(THREE.Group);
		expect(assetRegistry.getInfo("m-obj")?.metadata?.error).toMatch(
			/No loader available/,
		);
	});

	test("an audio source has no loader and no fallback object", async () => {
		await assetRegistry.registerFromSource("sound", "/audio/beep.mp3");

		const info = assetRegistry.getInfo("sound")!;
		expect(info.type).toBe("audio");
		expect(info.asset).toBe(null);
		expect(info.metadata?.error).toMatch(/No loader available/);
	});

	// ---------------------------------------------------------------------
	// Assets that need no loader
	// ---------------------------------------------------------------------

	test("an audio object goes in through the asset prop", () => {
		const sound = {play: () => {}, kind: "beep"};
		let loaded: any = null;

		renderer.render(
			<asset
				id="beep"
				asset={sound}
				type="audio"
				onload={(event: any) => (loaded = event)}
			/>,
			scene,
		);

		expect(assetRegistry.getInfo("beep")?.type).toBe("audio");
		expect(assetRegistry.getInfo("beep")?.asset).toBe(sound);
		expect(loaded.asset).toBe(sound);
	});

	test("a custom asset keeps its metadata", () => {
		renderer.render(
			<asset
				id="stats"
				asset={{hp: 10}}
				type="custom"
				metadata={{origin: "test"}}
			/>,
			scene,
		);

		const info = assetRegistry.getInfo("stats")!;
		expect(info.type).toBe("custom");
		expect(info.metadata?.origin).toBe("test");
		expect(info.metadata?.originalId).toBe("stats");
	});

	test("a canvas texture goes in without a loader", () => {
		const canvas = document.createElement("canvas");
		canvas.width = 2;
		canvas.height = 2;
		const texture = new THREE.CanvasTexture(canvas);

		renderer.render(
			<group>
				<texture id="painted" texture={texture} />
				<mesh>
					<meshbasicmaterial map="url(#painted)" />
				</mesh>
			</group>,
			scene,
		);

		const group = scene.children[0] as THREE.Group;
		expect(materialOf(group.children[1]).map).toBe(texture);
	});

	test("unmounting a custom asset removes it from the registry", () => {
		renderer.render(
			<group>
				<asset id="temp" asset={{value: 1}} type="custom" />
			</group>,
			scene,
		);
		expect(assetRegistry.has("temp")).toBe(true);

		renderer.render(<group />, scene);

		expect(assetRegistry.has("temp")).toBe(false);
	});
});
