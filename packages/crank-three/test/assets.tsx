/// <reference lib="dom" />
import {describe, test, expect, afterEach, beforeEach} from "@b9g/libuild/test";
import * as THREE from "three";

import {renderer, assetRegistry} from "../src/index.js";

function materialOf(object: THREE.Object3D): THREE.MeshBasicMaterial {
	return (object as THREE.Mesh).material as THREE.MeshBasicMaterial;
}

describe("asset registry and url(#id) references", () => {
	let scene: THREE.Scene;

	beforeEach(() => {
		scene = new THREE.Scene();
	});

	afterEach(() => {
		renderer.render(null, scene);
		// clear() also drops a reference that never resolved, so one test cannot
		// leave a warning behind for the next one.
		assetRegistry.clear();
	});

	test("a texture element registers its object", () => {
		const texture = new THREE.Texture();

		renderer.render(<texture id="plain" texture={texture} />, scene);

		expect(assetRegistry.has("plain")).toBe(true);
		expect(assetRegistry.getInfo("plain")?.type).toBe("texture");
	});

	test("a url(#id) reference resolves to the registered texture", () => {
		const texture = new THREE.Texture();

		renderer.render(
			<group>
				<texture id="bricks" texture={texture} />
				<mesh>
					<meshbasicmaterial map="url(#bricks)" />
				</mesh>
			</group>,
			scene,
		);

		const mesh = (scene.children[0] as THREE.Group).children[1];
		expect(materialOf(mesh).map).toBe(texture);
	});

	test("a bare #id reference resolves as well", () => {
		const texture = new THREE.Texture();

		renderer.render(
			<group>
				<texture id="short" texture={texture} />
				<mesh>
					<meshbasicmaterial map="#short" />
				</mesh>
			</group>,
			scene,
		);

		const mesh = (scene.children[0] as THREE.Group).children[1];
		expect(materialOf(mesh).map).toBe(texture);
	});

	test("a forward reference resolves when the render finishes", () => {
		const texture = new THREE.Texture();

		renderer.render(
			<group>
				<mesh>
					<meshbasicmaterial map="url(#later)" />
				</mesh>
				<texture id="later" texture={texture} />
			</group>,
			scene,
		);

		// The material comes before the definition, so the renderer holds the
		// reference and applies it in finalize().
		const mesh = (scene.children[0] as THREE.Group).children[0];
		expect(materialOf(mesh).map).toBe(texture);
	});

	test("a reference to a missing id gives an empty texture", () => {
		renderer.render(
			<mesh>
				<meshbasicmaterial map="url(#missing)" />
			</mesh>,
			scene,
		);

		const material = materialOf(scene.children[0]);
		// The material keeps a placeholder, so the scene still renders.
		expect(material.map).toBeInstanceOf(THREE.Texture);
		expect(material.map?.image).toBe(null);
	});

	test("a reference that is not a registry id loads as a path", () => {
		renderer.render(
			<mesh>
				<meshbasicmaterial map="/textures/plain.png" />
			</mesh>,
			scene,
		);

		const material = materialOf(scene.children[0]);
		expect(material.map).toBeInstanceOf(THREE.Texture);
		// The loader keeps the path of the request on the image element.
		expect(material.map?.image).toBeDefined();
	});

	test("a texture object goes to the material without the registry", () => {
		const texture = new THREE.Texture();

		renderer.render(
			<mesh>
				<meshbasicmaterial map={texture} />
			</mesh>,
			scene,
		);

		expect(materialOf(scene.children[0]).map).toBe(texture);
	});

	test("an asset element registers a custom asset", () => {
		const model = {scene: new THREE.Group()};

		renderer.render(
			<asset id="ship-model" asset={model} type="custom" />,
			scene,
		);

		expect(assetRegistry.has("ship-model")).toBe(true);
		expect(assetRegistry.getInfo("ship-model")?.asset).toBe(model);
	});

	test("an asset element fires onload for an object that is ready", () => {
		let loaded: any = null;

		renderer.render(
			<asset
				id="ready"
				asset={{ok: true}}
				type="custom"
				onload={(event: any) => (loaded = event)}
			/>,
			scene,
		);

		expect(loaded?.assetId).toBe("ready");
		expect(loaded?.type).toBe("load");
	});

	test("two references share one registered texture", () => {
		const texture = new THREE.Texture();

		renderer.render(
			<group>
				<texture id="shared" texture={texture} />
				<mesh>
					<meshbasicmaterial map="url(#shared)" />
				</mesh>
				<mesh>
					<meshbasicmaterial map="url(#shared)" />
				</mesh>
			</group>,
			scene,
		);

		const group = scene.children[0] as THREE.Group;
		expect(materialOf(group.children[1]).map).toBe(texture);
		expect(materialOf(group.children[2]).map).toBe(texture);
	});

	test("an invalid id becomes a normalized id", () => {
		renderer.render(
			<texture id="Bad Id!" texture={new THREE.Texture()} />,
			scene,
		);

		expect(assetRegistry.has("Bad-Id")).toBe(true);
	});
});
