/**
 * register() adds a display object class as a JSX tag at runtime.
 *
 * The API mirrors customElements.define(). Use it for your own Container
 * subclasses and for third-party display objects. The renderer applies props to
 * a registered tag through the same property applier that generated tags use.
 */

import {createPropertyApplier} from "./property-applier";

export type PixiElementConstructor = new (...args: any[]) => any;

export interface RegisteredElement {
	tag: string;
	class: PixiElementConstructor;
	applyProps: (node: any, props: Record<string, any>) => void;
}

const REGISTERED_ELEMENTS = new Map<string, RegisteredElement>();

/**
 * Register a display object class under a tag name.
 *
 * The tag name must contain a dash, as customElements.define() also requires.
 * Generated Pixi tags are dashless, so the two groups never collide.
 */
export function register(
	tagName: string,
	PixiClass: PixiElementConstructor,
): void {
	if (!tagName.includes("-")) {
		throw new Error(
			`Invalid tag name "${tagName}". A registered tag name must contain a dash. ` +
				`Dashless tag names are reserved for the generated Pixi elements.`,
		);
	}

	REGISTERED_ELEMENTS.set(tagName, {
		tag: tagName,
		class: PixiClass,
		applyProps: createPropertyApplier<any>(tagName),
	});
}

/** Get the element that register() added for a tag name. */
export function getRegisteredElement(
	tagName: string,
): RegisteredElement | undefined {
	return REGISTERED_ELEMENTS.get(tagName);
}

/** Get the registered tag names. */
export function getRegisteredTags(): string[] {
	return Array.from(REGISTERED_ELEMENTS.keys());
}

/** Remove all registered elements. Tests use this between cases. */
export function clearRegisteredElements(): void {
	REGISTERED_ELEMENTS.clear();
}
