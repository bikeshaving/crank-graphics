/**
 * Tag name convention of the generated Pixi elements.
 *
 * The tag is the class name in lower case. There are no word boundaries and no
 * hyphens, for example HTMLText -> htmltext and NineSliceSprite -> nineslicesprite.
 */

export function classNameToTag(className: string): string {
	// Bundled type definitions rename duplicate classes, for example Text$1.
	return className.replace(/\$\d+$/, "").toLowerCase();
}
