/// <reference lib="dom" />
import { describe, test, expect, beforeEach, afterEach } from "@b9g/libuild/test";
import * as PIXI from "pixi.js";

import { createElement } from "@b9g/crank";
import { renderer } from "../src/index.js";

describe("property application", () => {
	let pixiApp: PIXI.Application;

	beforeEach(async () => {
		pixiApp = new PIXI.Application();
		await pixiApp.init({
			width: 800,
			height: 600,
		});
		pixiApp.stage.removeChildren();
	});

	afterEach(() => {
		if (pixiApp) {
			pixiApp.destroy(true, true);
		}
	});

	test("common properties - position", () => {
		renderer.render(<container x={100} y={200} />, pixiApp);
	
		const container = pixiApp.stage.children[0] as PIXI.Container;
		expect(container.x).toBe(100);
		expect(container.y).toBe(200);
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
		expect(sprite.width).toBe(150);
		expect(sprite.height).toBe(100);
	});

	test("common properties - alpha and visibility", () => {
		renderer.render(
			<container alpha={0.5} visible={false} />, 
			pixiApp
		);
	
		const container = pixiApp.stage.children[0] as PIXI.Container;
		expect(container.alpha).toBe(0.5);
		expect(container.visible).toBe(false);
	});

	test("common properties - rotation", () => {
		const rotation = Math.PI / 4; // 45 degrees
	
		renderer.render(<container rotation={rotation} />, pixiApp);
	
		const container = pixiApp.stage.children[0] as PIXI.Container;
		expect(container.rotation).toBe(rotation);
	});

	test("common properties - scale as number", () => {
		renderer.render(<container scale={2} />, pixiApp);
	
		const container = pixiApp.stage.children[0] as PIXI.Container;
		expect(container.scale.x).toBe(2);
		expect(container.scale.y).toBe(2);
	});

	test("common properties - scale as object", () => {
		renderer.render(<container scale={{ x: 1.5, y: 2.5 }} />, pixiApp);
	
		const container = pixiApp.stage.children[0] as PIXI.Container;
		expect(container.scale.x).toBe(1.5);
		expect(container.scale.y).toBe(2.5);
	});

	test("sprite properties - anchor as number", () => {
		const graphics = new PIXI.Graphics();
		graphics.rect(0, 0, 50, 50);
		graphics.fill(0xff0000);
		const texture = pixiApp.renderer.generateTexture(graphics);
	
		renderer.render(<sprite texture={texture} anchor={0.5} />, pixiApp);
	
		const sprite = pixiApp.stage.children[0] as PIXI.Sprite;
		expect(sprite.anchor.x).toBe(0.5);
		expect(sprite.anchor.y).toBe(0.5);
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
		expect(sprite.anchor.x).toBe(0.2);
		expect(sprite.anchor.y).toBe(0.8);
	});

	test("sprite properties - tint", () => {
		const graphics = new PIXI.Graphics();
		graphics.rect(0, 0, 50, 50);
		graphics.fill(0xff0000);
		const texture = pixiApp.renderer.generateTexture(graphics);
	
		renderer.render(<sprite texture={texture} tint={0x00ff00} />, pixiApp);
	
		const sprite = pixiApp.stage.children[0] as PIXI.Sprite;
		expect(sprite.tint).toBe(0x00ff00);
	});

	test("text properties - basic text", () => {
		renderer.render(<text text="Hello World" />, pixiApp);
	
		const textObj = pixiApp.stage.children[0] as PIXI.Text;
		expect(textObj.text).toBe("Hello World");
	});

	test("text properties - style object", () => {
		const style = {
			fontSize: 24,
			fill: 0xff0000,
			fontFamily: "Arial",
			fontWeight: "bold" as const
		};
	
		renderer.render(<text text="Styled Text" style={style} />, pixiApp);
	
		const textObj = pixiApp.stage.children[0] as PIXI.Text;
		expect(textObj.text).toBe("Styled Text");
		expect(textObj.style.fontSize).toBe(24);
		expect(textObj.style.fill).toBe(0xff0000);
		expect(textObj.style.fontFamily).toBe("Arial");
		expect(textObj.style.fontWeight).toBe("bold");
	});

	test("animated sprite properties", () => {
		const texture1 = PIXI.Texture.from('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
		const texture2 = PIXI.Texture.from('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
	
		renderer.render(
			<animatedsprite 
				textures={[texture1, texture2]}
				animationSpeed={0.2}
				playing={true}
			/>, 
			pixiApp
		);
	
		const animSprite = pixiApp.stage.children[0] as PIXI.AnimatedSprite;
		expect(animSprite.animationSpeed).toBe(0.2);
		expect(animSprite.playing).toBe(true);
		expect(animSprite.textures.length).toBe(2);
	});

	test("tiling sprite properties", () => {
		const texture = PIXI.Texture.from('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
	
		renderer.render(
			<tilingsprite 
				texture={texture}
				width={200}
				height={150}
				tileScale={{ x: 2, y: 2 }}
				tilePosition={{ x: 10, y: 20 }}
			/>, 
			pixiApp
		);
	
		const tilingSprite = pixiApp.stage.children[0] as PIXI.TilingSprite;
		expect(tilingSprite.width).toBe(200);
		expect(tilingSprite.height).toBe(150);
		expect(tilingSprite.tileScale.x).toBe(2);
		expect(tilingSprite.tileScale.y).toBe(2);
		expect(tilingSprite.tilePosition.x).toBe(10);
		expect(tilingSprite.tilePosition.y).toBe(20);
	});

	test("property updates", () => {
		// Initial render
		renderer.render(<container x={0} y={0} alpha={1} />, pixiApp);
	
		let container = pixiApp.stage.children[0] as PIXI.Container;
		expect(container.x).toBe(0);
		expect(container.y).toBe(0);
		expect(container.alpha).toBe(1);
	
		// Update properties
		renderer.render(<container x={100} y={200} alpha={0.5} />, pixiApp);
	
		container = pixiApp.stage.children[0] as PIXI.Container;
		expect(container.x).toBe(100);
		expect(container.y).toBe(200);
		expect(container.alpha).toBe(0.5);
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
		expect(container.x).toBe(50);
		expect(container.y).toBe(0); // Default value
		expect(container.alpha).toBe(0.8);
		expect(container.rotation).toBe(0); // Default value
	});
});
