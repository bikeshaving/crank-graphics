/// <reference lib="dom" />
import { suite } from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";
import * as PIXI from "pixi.js";

import { createElement } from "@b9g/crank";
import { renderer } from "../src/index.js";

const test = suite("basic pixi rendering");

let pixiApp: PIXI.Application;

test.before.each(async () => {
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

test.after.each(() => {
	if (pixiApp) {
		pixiApp.destroy(true, true);
	}
});

test("simple container", () => {
	renderer.render(<container />, pixiApp);
	
	Assert.is(pixiApp.stage.children.length, 1);
	Assert.ok(pixiApp.stage.children[0] instanceof PIXI.Container);
});

test("container with position", () => {
	renderer.render(<container x={100} y={200} />, pixiApp);
	
	const container = pixiApp.stage.children[0] as PIXI.Container;
	Assert.is(container.x, 100);
	Assert.is(container.y, 200);
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
	Assert.is(parentContainer.children.length, 2);
	
	const child1 = parentContainer.children[0] as PIXI.Container;
	const child2 = parentContainer.children[1] as PIXI.Container;
	
	Assert.is(child1.x, 50);
	Assert.is(child1.y, 50);
	Assert.is(child2.x, 100);
	Assert.is(child2.y, 100);
});

test("text element", () => {
	renderer.render(<text text="Hello World" x={10} y={20} />, pixiApp);
	
	const textObj = pixiApp.stage.children[0] as PIXI.Text;
	Assert.ok(textObj instanceof PIXI.Text);
	Assert.is(textObj.text, "Hello World");
	Assert.is(textObj.x, 10);
	Assert.is(textObj.y, 20);
});

test("graphics element", () => {
	const drawSpy = Sinon.spy();
	
	renderer.render(
		<graphics 
			x={50} 
			y={75} 
			draw={(g: PIXI.Graphics) => {
				drawSpy();
				g.rect(0, 0, 100, 100);
				g.fill(0xff0000);
			}} 
		/>, 
		pixiApp
	);
	
	const graphics = pixiApp.stage.children[0] as PIXI.Graphics;
	Assert.ok(graphics instanceof PIXI.Graphics);
	Assert.is(graphics.x, 50);
	Assert.is(graphics.y, 75);
	// Note: We can't easily test the drawing operations without complex geometry inspection
	// but we can verify the draw function was called
	Assert.ok(drawSpy.called);
});

test.run();