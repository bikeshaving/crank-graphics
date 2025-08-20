console.log("Starting minimal test file");

/// <reference lib="dom" />
import { suite } from "uvu";
import * as Assert from "uvu/assert";

console.log("Imports loaded");

const test = suite("minimal test");

test("basic math", () => {
	console.log("Running basic math test");
	Assert.is(1 + 1, 2);
	console.log("Test passed");
});

test.run();