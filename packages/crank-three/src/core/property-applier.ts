/**
 * Core property applier utility for Three.js objects
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

			// Handle Three.js Vector3 properties (position, rotation, scale)
			if (
				(key === "position" || key === "rotation" || key === "scale") &&
				node[key] &&
				typeof node[key].set === "function"
			) {
				const current = node[key];

				if (typeof value === "number") {
					// Set all components to the same value
					current.set(value, value, value);
				} else if (Array.isArray(value)) {
					// A triple, or a quadruple that ends with the Euler order
					current.fromArray(value);
				} else if (value && typeof value === "object") {
					current.set(
						value.x ?? current.x,
						value.y ?? current.y,
						value.z ?? current.z,
					);

					// An Euler also holds the order of the rotations
					if (value.order !== undefined && "order" in current) {
						current.order = value.order;
					}
				}
				continue;
			}

			// Handle a color property. Three.js holds a Color object, and the
			// prop accepts any color representation: a number, a string, or a
			// Color.
			if (node[key] && node[key].isColor && !(value && value.isColor)) {
				node[key].set(value);
				continue;
			}

			// For other complex objects, try to set individual properties
			if (value && typeof value === "object" && !Array.isArray(value) && node[key] && typeof node[key] === "object") {
				Object.assign(node[key], value);
				continue;
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