/** @jsx createElement */
import {createElement, Fragment} from "@b9g/crank";
import {renderer as domRenderer} from "@b9g/crank/dom";
import {PixiApplication} from "../src/index";

/**
 * Example demonstrating SVG-style texture references with url(#id) syntax
 *
 * This shows how to:
 * 1. Define textures once with <texture id="..." src="..." />
 * 2. Reference them multiple times with texture="url(#id)"
 * 3. Reuse textures across different sprite types
 */

function* TextureReferencesDemo() {
	yield (
		<div>
			<h1>SVG-Style Texture References Demo</h1>
			<p>
				This demo showcases the new SVG-style texture reference system. Textures
				are defined once and referenced multiple times using url(#id) syntax.
			</p>

			<PixiApplication width={800} height={600} backgroundColor={0x2c3e50}>
				{/* Define textures once - these create no visual elements */}
				<texture id="hero-sprite" src="https://pixijs.com/assets/bunny.png" />
				<texture
					id="background-tile"
					src="https://pixijs.com/assets/bg_grass.jpg"
				/>
				<texture id="star-icon" src="https://pixijs.com/assets/star.png" />

				{/* Background using tiling sprite with texture reference */}
				<tiling-sprite
					texture="url(#background-tile)"
					width={800}
					height={600}
					x={0}
					y={0}
				/>

				{/* Multiple sprites using the same hero texture */}
				<sprite texture="url(#hero-sprite)" x={100} y={100} scale={1.5} />
				<sprite
					texture="url(#hero-sprite)"
					x={300}
					y={150}
					scale={0.8}
					rotation={0.5}
				/>
				<sprite
					texture="url(#hero-sprite)"
					x={500}
					y={200}
					scale={1.2}
					tint={0xff6b6b}
				/>

				{/* Nine-slice sprite using hero texture */}
				<nine-slice-sprite
					texture="url(#hero-sprite)"
					x={200}
					y={300}
					width={200}
					height={100}
				/>

				{/* Animated sprite using star texture */}
				<animated-sprite
					texture="url(#star-icon)"
					x={600}
					y={300}
					scale={2.0}
				/>

				{/* Demonstrate fallback for missing texture */}
				<sprite texture="url(#missing-texture)" x={50} y={50} />

				{/* Container with multiple children using references */}
				<container x={400} y={400} rotation={0.1}>
					<sprite texture="url(#star-icon)" x={0} y={0} scale={0.5} />
					<sprite texture="url(#star-icon)" x={50} y={0} scale={0.5} />
					<sprite texture="url(#star-icon)" x={25} y={43} scale={0.5} />
				</container>

				{/* Text with custom styling */}
				<text
					x={50}
					y={500}
					style={{
						fontFamily: "Arial",
						fontSize: 24,
						fill: "white",
						stroke: "black",
						strokeThickness: 2,
					}}
				>
					Texture References Demo!
				</text>

				{/* Show direct texture loading still works */}
				<text
					x={50}
					y={530}
					style={{
						fontFamily: "Arial",
						fontSize: 16,
						fill: "yellow",
					}}
				>
					Direct loading still works:
				</text>
				<sprite
					texture="https://pixijs.com/assets/bunny.png"
					x={250}
					y={515}
					scale={0.3}
				/>
			</PixiApplication>

			<div
				style={{marginTop: "20px", padding: "10px", backgroundColor: "#f0f0f0"}}
			>
				<h3>How it works:</h3>
				<ul>
					<li>
						<code>&lt;texture id="hero-sprite" src="..." /&gt;</code> - Defines
						a texture once
					</li>
					<li>
						<code>texture="url(#hero-sprite)"</code> - References the texture by
						ID
					</li>
					<li>
						<code>texture="#hero-sprite"</code> - Alternative short syntax (also
						supported)
					</li>
					<li>Textures are loaded once and reused, improving performance</li>
					<li>
						Missing texture references fall back to empty texture with warning
					</li>
					<li>Direct texture paths still work as before</li>
				</ul>

				<h3>Benefits:</h3>
				<ul>
					<li>
						🔄 <strong>Reusability</strong> - Define once, use everywhere
					</li>
					<li>
						🚀 <strong>Performance</strong> - No duplicate texture loading
					</li>
					<li>
						📝 <strong>Familiar</strong> - Uses CSS/SVG url() syntax
					</li>
					<li>
						🎯 <strong>Declarative</strong> - Keep definitions close to usage
					</li>
				</ul>

				<p>
					Open the browser console to see texture registration and reference
					logging. Try adding more sprites with the same texture references!
				</p>
			</div>
		</div>
	);
}

// Render the demo
domRenderer.render(<TextureReferencesDemo />, document.body);
