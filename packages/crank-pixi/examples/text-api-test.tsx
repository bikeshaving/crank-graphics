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

// Game state
let gameState = {
	playerName: "Hero",
	score: 1500,
	level: 5,
};

// Test the new text API
function* TextAPIDemo() {
	while (true) {
		yield (
			<container>
				{/* Test 1: String children in text */}
				<text x={50} y={50} style={{fontSize: 24, fill: 0xffffff}}>
					Hello {gameState.playerName}!
				</text>

				{/* Test 2: Text inheritance with nested text */}
				<text x={50} y={100} style={{fontSize: 20, fill: 0xffff00}}>
					Parent text (yellow, 20px)
					<text x={200} y={20} style={{fill: 0xff0000}}>
						Child text (should inherit 20px, be red)
					</text>
				</text>

				{/* Test 3: Deep nesting */}
				<text
					x={50}
					y={200}
					style={{fontSize: 18, fill: 0x00ff00, fontFamily: "Arial"}}
				>
					Level {gameState.level}
					<text x={100} y={0} style={{fontSize: 24, fontWeight: "bold"}}>
						(Inherited Arial, bigger bold)
						<text x={0} y={30} style={{fill: 0xff00ff}}>
							Score: {gameState.score}
						</text>
					</text>
				</text>

				{/* Test 4: Mixed content */}
				<text x={50} y={300} style={{fontSize: 16, fill: 0xcccccc}}>
					Mixed content:
					<sprite x={120} y={-5} texture={createRedSquareTexture()} />
					<text x={150} y={0}>
						and more text
					</text>
				</text>

				{/* Test 5: HTMLText host element */}
				<htmltext
					x={50}
					y={400}
					text="Rich <b>HTML</b> with <span style='color: red;'>styling</span>!"
					style={{fontSize: 18, wordWrap: true, wordWrapWidth: 300}}
				/>

				{/* Test 6: String content anywhere */}
				<container x={500} y={100}>
					This is a string in a container!
					<text x={0} y={30} style={{fontSize: 14, fill: 0xffffff}}>
						And this is a text element
					</text>
				</container>
			</container>
		);
	}
}

// Helper function to create a simple texture
function createRedSquareTexture() {
	const graphics = new PIXI.Graphics();
	graphics.rect(0, 0, 20, 20);
	graphics.fill(0xff0000);
	return pixiApp.renderer.generateTexture(graphics);
}

// Render once for testing (no animation loop)
renderer.render(<TextAPIDemo />, pixiApp);

// Add manual controls for testing
(window as any).testRender = () => {
	console.log("Manual render triggered");
	renderer.render(<TextAPIDemo />, pixiApp);
};

(window as any).updateScore = () => {
	gameState.score += 100;
	gameState.level = Math.floor(gameState.score / 500) + 1;
	console.log("Updated state:", gameState);
	renderer.render(<TextAPIDemo />, pixiApp);
};

console.log(
	"Text API test loaded. Use testRender() or updateScore() in console to trigger renders.",
);
