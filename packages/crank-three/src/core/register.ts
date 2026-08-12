/**
 * Custom renderables.
 *
 * The generated tag map holds the classes of the three core module. register()
 * adds another class: your own subclass, or a class of three/examples/jsm.
 * The function mirrors customElements.define().
 *
 * A registered tag must contain a dash. Generated tags never contain a dash,
 * so the two groups of names cannot collide.
 */

import {createPropertyApplier} from "./property-applier";

export type ThreeConstructor = new (...args: Array<any>) => any;

export interface RegisteredTag {
	tag: string;
	Class: ThreeConstructor;
	applyProps: (node: any, props: Record<string, any>) => void;
}

const registeredTags = new Map<string, RegisteredTag>();

/**
 * Register a class as an element.
 *
 *   register("orbit-controls", OrbitControls);
 *   <orbit-controls args={[camera, canvas]} enableDamping={true} />
 */
export function register(tagName: string, Class: ThreeConstructor): void {
	if (typeof tagName !== "string" || tagName.length === 0) {
		throw new TypeError("register() needs a tag name.");
	}

	if (!tagName.includes("-")) {
		throw new Error(
			`Invalid tag name "${tagName}". A registered tag must contain a dash. ` +
				"Dashless tags are reserved for the generated Three.js elements.",
		);
	}

	if (typeof Class !== "function") {
		throw new TypeError(`register() needs a class for "${tagName}".`);
	}

	registeredTags.set(tagName, {
		tag: tagName,
		Class,
		applyProps: createPropertyApplier<any>(tagName),
	});
}

/** Get the registration of a tag. */
export function getRegisteredTag(tag: string): RegisteredTag | undefined {
	return registeredTags.get(tag);
}

/** List the registered tags. */
export function getRegisteredTagNames(): Array<string> {
	return Array.from(registeredTags.keys());
}

/** Remove one registration, or all of them. Tests use this function. */
export function unregister(tag?: string): void {
	if (tag === undefined) {
		registeredTags.clear();
		return;
	}

	registeredTags.delete(tag);
}
