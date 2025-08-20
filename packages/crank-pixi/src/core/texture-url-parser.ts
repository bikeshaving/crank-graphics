/**
 * URL Parser for SVG-style texture references
 *
 * Supports parsing CSS/SVG url() syntax:
 * - url(#texture-id) -> texture-id
 * - url("#texture-id") -> texture-id
 * - url('#texture-id') -> texture-id
 *
 * Also supports direct # references:
 * - #texture-id -> texture-id
 */

export interface ParsedTextureUrl {
	type: "reference" | "url" | "direct";
	id: string;
	original: string;
}

/**
 * Parse a texture reference string to extract the ID
 *
 * @param value - The texture reference string
 * @returns ParsedTextureUrl if it's a reference, null if it's a direct texture value
 */
export function parseTextureUrl(value: string): ParsedTextureUrl | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();

	// Match url(#id), url("#id"), or url('#id')
	const urlMatch = trimmed.match(/^url\(\s*['"]?#([^'")]+)['"]?\s*\)$/i);
	if (urlMatch) {
		return {
			type: "reference",
			id: urlMatch[1],
			original: value,
		};
	}

	// Match direct #id reference
	const directMatch = trimmed.match(/^#([a-zA-Z0-9_-]+)$/);
	if (directMatch) {
		return {
			type: "direct",
			id: directMatch[1],
			original: value,
		};
	}

	// Not a reference pattern
	return null;
}

/**
 * Check if a value is a texture reference
 */
export function isTextureReference(value: any): boolean {
	return parseTextureUrl(value) !== null;
}

/**
 * Extract texture ID from a reference string
 * Returns null if not a reference
 */
export function extractTextureId(value: string): string | null {
	const parsed = parseTextureUrl(value);
	return parsed ? parsed.id : null;
}

/**
 * Create a texture reference string from an ID
 */
export function createTextureReference(id: string): string {
	return `url(#${id})`;
}

/**
 * Validate texture ID format
 * IDs should be valid CSS/HTML identifiers
 */
export function isValidTextureId(id: string): boolean {
	if (!id || typeof id !== "string") {
		return false;
	}

	// CSS/HTML identifier rules: start with letter, underscore, or hyphen
	// followed by letters, digits, hyphens, or underscores
	return /^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(id);
}

/**
 * Normalize a texture ID to ensure it's valid
 */
export function normalizeTextureId(id: string): string {
	if (!id || typeof id !== "string") {
		throw new Error("Texture ID must be a non-empty string");
	}

	// Replace invalid characters with hyphens
	let normalized = id.replace(/[^a-zA-Z0-9_-]/g, "-");

	// Ensure it starts with a valid character
	if (!/^[a-zA-Z_-]/.test(normalized)) {
		normalized = `texture-${normalized}`;
	}

	// Remove consecutive hyphens
	normalized = normalized.replace(/-+/g, "-");

	// Remove trailing hyphens
	normalized = normalized.replace(/-+$/, "");

	if (!normalized) {
		throw new Error("Unable to normalize texture ID: " + id);
	}

	return normalized;
}
