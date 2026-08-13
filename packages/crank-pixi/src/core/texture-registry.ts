/**
 * TextureRegistry - Singleton registry for managing textures with SVG-style url(#id) references
 *
 * Provides:
 * - Centralized texture storage by ID
 * - Reference counting for automatic cleanup
 * - Lazy loading and preloading support
 * - Development debugging tools
 */

import * as PIXI from "pixi.js";

export interface TextureRegistryEntry {
	texture: PIXI.Texture;
	refCount: number;
	source: string | HTMLImageElement | HTMLCanvasElement | undefined;
	metadata?: Record<string, any>;
}

export interface PendingTextureReference {
	textureId: string;
	node: any; // PIXI object that needs the texture
	property: string; // property name to set (e.g., 'texture', 'textures')
	resolver: (node: any, texture: PIXI.Texture) => void; // function to apply the texture
}

export interface TextureLoadEventDetail {
	textureId: string;
	texture?: PIXI.Texture;
	error?: Error;
	progress?: number;
}

export class TextureLoadEvent extends CustomEvent<TextureLoadEventDetail> {
	readonly textureId: string;
	readonly texture: PIXI.Texture | undefined;
	readonly error: Error | undefined;
	readonly progress: number | undefined;

	constructor(type: string, detail: TextureLoadEventDetail) {
		super(type, {detail});
		this.textureId = detail.textureId;
		this.texture = detail.texture;
		this.error = detail.error;
		this.progress = detail.progress;
	}
}

export type TextureEventHandler = (event: TextureLoadEvent) => void;

export class TextureRegistry extends EventTarget {
	private static instance: TextureRegistry | null = null;
	private textures = new Map<string, TextureRegistryEntry>();
	private loadingPromises = new Map<string, Promise<PIXI.Texture>>();
	private pendingReferences = new Array<PendingTextureReference>();

	private constructor() {
		super();
	}

	static getInstance(): TextureRegistry {
		if (!TextureRegistry.instance) {
			TextureRegistry.instance = new TextureRegistry();
		}
		return TextureRegistry.instance;
	}

	/**
	 * Register a texture with the given ID
	 */
	register(
		id: string,
		texture: PIXI.Texture,
		source?: string | HTMLImageElement | HTMLCanvasElement,
		metadata?: Record<string, any>,
	): void {
		if (this.textures.has(id)) {
			console.warn(
				`Texture with ID "${id}" already exists. Replacing existing texture.`,
			);
			this.unregister(id);
		}

		this.textures.set(id, {
			texture,
			refCount: 0,
			source: source || undefined,
			metadata: metadata || {},
		});

		// Fire load event
		this.dispatchEvent(new TextureLoadEvent("load", {textureId: id, texture}));

		// A node may have referenced this ID before the texture arrived
		this.resolveReferencesFor(id);
	}

	/**
	 * Register a texture from a source path - loads asynchronously
	 */
	async registerFromSource(
		id: string,
		source: string,
		metadata?: Record<string, any>
	): Promise<PIXI.Texture> {
		if (this.textures.has(id)) {
			console.warn(
				`Texture with ID "${id}" already exists. Replacing existing texture.`,
			);
			this.unregister(id);
		}

		// Check if we're already loading this texture
		const existingPromise = this.loadingPromises.get(id);
		if (existingPromise) {
			return existingPromise;
		}


		// Create loading promise
		let loadingPromise: Promise<PIXI.Texture>;

		// unregister() drops the pending promise. A load that is no longer the
		// current one for this ID must not write its result to the registry.
		const isCurrent = () => this.loadingPromises.get(id) === loadingPromise;

		loadingPromise = this.loadTexture(source)
			.then((texture) => {
				if (!isCurrent()) {
					return texture;
				}

				this.textures.set(id, {
					texture,
					refCount: 0,
					source,
					metadata: metadata || {},
				});
				this.loadingPromises.delete(id);

				// Fire load event
				this.dispatchEvent(
					new TextureLoadEvent("load", {textureId: id, texture}),
				);

				// A node may have referenced this ID before the load finished
				this.resolveReferencesFor(id);

				return texture;
			})
			.catch((error) => {
				console.error(
					`Failed to load texture "${id}" from source "${source}":`,
					error,
				);

				// Return empty texture as fallback
				const emptyTexture = PIXI.Texture.EMPTY;
				if (!isCurrent()) {
					return emptyTexture;
				}

				this.loadingPromises.delete(id);

				// Fire error event
				this.dispatchEvent(
					new TextureLoadEvent("error", {textureId: id, error}),
				);

				this.textures.set(id, {
					texture: emptyTexture,
					refCount: 0,
					source: source,
					metadata: {...metadata, error: error.message},
				});

				// Give the waiting nodes the fallback, so no reference stays pending
				this.resolveReferencesFor(id);

				return emptyTexture;
			});

		this.loadingPromises.set(id, loadingPromise);
		return loadingPromise;
	}

	/**
	 * Get a texture by ID and increment its reference count
	 */
	acquire(id: string): PIXI.Texture | null {
		const entry = this.textures.get(id);
		if (!entry) {
			console.warn(`Texture with ID "${id}" not found in registry`);
			return null;
		}

		entry.refCount++;
		return entry.texture;
	}

	/**
	 * Release a texture reference and decrement its reference count
	 */
	release(id: string): void {
		const entry = this.textures.get(id);
		if (!entry) {
			console.warn(`Texture with ID "${id}" not found in registry`);
			return;
		}

		entry.refCount = Math.max(0, entry.refCount - 1);

		// Auto-cleanup if no references remain (optional behavior)
		if (entry.refCount === 0 && this.shouldAutoCleanup(id)) {
			this.unregister(id);
		}
	}

	/**
	 * Check if a texture exists in the registry
	 */
	has(id: string): boolean {
		return this.textures.has(id);
	}

	/**
	 * Get texture info without acquiring a reference
	 */
	getInfo(id: string): TextureRegistryEntry | null {
		return this.textures.get(id) || null;
	}

	/**
	 * Unregister a texture and clean up its resources
	 */
	unregister(id: string): void {
		const entry = this.textures.get(id);
		if (entry) {
			// Don't destroy PIXI.Texture.EMPTY or shared textures
			if (entry.texture !== PIXI.Texture.EMPTY && entry.refCount === 0) {
				try {
					entry.texture.destroy(true);
				} catch (error) {
					console.warn(`Error destroying texture "${id}":`, error);
				}
			}
			this.textures.delete(id);
		}

		// Cancel any pending loads
		const loadingPromise = this.loadingPromises.get(id);
		if (loadingPromise) {
			this.loadingPromises.delete(id);
		}

	}

	/**
	 * Clear all textures from the registry
	 */
	clear(): void {
		// Destroy all textures
		for (const [id, entry] of this.textures) {
			if (entry.texture !== PIXI.Texture.EMPTY) {
				try {
					entry.texture.destroy(true);
				} catch (error) {
					console.warn(`Error destroying texture "${id}":`, error);
				}
			}
		}

		this.textures.clear();
		this.loadingPromises.clear();
		this.pendingReferences = [];
	}

	/**
	 * Get all registered texture IDs
	 */
	getIds(): string[] {
		return Array.from(this.textures.keys());
	}

	/**
	 * Get debug information about the registry
	 */
	getDebugInfo(): Record<string, any> {
		const info: Record<string, any> = {};

		for (const [id, entry] of this.textures) {
			info[id] = {
				refCount: entry.refCount,
				source: entry.source,
				width: entry.texture.width,
				height: entry.texture.height,
				metadata: entry.metadata,
			};
		}

		return {
			totalTextures: this.textures.size,
			loadingTextures: this.loadingPromises.size,
			textures: info,
		};
	}

	/**
	 * Private helper to load a texture from a source
	 */
	private async loadTexture(source: string): Promise<PIXI.Texture> {
		// Texture.from() only reads the Assets cache. Assets.load() fetches the
		// source, so a texture element with a src works on the first render.
		// A source with no file extension, for example an object URL, gives
		// Assets no parser to select, so name the texture parser for it.
		const hasExtension = /\.[a-z0-9]+(\?|#|$)/i.test(source);
		const asset =
			hasExtension || source.startsWith("data:")
				? await PIXI.Assets.load<PIXI.Texture>(source)
				: await PIXI.Assets.load<PIXI.Texture>({
						src: source,
						loadParser: "loadTextures",
					});

		if (!(asset instanceof PIXI.Texture)) {
			throw new Error(`Source "${source}" did not load as a texture`);
		}

		return asset;
	}

	/**
	 * Apply a texture to the pending references that name the given ID
	 */
	private resolveReferencesFor(id: string): void {
		const entry = this.textures.get(id);
		if (!entry || this.pendingReferences.length === 0) {
			return;
		}

		const unresolved = new Array<PendingTextureReference>();
		for (const ref of this.pendingReferences) {
			if (ref.textureId !== id) {
				unresolved.push(ref);
				continue;
			}

			this.applyReference(ref, entry);
		}

		this.pendingReferences = unresolved;
	}

	/**
	 * Give one waiting node its texture and count the new reference
	 */
	private applyReference(
		ref: PendingTextureReference,
		entry: TextureRegistryEntry,
	): boolean {
		try {
			// A deferred reference counts like an acquire(). Without this the
			// entry looks unused, and unregister() destroys a texture in use.
			entry.refCount++;
			ref.resolver(ref.node, entry.texture);
			return true;
		} catch (error) {
			entry.refCount--;
			console.warn(
				`Failed to resolve texture reference "${ref.textureId}":`,
				error,
			);
			return false;
		}
	}

	/**
	 * Determine if a texture should be auto-cleaned up when refCount reaches 0
	 */
	private shouldAutoCleanup(id: string): boolean {
		// For now, don't auto-cleanup - let developers manage lifecycle explicitly
		// This could be made configurable in the future
		return false;
	}

	/**
	 * Add a pending texture reference to be resolved later
	 */
	addPendingReference(reference: PendingTextureReference): void {
		this.pendingReferences.push(reference);
	}

	/**
	 * Resolve all pending texture references and update nodes
	 * Called during finalize() phase when all textures should be registered
	 */
	resolvePendingReferences(): void {
		const resolved = new Array<PendingTextureReference>();
		const unresolved = new Array<PendingTextureReference>();

		for (const ref of this.pendingReferences) {
			const entry = this.textures.get(ref.textureId);
			if (entry) {
				// Texture is now available, apply it
				if (this.applyReference(ref, entry)) {
					resolved.push(ref);
				} else {
					unresolved.push(ref);
				}
			} else {
				unresolved.push(ref);
			}
		}

		// Keep only unresolved references for next time
		this.pendingReferences = unresolved;

		// Warn about still-unresolved references
		if (unresolved.length > 0) {
			const missingIds = [...new Set(unresolved.map(ref => ref.textureId))];
			console.warn(
				`Unresolved texture references: ${missingIds.join(', ')}. ` +
				`Available textures: ${this.getIds().join(', ')}`
			);
		}
	}

	/**
	 * Clear all pending references (used in tests and cleanup)
	 */
	clearPendingReferences(): void {
		this.pendingReferences = [];
	}

	/**
	 * Get count of pending references (for debugging/testing)
	 */
	getPendingReferenceCount(): number {
		return this.pendingReferences.length;
	}

}

// Convenience function to get the singleton instance
export const textureRegistry = TextureRegistry.getInstance();

// Development helper to expose registry in global scope for debugging
if (
	typeof window !== "undefined" &&
	typeof process !== "undefined" &&
	process.env.NODE_ENV === "development"
) {
	(window as any).__PIXI_TEXTURE_REGISTRY__ = textureRegistry;
}
