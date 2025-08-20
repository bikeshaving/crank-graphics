/**
 * Core property applier utility for Pixi.js objects
 * Used by auto-generated property appliers
 */

export function createPropertyApplier<T extends Record<string, any>>(
	typeName: string,
	customProps: Partial<Record<keyof T, (node: any, value: any) => void>> = {},
) {
	return function applyProps(node: any, props: Record<string, any>): void {
		for (const [key, value] of Object.entries(props)) {
			if (value === undefined) continue;

			// Handle custom property setters first
			if (customProps[key as keyof T]) {
				customProps[key as keyof T]!(node, value);
				continue;
			}

			// Handle complex object properties (Point, Rectangle, etc.)
			if (value && typeof value === "object" && !Array.isArray(value)) {
				if (
					key === "scale" &&
					node.scale &&
					typeof node.scale.set === "function"
				) {
					if (typeof value === "number") {
						node.scale.set(value);
					} else if (value.x !== undefined || value.y !== undefined) {
						node.scale.set(value.x ?? node.scale.x, value.y ?? node.scale.y);
					}
					continue;
				}

				if (
					key === "anchor" &&
					node.anchor &&
					typeof node.anchor.set === "function"
				) {
					if (typeof value === "number") {
						node.anchor.set(value);
					} else {
						node.anchor.set(value.x ?? node.anchor.x, value.y ?? node.anchor.y);
					}
					continue;
				}

				// For other complex objects, try to set individual properties
				if (node[key] && typeof node[key] === "object") {
					Object.assign(node[key], value);
					continue;
				}
			}

			// Default: direct property assignment
			try {
				if (key in node || typeof node[key] !== "undefined") {
					node[key] = value;
				}
			} catch (error) {
				console.warn(`Failed to set property ${key} on ${typeName}:`, error);
			}
		}
	};
}
