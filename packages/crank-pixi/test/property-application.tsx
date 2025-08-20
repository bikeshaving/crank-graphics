/// <reference lib="dom" />
import { suite } from "uvu";
import * as Assert from "uvu/assert";
import * as PIXI from "pixi.js";

import { createElement } from "@b9g/crank";
import { renderer } from "../src/index.js";

const test = suite("property application");

let pixiApp: PIXI.Application;

test.before.each(async () => {
	pixiApp = new PIXI.Application();
	await pixiApp.init({
		width: 800,
		height: 600,
	});
	pixiApp.stage.removeChildren();
});

test.after.each(() => {
	if (pixiApp) {
		pixiApp.destroy(true, true);
	}
});

test("common properties - position", () => {
	renderer.render(<container x={100} y={200} />, pixiApp);
	
	const container = pixiApp.stage.children[0] as PIXI.Container;
	Assert.is(container.x, 100);
	Assert.is(container.y, 200);
});

test("common properties - dimensions", () => {
	const graphics = new PIXI.Graphics();
	graphics.rect(0, 0, 50, 50);
	graphics.fill(0xff0000);
	const texture = pixiApp.renderer.generateTexture(graphics);
	
	renderer.render(
		<sprite texture={texture} width={150} height={100} />, 
		pixiApp
	);
	
	const sprite = pixiApp.stage.children[0] as PIXI.Sprite;
	Assert.is(sprite.width, 150);
	Assert.is(sprite.height, 100);
});

test("common properties - alpha and visibility", () => {
	renderer.render(
		<container alpha={0.5} visible={false} />, 
		pixiApp
	);
	
	const container = pixiApp.stage.children[0] as PIXI.Container;
	Assert.is(container.alpha, 0.5);
	Assert.is(container.visible, false);
});

test("common properties - rotation", () => {
	const rotation = Math.PI / 4; // 45 degrees
	
	renderer.render(<container rotation={rotation} />, pixiApp);
	
	const container = pixiApp.stage.children[0] as PIXI.Container;
	Assert.is(container.rotation, rotation);
});

test("common properties - scale as number", () => {
	renderer.render(<container scale={2} />, pixiApp);
	
	const container = pixiApp.stage.children[0] as PIXI.Container;
	Assert.is(container.scale.x, 2);
	Assert.is(container.scale.y, 2);
});

test("common properties - scale as object", () => {
	renderer.render(<container scale={{ x: 1.5, y: 2.5 }} />, pixiApp);
	
	const container = pixiApp.stage.children[0] as PIXI.Container;
	Assert.is(container.scale.x, 1.5);
	Assert.is(container.scale.y, 2.5);
});

test("sprite properties - anchor as number", () => {
	const graphics = new PIXI.Graphics();
	graphics.rect(0, 0, 50, 50);
	graphics.fill(0xff0000);
	const texture = pixiApp.renderer.generateTexture(graphics);
	
	renderer.render(<sprite texture={texture} anchor={0.5} />, pixiApp);
	
	const sprite = pixiApp.stage.children[0] as PIXI.Sprite;
	Assert.is(sprite.anchor.x, 0.5);
	Assert.is(sprite.anchor.y, 0.5);
});

test("sprite properties - anchor as object", () => {
	const graphics = new PIXI.Graphics();
	graphics.rect(0, 0, 50, 50);
	graphics.fill(0xff0000);
	const texture = pixiApp.renderer.generateTexture(graphics);
	
	renderer.render(
		<sprite texture={texture} anchor={{ x: 0.2, y: 0.8 }} />, 
		pixiApp
	);
	
	const sprite = pixiApp.stage.children[0] as PIXI.Sprite;
	Assert.is(sprite.anchor.x, 0.2);
	Assert.is(sprite.anchor.y, 0.8);
});

test("sprite properties - tint", () => {
	const graphics = new PIXI.Graphics();
	graphics.rect(0, 0, 50, 50);
	graphics.fill(0xff0000);
	const texture = pixiApp.renderer.generateTexture(graphics);
	
	renderer.render(<sprite texture={texture} tint={0x00ff00} />, pixiApp);
	
	const sprite = pixiApp.stage.children[0] as PIXI.Sprite;
	Assert.is(sprite.tint, 0x00ff00);
});

test("text properties - basic text", () => {
	renderer.render(<text text="Hello World" />, pixiApp);
	
	const textObj = pixiApp.stage.children[0] as PIXI.Text;
	Assert.is(textObj.text, "Hello World");
});

test("text properties - style object", () => {
	const style = {
		fontSize: 24,
		fill: 0xff0000,
		fontFamily: "Arial",
		fontWeight: "bold"
	};
	
	renderer.render(<text text="Styled Text" style={style} />, pixiApp);
	
	const textObj = pixiApp.stage.children[0] as PIXI.Text;
	Assert.is(textObj.text, "Styled Text");
	Assert.is(textObj.style.fontSize, 24);
	Assert.is(textObj.style.fill, 0xff0000);
	Assert.is(textObj.style.fontFamily, "Arial");
	Assert.is(textObj.style.fontWeight, "bold");
});

test("animated sprite properties", () => {
	const texture1 = PIXI.Texture.from('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
	const texture2 = PIXI.Texture.from('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
	
	renderer.render(
		<animated-sprite 
			textures={[texture1, texture2]}
			animationSpeed={0.2}
			playing={true}
		/>, 
		pixiApp
	);
	
	const animSprite = pixiApp.stage.children[0] as PIXI.AnimatedSprite;
	Assert.is(animSprite.animationSpeed, 0.2);
	Assert.is(animSprite.playing, true);
	Assert.is(animSprite.textures.length, 2);
});

test("tiling sprite properties", () => {
	const texture = PIXI.Texture.from('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
	
	renderer.render(
		<tiling-sprite 
			texture={texture}
			width={200}
			height={150}
			tileScale={{ x: 2, y: 2 }}
			tilePosition={{ x: 10, y: 20 }}
		/>, 
		pixiApp
	);
	
	const tilingSprite = pixiApp.stage.children[0] as PIXI.TilingSprite;
	Assert.is(tilingSprite.width, 200);
	Assert.is(tilingSprite.height, 150);
	Assert.is(tilingSprite.tileScale.x, 2);
	Assert.is(tilingSprite.tileScale.y, 2);
	Assert.is(tilingSprite.tilePosition.x, 10);
	Assert.is(tilingSprite.tilePosition.y, 20);
});

test("property updates", () => {
	// Initial render
	renderer.render(<container x={0} y={0} alpha={1} />, pixiApp);
	
	let container = pixiApp.stage.children[0] as PIXI.Container;
	Assert.is(container.x, 0);
	Assert.is(container.y, 0);
	Assert.is(container.alpha, 1);
	
	// Update properties
	renderer.render(<container x={100} y={200} alpha={0.5} />, pixiApp);
	
	container = pixiApp.stage.children[0] as PIXI.Container;
	Assert.is(container.x, 100);
	Assert.is(container.y, 200);
	Assert.is(container.alpha, 0.5);
});

test("undefined properties are ignored", () => {
	renderer.render(
		<container 
			x={50} 
			y={undefined} 
			alpha={0.8} 
			rotation={undefined} 
		/>, 
		pixiApp
	);
	
	const container = pixiApp.stage.children[0] as PIXI.Container;
	Assert.is(container.x, 50);
	Assert.is(container.y, 0); // Default value
	Assert.is(container.alpha, 0.8);
	Assert.is(container.rotation, 0); // Default value
});

test.run();