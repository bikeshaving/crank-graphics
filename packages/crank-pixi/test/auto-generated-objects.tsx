/// <reference lib="dom" />
import { suite } from "uvu";
import * as Assert from "uvu/assert";
import * as PIXI from "pixi.js";

import { createElement } from "@b9g/crank";
import { renderer } from "../src/index.js";
import { PIXI_TAG_MAP } from "../src/generated/tag-mapping.js";

const test = suite("auto-generated pixi objects");

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
	if (pixiApp) {
		pixiApp.destroy(true, true);
	}
});

test("all auto-generated tags are supported", () => {
	const supportedTags = Object.keys(PIXI_TAG_MAP).filter(tag => tag !== 'texture');
	
	// Verify we have the expected number of auto-generated objects
	Assert.ok(supportedTags.length >= 14, `Expected at least 14 objects, got ${supportedTags.length}`);
	
	// Verify key objects are present
	const expectedTags = [
		'container', 'sprite', 'text', 'graphics', 
		'animated-sprite', 'tiling-sprite', 'nine-slice-sprite',
		'particle-container', 'bitmap-text', 'htmltext'
	];
	
	for (const tag of expectedTags) {
		Assert.ok(supportedTags.includes(tag), `Missing expected tag: ${tag}`);
	}
});

test("container creation", () => {
	renderer.render(<container />, pixiApp);
	
	const child = pixiApp.stage.children[0];
	Assert.ok(child instanceof PIXI.Container);
});

test("sprite creation", () => {
	// Create a simple texture for testing
	const graphics = new PIXI.Graphics();
	graphics.rect(0, 0, 50, 50);
	graphics.fill(0xff0000);
	const texture = pixiApp.renderer.generateTexture(graphics);
	
	renderer.render(<sprite texture={texture} />, pixiApp);
	
	const sprite = pixiApp.stage.children[0] as PIXI.Sprite;
	Assert.ok(sprite instanceof PIXI.Sprite);
	Assert.is(sprite.texture, texture);
});

test("text creation with style", () => {
	renderer.render(
		<text 
			text="Test Text" 
			style={{ fontSize: 24, fill: 0xffffff }} 
		/>, 
		pixiApp
	);
	
	const textObj = pixiApp.stage.children[0] as PIXI.Text;
	Assert.ok(textObj instanceof PIXI.Text);
	Assert.is(textObj.text, "Test Text");
	Assert.is(textObj.style.fontSize, 24);
	Assert.is(textObj.style.fill, 0xffffff);
});

test("animated sprite creation", () => {
	// Create test textures
	const texture1 = PIXI.Texture.from('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
	const texture2 = PIXI.Texture.from('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
	
	renderer.render(
		<animated-sprite 
			textures={[texture1, texture2]} 
			animationSpeed={0.1}
		/>, 
		pixiApp
	);
	
	const animatedSprite = pixiApp.stage.children[0] as PIXI.AnimatedSprite;
	Assert.ok(animatedSprite instanceof PIXI.AnimatedSprite);
	Assert.is(animatedSprite.animationSpeed, 0.1);
});

test("tiling sprite creation", () => {
	const texture = PIXI.Texture.from('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
	
	renderer.render(
		<tiling-sprite 
			texture={texture}
			width={100}
			height={100}
		/>, 
		pixiApp
	);
	
	const tilingSprite = pixiApp.stage.children[0] as PIXI.TilingSprite;
	Assert.ok(tilingSprite instanceof PIXI.TilingSprite);
	Assert.is(tilingSprite.width, 100);
	Assert.is(tilingSprite.height, 100);
});

test("nine slice sprite creation", () => {
	const texture = PIXI.Texture.from('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
	
	renderer.render(
		<nine-slice-sprite 
			texture={texture}
			width={100}
			height={100}
			leftWidth={10}
			rightWidth={10}
			topHeight={10}
			bottomHeight={10}
		/>, 
		pixiApp
	);
	
	const nineSlice = pixiApp.stage.children[0] as PIXI.NineSliceSprite;
	Assert.ok(nineSlice instanceof PIXI.NineSliceSprite);
	Assert.is(nineSlice.width, 100);
	Assert.is(nineSlice.height, 100);
});

test("particle container creation", () => {
	renderer.render(
		<particle-container maxSize={100}>
			<sprite />
			<sprite />
		</particle-container>, 
		pixiApp
	);
	
	const particleContainer = pixiApp.stage.children[0] as PIXI.ParticleContainer;
	Assert.ok(particleContainer instanceof PIXI.ParticleContainer);
	// Note: ParticleContainer in Pixi.js v8 manages particles differently
	// We just verify the container was created successfully
});

test("htmltext creation", () => {
	renderer.render(
		<htmltext 
			text="<b>Bold</b> text"
			style={{ fontSize: 16 }}
		/>, 
		pixiApp
	);
	
	const htmlText = pixiApp.stage.children[0] as PIXI.HTMLText;
	Assert.ok(htmlText instanceof PIXI.HTMLText);
	Assert.is(htmlText.text, "<b>Bold</b> text");
});

test.run();