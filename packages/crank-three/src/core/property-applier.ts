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
				if (typeof value === "number") {
					// Set all components to the same value
					node[key].set(value, value, value);
				} else if (value && typeof value === "object" && !Array.isArray(value)) {
					const current = node[key];
					node[key].set(
						value.x ?? current.x, 
						value.y ?? current.y, 
						value.z ?? current.z
					);
				}
				continue;
			}

			// Handle Euler rotation with order (when value is object)
			if (key === "rotation" && node.rotation && value && typeof value === "object" && value.order) {
				if (value.x !== undefined) node.rotation.x = value.x;
				if (value.y !== undefined) node.rotation.y = value.y;
				if (value.z !== undefined) node.rotation.z = value.z;
				if (value.order !== undefined) node.rotation.order = value.order;
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