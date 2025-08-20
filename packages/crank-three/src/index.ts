import {
	Portal,
	Renderer,
	type ElementValue,
	type RenderAdapter,
} from "@b9g/crank";
import * as THREE from "three";

// Three.js object types we'll support
type ThreeNode = any; // Three.js Object3D base
type ThreeContainer = any; // Three.js Scene or Group type

// Import auto-generated mappings
import {THREE_TAG_MAP} from "./generated/tag-mapping";
import {PROPERTY_APPLIERS} from "./generated/property-appliers";
import {createThreeObject} from "./generated/constructors";

// Import texture registry and URL parsing
import {textureRegistry} from "./core/texture-registry";
import {
	parseTextureUrl,
	isValidTextureId,
	normalizeTextureId,
} from "./core/texture-url-parser";

// Common property setters for Three.js objects
function applyCommonProps(node: ThreeNode, props: Record<string, any>): void {
	// Position properties
	if (props.x !== undefined || props.y !== undefined || props.z !== undefined) {
		if (node.position) {
			if (props.x !== undefined) node.position.x = props.x;
			if (props.y !== undefined) node.position.y = props.y;
			if (props.z !== undefined) node.position.z = props.z;
		}
	}

	// Rotation properties
	if (props.rotationX !== undefined || props.rotationY !== undefined || props.rotationZ !== undefined) {
		if (node.rotation) {
			if (props.rotationX !== undefined) node.rotation.x = props.rotationX;
			if (props.rotationY !== undefined) node.rotation.y = props.rotationY;
			if (props.rotationZ !== undefined) node.rotation.z = props.rotationZ;
		}
	}
	
	// Scale properties
	if (props.scaleX !== undefined || props.scaleY !== undefined || props.scaleZ !== undefined) {
		if (node.scale) {
			if (props.scaleX !== undefined) node.scale.x = props.scaleX;
			if (props.scaleY !== undefined) node.scale.y = props.scaleY;
			if (props.scaleZ !== undefined) node.scale.z = props.scaleZ;
		}
	}
	
	// Scale uniform property
	if (props.scale !== undefined && node.scale && typeof props.scale === "number") {
		node.scale.set(props.scale, props.scale, props.scale);
	}

	// Visibility and transformation
	if (props.visible !== undefined && "visible" in node) {
		node.visible = props.visible;
	}
	
	// Material properties for meshes
	if (props.material !== undefined && "material" in node) {
		node.material = props.material;
	}
	
	// Geometry properties for meshes
	if (props.geometry !== undefined && "geometry" in node) {
		node.geometry = props.geometry;
	}
}

// Import symbols for internal communication
import {
	OBJECT_PARENT,
	DEFERRED_CHILDREN,
	IS_TEXTURE_DEFINITION,
	TEXTURE_ID,
	RESOLVING_TEXTURE,
} from "./core/symbols";

// Enhanced texture resolution with URL reference support
function resolveTexture(textureRef: any, node?: any, property?: string): THREE.Texture {
	if (!textureRef) return new THREE.Texture();

	if (textureRef instanceof THREE.Texture) {
		return textureRef;
	}

	if (typeof textureRef === "string") {
		// Check if it's a URL reference (url(#id) or #id)
		const parsed = parseTextureUrl(textureRef);
		if (parsed) {
			const texture = textureRegistry.acquire(parsed.id);
			if (texture) {
				return texture;
			} else if (node && property) {
				// Defer resolution - texture may be defined later in the tree
				textureRegistry.addPendingReference({
					textureId: parsed.id,
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
				return new THREE.Texture(); // Temporary fallback
			} else {
				console.warn(
					`Texture reference "${textureRef}" not found in registry. Available textures: ${textureRegistry.getIds().join(", ")}`,
				);
				return new THREE.Texture();
			}
		}

		// Direct texture path - load it
		const loader = new THREE.TextureLoader();
		return loader.load(textureRef);
	}

	return new THREE.Texture();
}

// Texture registration from props (synchronous container creation, async loading)
function createTextureFromProps(props: Record<string, any>): THREE.Group {
	const group = new THREE.Group();
	group.visible = false;
	(group as any)[IS_TEXTURE_DEFINITION] = true;

	// Validate required props
	if (!props.id) {
		console.error('Texture element requires an "id" prop');
		return group;
	}

	// Normalize the texture ID
	let textureId: string;
	try {
		textureId = isValidTextureId(props.id)
			? props.id
			: normalizeTextureId(props.id);
	} catch (error) {
		console.error(`Invalid texture ID "${props.id}":`, error);
		return group;
	}

	// Store the texture ID on the group for cleanup
	(group as any)[TEXTURE_ID] = textureId;

	// Register texture based on provided props
	if (props.src) {
		// Load from source path asynchronously
		textureRegistry
			.registerFromSource(textureId, props.src, {
				originalId: props.id,
				...props.metadata,
			})
			.then(() => {
				console.log(
					`Registered texture "${textureId}" from source: ${props.src}`,
				);
			})
			.catch((error) => {
				console.error(`Failed to register texture "${textureId}":`, error);
			});
	} else if (props.texture && props.texture instanceof THREE.Texture) {
		// Register existing texture object synchronously
		textureRegistry.register(textureId, props.texture, undefined, {
			originalId: props.id,
			...props.metadata,
		});
		console.log(`Registered texture "${textureId}" from THREE.Texture object`);
	} else {
		console.warn(`Texture element "${textureId}" has no src or texture prop`);
	}

	return group;
}

export const adapter: Partial<
	RenderAdapter<
		ThreeNode | THREE.WebGLRenderer,
		undefined,
		ThreeContainer | THREE.Scene
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
	}): ThreeNode {
		if (typeof tag !== "string") {
			throw new Error(`Unknown tag: ${tagName} (tag: ${String(tag)})`);
		}

		let node: ThreeNode;

		// Handle special texture definition element
		if (tag === "texture") {
			// Texture elements are virtual - they register textures but don't create display objects
			return createTextureFromProps(props);
		}

		// Use the comprehensive tag mapping
		const ThreeClass = THREE_TAG_MAP[tag as keyof typeof THREE_TAG_MAP];
		if (!ThreeClass) {
			const supportedTags = Object.keys(THREE_TAG_MAP)
				.filter((t) => t !== "texture")
				.join(", ");
			throw new Error(
				`Unknown Three.js tag: ${tag}. Supported tags: ${supportedTags}`,
			);
		}

		// Create the appropriate Three.js object with intelligent constructor arguments
		node = createThreeObject(tag as any, ThreeClass, props);

		return node;
	},

	patch({
		node,
		tagName,
		props,
		oldProps,
	}: {
		node: ThreeNode;
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
			// Fallback for unknown types
			for (const [key, value] of Object.entries(props)) {
				if (value !== undefined && key in node) {
					try {
						node[key] = value;
					} catch (error) {
						console.warn(`Failed to set property ${key} on ${tagName}:`, error);
					}
				}
			}
		}

		// Handle event listeners (Three.js uses addEventListener/removeEventListener)
		for (const [key, value] of Object.entries(props)) {
			if (key.startsWith("on") && typeof value === "function") {
				const eventName = key.slice(2).toLowerCase();
				const oldValue = oldProps?.[key];

				if (oldValue && typeof oldValue === "function") {
					node.removeEventListener?.(eventName, oldValue);
				}

				if (value) {
					node.addEventListener?.(eventName, value);
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
		node: ThreeNode | THREE.WebGLRenderer;
		props: Record<string, any>;
		children: Array<ThreeNode>;
	}): void {
		// Handle WebGLRenderer by using a scene (we'll need to manage this externally)
		if (node instanceof THREE.WebGLRenderer) {
			// For renderer, children should be scenes that get rendered
			// This is a special case and should be handled by the ThreeRenderer class
			return;
		}

		if (tag === Portal) {
			// For Portal, we need to manually add children to the portal root
			if (node instanceof THREE.Object3D) {
				for (let i = 0; i < children.length; i++) {
					const child = children[i];
					if (child && child instanceof THREE.Object3D && !node.children.includes(child)) {
						node.add(child);
					}
				}
			}
			return;
		}

		// Only Object3D can have children in Three.js
		if (node instanceof THREE.Object3D) {
			// Remove existing children that aren't in the new children array
			const toRemove: ThreeNode[] = [];
			for (const existingChild of node.children) {
				if (!children.includes(existingChild)) {
					toRemove.push(existingChild);
				}
			}

			for (const child of toRemove) {
				node.remove(child);
			}

			// Add/reorder children
			for (let i = 0; i < children.length; i++) {
				const child = children[i];

				if (child instanceof THREE.Object3D) {
					// Check if child is already in this object
					const currentIndex = node.children.indexOf(child);

					if (currentIndex === -1) {
						// Child not in object, add it
						node.add(child);
					}
					// Note: Three.js doesn't have explicit child ordering like PIXI
					// The order is determined by the order of add() calls
				}
			}
		}
	},

	remove({
		node,
		parentNode,
	}: {
		node: ThreeNode;
		parentNode: ThreeNode | THREE.WebGLRenderer;
		isNested: boolean;
	}): void {
		// Handle texture definition cleanup
		if ((node as any)[IS_TEXTURE_DEFINITION] && (node as any)[TEXTURE_ID]) {
			const textureId = (node as any)[TEXTURE_ID];
			console.log(`Unregistering texture "${textureId}"`);
			textureRegistry.unregister(textureId);
		}

		// Handle WebGLRenderer parents (special case)
		if (parentNode instanceof THREE.WebGLRenderer) {
			// Renderer doesn't directly contain objects, this should be handled externally
			return;
		}

		if (parentNode instanceof THREE.Object3D && node instanceof THREE.Object3D && node.parent === parentNode) {
			parentNode.remove(node);
		}
	},

	text({
		value,
	}: {
		value: string;
		scope: undefined;
		oldNode: ThreeNode | undefined;
		hydrationNodes: Array<ThreeNode> | undefined;
	}): ThreeNode {
		// Three.js doesn't have built-in text objects like PIXI
		// We'll create an empty Group as a placeholder
		// Real text rendering would require a text geometry or sprite
		const group = new THREE.Group();
		(group as any).textContent = value;
		return group;
	},

	read(value: ElementValue<ThreeNode>): ThreeNode | Array<ThreeNode> | undefined {
		// Return the Three.js object(s) directly
		return value;
	},

	finalize(root: ThreeContainer): void {
		// Resolve any pending texture references now that all elements are created
		textureRegistry.resolvePendingReferences();
		
		// The actual rendering is handled in the ThreeRenderer.render method
	},
};

export class ThreeRenderer extends Renderer<
	ThreeNode | THREE.WebGLRenderer,
	undefined,
	ThreeContainer | THREE.Scene
> {
	constructor() {
		super(adapter);
	}

	render(
		children: any,
		root: ThreeContainer | THREE.Scene,
		ctx?: any,
	):
		| Promise<ElementValue<ThreeNode | THREE.WebGLRenderer>>
		| ElementValue<ThreeNode | THREE.WebGLRenderer> {
		// Validate root type
		const isScene = root instanceof THREE.Scene;
		const isObject3D = root instanceof THREE.Object3D;

		if (!isScene && !isObject3D) {
			throw new TypeError(
				`Three.js render root must be a Scene or Object3D. Received: ${String(root)}`,
			);
		}

		// Let the adapter handle both Scenes and Object3D containers
		return super.render(children, root, ctx);
	}
}

export const renderer = new ThreeRenderer();

// ThreeCanvas bridge component (DOM → Three.js)
export function* ThreeCanvas({
	width = 800,
	height = 600,
	background = 0x000000,
	children,
	antialias = true,
	...props
}: {
	width?: number;
	height?: number;
	background?: number;
	children?: any;
	antialias?: boolean;
	[key: string]: any;
}) {
	// Create Three.js renderer and scene
	const threeRenderer = new THREE.WebGLRenderer({ antialias, ...props });
	const scene = new THREE.Scene();
	
	// Set up renderer
	threeRenderer.setSize(width, height);
	threeRenderer.setClearColor(background);
	
	// Create a default camera if none provided
	const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
	camera.position.z = 5;

	// Store renderer reference for cleanup
	const canvas = threeRenderer.domElement;
	(canvas as any)._threeRenderer = threeRenderer;
	(canvas as any)._threeScene = scene;
	(canvas as any)._threeCamera = camera;

	try {
		while (true) {
			// Render children into the scene
			if (children) {
				renderer.render(children, scene);
			}

			// Render the scene
			threeRenderer.render(scene, camera);

			// Yield canvas for DOM insertion
			yield canvas;
		}
	} finally {
		// Cleanup when component unmounts
		threeRenderer.dispose();
	}
}

// Export common Three.js types for convenience
export {THREE};
export type {ThreeNode, ThreeContainer};