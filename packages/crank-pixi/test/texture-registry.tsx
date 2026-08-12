/// <reference lib="dom" />
import { describe, test, expect } from "@b9g/libuild/test";
import * as PIXI from "pixi.js";

import { createElement } from "@b9g/crank";
import { renderer } from "../src/index.js";
import { textureRegistry } from "../src/core/texture-registry.js";
import { 
	parseTextureUrl, 
	isTextureReference, 
	extractTextureId,
	createTextureReference,
	isValidTextureId,
	normalizeTextureId
} from "../src/core/texture-url-parser.js";

describe("texture registry and URL parsing", () => {
	// Removed hooks to debug test runner issue

	// Basic functionality tests
	test("dummy test", () => {
		textureRegistry.clear();
		expect(1 + 1).toBe(2);
	});

	test("AnimatedSprite playing property direct assignment", () => {
		// Create some dummy textures for AnimatedSprite
		const textures = [PIXI.Texture.EMPTY, PIXI.Texture.EMPTY];
	
		// Import constructor helper to trigger prototype modification
		const { createPixiObject } = require("../src/generated/constructors.js");
	
		// Create an AnimatedSprite via constructor (triggers prototype setup)
		const sprite = createPixiObject("animatedsprite", PIXI.AnimatedSprite, { textures });
	
		// Test direct assignment to playing property
		let playWasCalled = false;
		let stopWasCalled = false;
		sprite.play = () => { playWasCalled = true; };
		sprite.stop = () => { stopWasCalled = true; };
	
		// Test direct assignment
		sprite.playing = true;
		expect(playWasCalled).toBeTruthy();
	
		sprite.playing = false;
		expect(stopWasCalled).toBeTruthy();
	});

	// URL Parsing Tests
	test("parseTextureUrl - url(#id) format", () => {
		const result = parseTextureUrl("url(#my-texture)")!;
		expect(result).toBeTruthy();
		expect(result.type).toBe("reference");
		expect(result.id).toBe("my-texture");
		expect(result.original).toBe("url(#my-texture)");
	});

	/*
	test("parseTextureUrl - url('#id') format", () => {
		const result = parseTextureUrl("url('#my-texture')");
		expect(result).toBeTruthy();
		expect(result.type).toBe("reference");
		expect(result.id).toBe("my-texture");
	});

	test("parseTextureUrl - url(\"#id\") format", () => {
		const result = parseTextureUrl('url("#my-texture")');
		expect(result).toBeTruthy();
		expect(result.type).toBe("reference");
		expect(result.id).toBe("my-texture");
	});

	test("parseTextureUrl - #id format", () => {
		const result = parseTextureUrl("#my-texture");
		expect(result).toBeTruthy();
		expect(result.type).toBe("direct");
		expect(result.id).toBe("my-texture");
	});

	test("parseTextureUrl - invalid formats", () => {
		expect(parseTextureUrl("not-a-reference")).toBe(null);
		expect(parseTextureUrl("url(no-hash)")).toBe(null);
		expect(parseTextureUrl("")).toBe(null);
		expect(parseTextureUrl("regular-string")).toBe(null);
	});

	test("isTextureReference", () => {
		expect(isTextureReference("url(#test)")).toBeTruthy();
		expect(isTextureReference("#test")).toBeTruthy();
		expect(isTextureReference("not-a-ref")).toBeFalsy();
		expect(isTextureReference("")).toBeFalsy();
	});

	test("extractTextureId", () => {
		expect(extractTextureId("url(#my-id)")).toBe("my-id");
		expect(extractTextureId("#my-id")).toBe("my-id");
		expect(extractTextureId("not-a-ref")).toBe(null);
	});

	test("createTextureReference", () => {
		expect(createTextureReference("my-texture")).toBe("url(#my-texture)");
	});

	test("isValidTextureId", () => {
		expect(isValidTextureId("valid-id")).toBeTruthy();
		expect(isValidTextureId("valid_id")).toBeTruthy();
		expect(isValidTextureId("ValidId")).toBeTruthy();
		expect(isValidTextureId("_valid")).toBeTruthy();
		expect(isValidTextureId("-valid")).toBeTruthy();
	
		expect(isValidTextureId("")).toBeFalsy();
		expect(isValidTextureId("123invalid")).toBeFalsy(); // Can't start with number
		expect(isValidTextureId("invalid space")).toBeFalsy();
		expect(isValidTextureId("invalid@symbol")).toBeFalsy();
	});

	test("normalizeTextureId", () => {
		expect(normalizeTextureId("valid-id")).toBe("valid-id");
		expect(normalizeTextureId("invalid space")).toBe("invalid-space");
		expect(normalizeTextureId("invalid@symbol")).toBe("invalid-symbol");
		expect(normalizeTextureId("123invalid")).toBe("texture-123invalid");
		expect(normalizeTextureId("multiple--hyphens")).toBe("multiple-hyphens");
		expect(normalizeTextureId("trailing-hyphens---")).toBe("trailing-hyphens");
	});

	// Texture Registry Tests
	test("textureRegistry.register and acquire", () => {
		const texture = PIXI.Texture.EMPTY;
	
		textureRegistry.register("test-texture", texture);
		expect(textureRegistry.has("test-texture")).toBeTruthy();
	
		const acquired = textureRegistry.acquire("test-texture");
		expect(acquired).toBe(texture);
	
		// Check reference count
		const info = textureRegistry.getInfo("test-texture");
		expect(info?.refCount).toBe(1);
	});

	test("textureRegistry.release and reference counting", () => {
		const texture = PIXI.Texture.EMPTY;
	
		textureRegistry.register("test-texture", texture);
	
		// Acquire multiple times
		textureRegistry.acquire("test-texture");
		textureRegistry.acquire("test-texture");
	
		let info = textureRegistry.getInfo("test-texture");
		expect(info?.refCount).toBe(2);
	
		// Release once
		textureRegistry.release("test-texture");
		info = textureRegistry.getInfo("test-texture");
		expect(info?.refCount).toBe(1);
	
		// Release again
		textureRegistry.release("test-texture");
		info = textureRegistry.getInfo("test-texture");
		expect(info?.refCount).toBe(0);
	});

	test("textureRegistry.getIds", () => {
		const texture1 = PIXI.Texture.EMPTY;
		const texture2 = PIXI.Texture.EMPTY;
	
		textureRegistry.register("texture-1", texture1);
		textureRegistry.register("texture-2", texture2);
	
		const ids = textureRegistry.getIds();
		expect(ids.includes("texture-1")).toBeTruthy();
		expect(ids.includes("texture-2")).toBeTruthy();
		expect(ids.length).toBe(2);
	});

	test("textureRegistry.clear", () => {
		const texture = PIXI.Texture.EMPTY;
		textureRegistry.register("test-texture", texture);
	
		expect(textureRegistry.has("test-texture")).toBeTruthy();
	
		textureRegistry.clear();
	
		expect(textureRegistry.has("test-texture")).toBeFalsy();
		expect(textureRegistry.getIds().length).toBe(0);
	});

	test("textureRegistry.getDebugInfo", () => {
		const texture = PIXI.Texture.EMPTY;
		textureRegistry.register("test-texture", texture, "test-source");
		textureRegistry.acquire("test-texture");
	
		const debug = textureRegistry.getDebugInfo();
	
		expect(debug.totalTextures).toBe(1);
		expect(debug.textures["test-texture"]).toBeTruthy();
		expect(debug.textures["test-texture"].refCount).toBe(1);
		expect(debug.textures["test-texture"].source).toBe("test-source");
	});

	// Integration Tests with JSX
	test("texture element registration", () => {
		const testTexture = PIXI.Texture.EMPTY;
	
		renderer.render(
			<container>
				<texture id="my-texture" texture={testTexture} />
			</container>,
			pixiApp
		);
	
		expect(textureRegistry.has("my-texture")).toBeTruthy();
	
		const acquired = textureRegistry.acquire("my-texture");
		expect(acquired).toBe(testTexture);
	});

	test("sprite with texture reference", () => {
		const testTexture = PIXI.Texture.EMPTY;
	
		// Register texture first
		textureRegistry.register("my-texture", testTexture);
	
		renderer.render(
			<sprite texture="url(#my-texture)" />,
			pixiApp
		);
	
		const sprite = pixiApp.stage.children[0] as PIXI.Sprite;
		expect(sprite instanceof PIXI.Sprite).toBeTruthy();
		expect(sprite.texture).toBe(testTexture);
	});

	test("sprite with direct hash reference", () => {
		const testTexture = PIXI.Texture.EMPTY;
	
		// Register texture first
		textureRegistry.register("my-texture", testTexture);
	
		renderer.render(
			<sprite texture="#my-texture" />,
			pixiApp
		);
	
		const sprite = pixiApp.stage.children[0] as PIXI.Sprite;
		expect(sprite.texture).toBe(testTexture);
	});

	test("texture reference not found fallback", () => {
		renderer.render(
			<sprite texture="url(#nonexistent)" />,
			pixiApp
		);
	
		const sprite = pixiApp.stage.children[0] as PIXI.Sprite;
		expect(sprite.texture).toBe(PIXI.Texture.EMPTY);
	
		// Verify that appropriate warning was logged
		expect(consoleWarnStub.called).toBeTruthy();
		expect(consoleWarnStub.args.some(args => 
				args[0].includes('not found in registry')
			)).toBeTruthy();
	});

	test("deferred texture references - texture defined later", () => {
		// Create a test texture
		const graphics = new PIXI.Graphics();
		graphics.rect(0, 0, 50, 50);
		graphics.fill(0x00ff00);
		const testTexture = pixiApp.renderer.generateTexture(graphics);

		// Render sprite that references texture before it's defined
		renderer.render(
			<container>
				<sprite texture="url(#later-texture)" />
				<texture id="later-texture" texture={testTexture} />
			</container>,
			pixiApp
		);

		// Initially, sprite should have EMPTY texture (deferred)
		const sprite = pixiApp.stage.children[0].children[0] as PIXI.Sprite;
		expect(sprite.texture).toBe(PIXI.Texture.EMPTY);
	
		// Check that pending reference was created
		expect(textureRegistry.getPendingReferenceCount()).toBe(1);
	
		// Manually trigger finalize to resolve references
		textureRegistry.resolvePendingReferences();
	
		// After resolution, sprite should have the correct texture
		expect(sprite.texture).toBe(testTexture);
		expect(textureRegistry.getPendingReferenceCount()).toBe(0);
	});

	test("deferred texture references - multiple sprites same texture", () => {
		// Create a test texture
		const graphics = new PIXI.Graphics();
		graphics.rect(0, 0, 30, 30);
		graphics.fill(0x0000ff);
		const testTexture = pixiApp.renderer.generateTexture(graphics);

		// Render multiple sprites that reference the same deferred texture
		renderer.render(
			<container>
				<sprite texture="url(#shared-texture)" x={0} y={0} />
				<sprite texture="url(#shared-texture)" x={50} y={0} />
				<texture id="shared-texture" texture={testTexture} />
			</container>,
			pixiApp
		);

		const container = pixiApp.stage.children[0] as PIXI.Container;
		const sprite1 = container.children[0] as PIXI.Sprite;
		const sprite2 = container.children[1] as PIXI.Sprite;
	
		// Both should start with EMPTY texture
		expect(sprite1.texture).toBe(PIXI.Texture.EMPTY);
		expect(sprite2.texture).toBe(PIXI.Texture.EMPTY);
	
		// Should have 2 pending references
		expect(textureRegistry.getPendingReferenceCount()).toBe(2);
	
		// Resolve references
		textureRegistry.resolvePendingReferences();
	
		// Both should now have the correct texture
		expect(sprite1.texture).toBe(testTexture);
		expect(sprite2.texture).toBe(testTexture);
		expect(textureRegistry.getPendingReferenceCount()).toBe(0);
	});

	test("deferred texture references - unresolved references warn", () => {
		// Create sprite with reference that will never be resolved
		renderer.render(
			<sprite texture="url(#never-defined)" />,
			pixiApp
		);

		const sprite = pixiApp.stage.children[0] as PIXI.Sprite;
		expect(sprite.texture).toBe(PIXI.Texture.EMPTY);
		expect(textureRegistry.getPendingReferenceCount()).toBe(1);
	
		// Try to resolve - should warn about unresolved references
		textureRegistry.resolvePendingReferences();
	
		// Should still be pending and logged warning
		expect(textureRegistry.getPendingReferenceCount()).toBe(1);
		expect(consoleWarnStub.args.some(args => 
				args[0].includes('Unresolved texture references')
			)).toBeTruthy();
	});
	*/
});
