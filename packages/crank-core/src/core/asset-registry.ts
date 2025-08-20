/**
 * Generic AssetRegistry - Framework-agnostic asset management
 * 
 * Can be extended for Pixi.js, Three.js, or any other renderer
 * Provides common patterns: reference counting, deferred resolution, events
 */

export interface AssetRegistryEntry<TAsset = any> {
	asset: TAsset;
	type: string;
	refCount: number;
	source?: string;
	metadata?: Record<string, any>;
}

export interface PendingAssetReference<TAsset = any> {
	assetId: string;
	node: any; // Framework-specific object
	property: string;
	resolver: (node: any, asset: TAsset) => void;
}

export interface AssetLoadEvent<TAsset = any> {
	type: "load" | "error" | "progress";
	assetId: string;
	asset?: TAsset;
	error?: Error;
	progress?: number;
}

export type AssetEventHandler<TAsset = any> = (event: AssetLoadEvent<TAsset>) => void;

export interface AssetLoader<TAsset = any> {
	load(source: string): Promise<TAsset>;
	createFallback(): TAsset;
	dispose?(asset: TAsset): void;
}

export interface AssetRegistryOptions<TAsset = any> {
	loaders: Record<string, AssetLoader<TAsset>>;
	defaultType?: string;
	autoCleanup?: boolean;
	enableEvents?: boolean;
}

export abstract class BaseAssetRegistry<TAsset = any> {
	protected assets = new Map<string, AssetRegistryEntry<TAsset>>();
	protected loadingPromises = new Map<string, Promise<TAsset>>();
	protected pendingReferences = new Array<PendingAssetReference<TAsset>>();
	protected eventHandlers = new Map<string, AssetEventHandler<TAsset>[]>();
	protected options: AssetRegistryOptions<TAsset>;

	constructor(options: AssetRegistryOptions<TAsset>) {
		this.options = options;
	}

	/**
	 * Register an asset with the given ID
	 */
	register(
		id: string,
		asset: TAsset,
		type: string,
		source?: string,
		metadata?: Record<string, any>
	): void {
		if (this.assets.has(id)) {
			console.warn(`Asset with ID "${id}" already exists. Replacing existing asset.`);
			this.unregister(id);
		}

		this.assets.set(id, {
			asset,
			type,
			refCount: 0,
			source,
			metadata: metadata || {},
		});

		// Fire load event
		if (this.options.enableEvents) {
			this.dispatchEvent({
				type: "load",
				assetId: id,
				asset
			});
		}
	}

	/**
	 * Register an asset from a source path - loads asynchronously
	 */
	async registerFromSource(
		id: string,
		source: string,
		type?: string,
		metadata?: Record<string, any>,
		onLoad?: AssetEventHandler<TAsset>,
		onError?: AssetEventHandler<TAsset>
	): Promise<TAsset> {
		if (this.assets.has(id)) {
			console.warn(`Asset with ID "${id}" already exists. Replacing existing asset.`);
			this.unregister(id);
		}

		// Check if we're already loading this asset
		const existingPromise = this.loadingPromises.get(id);
		if (existingPromise) {
			return existingPromise;
		}

		// Detect asset type
		const assetType = type || this.detectAssetType(source);
		const loader = this.options.loaders[assetType];

		if (!loader) {
			throw new Error(`No loader available for asset type: ${assetType}`);
		}

		// Add event handlers if provided
		if (onLoad) this.addEventListener(id, onLoad);
		if (onError) this.addEventListener(id, onError);

		// Create loading promise
		const loadingPromise = loader.load(source)
			.then((asset) => {
				this.assets.set(id, {
					asset,
					type: assetType,
					refCount: 0,
					source,
					metadata: metadata || {},
				});
				this.loadingPromises.delete(id);

				// Fire load event
				if (this.options.enableEvents) {
					this.dispatchEvent({
						type: "load",
						assetId: id,
						asset
					});
				}

				return asset;
			})
			.catch((error) => {
				console.error(`Failed to load asset "${id}" from source "${source}":`, error);
				this.loadingPromises.delete(id);

				// Fire error event
				if (this.options.enableEvents) {
					this.dispatchEvent({
						type: "error",
						assetId: id,
						error
					});
				}

				// Return fallback asset
				const fallbackAsset = loader.createFallback();
				this.assets.set(id, {
					asset: fallbackAsset,
					type: assetType,
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
	acquire(id: string): TAsset | null {
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

		// Auto-cleanup if no references remain
		if (entry.refCount === 0 && this.options.autoCleanup) {
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
	getInfo(id: string): AssetRegistryEntry<TAsset> | null {
		return this.assets.get(id) || null;
	}

	/**
	 * Unregister an asset and clean up its resources
	 */
	unregister(id: string): void {
		const entry = this.assets.get(id);
		if (entry) {
			// Dispose asset if loader supports it
			const loader = this.options.loaders[entry.type];
			if (loader?.dispose) {
				loader.dispose(entry.asset);
			}
			this.assets.delete(id);
		}

		// Cancel any pending loads
		this.loadingPromises.delete(id);

		// Remove event handlers
		this.eventHandlers.delete(id);
	}

	/**
	 * Add event listener for asset loading events
	 */
	addEventListener(assetId: string, handler: AssetEventHandler<TAsset>): void {
		if (!this.options.enableEvents) return;
		
		const handlers = this.eventHandlers.get(assetId) || [];
		handlers.push(handler);
		this.eventHandlers.set(assetId, handlers);
	}

	/**
	 * Remove event listener
	 */
	removeEventListener(assetId: string, handler: AssetEventHandler<TAsset>): void {
		const handlers = this.eventHandlers.get(assetId);
		if (handlers) {
			const index = handlers.indexOf(handler);
			if (index !== -1) {
				handlers.splice(index, 1);
			}
		}
	}

	/**
	 * Add a pending asset reference to be resolved later
	 */
	addPendingReference(reference: PendingAssetReference<TAsset>): void {
		this.pendingReferences.push(reference);
	}

	/**
	 * Resolve all pending asset references
	 */
	resolvePendingReferences(): void {
		const resolved = new Array<PendingAssetReference<TAsset>>();
		const unresolved = new Array<PendingAssetReference<TAsset>>();

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
			const loader = this.options.loaders[entry.type];
			if (loader?.dispose) {
				loader.dispose(entry.asset);
			}
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

	/**
	 * Dispatch asset event to registered handlers
	 */
	protected dispatchEvent(event: AssetLoadEvent<TAsset>): void {
		if (!this.options.enableEvents) return;
		
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
	protected abstract detectAssetType(source: string): string;
}