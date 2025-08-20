import {renderer} from "../src/index.ts";
import * as PIXI from "pixi.js";

// Create Pixi application
const pixiApp = new PIXI.Application();
await pixiApp.init({
	width: 1000,
	height: 800,
	backgroundColor: 0x1099bb,
});

document.getElementById("game-container")!.appendChild(pixiApp.canvas);

// Create textures for our demo
const graphics = new PIXI.Graphics();
graphics.rect(0, 0, 50, 50);
graphics.fill(0xff0000);
const redTexture = pixiApp.renderer.generateTexture(graphics);

graphics.clear();
graphics.circle(0, 0, 25);
graphics.fill(0x00ff00);
const greenTexture = pixiApp.renderer.generateTexture(graphics);

// Game state
let demoState = {
	isAnimating: true,
	rotation: 0,
	scale: 1,
	time: 0,
	currentTexture: redTexture,
};

// Comprehensive demo showcasing all auto-generated Pixi object types
function* ComprehensiveDemo() {
	while (true) {
		if (demoState.isAnimating) {
			demoState.rotation += 0.01;
			demoState.scale = 1 + Math.sin(demoState.time * 0.03) * 0.1;
			demoState.time++;
		}

		yield (
			<container>
				{/* Header Text */}
				<text
					text="🎮 Comprehensive Pixi.js Demo - Auto-Generated Object Support"
					x={500}
					y={50}
					anchor={{x: 0.5, y: 0.5}}
					style={{
						fontSize: 24,
						fill: 0xffffff,
						fontWeight: "bold",
						stroke: {color: 0x000000, width: 2},
					}}
				/>

				{/* Basic Display Objects Row 1 */}
				<container x={50} y={120}>
					<text
						text="Basic Objects:"
						x={0}
						y={0}
						style={{fontSize: 18, fill: 0xffff00}}
					/>

					{/* Container with children */}
					<container x={0} y={40} rotation={demoState.rotation}>
						<text
							text="Container"
							x={0}
							y={-20}
							style={{fontSize: 12, fill: 0xffffff}}
						/>
						<sprite
							texture={redTexture}
							x={0}
							y={0}
							anchor={{x: 0.5, y: 0.5}}
						/>
						<sprite
							texture={greenTexture}
							x={30}
							y={0}
							anchor={{x: 0.5, y: 0.5}}
						/>
					</container>

					{/* Regular Sprite */}
					<sprite
						texture={demoState.currentTexture}
						x={100}
						y={40}
						anchor={{x: 0.5, y: 0.5}}
						scale={demoState.scale}
						interactive={true}
						onclick={() => {
							console.log("Sprite clicked!");
							demoState.currentTexture =
								demoState.currentTexture === redTexture
									? greenTexture
									: redTexture;
						}}
					/>
					<text
						text="Sprite"
						x={100}
						y={70}
						anchor={{x: 0.5, y: 0}}
						style={{fontSize: 12, fill: 0xffffff}}
					/>

					{/* Graphics Object */}
					<graphics
						x={200}
						y={40}
						draw={(g: PIXI.Graphics) => {
							g.clear();
							g.star(0, 0, 5, 20, 10, demoState.rotation);
							g.fill(0xffaa00);
							g.stroke({color: 0xffffff, width: 2});
						}}
						interactive={true}
						onclick={() => console.log("Star clicked!")}
					/>
					<text
						text="Graphics"
						x={200}
						y={70}
						anchor={{x: 0.5, y: 0}}
						style={{fontSize: 12, fill: 0xffffff}}
					/>

					{/* Text with Style Inheritance */}
					<text
						x={300}
						y={40}
						style={{fontSize: 16, fill: 0x00ffff, fontFamily: "Arial"}}
					>
						Parent Text
						<text x={0} y={20} style={{fontSize: 12, fill: 0xff00ff}}>
							Child inherits Arial
						</text>
					</text>
				</container>

				{/* Advanced Objects Row 2 */}
				<container x={50} y={250}>
					<text
						text="Advanced Objects:"
						x={0}
						y={0}
						style={{fontSize: 18, fill: 0xffff00}}
					/>

					{/* Animated Sprite */}
					<animated-sprite
						x={0}
						y={40}
						textures={[redTexture, greenTexture]}
						animationSpeed={0.1}
						playing={demoState.isAnimating}
						anchor={{x: 0.5, y: 0.5}}
					/>
					<text
						text="AnimatedSprite"
						x={0}
						y={70}
						anchor={{x: 0.5, y: 0}}
						style={{fontSize: 12, fill: 0xffffff}}
					/>

					{/* Tiling Sprite */}
					<tiling-sprite
						texture={redTexture}
						x={100}
						y={20}
						width={60}
						height={60}
						tileScale={{x: 0.5, y: 0.5}}
						tilePosition={{x: demoState.time * 0.5, y: demoState.time * 0.3}}
					/>
					<text
						text="TilingSprite"
						x={130}
						y={90}
						anchor={{x: 0.5, y: 0}}
						style={{fontSize: 12, fill: 0xffffff}}
					/>

					{/* Nine Slice Sprite */}
					<nine-slice-sprite
						texture={greenTexture}
						x={200}
						y={20}
						width={80}
						height={60}
						leftWidth={10}
						topHeight={10}
						rightWidth={10}
						bottomHeight={10}
					/>
					<text
						text="NineSliceSprite"
						x={240}
						y={90}
						anchor={{x: 0.5, y: 0}}
						style={{fontSize: 12, fill: 0xffffff}}
					/>

					{/* Particle Container */}
					<particle-container x={320} y={40} maxSize={100}>
						{Array.from({length: 10}, (_, i) => (
							<sprite
								key={i}
								texture={i % 2 === 0 ? redTexture : greenTexture}
								x={Math.cos(demoState.time * 0.05 + i) * 20}
								y={Math.sin(demoState.time * 0.05 + i) * 20}
								anchor={{x: 0.5, y: 0.5}}
								scale={0.3}
							/>
						))}
					</particle-container>
					<text
						text="ParticleContainer"
						x={320}
						y={70}
						anchor={{x: 0.5, y: 0}}
						style={{fontSize: 12, fill: 0xffffff}}
					/>
				</container>

				{/* Text Objects Row 3 */}
				<container x={50} y={380}>
					<text
						text="Text Objects:"
						x={0}
						y={0}
						style={{fontSize: 18, fill: 0xffff00}}
					/>

					{/* Regular Text with Children */}
					<text x={0} y={40} style={{fontSize: 14, fill: 0xffffff}}>
						Regular Text: Time = {Math.floor(demoState.time / 60)}s
					</text>

					{/* HTML Text */}
					<htmltext
						x={250}
						y={40}
						text={`<div style="color: white;">HTML Text with <b>bold</b> and <i>italic</i></div>`}
						style={{fontSize: 14, wordWrap: true, wordWrapWidth: 200}}
					/>

					{/* Bitmap Text (if font is available) */}
					<text x={0} y={80} style={{fontSize: 12, fill: 0xcccccc}}>
						BitmapText requires pre-loaded font atlas
					</text>
				</container>

				{/* Mesh Object Row 4 */}
				<container x={50} y={520}>
					<text
						text="Mesh Object:"
						x={0}
						y={0}
						style={{fontSize: 18, fill: 0xffff00}}
					/>

					{/* Simple Mesh */}
					<mesh
						x={0}
						y={40}
						// Note: Mesh requires geometry and shader - simplified for demo
					/>
					<text
						text="Mesh (Advanced)"
						x={0}
						y={80}
						style={{fontSize: 12, fill: 0xcccccc}}
					/>
				</container>

				{/* Controls */}
				<container x={50} y={650}>
					<graphics
						x={0}
						y={0}
						draw={(g: PIXI.Graphics) => {
							g.clear();
							g.roundRect(0, 0, 150, 40, 10);
							g.fill(demoState.isAnimating ? 0x00aa00 : 0xaa0000);
							g.stroke({color: 0xffffff, width: 2});
						}}
						interactive={true}
						onclick={() => {
							demoState.isAnimating = !demoState.isAnimating;
							console.log(
								"Animation",
								demoState.isAnimating ? "started" : "paused",
							);
						}}
					/>
					<text
						text={demoState.isAnimating ? "⏸️ Pause" : "▶️ Play"}
						x={75}
						y={20}
						anchor={{x: 0.5, y: 0.5}}
						style={{fontSize: 16, fill: 0xffffff, fontWeight: "bold"}}
					/>

					<text
						text={`Total Objects: 15+ | Generated Tags: container, sprite, graphics, text, animated-sprite, tiling-sprite, nine-slice-sprite, particle-container, htmltext, mesh`}
						x={200}
						y={20}
						style={{fontSize: 12, fill: 0xaaaaaa}}
					/>
				</container>

				{/* Info Text */}
				<text
					text="🚀 All objects auto-generated from Pixi.js TypeScript definitions using ts-morph!"
					x={500}
					y={750}
					anchor={{x: 0.5, y: 0.5}}
					style={{fontSize: 14, fill: 0xffffff, fontStyle: "italic"}}
				/>
			</container>
		);
	}
}

// Start the demo
pixiApp.ticker.add(() => {
	if (demoState.isAnimating) {
		renderer.render(<ComprehensiveDemo />, pixiApp);
	}
});

// Initial render
renderer.render(<ComprehensiveDemo />, pixiApp);

// Global controls
(window as any).demo = {
	toggleAnimation() {
		demoState.isAnimating = !demoState.isAnimating;
	},
	getState() {
		return demoState;
	},
};

console.log(
	"🎮 Comprehensive demo loaded! Available objects:",
	Object.keys(renderer.adapter.create ? {} : {}),
);
console.log("Use demo.toggleAnimation() to control animation");
