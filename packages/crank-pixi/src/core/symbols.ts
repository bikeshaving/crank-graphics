// Symbol keys for properties added to PIXI objects
// Using Symbol.for() to make them globally accessible for debugging

export const TEXT_PARENT = Symbol.for('CrankPixi.textParent');
export const DEFERRED_CHILDREN = Symbol.for('CrankPixi.deferredChildren');
export const IS_TEXTURE_DEFINITION = Symbol.for('CrankPixi.isTextureDefinition');
export const TEXTURE_ID = Symbol.for('CrankPixi.textureId');
export const RESOLVING_TEXTURE = Symbol.for('CrankPixi.resolvingTexture');