import {
	Portal,
	Renderer,
	type ElementValue,
	type RenderAdapter,
} from "@b9g/crank";
import * as PIXI from "pixi.js";

// Pixi.js display object types we'll support
type PixiNode = any; // PIXI display object base
type PixiContainer = any; // PIXI container type

// Import auto-generated mappings
import "./generated/jsx-types";
import {PIXI_TAG_MAP} from "./generated/tag-mapping";
import {PROPERTY_APPLIERS} from "./generated/property-appliers";
import {createPixiObject} from "./generated/constructors";

// Import the register() escape hatch
import {
	register,
	getRegisteredElement,
	getRegisteredTags,
	clearRegisteredElements,
} from "./core/register";

export {register, getRegisteredTags, clearRegisteredElements};
export type {RegisteredElement, PixiElementConstructor} from "./core/register";
export type {PixiElementProps, PixiCommonProps} from "./types/element-props";

// Import texture registry and URL parsing
import {textureRegistry} from "./core/texture-registry";
import {
	parseTextureUrl,
	isValidTextureId,
	normalizeTextureId,
} from "./core/texture-url-parser";

// Common property setters for Pixi objects
function applyCommonProps(node: PixiNode, props: Record<string, any>): void {
	if (props.x !== undefined) {
		node.x = props.x;
	}
	if (props.y !== undefined) {
		node.y = props.y;
	}
	if (props.width !== undefined) node.width = props.width;
	if (props.height !== undefined) node.height = props.height;
	if (props.alpha !== undefined) node.alpha = props.alpha;
	if (props.visible !== undefined) node.visible = props.visible;
	if (props.rotation !== undefined) node.rotation = props.rotation;
	if (props.scale !== undefined) {
		if (typeof props.scale === "number") {
			node.scale.set(props.scale);
		} else if (props.scale.x !== undefined || props.scale.y !== undefined) {
			node.scale.set(
				props.scale.x ?? node.scale.x,
				props.scale.y ?? node.scale.y,
			);
		}
	}
	if (props.anchor !== undefined && "anchor" in node) {
		const anchor = node.anchor as PIXI.ObservablePoint;
		if (typeof props.anchor === "number") {
			anchor.set(props.anchor);
		} else {
			anchor.set(props.anchor.x ?? anchor.x, props.anchor.y ?? anchor.y);
		}
	}
	if (props.tint !== undefined && "tint" in node) {
		(node as any).tint = props.tint;
	}
}

// Collect inherited text styles from parent chain
// Helper function to find the nearest container ancestor
function findNearestContainer(node: any): PIXI.Container | null {
	let current = node.parent;
	while (current) {
		if (current instanceof PIXI.Container) {
			return current;
		}
		current = current.parent;
	}
	return null;
}

// Import text style inheritance and symbols
import {collectParentTextStyles} from "./core/text-style-inheritance.js";
import {TEXT_PARENT, DEFERRED_CHILDREN, IS_TEXTURE_DEFINITION, TEXTURE_ID, RESOLVING_TEXTURE} from "./core/symbols.js";

// Re-export for external use
export {collectParentTextStyles};

// Legacy text props function (will be replaced by auto-generated version)
function applyTextPropsLegacy(
	node: PIXI.Text,
	props: Record<string, any>,
): void {
	// Handle text content from props.text
	if (props.text !== undefined) {
		node.text = props.text;
	}

	// Handle style inheritance + merging
	if (props.style !== undefined || node instanceof PIXI.Text) {
		// Always collect inherited styles for text nodes
		const inheritedStyle = collectParentTextStyles(node);

		// Merge: inherited (lowest) < props.style (highest)
		const mergedStyle = {...inheritedStyle, ...(props.style || {})};

		// Only create new style if we have styles to apply
		if (Object.keys(mergedStyle).length > 0) {
			node.style = new PIXI.TextStyle(mergedStyle);
		}
	}
}

// Enhanced texture resolution with URL reference support
// Can optionally defer resolution for missing textures
function resolveTexture(textureRef: any, node?: any, property?: string): PIXI.Texture {
	if (!textureRef) return PIXI.Texture.EMPTY;

	if (textureRef instanceof PIXI.Texture) {
		return textureRef;
	}

	if (typeof textureRef === "string") {
		// Check if it's a registry reference (#id)
		if (textureRef.startsWith("#")) {
			const id = textureRef.slice(1);
			const texture = textureRegistry.acquire(id);
			if (texture) {
				return texture;
			} else if (node && property) {
				// Defer resolution - texture may be defined later in the tree
				textureRegistry.addPendingReference({
					textureId: id,
					node,
					property,
					resolver: (targetNode, resolvedTexture) => {
						// Use flag to prevent recursion during resolution
						if ((targetNode as any)[RESOLVING_TEXTURE]) {
							return;
						}
						
						// Only update if texture is different
						if (targetNode[property] !== resolvedTexture) {
							(targetNode as any)[RESOLVING_TEXTURE] = true;
							try {
								targetNode[property] = resolvedTexture;
							} finally {
								delete (targetNode as any)[RESOLVING_TEXTURE];
							}
						}
					}
				});
				return PIXI.Texture.EMPTY; // Temporary fallback
			} else {
				console.warn(
					`Texture reference "${textureRef}" not found in registry. Available textures: ${textureRegistry.getIds().join(", ")}`,
				);
				return PIXI.Texture.EMPTY;
			}
		}

		// Direct texture path
		return PIXI.Texture.from(textureRef);
	}

	return PIXI.Texture.EMPTY;
}

// The property appliers are now auto-generated in generated/property-appliers.ts

// Texture registration from props (synchronous container creation, async loading)
function createTextureFromProps(props: Record<string, any>): PIXI.Container {
	const container = new PIXI.Container();
	container.visible = false;
	(container as any)[IS_TEXTURE_DEFINITION] = true;

	// Validate required props
	if (!props.id) {
		console.error('Texture element requires an "id" prop');
		return container;
	}

	// Normalize the texture ID
	let textureId: string;
	try {
		textureId = isValidTextureId(props.id)
			? props.id
			: normalizeTextureId(props.id);
	} catch (error) {
		console.error(`Invalid texture ID "${props.id}":`, error);
		return container;
	}

	// Store the texture ID on the container for cleanup
	(container as any)[TEXTURE_ID] = textureId;

	// Event listeners are now handled via standard EventTarget API
	// Users should use textureRegistry.addEventListener('load', handler) directly

	// Register texture based on provided props
	if (props.src) {
		// Load from source path asynchronously
		textureRegistry
			.registerFromSource(
				textureId, 
				props.src, 
				{
					originalId: props.id,
					...props.metadata,
				}
			)
			.then(() => {
				console.log(
					`Registered texture "${textureId}" from source: ${props.src}`,
				);
			})
			.catch((error) => {
				console.error(`Failed to register texture "${textureId}":`, error);
			});
	} else if (props.texture && props.texture instanceof PIXI.Texture) {
		// Register existing texture object synchronously
		textureRegistry.register(textureId, props.texture, undefined, {
			originalId: props.id,
			...props.metadata,
		});
		console.log(`Registered texture "${textureId}" from PIXI.Texture object`);
		
		// Event will be fired automatically by textureRegistry.register()
	} else {
		console.warn(`Texture element "${textureId}" has no src or texture prop`);
	}

	return container;
}

// Object creation and property application are now auto-generated

export const adapter: Partial<
	RenderAdapter<
		PixiNode | PIXI.Application,
		undefined,
		PixiContainer | PIXI.Application
	>
> = {
	create({
		tag,
		tagName,
		props,
	}: {
		tag: string | symbol;
		tagName: string;
		props: Record<string, any>;
		scope: undefined;
	}): PixiNode {
		if (typeof tag !== "string") {
			throw new Error(`Unknown tag: ${tagName} (tag: ${String(tag)})`);
		}

		let node: PixiNode;

		// Handle special texture definition element
		if (tag === "texture") {
			// Texture elements are virtual - they register textures but don't create display objects
			return createTextureFromProps(props);
		}

		// Use the comprehensive tag mapping
		const PixiClass = PIXI_TAG_MAP[tag as keyof typeof PIXI_TAG_MAP];
		if (!PixiClass) {
			// Tags that register() added
			const registered = getRegisteredElement(tag);
			if (registered) {
				return new registered.class();
			}

			const supportedTags = Object.keys(PIXI_TAG_MAP)
				.filter((t) => t !== "texture")
				.concat(getRegisteredTags())
				.join(", ");
			throw new Error(
				`Unknown Pixi tag: ${tag}. Supported tags: ${supportedTags}`,
			);
		}

		// Create the appropriate Pixi object with intelligent constructor arguments
		node = createPixiObject(tag as any, PixiClass, props);

		return node;
	},

	patch({
		node,
		tagName,
		props,
		oldProps,
	}: {
		node: PixiNode;
		tagName: string;
		props: Record<string, any>;
		oldProps: Record<string, any> | undefined;
		scope: undefined;
		copyProps: Set<string> | undefined;
		quietProps: Set<string> | undefined;
		isHydrating: boolean;
	}): void {
		// Skip texture definition elements
		if ((node as any)[IS_TEXTURE_DEFINITION]) {
			return;
		}

		// Apply common properties first
		applyCommonProps(node, props);

		// Use the auto-generated property applier based on tag name
		const applier =
			PROPERTY_APPLIERS[tagName as keyof typeof PROPERTY_APPLIERS];

		if (applier) {
			applier(node, props);
		} else {
			// Tags that register() added
			const registered = getRegisteredElement(tagName);
			if (registered) {
				registered.applyProps(node, props);
			} else {
				// Fallback for unknown types
				for (const [key, value] of Object.entries(props)) {
					if (value !== undefined && key in node) {
						try {
							node[key] = value;
						} catch (error) {
							console.warn(
								`Failed to set property ${key} on ${tagName}:`,
								error,
							);
						}
					}
				}
			}
		}

		// Handle event listeners
		for (const [key, value] of Object.entries(props)) {
			if (key.startsWith("on") && typeof value === "function") {
				const eventName = key.slice(2).toLowerCase();
				const oldValue = oldProps?.[key];

				if (oldValue && typeof oldValue === "function") {
					node.off(eventName, oldValue);
				}

				if (value) {
					node.on(eventName, value);
				}
			}
		}
	},

	arrange({
		tag,
		node,
		children,
	}: {
		tag: string | symbol;
		node: PixiNode | PIXI.Application;
		props: Record<string, any>;
		children: Array<PixiNode>;
	}): void {
		// Handle PIXI Applications by using their stage
		if (
			"stage" in node &&
			"renderer" in node &&
			node.stage instanceof PIXI.Container
		) {
			const app = node as PIXI.Application;
			// Add children to the stage and trigger render
			for (let i = 0; i < children.length; i++) {
				const child = children[i];
				if (child && !app.stage.children.includes(child)) {
					app.stage.addChild(child);
				}
				
				// Handle deferred children from text nodes
				if ((child as any)[DEFERRED_CHILDREN]) {
					const deferredChildren = (child as any)[DEFERRED_CHILDREN];
					for (const deferredChild of deferredChildren) {
						if (!app.stage.children.includes(deferredChild)) {
							app.stage.addChild(deferredChild);
						}
						
						// Apply style inheritance to deferred text children
						if (deferredChild instanceof PIXI.Text && (deferredChild as any)[TEXT_PARENT]) {
							const inheritedStyle = collectParentTextStyles(deferredChild);
							if (Object.keys(inheritedStyle).length > 0) {
								const currentStyle = deferredChild.style;
								const explicitStyles: Record<string, any> = {};
								
								// Only preserve explicitly set styles
								if (currentStyle.fontWeight !== "normal") explicitStyles.fontWeight = currentStyle.fontWeight;
								if (currentStyle.fontStyle !== "normal") explicitStyles.fontStyle = currentStyle.fontStyle;
								
								// Merge: inherited < explicit
								const mergedStyle = {
									...inheritedStyle,
									...explicitStyles
								};
								
								deferredChild.style = new PIXI.TextStyle(mergedStyle);
							}
						}
					}
					// Clear the deferred children to avoid re-adding
					delete (child as any)[DEFERRED_CHILDREN];
				}
				
				// Apply inherited styles to text children after parent relationships are established
				if (child instanceof PIXI.Text && (child as any)[TEXT_PARENT]) {
					const inheritedStyle = collectParentTextStyles(child);
					if (Object.keys(inheritedStyle).length > 0) {
						// Get the child's current explicit styles (only non-default values)
						const currentStyle = child.style;
						const explicitStyles: Record<string, any> = {};
						
						// Only preserve explicitly set styles (that differ from defaults)
						if (currentStyle.fontWeight !== "normal") explicitStyles.fontWeight = currentStyle.fontWeight;
						if (currentStyle.fontStyle !== "normal") explicitStyles.fontStyle = currentStyle.fontStyle;
						// Add other explicit styles as needed
						
						// Merge: inherited < explicit (explicit overrides inherited)
						const mergedStyle = {
							...inheritedStyle,
							...explicitStyles
						};
						
						child.style = new PIXI.TextStyle(mergedStyle);
					}
				}
			}
			app.renderer.render(app.stage);
			return;
		}

		if (tag === Portal) {
			// For Portal, we need to manually add children to the portal root (stage)
			if (node instanceof PIXI.Container) {
				for (let i = 0; i < children.length; i++) {
					const child = children[i];
					if (child && !node.children.includes(child)) {
						node.addChild(child);
					}
				}
			}
			return;
		}

		// Handle text content from children for text and htmltext nodes
		if (tag === "text" || tag === "htmltext") {
			// Separate string children from PIXI children
			const stringChildren: string[] = [];
			const pixiChildren: PixiNode[] = [];

			for (const child of children) {
				if (typeof child === "string") {
					stringChildren.push(child);
				} else {
					// For PIXI children of text nodes, we'll add them to the nearest container
					// but mark them as having a text parent for style inheritance
					if (child instanceof PIXI.Text || child instanceof PIXI.HTMLText) {
						(child as any)[TEXT_PARENT] = node;
					}
					pixiChildren.push(child);
				}
			}

			// Set text content from string children only
			if (
				stringChildren.length > 0 &&
				(node instanceof PIXI.Text || node instanceof PIXI.HTMLText)
			) {
				const textContent = stringChildren.join("");
				node.text = textContent;
			}

			// In Pixi.js v8, Text objects can't have children
			// Instead, we need to add child text objects directly to the container
			// For top-level text elements, we'll let them be added to the main container normally
			if (pixiChildren.length > 0 && (node instanceof PIXI.Text || node instanceof PIXI.HTMLText)) {
				// If this text node has a parent container, add children there
				// Otherwise, add them to the same level (they'll be siblings)
				const parentContainer = node.parent as PIXI.Container;
				if (parentContainer && parentContainer instanceof PIXI.Container) {
					for (const child of pixiChildren) {
						parentContainer.addChild(child);
					}
				} else {
					// For top-level text nodes, return the children to be added as siblings
					// We'll store them and add them after this node is placed
					(node as any)[DEFERRED_CHILDREN] = pixiChildren;
				}
				return; // Don't try to add children to text nodes
			}

			// For other containers that happen to have text/htmltext tag, handle normally
			children = pixiChildren;
		}

		// Only Containers can have children in Pixi.js v8
		if (node instanceof PIXI.Container) {
			const container: PIXI.Container = node;
			const isParticleContainer = node instanceof PIXI.ParticleContainer;

			// Remove existing children that aren't in the new children array
			const toRemove: PixiNode[] = [];
			for (const existingChild of container.children) {
				if (!children.includes(existingChild)) {
					toRemove.push(existingChild);
				}
			}

			for (const child of toRemove) {
				container.removeChild(child);
			}

			// Add/reorder children
			for (let i = 0; i < children.length; i++) {
				const child = children[i];

				// Check if child is already in this container
				let currentIndex = -1;
				try {
					currentIndex = container.getChildIndex(child);
				} catch (e) {
					// Child is not in this container, currentIndex remains -1
				}

				if (currentIndex === -1) {
					// Child not in container, add it
					if (isParticleContainer) {
						// Use addParticle for ParticleContainer
						(container as any).addParticle(child);
					} else {
						container.addChildAt(child, i);
					}
				} else if (currentIndex !== i) {
					// Child exists but in wrong position, move it
					if (isParticleContainer) {
						// ParticleContainer doesn't support setChildIndex, remove and re-add
						container.removeChild(child);
						(container as any).addParticle(child);
					} else {
						container.setChildIndex(child, i);
					}
				}
			}

			// Handle deferred children from text nodes
			for (const child of children) {
				if ((child as any)[DEFERRED_CHILDREN]) {
					const deferredChildren = (child as any)[DEFERRED_CHILDREN];
					for (const deferredChild of deferredChildren) {
						if (!container.children.includes(deferredChild)) {
							container.addChild(deferredChild);
						}
					}
					// Clear the deferred children to avoid re-adding
					delete (child as any)[DEFERRED_CHILDREN];
				}
			}
		}
	},

	remove({
		node,
		parentNode,
	}: {
		node: PixiNode;
		parentNode: PixiNode | PIXI.Application;
		isNested: boolean;
	}): void {
		// Handle texture definition cleanup
		if ((node as any)[IS_TEXTURE_DEFINITION] && (node as any)[TEXTURE_ID]) {
			const textureId = (node as any)[TEXTURE_ID];
			console.log(`Unregistering texture "${textureId}"`);
			textureRegistry.unregister(textureId);
		}

		// Handle Application parents
		if ("stage" in parentNode && parentNode.stage instanceof PIXI.Container) {
			const app = parentNode as PIXI.Application;
			if (node.parent === app.stage) {
				app.stage.removeChild(node);
			}
			return;
		}

		if (parentNode instanceof PIXI.Container && node.parent === parentNode) {
			parentNode.removeChild(node);
		}
	},

	text({
		value,
	}: {
		value: string;
		scope: undefined;
		oldNode: PixiNode | undefined;
		hydrationNodes: Array<PixiNode> | undefined;
	}): PixiNode {
		// For Pixi, text nodes are PIXI.Text objects
		// This handles string content like "Hello world!" in JSX
		// Use Pixi.js v8 constructor format
		return new PIXI.Text({ text: value });
	},

	read(value: ElementValue<PixiNode>): PixiNode | Array<PixiNode> | undefined {
		// Return the Pixi display object(s) directly
		return value;
	},

	finalize(root: PixiContainer): void {
		// Resolve any pending texture references now that all elements are created
		textureRegistry.resolvePendingReferences();
		
		// The actual rendering is handled in the PixiRenderer.render method
	},
};

export class PixiRenderer extends Renderer<
	PixiNode | PIXI.Application,
	undefined,
	PixiContainer | PIXI.Application
> {
	constructor() {
		super(adapter);
	}

	render(
		children: any,
		root: PixiContainer | PIXI.Application,
		ctx?: any,
	):
		| Promise<ElementValue<PixiNode | PIXI.Application>>
		| ElementValue<PixiNode | PIXI.Application> {
		// Validate root type
		const isApp =
			"stage" in root &&
			"renderer" in root &&
			root.stage instanceof PIXI.Container;
		const isContainer = root instanceof PIXI.Container;

		if (!isApp && !isContainer) {
			throw new TypeError(
				`Pixi render root must be a Container or Application. Received: ${String(root)}`,
			);
		}

		// Let the adapter handle both Applications and Containers
		return super.render(children, root, ctx);
	}
}

export const renderer = new PixiRenderer();

// Import DOM and HTML renderers for bridging
import {renderer as domRenderer} from "@b9g/crank/dom";
import {renderer as htmlRenderer} from "@b9g/crank/html";

// PixiApplication bridge component (DOM → PIXI)
export function* PixiApplication({
	width = 800,
	height = 600,
	backgroundColor = 0x1099bb,
	children,
	...props
}: {
	width?: number;
	height?: number;
	backgroundColor?: number;
	children?: any;
	[key: string]: any;
}) {
	// Create PIXI application
	const pixiApp = new PIXI.Application();
	let isInitialized = false;

	// Initialize asynchronously
	pixiApp
		.init({
			width,
			height,
			backgroundColor,
			...props,
		})
		.then(() => {
			isInitialized = true;
		});

	// Store app reference for cleanup
	const canvas = pixiApp.canvas;
	(canvas as any)._pixiApp = pixiApp;

	try {
		while (true) {
			// Only render children after PIXI is initialized
			if (isInitialized && children) {
				renderer.render(children, pixiApp);
			}

			// Yield canvas for DOM insertion
			yield canvas;
		}
	} finally {
		// Cleanup when component unmounts
		pixiApp.destroy(true, true);
	}
}

// HTMLText bridge component (PIXI → HTML)
export function* HTMLText({
	children,
	x = 0,
	y = 0,
	anchor,
	style = {},
	...props
}: {
	children?: any;
	x?: number;
	y?: number;
	anchor?: {x?: number; y?: number};
	style?: Record<string, any>;
	[key: string]: any;
}) {
	// Create HTMLText object
	const htmlText = new PIXI.HTMLText({
		text: "",
		style: {
			...style,
			...props,
		},
	});

	// Apply positioning
	htmlText.x = x;
	htmlText.y = y;
	if (anchor) {
		htmlText.anchor.set(anchor.x ?? 0.5, anchor.y ?? 0.5);
	}

	try {
		while (true) {
			// Render children with HTML renderer to get HTML string
			if (children) {
				const htmlString = htmlRenderer.render(children);
				htmlText.text = htmlString;
			} else {
				htmlText.text = "";
			}

			yield htmlText;
		}
	} finally {
		// Cleanup if needed
		htmlText.destroy();
	}
}

// Export common Pixi types for convenience
export {PIXI};
export type {PixiNode, PixiContainer};
