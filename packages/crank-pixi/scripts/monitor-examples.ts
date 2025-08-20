#!/usr/bin/env bun
/**
 * Background monitor for Pixi.js examples
 * Runs examples and periodically checks for runtime errors
 */

import {spawn, type ChildProcess} from "child_process";
import {setTimeout} from "timers/promises";
import * as Path from "path";

interface ExampleMonitor {
	name: string;
	process: ChildProcess | null;
	port: number;
	errors: string[];
	lastCheck: Date;
	isHealthy: boolean;
}

const EXAMPLES = [
	{name: "comprehensive-demo", file: "comprehensive-demo.html", port: 3000},
	{name: "texture-references", file: "texture-references.html", port: 3001},
	{
		name: "advanced-texture-demo",
		file: "advanced-texture-demo.html",
		port: 3002,
	},
];

const monitors: ExampleMonitor[] = EXAMPLES.map((ex) => ({
	name: ex.name,
	process: null,
	port: ex.port,
	errors: [],
	lastCheck: new Date(),
	isHealthy: true,
}));

function startExample(
	example: (typeof EXAMPLES)[0],
	monitor: ExampleMonitor,
): Promise<void> {
	return new Promise((resolve, reject) => {
		console.log(`🚀 Starting ${example.name} on port ${example.port}...`);

		// Get examples directory relative to this script
		const examplesDir = Path.resolve(
			Path.dirname(import.meta.url.replace("file://", "")),
			"../examples",
		);

		const proc = spawn(
			"bun",
			["serve", example.file, "--port", example.port.toString()],
			{
				cwd: examplesDir,
				stdio: ["pipe", "pipe", "pipe"],
			},
		);

		monitor.process = proc;

		proc.stdout?.on("data", (data) => {
			const output = data.toString();
			if (output.includes("Listening on")) {
				console.log(
					`✅ ${example.name} ready at http://localhost:${example.port}`,
				);
				resolve();
			}
		});

		proc.stderr?.on("data", (data) => {
			const error = data.toString().trim();
			if (error) {
				monitor.errors.push(`[${new Date().toISOString()}] ${error}`);
				monitor.isHealthy = false;
				console.error(`❌ ${example.name} error:`, error);
			}
		});

		proc.on("error", (error) => {
			monitor.errors.push(
				`[${new Date().toISOString()}] Process error: ${error.message}`,
			);
			monitor.isHealthy = false;
			console.error(`💥 ${example.name} process error:`, error.message);
		});

		proc.on("exit", (code) => {
			monitor.process = null;
			monitor.isHealthy = false;
			console.warn(`⚠️ ${example.name} exited with code ${code}`);
		});

		// Timeout if server doesn't start in 10 seconds
		setTimeout(() => {
			if (monitor.process && !monitor.isHealthy) {
				reject(new Error(`${example.name} failed to start within 10 seconds`));
			}
		}, 10000);
	});
}

async function checkExampleHealth(
	example: (typeof EXAMPLES)[0],
	monitor: ExampleMonitor,
): Promise<void> {
	try {
		const response = await fetch(`http://localhost:${example.port}/`, {
			method: "HEAD",
			signal: AbortSignal.timeout(5000),
		});

		if (response.ok) {
			if (!monitor.isHealthy) {
				console.log(`🟢 ${example.name} recovered`);
				monitor.isHealthy = true;
			}
		} else {
			throw new Error(`HTTP ${response.status}`);
		}
	} catch (error) {
		if (monitor.isHealthy) {
			console.error(`🔴 ${example.name} health check failed:`, error.message);
			monitor.isHealthy = false;
		}
		monitor.errors.push(
			`[${new Date().toISOString()}] Health check failed: ${error.message}`,
		);
	}

	monitor.lastCheck = new Date();
}

function printStatus() {
	console.log("\n📊 Example Status Report:");
	console.log("=".repeat(50));

	monitors.forEach((monitor) => {
		const status = monitor.isHealthy ? "🟢 HEALTHY" : "🔴 UNHEALTHY";
		const uptime = monitor.process ? "RUNNING" : "STOPPED";
		const errorCount = monitor.errors.length;

		console.log(
			`${monitor.name.padEnd(20)} ${status} ${uptime.padEnd(8)} Errors: ${errorCount}`,
		);

		// Show recent errors
		if (errorCount > 0) {
			const recentErrors = monitor.errors.slice(-3);
			recentErrors.forEach((error) => {
				console.log(
					`  ↳ ${error.slice(0, 80)}${error.length > 80 ? "..." : ""}`,
				);
			});
		}
	});

	console.log("=".repeat(50));
	console.log(`Last check: ${new Date().toLocaleTimeString()}\n`);
}

async function main() {
	console.log("🎮 Starting Pixi.js Example Monitor...\n");

	// Start all examples
	for (let i = 0; i < EXAMPLES.length; i++) {
		try {
			await startExample(EXAMPLES[i], monitors[i]);
			await setTimeout(2000); // Stagger startup
		} catch (error) {
			console.error(`Failed to start ${EXAMPLES[i].name}:`, error.message);
		}
	}

	console.log("\n🔍 Starting health monitoring...");

	// Monitor loop
	while (true) {
		// Health check all examples
		for (let i = 0; i < EXAMPLES.length; i++) {
			if (monitors[i].process) {
				await checkExampleHealth(EXAMPLES[i], monitors[i]);
			}
		}

		// Print status every 30 seconds
		printStatus();

		// Wait 30 seconds before next check
		await setTimeout(30000);
	}
}

// Cleanup on exit
process.on("SIGINT", () => {
	console.log("\n🛑 Shutting down monitors...");
	monitors.forEach((monitor) => {
		if (monitor.process) {
			monitor.process.kill();
		}
	});
	process.exit(0);
});

process.on("SIGTERM", () => {
	monitors.forEach((monitor) => {
		if (monitor.process) {
			monitor.process.kill();
		}
	});
	process.exit(0);
});

// Start monitoring
main().catch((error) => {
	console.error("Monitor failed:", error);
	process.exit(1);
});
