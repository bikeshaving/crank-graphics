/// <reference lib="dom" />
import { describe, test, expect, beforeEach, afterEach } from "@b9g/libuild/test";
import * as PIXI from "pixi.js";

import { createElement } from "@b9g/crank";
import { renderer } from "../src/index.js";
import { PIXI_TAG_MAP } from "../src/generated/tag-mapping.js";

describe("auto-generated pixi objects", () => {
	let pixiApp: PIXI.Application;

	beforeEach(async () => {
		pixiApp = new PIXI.Application();
		await pixiApp.init({
			width: 800,
			height: 600,
			backgroundColor: 0x1099bb,
		});
		pixiApp.stage.removeChildren();
	});

	afterEach(async () => {
		if (pixiApp) {
			// Pixi builds HTML text textures asynchronously and gives no public
			// way to await them. A destroy with builds in flight makes the
			// resolved promise read a destroyed style and throw. Stop the
			// ticker so no new build starts, then drain the two stores that
			// hold pending builds: HTMLTextSystem._activeTextures and the
			// per-text texturePromise in HTMLTextPipe gpu data.
			pixiApp.ticker.stop();

			const pending: Array<Promise<unknown>> = [];
			const htmlTextSystem = (pixiApp.renderer as any).htmlText;
			if (htmlTextSystem?._activeTextures) {
				for (const entry of Object.values<any>(htmlTextSystem._activeTextures)) {
					if (entry?.promise) {
						pending.push(entry.promise);
					}
				}
			}

			const rendererUID = (pixiApp.renderer as any).uid;
			for (const child of pixiApp.stage.children) {
				const gpuData = (child as any)._gpuData?.[rendererUID];
				if (gpuData?.texturePromise) {
					pending.push(gpuData.texturePromise);
				}
			}

			await Promise.allSettled(pending);
			pixiApp.destroy(true, true);
		}
	});

	test("all auto-generated tags are supported", () => {
		const supportedTags = Object.keys(PIXI_TAG_MAP).filter(tag => tag !== 'texture');
	
		// Verify we have the expected number of auto-generated objects
		expect(supportedTags.length >= 14).toBeTruthy();
	
		// Verify key objects are present
		const expectedTags = [
			'container', 'sprite', 'text', 'graphics', 
			'animatedsprite', 'tilingsprite', 'nineslicesprite',
			'particlecontainer', 'bitmaptext', 'htmltext'
		];
	
		for (const tag of expectedTags) {
			expect(supportedTags.includes(tag)).toBeTruthy();
		}
	});

	test("container creation", () => {
		renderer.render(<container />, pixiApp);
	
		const child = pixiApp.stage.children[0];
		expect(child instanceof PIXI.Container).toBeTruthy();
	});

	test("sprite creation", () => {
		// Create a simple texture for testing
		const graphics = new PIXI.Graphics();
		graphics.rect(0, 0, 50, 50);
		graphics.fill(0xff0000);
		const texture = pixiApp.renderer.generateTexture(graphics);
	
		renderer.render(<sprite texture={texture} />, pixiApp);
	
		const sprite = pixiApp.stage.children[0] as PIXI.Sprite;
		expect(sprite instanceof PIXI.Sprite).toBeTruthy();
		expect(sprite.texture).toBe(texture);
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
		expect(textObj instanceof PIXI.Text).toBeTruthy();
		expect(textObj.text).toBe("Test Text");
		expect(textObj.style.fontSize).toBe(24);
		expect(textObj.style.fill).toBe(0xffffff);
	});

	test("animated sprite creation", () => {
		// Create test textures
		const texture1 = PIXI.Texture.from('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
		const texture2 = PIXI.Texture.from('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
	
		renderer.render(
			<animatedsprite 
				textures={[texture1, texture2]} 
				animationSpeed={0.1}
			/>, 
			pixiApp
		);
	
		const animatedSprite = pixiApp.stage.children[0] as PIXI.AnimatedSprite;
		expect(animatedSprite instanceof PIXI.AnimatedSprite).toBeTruthy();
		expect(animatedSprite.animationSpeed).toBe(0.1);
	});

	test("tiling sprite creation", () => {
		const texture = PIXI.Texture.from('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
	
		renderer.render(
			<tilingsprite 
				texture={texture}
				width={100}
				height={100}
			/>, 
			pixiApp
		);
	
		const tilingSprite = pixiApp.stage.children[0] as PIXI.TilingSprite;
		expect(tilingSprite instanceof PIXI.TilingSprite).toBeTruthy();
		expect(tilingSprite.width).toBe(100);
		expect(tilingSprite.height).toBe(100);
	});

	test("nine slice sprite creation", () => {
		const texture = PIXI.Texture.from('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
	
		renderer.render(
			<nineslicesprite 
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
		expect(nineSlice instanceof PIXI.NineSliceSprite).toBeTruthy();
		expect(nineSlice.width).toBe(100);
		expect(nineSlice.height).toBe(100);
	});

	test("particle container creation", () => {
		renderer.render(
			<particlecontainer maxSize={100}>
				<sprite />
				<sprite />
			</particlecontainer>, 
			pixiApp
		);
	
		const particleContainer = pixiApp.stage.children[0] as PIXI.ParticleContainer;
		expect(particleContainer instanceof PIXI.ParticleContainer).toBeTruthy();
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
		expect(htmlText instanceof PIXI.HTMLText).toBeTruthy();
		expect(htmlText.text).toBe("<b>Bold</b> text");
	});
});
