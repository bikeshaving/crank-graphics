/**
 * AssetRegistry - Universal asset management for Three.js with SVG-style url(#id) references
 * 
 * Supports:
 * - Textures (*.jpg, *.png, *.webp, etc.)
 * - 3D Models (*.gltf, *.glb, *.obj, etc.)  
 * - Audio files (*.mp3, *.wav, etc.)
 * - Custom asset types
 * - DOM-like onload/onerror events
 * - Reference counting and cleanup
 * - Deferred resolution for forward references
 */

import * as THREE from "three";

export type AssetType = "texture" | "gltf" | "glb" | "obj" | "audio" | "custom";

export interface AssetRegistryEntry {
	asset: any; // The loaded asset (THREE.Texture, GLTF, etc.)
	type: AssetType;
	refCount: number;
	source: string | undefined;
	metadata?: Record<string, any>;
	isLoading?: boolean;
	loadPromise?: Promise<any>;
}

export interface PendingAssetReference {
	assetId: string;
	node: any; // Three.js object that needs the asset
	property: string; // property name to set (e.g., 'map', 'scene', 'userData.sound')
	resolver: (node: any, asset: any) => void; // function to apply the asset
}

export interface AssetLoadEvent {
	type: "load" | "error" | "progress";
	assetId: string;
	asset?: any;
	error?: Error;
	progress?: number;
}

export type AssetEventHandler = (event: AssetLoadEvent) => void;

export class AssetRegistry {
	private static instance: AssetRegistry | null = null;
	private assets = new Map<string, AssetRegistryEntry>();
	private loadingPromises = new Map<string, Promise<any>>();
	private pendingReferences = new Array<PendingAssetReference>();
	private eventHandlers = new Map<string, AssetEventHandler[]>();

	// Loaders for different asset types
	private textureLoader = new THREE.TextureLoader();
	private loaders: Record<AssetType, any> = {
		texture: this.textureLoader,
		gltf: null, // Will be GLTFLoader when available
		glb: null,  // Will be GLTFLoader when available
		obj: null,  // Will be OBJLoader when available
		audio: null, // Will be AudioLoader when available
		custom: null // Custom loader function
	};

	private constructor() {}

	static getInstance(): AssetRegistry {
		if (!AssetRegistry.instance) {
			AssetRegistry.instance = new AssetRegistry();
		}
		return AssetRegistry.instance;
	}

	/**
	 * Register an asset with the given ID
	 */
	register(
		id: string,
		asset: any,
		type: AssetType = "custom",
		source?: string,
		metadata?: Record<string, any>,
	): void {
		if (this.assets.has(id)) {
			console.warn(`Asset with ID "${id}" already exists. Replacing existing asset.`);
			this.unregister(id);
		}

		this.assets.set(id, {
			asset,
			type,
			refCount: 0,
			source: source || undefined,
			metadata: metadata || {},
		});

		// Fire load event
		this.dispatchEvent({
			type: "load",
			assetId: id,
			asset
		});
	}

	/**
	 * Register an asset from a source path - loads asynchronously with proper loader
	 */
	async registerFromSource(
		id: string,
		source: string,
		type?: AssetType,
		metadata?: Record<string, any>,
		onLoad?: AssetEventHandler,
		onError?: AssetEventHandler
	): Promise<any> {
		if (this.assets.has(id)) {
			console.warn(`Asset with ID "${id}" already exists. Replacing existing asset.`);
			this.unregister(id);
		}

		// Check if we're already loading this asset
		const existingPromise = this.loadingPromises.get(id);
		if (existingPromise) {
			return existingPromise;
		}

		// Auto-detect asset type from file extension
		const detectedType = type || this.detectAssetType(source);

		// Add event handlers if provided
		if (onLoad) this.addEventListener(id, onLoad);
		if (onError) this.addEventListener(id, onError);

		// Create loading promise
		const loadingPromise = this.loadAsset(source, detectedType)
			.then((asset) => {
				this.assets.set(id, {
					asset,
					type: detectedType,
					refCount: 0,
					source,
					metadata: metadata || {},
				});
				this.loadingPromises.delete(id);

				// Fire load event
				this.dispatchEvent({
					type: "load",
					assetId: id,
					asset
				});

				return asset;
			})
			.catch((error) => {
				console.error(`Failed to load asset "${id}" from source "${source}":`, error);
				this.loadingPromises.delete(id);

				// Fire error event
				this.dispatchEvent({
					type: "error",
					assetId: id,
					error
				});

				// Return fallback asset based on type
				const fallbackAsset = this.createFallbackAsset(detectedType);
				this.assets.set(id, {
					asset: fallbackAsset,
					type: detectedType,
					refCount: 0,
					source: source,
					metadata: {...metadata, error: error.message},
				});
				return fallbackAsset;
			});

		this.loadingPromises.set(id, loadingPromise);
		return loadingPromise;
	}

	/**
	 * Get an asset by ID and increment its reference count
	 */
	acquire(id: string): any | null {
		const entry = this.assets.get(id);
		if (!entry) {
			console.warn(`Asset with ID "${id}" not found in registry`);
			return null;
		}

		entry.refCount++;
		return entry.asset;
	}

	/**
	 * Release an asset reference and decrement its reference count
	 */
	release(id: string): void {
		const entry = this.assets.get(id);
		if (!entry) {
			console.warn(`Asset with ID "${id}" not found in registry`);
			return;
		}

		entry.refCount = Math.max(0, entry.refCount - 1);

		// Auto-cleanup if no references remain (optional behavior)
		if (entry.refCount === 0 && this.shouldAutoCleanup(id)) {
			this.unregister(id);
		}
	}

	/**
	 * Check if an asset exists in the registry
	 */
	has(id: string): boolean {
		return this.assets.has(id);
	}

	/**
	 * Get asset info without acquiring a reference
	 */
	getInfo(id: string): AssetRegistryEntry | null {
		return this.assets.get(id) || null;
	}

	/**
	 * Unregister an asset and clean up its resources
	 */
	unregister(id: string): void {
		const entry = this.assets.get(id);
		if (entry) {
			// Dispose asset based on type
			this.disposeAsset(entry.asset, entry.type);
			this.assets.delete(id);
		}

		// Cancel any pending loads
		const loadingPromise = this.loadingPromises.get(id);
		if (loadingPromise) {
			this.loadingPromises.delete(id);
		}

		// Remove event handlers
		this.eventHandlers.delete(id);
	}

	/**
	 * Add event listener for asset loading events
	 */
	addEventListener(assetId: string, handler: AssetEventHandler): void {
		const handlers = this.eventHandlers.get(assetId) || [];
		handlers.push(handler);
		this.eventHandlers.set(assetId, handlers);
	}

	/**
	 * Remove event listener
	 */
	removeEventListener(assetId: string, handler: AssetEventHandler): void {
		const handlers = this.eventHandlers.get(assetId);
		if (handlers) {
			const index = handlers.indexOf(handler);
			if (index !== -1) {
				handlers.splice(index, 1);
			}
		}
	}

	/**
	 * Dispatch asset event to registered handlers
	 */
	private dispatchEvent(event: AssetLoadEvent): void {
		const handlers = this.eventHandlers.get(event.assetId);
		if (handlers) {
			handlers.forEach(handler => {
				try {
					handler(event);
				} catch (error) {
					console.error('Asset event handler error:', error);
				}
			});
		}
	}

	/**
	 * Auto-detect asset type from file extension
	 */
	private detectAssetType(source: string): AssetType {
		const ext = source.toLowerCase().split('.').pop() || '';
		
		switch (ext) {
			case 'jpg':
			case 'jpeg':
			case 'png':
			case 'webp':
			case 'gif':
			case 'bmp':
			case 'tga':
				return 'texture';
			case 'gltf':
				return 'gltf';
			case 'glb':
				return 'glb';
			case 'obj':
				return 'obj';
			case 'mp3':
			case 'wav':
			case 'ogg':
				return 'audio';
			default:
				return 'custom';
		}
	}

	/**
	 * Load asset using appropriate loader
	 */
	private async loadAsset(source: string, type: AssetType): Promise<any> {
		const loader = this.loaders[type];
		
		if (!loader) {
			throw new Error(`No loader available for asset type: ${type}`);
		}

		return new Promise((resolve, reject) => {
			try {
				if (type === 'texture') {
					loader.load(source, resolve, undefined, reject);
				} else {
					// For other asset types, assume similar loader interface
					// This would need to be customized based on actual loader APIs
					loader.load(source, resolve, undefined, reject);
				}
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Create fallback asset for failed loads
	 */
	private createFallbackAsset(type: AssetType): any {
		switch (type) {
			case 'texture':
				return new THREE.Texture();
			case 'gltf':
			case 'glb':
			case 'obj':
				return new THREE.Group(); // Empty group as fallback
			case 'audio':
				return null; // No meaningful fallback for audio
			default:
				return null;
		}
	}

	/**
	 * Dispose asset based on type
	 */
	private disposeAsset(asset: any, type: AssetType): void {
		try {
			switch (type) {
				case 'texture':
					if (asset && typeof asset.dispose === 'function') {
						asset.dispose();
					}
					break;
				case 'gltf':
				case 'glb':
				case 'obj':
					// Dispose geometries and materials recursively
					if (asset && asset.traverse) {
						asset.traverse((child: any) => {
							if (child.geometry) child.geometry.dispose();
							if (child.material) {
								if (Array.isArray(child.material)) {
									child.material.forEach((mat: any) => mat.dispose());
								} else {
									child.material.dispose();
								}
							}
						});
					}
					break;
				case 'audio':
					// Audio cleanup would depend on the audio implementation
					break;
			}
		} catch (error) {
			console.warn(`Error disposing ${type} asset:`, error);
		}
	}

	/**
	 * Determine if an asset should be auto-cleaned up when refCount reaches 0
	 */
	private shouldAutoCleanup(id: string): boolean {
		// For now, don't auto-cleanup - let developers manage lifecycle explicitly
		return false;
	}

	/**
	 * Add a pending asset reference to be resolved later
	 */
	addPendingReference(reference: PendingAssetReference): void {
		this.pendingReferences.push(reference);
	}

	/**
	 * Resolve all pending asset references
	 */
	resolvePendingReferences(): void {
		const resolved = new Array<PendingAssetReference>();
		const unresolved = new Array<PendingAssetReference>();

		for (const ref of this.pendingReferences) {
			const entry = this.assets.get(ref.assetId);
			if (entry) {
				try {
					ref.resolver(ref.node, entry.asset);
					resolved.push(ref);
				} catch (error) {
					console.warn(`Failed to resolve asset reference "${ref.assetId}":`, error);
					unresolved.push(ref);
				}
			} else {
				unresolved.push(ref);
			}
		}

		this.pendingReferences = unresolved;

		if (unresolved.length > 0) {
			const missingIds = [...new Set(unresolved.map(ref => ref.assetId))];
			console.warn(`Unresolved asset references: ${missingIds.join(', ')}`);
		}
	}

	/**
	 * Clear all assets from the registry
	 */
	clear(): void {
		for (const [id, entry] of this.assets) {
			this.disposeAsset(entry.asset, entry.type);
		}

		this.assets.clear();
		this.loadingPromises.clear();
		this.pendingReferences = [];
		this.eventHandlers.clear();
	}

	/**
	 * Get all registered asset IDs
	 */
	getIds(): string[] {
		return Array.from(this.assets.keys());
	}

	/**
	 * Get debug information about the registry
	 */
	getDebugInfo(): Record<string, any> {
		const info: Record<string, any> = {};

		for (const [id, entry] of this.assets) {
			info[id] = {
				type: entry.type,
				refCount: entry.refCount,
				source: entry.source,
				metadata: entry.metadata,
				hasEventHandlers: this.eventHandlers.has(id)
			};
		}

		return {
			totalAssets: this.assets.size,
			loadingAssets: this.loadingPromises.size,
			pendingReferences: this.pendingReferences.length,
			assets: info,
		};
	}
}

// Convenience function to get the singleton instance
export const assetRegistry = AssetRegistry.getInstance();

// Development helper
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
	(window as any).__THREE_ASSET_REGISTRY__ = assetRegistry;
}

// Backward compatibility - export as textureRegistry
export const textureRegistry = assetRegistry;