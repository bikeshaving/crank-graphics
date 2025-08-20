/** @jsx createElement */
import {createElement, Fragment} from "@b9g/crank";
import {renderer as domRenderer} from "@b9g/crank/dom";
import {PixiApplication} from "../src/index";

/**
 * Advanced texture reference demo showing:
 * - Component composition with texture sharing
 * - Dynamic texture updates
 * - Performance comparison
 * - Complex UI layouts
 */

// Reusable UI components that share textures
function* IconButton({icon, x, y, scale = 1, onClick}: any) {
	while (true) {
		yield (
			<container x={x} y={y} onclick={onClick}>
				<graphics
					draw={(g: any) => {
						g.beginFill(0x3498db);
						g.drawRoundedRect(0, 0, 60, 60, 8);
						g.endFill();
					}}
				/>
				<sprite
					texture={`url(#${icon})`}
					x={30}
					y={30}
					anchor={{x: 0.5, y: 0.5}}
					scale={scale}
				/>
			</container>
		);
	}
}

function* Card({title, icon, x, y, width = 200, height = 150}: any) {
	while (true) {
		yield (
			<container x={x} y={y}>
				{/* Card background */}
				<graphics
					draw={(g: any) => {
						g.beginFill(0xffffff, 0.9);
						g.lineStyle(2, 0xecf0f1);
						g.drawRoundedRect(0, 0, width, height, 12);
						g.endFill();
					}}
				/>

				{/* Card icon */}
				<sprite
					texture={`url(#${icon})`}
					x={width / 2}
					y={40}
					anchor={{x: 0.5, y: 0.5}}
					scale={1.5}
				/>

				{/* Card title */}
				<text
					x={width / 2}
					y={height - 30}
					anchor={{x: 0.5, y: 0.5}}
					style={{
						fontFamily: "Arial",
						fontSize: 16,
						fill: 0x2c3e50,
						align: "center",
					}}
				>
					{title}
				</text>
			</container>
		);
	}
}

function* AnimatedBackground() {
	let time = 0;

	while (true) {
		time += 0.01;

		yield (
			<container>
				{/* Animated tiling background */}
				<tiling-sprite
					texture="url(#tile-pattern)"
					width={800}
					height={600}
					tilePosition={{x: Math.sin(time) * 50, y: Math.cos(time) * 30}}
				/>

				{/* Floating particles */}
				{Array.from({length: 20}, (_, i) => (
					<sprite
						key={i}
						texture="url(#particle)"
						x={100 + i * 30 + Math.sin(time + i) * 20}
						y={100 + Math.cos(time + i * 0.5) * 40}
						scale={0.3 + Math.sin(time + i) * 0.1}
						alpha={0.6 + Math.sin(time + i) * 0.2}
					/>
				))}
			</container>
		);
	}
}

function* TextureReferencesAdvancedDemo() {
	let selectedCard = 0;

	const handleCardClick = (index: number) => {
		selectedCard = index;
		console.log(`Selected card ${index}`);
	};

	while (true) {
		yield (
			<div>
				<h1>Advanced Texture References Demo</h1>
				<p>
					Showcasing component composition, animations, and performance benefits
					of the SVG-style texture reference system.
				</p>

				<PixiApplication width={800} height={600} backgroundColor={0x34495e}>
					{/* Define texture library - loaded once, used everywhere */}
					<texture id="hero" src="https://pixijs.com/assets/bunny.png" />
					<texture id="star" src="https://pixijs.com/assets/star.png" />
					<texture
						id="tile-pattern"
						src="https://pixijs.com/assets/bg_grass.jpg"
					/>
					<texture id="particle" src="https://pixijs.com/assets/star.png" />
					<texture id="icon-home" src="https://pixijs.com/assets/bunny.png" />
					<texture
						id="icon-settings"
						src="https://pixijs.com/assets/star.png"
					/>
					<texture
						id="icon-profile"
						src="https://pixijs.com/assets/bunny.png"
					/>

					{/* Animated background layer */}
					<AnimatedBackground />

					{/* Main content */}
					<container x={50} y={50}>
						{/* Header with title */}
						<text
							x={0}
							y={0}
							style={{
								fontFamily: "Arial",
								fontSize: 32,
								fill: "white",
								fontWeight: "bold",
								stroke: "black",
								strokeThickness: 2,
							}}
						>
							Texture Gallery
						</text>

						{/* Card grid using shared textures */}
						<Card
							title="Hero Character"
							icon="hero"
							x={0}
							y={60}
							onclick={() => handleCardClick(0)}
						/>
						<Card
							title="Star Collectible"
							icon="star"
							x={220}
							y={60}
							onclick={() => handleCardClick(1)}
						/>
						<Card
							title="Environment"
							icon="tile-pattern"
							x={440}
							y={60}
							onclick={() => handleCardClick(2)}
						/>

						{/* Action buttons using texture references */}
						<IconButton
							icon="icon-home"
							x={0}
							y={240}
							onClick={() => console.log("Home clicked")}
						/>
						<IconButton
							icon="icon-settings"
							x={80}
							y={240}
							onClick={() => console.log("Settings clicked")}
						/>
						<IconButton
							icon="icon-profile"
							x={160}
							y={240}
							onClick={() => console.log("Profile clicked")}
						/>

						{/* Performance showcase - many sprites, one texture */}
						<text
							x={0}
							y={320}
							style={{
								fontFamily: "Arial",
								fontSize: 18,
								fill: "white",
							}}
						>
							Performance Test: 50 sprites, 1 texture
						</text>

						<container x={0} y={350}>
							{Array.from({length: 50}, (_, i) => (
								<sprite
									key={i}
									texture="url(#particle)"
									x={(i % 10) * 25}
									y={Math.floor(i / 10) * 25}
									scale={0.2}
									rotation={i * 0.1}
									tint={0x3498db + i * 1000}
								/>
							))}
						</container>

						{/* Status indicator */}
						<text
							x={300}
							y={350}
							style={{
								fontFamily: "Arial",
								fontSize: 14,
								fill: selectedCard === 0 ? "yellow" : "lightgray",
							}}
						>
							Selected: Card {selectedCard}
						</text>
					</container>

					{/* HUD overlay using texture references */}
					<container x={650} y={20}>
						<text
							x={0}
							y={0}
							style={{
								fontFamily: "Arial",
								fontSize: 14,
								fill: "white",
							}}
						>
							Quick Actions
						</text>
						<sprite texture="url(#star)" x={0} y={20} scale={0.3} />
						<sprite texture="url(#hero)" x={30} y={20} scale={0.2} />
						<sprite texture="url(#star)" x={60} y={20} scale={0.3} />
					</container>
				</PixiApplication>

				<div
					style={{
						marginTop: "20px",
						padding: "15px",
						backgroundColor: "#ecf0f1",
					}}
				>
					<h3>🎮 Interactive Features:</h3>
					<ul>
						<li>Click on cards to select them</li>
						<li>Action buttons show interaction feedback</li>
						<li>Animated background using texture references</li>
						<li>50 particle sprites sharing one texture for performance</li>
					</ul>

					<h3>🏗️ Architecture Highlights:</h3>
					<ul>
						<li>
							<strong>Component Composition:</strong> IconButton and Card
							components reuse textures
						</li>
						<li>
							<strong>Performance:</strong> One texture loaded, used in 50+
							places
						</li>
						<li>
							<strong>Maintainability:</strong> Change texture source in one
							place
						</li>
						<li>
							<strong>Declarative:</strong> Clear separation of texture
							definitions and usage
						</li>
					</ul>

					<h3>📊 Texture Registry Status:</h3>
					<p>
						Open browser console and run{" "}
						<code>__PIXI_TEXTURE_REGISTRY__.getDebugInfo()</code>
						to see texture usage statistics and reference counts.
					</p>
				</div>
			</div>
		);
	}
}

// Render the advanced demo
domRenderer.render(<TextureReferencesAdvancedDemo />, document.body);
