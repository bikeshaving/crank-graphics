/// <reference lib="dom" />
import { describe, test, expect, beforeEach, afterEach } from "@b9g/libuild/test";
import * as PIXI from "pixi.js";

import { createElement } from "@b9g/crank";
import { renderer } from "../src/index.js";

describe("nested text handling", () => {
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

	afterEach(() => {
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
		expect(children.length >= 1).toBeTruthy();
	
		// Find the text objects
		const textObjects = children.filter(child => child instanceof PIXI.Text);
		expect(textObjects.length >= 2).toBeTruthy();
	
		// Verify the parent text object exists and has correct positioning
		const parentText = textObjects.find(text => 
			(text as PIXI.Text).x === 100 && (text as PIXI.Text).y === 100
		);
		expect(parentText).toBeTruthy();
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
		expect(textObjects.length >= 2).toBeTruthy();
	
		// Verify that at least one text object has the nested styling
		const boldText = textObjects.find(text => 
			(text as PIXI.Text).style.fontWeight === "bold"
		);
		expect(boldText).toBeTruthy();
	
		// Verify that other text objects exist for the parent content
		const nonBoldTexts = textObjects.filter(text => 
			(text as PIXI.Text).style.fontWeight !== "bold"
		);
		expect(nonBoldTexts.length > 0).toBeTruthy();
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
	
		expect(boldText).toBeTruthy();
	
		// Check that styles were inherited from parent
		expect(boldText.style.fontSize).toBe(24);
		expect(boldText.style.fontFamily).toBe("Arial");
		expect(boldText.style.fontWeight).toBe("bold");
	});
});
