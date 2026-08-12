/**
 * Tag name convention, shared by the code generator and by extend().
 *
 * The tag name is the class name in lower case. There are no hyphens and no
 * word boundaries.
 *
 * Examples:
 * - LOD -> "lod"
 * - Object3D -> "object3d"
 * - BoxGeometry -> "boxgeometry"
 * - MeshPhysicalMaterial -> "meshphysicalmaterial"
 * - PerspectiveCamera -> "perspectivecamera"
 */
export function classNameToTagName(className: string): string {
	return className.toLowerCase();
}
