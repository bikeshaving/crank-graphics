/// <reference lib="dom" />
import { describe, test, expect, beforeEach, afterEach } from "@b9g/libuild/test";
import * as PIXI from "pixi.js";

import { createElement } from "@b9g/crank";
import { renderer } from "../src/index.js";

describe("basic pixi rendering", () => {
	let pixiApp: PIXI.Application;

	beforeEach(async () => {
		// Create a test PIXI application
		pixiApp = new PIXI.Application();
		await pixiApp.init({
			width: 800,
			height: 600,
			backgroundColor: 0x1099bb,
		});

		// Clear any existing content
		pixiApp.stage.removeChildren();
	});

	afterEach(() => {
		if (pixiApp) {
			pixiApp.destroy(true, true);
		}
	});

	test("simple container", () => {
		renderer.render(<container />, pixiApp);
	
		expect(pixiApp.stage.children.length).toBe(1);
		expect(pixiApp.stage.children[0] instanceof PIXI.Container).toBeTruthy();
	});

	test("container with position", () => {
		renderer.render(<container x={100} y={200} />, pixiApp);
	
		const container = pixiApp.stage.children[0] as PIXI.Container;
		expect(container.x).toBe(100);
		expect(container.y).toBe(200);
	});

	test("nested containers", () => {
		renderer.render(
			<container>
				<container x={50} y={50} />
				<container x={100} y={100} />
			</container>,
			pixiApp
		);
	
		const parentContainer = pixiApp.stage.children[0] as PIXI.Container;
		expect(parentContainer.children.length).toBe(2);
	
		const child1 = parentContainer.children[0] as PIXI.Container;
		const child2 = parentContainer.children[1] as PIXI.Container;
	
		expect(child1.x).toBe(50);
		expect(child1.y).toBe(50);
		expect(child2.x).toBe(100);
		expect(child2.y).toBe(100);
	});

	test("text element", () => {
		renderer.render(<text text="Hello World" x={10} y={20} />, pixiApp);
	
		const textObj = pixiApp.stage.children[0] as PIXI.Text;
		expect(textObj instanceof PIXI.Text).toBeTruthy();
		expect(textObj.text).toBe("Hello World");
		expect(textObj.x).toBe(10);
		expect(textObj.y).toBe(20);
	});

	test("graphics element", () => {
		let drawCount = 0;
	
		renderer.render(
			<graphics 
				x={50} 
				y={75} 
				draw={(g: PIXI.Graphics) => {
					drawCount++;
					g.rect(0, 0, 100, 100);
					g.fill(0xff0000);
				}} 
			/>, 
			pixiApp
		);
	
		const graphics = pixiApp.stage.children[0] as PIXI.Graphics;
		expect(graphics instanceof PIXI.Graphics).toBeTruthy();
		expect(graphics.x).toBe(50);
		expect(graphics.y).toBe(75);
		// Note: We can't easily test the drawing operations without complex geometry inspection
		// but we can verify the draw function was called
		expect(drawCount).toBeGreaterThan(0);
	});
});
