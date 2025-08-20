/// <reference lib="dom" />
import { suite } from "uvu";
import * as Assert from "uvu/assert";
import * as PIXI from "pixi.js";
import * as sinon from "sinon";

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

const test = suite("texture registry and URL parsing");

let pixiApp: PIXI.Application;
let consoleWarnStub: sinon.SinonStub;

test.before.each(async () => {
	pixiApp = new PIXI.Application();
	await pixiApp.init({
		width: 800,
		height: 600,
	});
	pixiApp.stage.removeChildren();
	
	// Clear the texture registry
	textureRegistry.clear();
	
	// Stub console.warn to reduce test noise
	consoleWarnStub = sinon.stub(console, 'warn');
});

test.after.each(() => {
	if (pixiApp) {
		pixiApp.destroy(true, true);
	}
	textureRegistry.clear();
	
	// Restore console.warn
	consoleWarnStub.restore();
});

// URL Parsing Tests
test("parseTextureUrl - url(#id) format", () => {
	const result = parseTextureUrl("url(#my-texture)");
	Assert.ok(result);
	Assert.is(result.type, "reference");
	Assert.is(result.id, "my-texture");
	Assert.is(result.original, "url(#my-texture)");
});

test("parseTextureUrl - url('#id') format", () => {
	const result = parseTextureUrl("url('#my-texture')");
	Assert.ok(result);
	Assert.is(result.type, "reference");
	Assert.is(result.id, "my-texture");
});

test("parseTextureUrl - url(\"#id\") format", () => {
	const result = parseTextureUrl('url("#my-texture")');
	Assert.ok(result);
	Assert.is(result.type, "reference");
	Assert.is(result.id, "my-texture");
});

test("parseTextureUrl - #id format", () => {
	const result = parseTextureUrl("#my-texture");
	Assert.ok(result);
	Assert.is(result.type, "direct");
	Assert.is(result.id, "my-texture");
});

test("parseTextureUrl - invalid formats", () => {
	Assert.is(parseTextureUrl("not-a-reference"), null);
	Assert.is(parseTextureUrl("url(no-hash)"), null);
	Assert.is(parseTextureUrl(""), null);
	Assert.is(parseTextureUrl("regular-string"), null);
});

test("isTextureReference", () => {
	Assert.ok(isTextureReference("url(#test)"));
	Assert.ok(isTextureReference("#test"));
	Assert.not(isTextureReference("not-a-ref"));
	Assert.not(isTextureReference(""));
});

test("extractTextureId", () => {
	Assert.is(extractTextureId("url(#my-id)"), "my-id");
	Assert.is(extractTextureId("#my-id"), "my-id");
	Assert.is(extractTextureId("not-a-ref"), null);
});

test("createTextureReference", () => {
	Assert.is(createTextureReference("my-texture"), "url(#my-texture)");
});

test("isValidTextureId", () => {
	Assert.ok(isValidTextureId("valid-id"));
	Assert.ok(isValidTextureId("valid_id"));
	Assert.ok(isValidTextureId("ValidId"));
	Assert.ok(isValidTextureId("_valid"));
	Assert.ok(isValidTextureId("-valid"));
	
	Assert.not(isValidTextureId(""));
	Assert.not(isValidTextureId("123invalid")); // Can't start with number
	Assert.not(isValidTextureId("invalid space"));
	Assert.not(isValidTextureId("invalid@symbol"));
});

test("normalizeTextureId", () => {
	Assert.is(normalizeTextureId("valid-id"), "valid-id");
	Assert.is(normalizeTextureId("invalid space"), "invalid-space");
	Assert.is(normalizeTextureId("invalid@symbol"), "invalid-symbol");
	Assert.is(normalizeTextureId("123invalid"), "texture-123invalid");
	Assert.is(normalizeTextureId("multiple--hyphens"), "multiple-hyphens");
	Assert.is(normalizeTextureId("trailing-hyphens---"), "trailing-hyphens");
});

// Texture Registry Tests
test("textureRegistry.register and acquire", () => {
	const texture = PIXI.Texture.EMPTY;
	
	textureRegistry.register("test-texture", texture);
	Assert.ok(textureRegistry.has("test-texture"));
	
	const acquired = textureRegistry.acquire("test-texture");
	Assert.is(acquired, texture);
	
	// Check reference count
	const info = textureRegistry.getInfo("test-texture");
	Assert.is(info?.refCount, 1);
});

test("textureRegistry.release and reference counting", () => {
	const texture = PIXI.Texture.EMPTY;
	
	textureRegistry.register("test-texture", texture);
	
	// Acquire multiple times
	textureRegistry.acquire("test-texture");
	textureRegistry.acquire("test-texture");
	
	let info = textureRegistry.getInfo("test-texture");
	Assert.is(info?.refCount, 2);
	
	// Release once
	textureRegistry.release("test-texture");
	info = textureRegistry.getInfo("test-texture");
	Assert.is(info?.refCount, 1);
	
	// Release again
	textureRegistry.release("test-texture");
	info = textureRegistry.getInfo("test-texture");
	Assert.is(info?.refCount, 0);
});

test("textureRegistry.getIds", () => {
	const texture1 = PIXI.Texture.EMPTY;
	const texture2 = PIXI.Texture.EMPTY;
	
	textureRegistry.register("texture-1", texture1);
	textureRegistry.register("texture-2", texture2);
	
	const ids = textureRegistry.getIds();
	Assert.ok(ids.includes("texture-1"));
	Assert.ok(ids.includes("texture-2"));
	Assert.is(ids.length, 2);
});

test("textureRegistry.clear", () => {
	const texture = PIXI.Texture.EMPTY;
	textureRegistry.register("test-texture", texture);
	
	Assert.ok(textureRegistry.has("test-texture"));
	
	textureRegistry.clear();
	
	Assert.not(textureRegistry.has("test-texture"));
	Assert.is(textureRegistry.getIds().length, 0);
});

test("textureRegistry.getDebugInfo", () => {
	const texture = PIXI.Texture.EMPTY;
	textureRegistry.register("test-texture", texture, "test-source");
	textureRegistry.acquire("test-texture");
	
	const debug = textureRegistry.getDebugInfo();
	
	Assert.is(debug.totalTextures, 1);
	Assert.ok(debug.textures["test-texture"]);
	Assert.is(debug.textures["test-texture"].refCount, 1);
	Assert.is(debug.textures["test-texture"].source, "test-source");
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
	
	Assert.ok(textureRegistry.has("my-texture"));
	
	const acquired = textureRegistry.acquire("my-texture");
	Assert.is(acquired, testTexture);
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
	Assert.ok(sprite instanceof PIXI.Sprite);
	Assert.is(sprite.texture, testTexture);
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
	Assert.is(sprite.texture, testTexture);
});

test("texture reference not found fallback", () => {
	renderer.render(
		<sprite texture="url(#nonexistent)" />,
		pixiApp
	);
	
	const sprite = pixiApp.stage.children[0] as PIXI.Sprite;
	Assert.is(sprite.texture, PIXI.Texture.EMPTY);
	
	// Verify that appropriate warning was logged
	Assert.ok(consoleWarnStub.called, "Should warn about missing texture");
	Assert.ok(
		consoleWarnStub.args.some(args => 
			args[0].includes('not found in registry')
		),
		"Warning should mention texture not found"
	);
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
	Assert.is(sprite.texture, PIXI.Texture.EMPTY, "Should start with EMPTY texture");
	
	// Check that pending reference was created
	Assert.is(textureRegistry.getPendingReferenceCount(), 1, "Should have 1 pending reference");
	
	// Manually trigger finalize to resolve references
	textureRegistry.resolvePendingReferences();
	
	// After resolution, sprite should have the correct texture
	Assert.is(sprite.texture, testTexture, "Should resolve to correct texture after finalize");
	Assert.is(textureRegistry.getPendingReferenceCount(), 0, "Should have no pending references after resolution");
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
	Assert.is(sprite1.texture, PIXI.Texture.EMPTY);
	Assert.is(sprite2.texture, PIXI.Texture.EMPTY);
	
	// Should have 2 pending references
	Assert.is(textureRegistry.getPendingReferenceCount(), 2);
	
	// Resolve references
	textureRegistry.resolvePendingReferences();
	
	// Both should now have the correct texture
	Assert.is(sprite1.texture, testTexture);
	Assert.is(sprite2.texture, testTexture);
	Assert.is(textureRegistry.getPendingReferenceCount(), 0);
});

test("deferred texture references - unresolved references warn", () => {
	// Create sprite with reference that will never be resolved
	renderer.render(
		<sprite texture="url(#never-defined)" />,
		pixiApp
	);

	const sprite = pixiApp.stage.children[0] as PIXI.Sprite;
	Assert.is(sprite.texture, PIXI.Texture.EMPTY);
	Assert.is(textureRegistry.getPendingReferenceCount(), 1);
	
	// Try to resolve - should warn about unresolved references
	textureRegistry.resolvePendingReferences();
	
	// Should still be pending and logged warning
	Assert.is(textureRegistry.getPendingReferenceCount(), 1);
	Assert.ok(
		consoleWarnStub.args.some(args => 
			args[0].includes('Unresolved texture references')
		),
		"Should warn about unresolved references"
	);
});

test.run();