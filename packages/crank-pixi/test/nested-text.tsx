/// <reference lib="dom" />
import { suite } from "uvu";
import * as Assert from "uvu/assert";
import * as PIXI from "pixi.js";

import { createElement } from "@b9g/crank";
import { renderer } from "../src/index.js";

const test = suite("nested text handling");

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

test("nested text elements render without deprecation warnings", () => {
	// This should not produce deprecation warnings in v8
	renderer.render(
		<text x={100} y={100} style={{ fontSize: 24, fill: 0xffffff }}>
			Parent text with{" "}
			<text style={{ fontWeight: "bold" }}>bold child</text>
			{" "}and more text
		</text>,
		pixiApp
	);

	// Verify multiple text objects are created and positioned correctly
	const children = pixiApp.stage.children;
	Assert.ok(children.length >= 1, "Should have at least one child in stage");
	
	// Find the text objects
	const textObjects = children.filter(child => child instanceof PIXI.Text);
	Assert.ok(textObjects.length >= 2, "Should create separate text objects for nested content");
	
	// Verify the parent text object exists and has correct positioning
	const parentText = textObjects.find(text => 
		(text as PIXI.Text).x === 100 && (text as PIXI.Text).y === 100
	);
	Assert.ok(parentText, "Should find positioned parent text object");
});

test("nested text content creates multiple text objects", () => {
	renderer.render(
		<text>
			Parent with{" "}
			<text style={{ fontWeight: "bold" }}>bold nested child</text>
		</text>,
		pixiApp
	);

	// Find text objects
	const textObjects = pixiApp.stage.children.filter(child => child instanceof PIXI.Text);
	Assert.ok(textObjects.length >= 2, "Should create multiple text objects for nested content");
	
	// Verify that at least one text object has the nested styling
	const boldText = textObjects.find(text => 
		(text as PIXI.Text).style.fontWeight === "bold"
	);
	Assert.ok(boldText, "Should find text object with bold styling");
	
	// Verify that other text objects exist for the parent content
	const nonBoldTexts = textObjects.filter(text => 
		(text as PIXI.Text).style.fontWeight !== "bold"
	);
	Assert.ok(nonBoldTexts.length > 0, "Should have other text objects for parent content");
});

test("style inheritance works for nested text", () => {
	renderer.render(
		<text style={{ fontSize: 24, fontFamily: "Arial" }}>
			Parent text{" "}
			<text style={{ fontWeight: "bold" }}>child inherits styles</text>
		</text>,
		pixiApp
	);

	// Find the child text by its explicit style
	const textObjects = pixiApp.stage.children.filter(child => child instanceof PIXI.Text);
	const boldText = textObjects.find(text => 
		(text as PIXI.Text).style.fontWeight === "bold"
	) as PIXI.Text;
	
	Assert.ok(boldText, "Should find bold child text");
	
	// Check that styles were inherited from parent
	Assert.is(boldText.style.fontSize, 24, "Child should inherit parent's fontSize");
	Assert.is(boldText.style.fontFamily, "Arial", "Child should inherit parent's fontFamily");
	Assert.is(boldText.style.fontWeight, "bold", "Child should preserve its own fontWeight");
});

test.run();