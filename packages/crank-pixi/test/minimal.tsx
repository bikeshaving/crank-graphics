console.log("Starting minimal test file");

/// <reference lib="dom" />
import { describe, test, expect } from "@b9g/libuild/test";

console.log("Imports loaded");

describe("minimal test", () => {
	test("basic math", () => {
		console.log("Running basic math test");
		expect(1 + 1).toBe(2);
		console.log("Test passed");
	});
});
