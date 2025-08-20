import {renderer} from "../src/index.ts";
import * as PIXI from "pixi.js";

// Create Pixi application
const pixiApp = new PIXI.Application();
await pixiApp.init({
	width: 800,
	height: 600,
	backgroundColor: 0x1099bb,
});

document.getElementById("game-container")!.appendChild(pixiApp.canvas);

// Create a simple colored rectangle texture
const graphics = new PIXI.Graphics();
graphics.rect(-25, -25, 50, 50);
graphics.fill(0xff0000);
const redTexture = pixiApp.renderer.generateTexture(graphics);

graphics.clear();
graphics.rect(-15, -15, 30, 30);
graphics.fill(0x00ff00);
const greenTexture = pixiApp.renderer.generateTexture(graphics);

// Game state
let gameState = {
	isAnimating: true,
	currentColor: "red",
	rotation: 0,
	scale: 1,
	time: 0,
};

// Component that shows animated elements
function* AnimatedScene() {
	while (true) {
		if (gameState.isAnimating) {
			gameState.rotation += 0.02;
			gameState.scale = 1 + Math.sin(gameState.time * 0.05) * 0.2;
			gameState.time++;
		}

		const currentTexture =
			gameState.currentColor === "red" ? redTexture : greenTexture;

		yield (
			<container>
				<text
					text="Crank + Pixi.js!"
					x={400}
					y={100}
					anchor={{x: 0.5, y: 0.5}}
					style={{
						fontFamily: "Arial",
						fontSize: 48,
						fill: 0xffffff,
						stroke: {color: 0x000000, width: 4},
					}}
				/>

				{/* Test text children/content */}
				<container x={50} y={50}>
					Hello from text node!
				</container>

				{/* Test nested text nodes */}
				<text x={50} y={200} style={{fontSize: 24, fill: 0xffffff}}>
					Parent text with
					<text
						text=" nested "
						style={{fontSize: 18, fill: 0xff0000}}
						x={100}
					/>
					child text!
				</text>

				<sprite
					texture={currentTexture}
					x={400}
					y={300}
					anchor={{x: 0.5, y: 0.5}}
					rotation={gameState.rotation}
					scale={gameState.scale}
					interactive={true}
					onclick={() => {
						console.log("Sprite clicked!");
						gameState.currentColor =
							gameState.currentColor === "red" ? "green" : "red";
					}}
				/>

				<text
					text={`Status: ${gameState.isAnimating ? "Animating" : "Paused"}`}
					x={400}
					y={450}
					anchor={{x: 0.5, y: 0.5}}
					style={{
						fontFamily: "Arial",
						fontSize: 24,
						fill: gameState.isAnimating ? 0x00ff00 : 0xff0000,
					}}
				/>

				<text
					text={`Rotation: ${gameState.rotation.toFixed(2)}`}
					x={400}
					y={500}
					anchor={{x: 0.5, y: 0.5}}
					style={{
						fontFamily: "Arial",
						fontSize: 18,
						fill: 0xffff00,
					}}
				/>

				<graphics
					x={100}
					y={100}
					draw={(g: PIXI.Graphics) => {
						g.clear();
						g.circle(0, 0, 30);
						g.fill(0xff00ff);

						// Add a white border
						g.circle(0, 0, 30);
						g.stroke({color: 0xffffff, width: 3});
					}}
					interactive={true}
					onclick={() => {
						console.log("Circle clicked!");
					}}
				/>
			</container>
		);
	}
}

// Start animation loop
pixiApp.ticker.add(() => {
	if (gameState.isAnimating) {
		// Re-render the scene each frame - pass the app instead of stage
		renderer.render(<AnimatedScene />, pixiApp);
	}
});

// Global controls for the demo
(window as any).app = {
	toggleAnimation() {
		gameState.isAnimating = !gameState.isAnimating;
	},
	changeColor() {
		gameState.currentColor = gameState.currentColor === "red" ? "green" : "red";
	},
	getState() {
		return gameState;
	},
};
