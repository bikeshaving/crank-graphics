/**
 * Symbols for internal properties and communication between Three.js objects
 * Using Symbol.for() for global accessibility across different instances
 */

// Symbol for tracking parent-child relationships in Three.js scene graph
export const OBJECT_PARENT = Symbol.for('CrankThree.objectParent');

// Symbol for deferred children that need to be added after creation
export const DEFERRED_CHILDREN = Symbol.for('CrankThree.deferredChildren');

// Symbol to mark texture definition elements
export const IS_TEXTURE_DEFINITION = Symbol.for('CrankThree.isTextureDefinition');

// Symbol for texture ID on texture definition elements
export const TEXTURE_ID = Symbol.for('CrankThree.textureId');

// Symbol for the registration token of an asset definition element
export const ASSET_TOKEN = Symbol.for('CrankThree.assetToken');

// Symbol for preventing infinite recursion during texture resolution
export const RESOLVING_TEXTURE = Symbol.for('CrankThree.resolvingTexture');

// Symbol for marking geometry definition elements
export const IS_GEOMETRY_DEFINITION = Symbol.for('CrankThree.isGeometryDefinition');

// Symbol for geometry ID on geometry definition elements
export const GEOMETRY_ID = Symbol.for('CrankThree.geometryId');

// Symbol for material parent tracking
export const MATERIAL_PARENT = Symbol.for('CrankThree.materialParent');