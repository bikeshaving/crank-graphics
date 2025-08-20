import {renderer as domRenderer} from "@b9g/crank/dom";
import {PixiApplication, HTMLText} from "../src/index.ts";

// Game state
let gameState = {
	playerName: "Player1",
	score: 1250,
	level: 3,
	isPlaying: true,
	rotation: 0,
};

// Main DOM app that embeds PIXI
function* App() {
	while (true) {
		yield (
			<div>
				<h1>🎮 Multi-Renderer Game Demo</h1>
				<p>
					This demonstrates DOM ↔ PIXI ↔ HTML renderer bridging with Crank!
				</p>

				<div class="controls">
					<button
						onclick={() => {
							gameState.playerName =
								gameState.playerName === "Player1" ? "Hero" : "Player1";
						}}
					>
						Change Name
					</button>
					<button
						onclick={() => {
							gameState.score += 100;
						}}
					>
						Add Score
					</button>
					<button
						onclick={() => {
							gameState.isPlaying = !gameState.isPlaying;
						}}
					>
						{gameState.isPlaying ? "Pause" : "Resume"}
					</button>
				</div>

				<div class="game-container">
					<PixiApplication width={600} height={400} backgroundColor={0x1099bb}>
						{/* This content renders with PIXI renderer */}
						<GameScene />
					</PixiApplication>
				</div>

				<div style="margin-top: 20px; text-align: center;">
					<p>
						Player: <strong>{gameState.playerName}</strong> | Score:{" "}
						<strong>{gameState.score}</strong>
					</p>
				</div>
			</div>
		);
	}
}

// PIXI game scene with HTML text overlay
function* GameScene() {
	while (true) {
		if (gameState.isPlaying) {
			gameState.rotation += 0.02;
		}

		yield (
			<container>
				{/* Background sprite */}
				<graphics
					x={300}
					y={200}
					draw={(g) => {
						g.clear();
						g.circle(0, 0, 150);
						g.fill(0x4444ff);
						g.circle(0, 0, 150);
						g.stroke({color: 0xffffff, width: 3});
					}}
				/>

				{/* Rotating sprite */}
				<graphics
					x={300}
					y={200}
					rotation={gameState.rotation}
					draw={(g) => {
						g.clear();
						g.rect(-25, -25, 50, 50);
						g.fill(0xff4444);
					}}
				/>

				{/* Rich HTML text overlay using bridge */}
				<HTMLText
					x={50}
					y={50}
					style={{fontSize: 18, wordWrap: true, wordWrapWidth: 500}}
				>
					{/* This content renders with HTML renderer */}
					<div>
						<h2 style="color: white; margin: 0;">Game Status</h2>
						<p style="color: #cccccc; margin: 5px 0;">
							Welcome{" "}
							<strong style="color: #ffff00;">{gameState.playerName}</strong>!
						</p>
						<p style="color: #cccccc; margin: 5px 0;">
							Level{" "}
							<span style="color: #00ff00; font-size: 20px;">
								{gameState.level}
							</span>{" "}
							• Score:{" "}
							<span style="color: #ffaa00; font-size: 20px;">
								{gameState.score}
							</span>
						</p>
						<p style="color: #cccccc; margin: 5px 0;">
							Status:{" "}
							<em style="color: {gameState.isPlaying ? '#00ff00' : '#ff0000'};">
								{gameState.isPlaying ? "Playing" : "Paused"}
							</em>
						</p>
					</div>
				</HTMLText>

				{/* Simple PIXI text for comparison */}
				<text
					text={`Rotation: ${gameState.rotation.toFixed(2)}`}
					x={50}
					y={300}
					style={{fontSize: 16, fill: 0xffffff}}
				/>
			</container>
		);
	}
}

// Render the DOM app
domRenderer.render(<App />, document.getElementById("app")!);
