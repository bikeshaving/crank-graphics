/// <reference lib="dom" />
import { describe, test, expect, beforeEach, afterEach } from "@b9g/libuild/test";
import * as PIXI from "pixi.js";

import { createElement, Fragment, type Context } from "@b9g/crank";
import { renderer } from "../src/index.js";

describe("re-render patching", () => {
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

	test("position, alpha and scale update in place", () => {
		renderer.render(<container x={10} y={20} alpha={1} />, pixiApp);
		const node = pixiApp.stage.children[0] as PIXI.Container;

		renderer.render(
			<container x={30} y={40} alpha={0.5} scale={{x: 2, y: 3}} />,
			pixiApp,
		);

		// Same instance, no recreate
		expect(pixiApp.stage.children[0]).toBe(node);
		expect(pixiApp.stage.children.length).toBe(1);
		expect(node.position.x).toBe(30);
		expect(node.position.y).toBe(40);
		expect(node.alpha).toBe(0.5);
		expect(node.scale.x).toBe(2);
		expect(node.scale.y).toBe(3);
	});

	test("text content and style update in place", () => {
		renderer.render(<text text="first" x={5} />, pixiApp);
		const node = pixiApp.stage.children[0] as PIXI.Text;

		renderer.render(
			<text text="second" x={5} style={{fontSize: 42}} />,
			pixiApp,
		);

		expect(pixiApp.stage.children[0]).toBe(node);
		expect(node.text).toBe("second");
		expect(node.style.fontSize).toBe(42);
	});

	test("the graphics draw prop runs again on each render", () => {
		let drawCount = 0;
		const draw = (g: PIXI.Graphics) => {
			drawCount++;
			g.rect(0, 0, 10, 10);
			g.fill(0xff0000);
		};

		renderer.render(<graphics draw={draw} x={1} />, pixiApp);
		const node = pixiApp.stage.children[0] as PIXI.Graphics;
		expect(drawCount).toBe(1);

		renderer.render(<graphics draw={draw} x={2} />, pixiApp);

		expect(pixiApp.stage.children[0]).toBe(node);
		expect(node.x).toBe(2);
		expect(drawCount).toBe(2);
	});

	test("a prop that disappears keeps its last value", () => {
		// The adapter applies the props of the current render only. It never
		// records defaults, so a prop that goes away is not reset.
		renderer.render(<container x={10} y={20} alpha={0.25} />, pixiApp);
		const node = pixiApp.stage.children[0] as PIXI.Container;

		renderer.render(<container x={10} />, pixiApp);

		expect(pixiApp.stage.children[0]).toBe(node);
		expect(node.y).toBe(20);
		expect(node.alpha).toBe(0.25);
	});

	test("an undefined prop value leaves the node alone", () => {
		renderer.render(<container x={10} y={20} />, pixiApp);
		const node = pixiApp.stage.children[0] as PIXI.Container;

		renderer.render(<container x={10} y={undefined} />, pixiApp);

		expect(node.y).toBe(20);
	});

	test("a different tag replaces the node", () => {
		renderer.render(<container x={10} />, pixiApp);
		const first = pixiApp.stage.children[0];

		renderer.render(<sprite x={10} />, pixiApp);
		const second = pixiApp.stage.children[0];

		expect(second).not.toBe(first);
		expect(second instanceof PIXI.Sprite).toBeTruthy();
		expect(pixiApp.stage.children.length).toBe(1);
		expect(pixiApp.stage.children.includes(first)).toBeFalsy();
	});
});

describe("children diffing", () => {
	let pixiApp: PIXI.Application;

	beforeEach(async () => {
		pixiApp = new PIXI.Application();
		await pixiApp.init({width: 800, height: 600});
		pixiApp.stage.removeChildren();
	});

	afterEach(() => {
		if (pixiApp) {
			pixiApp.destroy(true, true);
		}
	});

	function renderList(ids: string[]) {
		renderer.render(
			<container>
				{ids.map((id) => (
					<sprite key={id} label={id} />
				))}
			</container>,
			pixiApp,
		);
	}

	function labels(parent: PIXI.Container): string[] {
		return parent.children.map((child) => child.label);
	}

	test("a keyed list reorders without recreating children", () => {
		renderList(["a", "b", "c"]);
		const parent = pixiApp.stage.children[0] as PIXI.Container;
		const [a, b, c] = parent.children;

		expect(labels(parent)).toEqual(["a", "b", "c"]);

		renderList(["c", "a", "b"]);

		expect(labels(parent)).toEqual(["c", "a", "b"]);
		expect(parent.children[0]).toBe(c);
		expect(parent.children[1]).toBe(a);
		expect(parent.children[2]).toBe(b);
	});

	test("a keyed child inserted in the middle keeps its siblings", () => {
		renderList(["a", "c"]);
		const parent = pixiApp.stage.children[0] as PIXI.Container;
		const [a, c] = parent.children;

		renderList(["a", "b", "c"]);

		expect(labels(parent)).toEqual(["a", "b", "c"]);
		expect(parent.children[0]).toBe(a);
		expect(parent.children[2]).toBe(c);
	});

	test("a removed keyed child leaves the stage", () => {
		renderList(["a", "b", "c"]);
		const parent = pixiApp.stage.children[0] as PIXI.Container;
		const b = parent.children[1];

		renderList(["a", "c"]);

		expect(labels(parent)).toEqual(["a", "c"]);
		expect(parent.children.includes(b)).toBeFalsy();
		expect(b.parent).toBe(null);
		expect(b.destroyed).toBeFalsy();
	});

	test("children of a fragment land on the parent in order", () => {
		renderer.render(
			<container>
				<Fragment>
					<sprite label="one" />
					<sprite label="two" />
				</Fragment>
				<sprite label="three" />
			</container>,
			pixiApp,
		);

		const parent = pixiApp.stage.children[0] as PIXI.Container;
		expect(labels(parent)).toEqual(["one", "two", "three"]);
	});

	test("nested containers keep their own children", () => {
		renderer.render(
			<container label="outer">
				<container label="inner">
					<sprite label="leaf" />
				</container>
			</container>,
			pixiApp,
		);

		const outer = pixiApp.stage.children[0] as PIXI.Container;
		const inner = outer.children[0] as PIXI.Container;

		expect(outer.children.length).toBe(1);
		expect(inner.label).toBe("inner");
		expect(inner.children.length).toBe(1);
		expect(inner.children[0].label).toBe("leaf");
	});
});

describe("components and events", () => {
	let pixiApp: PIXI.Application;

	beforeEach(async () => {
		pixiApp = new PIXI.Application();
		await pixiApp.init({width: 800, height: 600});
		pixiApp.stage.removeChildren();
	});

	afterEach(() => {
		if (pixiApp) {
			pixiApp.destroy(true, true);
		}
	});

	test("a generator component patches its node on refresh", () => {
		let ctx!: Context;
		let x = 0;

		function* Mover(this: Context) {
			ctx = this;
			while (true) {
				yield <sprite x={x} />;
			}
		}

		renderer.render(<Mover />, pixiApp);
		const node = pixiApp.stage.children[0] as PIXI.Sprite;
		expect(node.x).toBe(0);

		x = 25;
		ctx.refresh();

		expect(pixiApp.stage.children[0]).toBe(node);
		expect(node.x).toBe(25);
		expect(pixiApp.stage.children.length).toBe(1);
	});

	test("a component that unmounts removes its node", () => {
		let ctx!: Context;
		let show = true;

		function* Toggle(this: Context) {
			ctx = this;
			while (true) {
				yield show ? <sprite label="visible" /> : null;
			}
		}

		renderer.render(<Toggle />, pixiApp);
		const node = pixiApp.stage.children[0];
		expect(node.label).toBe("visible");

		show = false;
		ctx.refresh();

		expect(pixiApp.stage.children.length).toBe(0);
		expect(node.parent).toBe(null);
	});

	test("an event handler attaches once across re-renders", () => {
		let calls = 0;
		const onClick = () => {
			calls++;
		};

		renderer.render(<sprite onClick={onClick} x={1} />, pixiApp);
		const node = pixiApp.stage.children[0] as PIXI.Sprite;

		renderer.render(<sprite onClick={onClick} x={2} />, pixiApp);
		renderer.render(<sprite onClick={onClick} x={3} />, pixiApp);

		expect(node.listenerCount("click")).toBe(1);

		node.emit("click", {} as any);
		expect(calls).toBe(1);
	});

	test("a replaced event handler detaches the old one", () => {
		let first = 0;
		let second = 0;

		renderer.render(<sprite onClick={() => first++} />, pixiApp);
		const node = pixiApp.stage.children[0] as PIXI.Sprite;

		renderer.render(<sprite onClick={() => second++} />, pixiApp);

		expect(node.listenerCount("click")).toBe(1);

		node.emit("click", {} as any);
		expect(first).toBe(0);
		expect(second).toBe(1);
	});

	test("a removed event handler detaches", () => {
		let calls = 0;

		renderer.render(<sprite onClick={() => calls++} />, pixiApp);
		const node = pixiApp.stage.children[0] as PIXI.Sprite;
		expect(node.listenerCount("click")).toBe(1);

		renderer.render(<sprite x={5} />, pixiApp);

		expect(pixiApp.stage.children[0]).toBe(node);
		expect(node.listenerCount("click")).toBe(0);

		node.emit("click", {} as any);
		expect(calls).toBe(0);
	});
});
