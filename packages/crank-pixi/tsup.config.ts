import {defineConfig} from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["cjs", "esm"],
	dts: true,
	clean: true,
	external: ["@b9g/crank", "pixi.js"],
	noExternal: [],
});
