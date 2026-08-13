#!/usr/bin/env bun
/**
 * TypeScript introspection tool to automatically generate Three.js object mappings
 * using ts-morph for comprehensive type analysis.
 */

import {
	Project,
	ClassDeclaration,
	ConstructorDeclaration,
	ParameterDeclaration,
	SyntaxKind,
} from "ts-morph";
import * as FS from "fs";
import * as Path from "path";
import {classNameToTagName} from "../src/core/tag-name";

interface ThreeClassInfo {
	name: string;
	tagName: string;
	className: string;
	extendsClause?: string;
	implementsClause?: string[];
	constructors: ConstructorInfo[];
	properties: PropertyInfo[];
	jsxProperties: JSXPropertyInfo[];
	isObject3D: boolean;
	isMaterial: boolean;
	isGeometry: boolean;
	bestConstructor?: ConstructorInfo;
}

interface ConstructorInfo {
	parameters: ParameterInfo[];
	isMainConstructor: boolean;
	constructorRank: number;
	propMappings: PropMapping[];
}

interface ParameterInfo {
	name: string;
	type: string;
	isOptional: boolean;
	defaultValue?: string;
	semanticType: "texture" | "material" | "geometry" | "array" | "object" | "primitive" | "unknown";
	interfaceProperties?: InterfacePropertyInfo[];
}

interface InterfacePropertyInfo {
	name: string;
	type: string;
	isRequired: boolean;
	semanticType: "texture" | "material" | "geometry" | "array" | "object" | "primitive" | "unknown";
}

interface PropertyInfo {
	name: string;
	type: string;
	isReadonly: boolean;
	isStatic: boolean;
	hasGetter: boolean;
	hasSetter: boolean;
	semanticType: "texture" | "material" | "geometry" | "array" | "object" | "primitive" | "unknown";
}

interface JSXPropertyInfo {
	name: string;
	typeText: string;
}

interface PropMapping {
	jsxProp: string;
	constructorParam: string;
	transformation?: string;
}

/**
 * Marker properties of the Three.js class hierarchies that this renderer supports.
 * Every Three.js class carries a readonly marker such as "isObject3D".
 * The marker is a reliable test, and it works for a subclass of any depth.
 */
const HIERARCHY_MARKERS = [
	"isObject3D",
	"isBufferGeometry",
	"isMaterial",
	"isTexture",
	"isLight",
	"isCamera",
];

/**
 * Classes that the rule finds, but that this renderer must not map to a tag.
 * - Material: a bare material has no shader, so it renders nothing.
 * - Texture: the "texture" tag belongs to the asset registry element.
 */
const EXCLUDED_CLASSES = new Set(["Material", "Texture"]);

function main() {
	console.log("🔍 Starting Three.js type introspection...");
	
	const project = new Project({
		tsConfigFilePath: "tsconfig.json",
	});

	// Resolve the Three.js classes through the "three" module.
	// Module resolution keeps one declaration of each class in the program.
	// A file added by path gives a second declaration, and the checker then fails.
	const introspectionFile = project.createSourceFile(
		"__three-introspection.ts",
		`import * as THREE from "three";\nexport type ThreeModule = typeof THREE;\n`,
		{overwrite: true},
	);

	const moduleType = introspectionFile.getTypeAliasOrThrow("ThreeModule").getType();
	console.log(`📊 Found ${moduleType.getProperties().length} exports in the three module`);

	const threeClasses: ThreeClassInfo[] = [];

	for (const symbol of moduleType.getProperties()) {
		const className = symbol.getName();
		if (EXCLUDED_CLASSES.has(className)) {
			console.log(`⏭️  Excluding ${className}`);
			continue;
		}

		// An export specifier re-exports a class from another module.
		// The aliased symbol holds the class declaration.
		const resolved = symbol.getAliasedSymbol() ?? symbol;
		const declaration = resolved
			.getDeclarations()
			.find(d => d.getKind() === SyntaxKind.ClassDeclaration) as ClassDeclaration | undefined;

		if (!declaration || declaration.isAbstract()) {
			continue;
		}

		const classType = declaration.getType();
		if (!HIERARCHY_MARKERS.some(marker => classType.getProperty(marker))) {
			continue;
		}

		console.log(`✅ Processing ${className}`);

		const classInfo = analyzeClass(declaration, className);
		if (classInfo) {
			threeClasses.push(classInfo);
		}
	}

	console.log(`🎯 Found ${threeClasses.length} Three.js classes`);

	// Generate output files
	generateTagMapping(threeClasses);
	generatePropertyAppliers(threeClasses);
	generateConstructorHelpers(threeClasses);
	generateJSXTypes(threeClasses);

	console.log("✨ Code generation complete!");
}

function analyzeClass(cls: ClassDeclaration, exportName?: string): ThreeClassInfo | null {
	const name = exportName ?? cls.getName();
	if (!name) return null;

	const tagName = classNameToTagName(name);
	const extendsClause = cls.getExtends()?.getText();
	const classType = cls.getType();

	// The marker properties classify the class. A name test is not reliable.
	const isObject3D = !!classType.getProperty("isObject3D");
	const isMaterial = !!classType.getProperty("isMaterial");
	const isGeometry = !!classType.getProperty("isBufferGeometry");

	const constructors = cls.getConstructors().map(analyzeConstructor);
	const properties = cls.getProperties().map(analyzeProperty);
	const jsxProperties = collectJSXProperties(cls);

	return {
		name,
		tagName,
		className: `THREE.${name}`,
		extendsClause,
		implementsClause: cls.getImplements().map(i => i.getText()),
		constructors,
		properties,
		jsxProperties,
		isObject3D,
		isMaterial,
		isGeometry,
	};
}

// Props that the common props interface declares, or that the renderer must not set.
const EXCLUDED_JSX_PROPS = new Set([
	"position",
	"rotation",
	"scale",
	"visible",
	"name",
	"userData",
	"castShadow",
	"receiveShadow",
	"frustumCulled",
	"renderOrder",
	"children",
	"parent",
	"id",
	"uuid",
	"type",
	"version",
	"matrix",
	"matrixWorld",
	"matrixWorldNeedsUpdate",
	"modelViewMatrix",
	"normalMatrix",
	"quaternion",
]);

/**
 * Collect the writable properties of a class, inherited properties included.
 * The type checker gives the full property list of the class type.
 */
function collectJSXProperties(cls: ClassDeclaration): JSXPropertyInfo[] {
	const result: JSXPropertyInfo[] = [];
	const seen = new Set<string>();

	for (const symbol of cls.getType().getProperties()) {
		const name = symbol.getName();
		if (seen.has(name) || EXCLUDED_JSX_PROPS.has(name)) continue;
		if (name.startsWith("_") || /^is[A-Z]/.test(name)) continue;

		const declaration = symbol.getDeclarations()[0];
		if (!declaration) continue;
		if (declaration.getKind() === SyntaxKind.MethodDeclaration) continue;
		if ((declaration as any).isReadonly?.()) continue;

		let typeText: string;
		try {
			const type = symbol.getTypeAtLocation(declaration);
			if (type.getCallSignatures().length > 0) continue;
			typeText = type.getText(declaration);
		} catch (error) {
			// The checker cannot resolve every inherited symbol. Skip those properties.
			continue;
		}

		seen.add(name);
		result.push({name, typeText});
	}

	return result.sort((a, b) => a.name.localeCompare(b.name));
}

function analyzeConstructor(ctor: ConstructorDeclaration): ConstructorInfo {
	const parameters = ctor.getParameters().map(analyzeParameter);
	
	return {
		parameters,
		isMainConstructor: true,
		constructorRank: parameters.length,
		propMappings: [],
	};
}

function analyzeParameter(param: ParameterDeclaration): ParameterInfo {
	const name = param.getName();
	const type = param.getType().getText();
	const isOptional = param.isOptional();
	
	return {
		name,
		type,
		isOptional,
		semanticType: classifyParameterType(type),
	};
}

function analyzeProperty(prop: any): PropertyInfo {
	const name = prop.getName();
	const type = prop.getType().getText();
	
	return {
		name,
		type,
		isReadonly: prop.isReadonly(),
		isStatic: prop.isStatic(),
		hasGetter: true,
		hasSetter: true,
		semanticType: classifyParameterType(type),
	};
}

function classifyParameterType(type: string): "texture" | "material" | "geometry" | "array" | "object" | "primitive" | "unknown" {
	if (type.includes("Texture")) return "texture";
	if (type.includes("Material")) return "material";
	if (type.includes("Geometry")) return "geometry";
	if (type.includes("[]") || type.includes("Array")) return "array";
	if (type.includes("number") || type.includes("string") || type.includes("boolean")) return "primitive";
	if (type.includes("{") || type.includes("interface")) return "object";
	return "unknown";
}


function generateTagMapping(classes: ThreeClassInfo[]) {
	console.log("🏷️  Generating tag mapping...");
	
	const mappingEntries = classes.map(cls => 
		`  "${cls.tagName}": ${cls.className},`
	).join("\n");

	const code = `// Auto-generated Three.js tag mapping
// Generated by scripts/generate-three-objects.ts

import * as THREE from 'three';

export type ThreeTag = ${classes.map(cls => `"${cls.tagName}"`).join(" | ")};

export const THREE_TAG_MAP = {
${mappingEntries}
} as const;

export function isValidThreeTag(tag: string): tag is ThreeTag {
  return tag in THREE_TAG_MAP;
}

export function getThreeClass(tag: ThreeTag) {
  return THREE_TAG_MAP[tag];
}
`;

	writeGeneratedFile("generated/tag-mapping.ts", code);
}

function generatePropertyAppliers(classes: ThreeClassInfo[]) {
	console.log("⚙️  Generating property appliers...");
	
	const appliers = classes.map(generateClassPropertyApplier).join("\n\n");
	const exportMap = classes.map(cls => 
		`  "${cls.tagName}": apply${cls.name}Props,`
	).join("\n");

	const code = `// Auto-generated Three.js property appliers
// Generated by scripts/generate-three-objects.ts

import * as THREE from 'three';
import { createPropertyApplier } from '../core/property-applier';
import { parseTextureUrl } from '../core/texture-url-parser';
import { assetRegistry } from '../core/asset-registry';

// Enhanced texture resolution with URL reference support and deferred resolution
function resolveTexture(textureRef: any, node?: any, property?: string): THREE.Texture {
  if (!textureRef) return new THREE.Texture();
  
  if (textureRef instanceof THREE.Texture) {
    return textureRef;
  }
  
  if (typeof textureRef === "string") {
    // Check if it's a URL reference (url(#id) or #id)
    const parsed = parseTextureUrl(textureRef);
    if (parsed) {
      const texture = assetRegistry.acquire(parsed.id);
      if (texture) {
        return texture;
      } else if (node && property) {
        // Defer resolution - texture may be defined later in the tree
        assetRegistry.addPendingReference({
          assetId: parsed.id,
          node,
          property,
          resolver: (targetNode: any, resolvedTexture: any) => {
            // Simple direct assignment - only called during finalize()
            if (targetNode[property] !== resolvedTexture) {
              targetNode[property] = resolvedTexture;
              // A material needs a recompile after a late texture assignment.
              if (targetNode.isMaterial) {
                targetNode.needsUpdate = true;
              }
            }
          }
        });
        return new THREE.Texture(); // Temporary fallback
      } else {
        console.warn(\`Texture reference "\${textureRef}" not found in registry. Available assets: \${assetRegistry.getIds().join(', ')}\`);
        return new THREE.Texture();
      }
    }
    
    // Direct texture path - load it
    const loader = new THREE.TextureLoader();
    return loader.load(textureRef);
  }
  
  return new THREE.Texture();
}

${appliers}

export const PROPERTY_APPLIERS = {
${exportMap}
} as const;
`;

	writeGeneratedFile("generated/property-appliers.ts", code);
}

function generateClassPropertyApplier(cls: ThreeClassInfo): string {
	const customHandlers: string[] = [];

	// Add texture handling for materials that have a map property
	if (cls.isMaterial && cls.jsxProperties.some(prop => prop.name === "map")) {
		customHandlers.push(`  map: (node: ${cls.className}, value: any) => {
    if (value) {
      const resolvedTexture = resolveTexture(value, node, 'map');
      node.map = resolvedTexture;
      node.needsUpdate = true;
    }
  }`);
	}

	const customHandlersStr = customHandlers.length > 0 ? `, {\n${customHandlers.join(",\n")}\n}` : "";

	return `export const apply${cls.name}Props = createPropertyApplier<${cls.className}>('${cls.name}'${customHandlersStr});`;
}

function generateConstructorHelpers(classes: ThreeClassInfo[]) {
	console.log("\ud83c\udfd7\ufe0f  Generating constructor helpers...");

	const code = `// Auto-generated Three.js constructor helpers
// Generated by scripts/generate-three-objects.ts

import type { ThreeTag } from './tag-mapping';

/**
 * Create the Three.js object of an element.
 * The "args" prop gives the constructor arguments, for example
 * <boxgeometry args={[1, 2, 3]} />.
 */
export function createThreeObject(
  tag: ThreeTag | string,
  ThreeClass: any,
  props: Record<string, any>,
): any {
  const args: Array<any> = Array.isArray(props.args) ? props.args : [];

  try {
    return new ThreeClass(...args);
  } catch (error) {
    if (args.length > 0) {
      console.warn(\`Failed to create <\${tag}> with the args prop. Trying the default constructor:\`, error);
      try {
        return new ThreeClass();
      } catch (fallbackError) {
        throw new Error(
          \`Cannot create <\${tag}>. The class needs constructor arguments. Pass them with the args prop.\`,
          {cause: fallbackError},
        );
      }
    }

    throw new Error(
      \`Cannot create <\${tag}>. The class needs constructor arguments. Pass them with the args prop.\`,
      {cause: error},
    );
  }
}
`;

	writeGeneratedFile("generated/constructors.ts", code);
}

function generateJSXTypes(classes: ThreeClassInfo[]) {
	console.log("📝 Generating TypeScript definitions...");

	const interfaces = classes.map(cls => generateThreeJSXInterface(cls)).join("\n\n");
	const elementEntries = classes.map(cls =>
		`  "${cls.tagName}": ${propsInterfaceName(cls)};`
	).join("\n");

	const code = `// Auto-generated Three.js JSX type definitions
// Generated by scripts/generate-three-objects.ts

import * as THREE from 'three';

/** A Vector3 property. The renderer accepts a vector, a triple, a number, or a partial vector. */
export type Vector3Prop =
  | THREE.Vector3
  | [number, number, number]
  | number
  | {x?: number; y?: number; z?: number};

/** A rotation property. The renderer accepts an Euler, a triple, or a partial Euler. */
export type EulerProp =
  | THREE.Euler
  | [number, number, number]
  | {x?: number; y?: number; z?: number; order?: THREE.EulerOrder};

/** A texture property. A string is a path, a "#id" reference, or a "url(#id)" reference. */
export type TextureProp = THREE.Texture | string | null;

export type ThreeEventHandler = (event: any) => void;

/**
 * Widen one prop type the way the renderer accepts it: a color takes any color
 * representation, a texture takes a url(#id) reference or a path, and a vector
 * takes a triple or a partial vector.
 */
export type WidenThreeProp<V> = [V] extends [THREE.Color]
  ? V | THREE.ColorRepresentation
  : [V] extends [THREE.Texture | null]
    ? V | string
    : [V] extends [THREE.Vector3]
      ? V | Vector3Prop
      : [V] extends [THREE.Euler]
        ? V | EulerProp
        : V;

/** The value properties of a class. The helper drops the methods. */
export type ThreeValueProps<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any ? never : K]?: WidenThreeProp<T[K]>;
};

/**
 * The props of an element of a class that extend() registers.
 * Augment JSX.IntrinsicElements with it:
 *
 *   declare global {
 *     namespace JSX {
 *       interface IntrinsicElements {
 *         orbitcontrols: ThreeElementProps<OrbitControls>;
 *       }
 *     }
 *   }
 */
export type ThreeElementProps<T> = ThreeCommonProps &
  Omit<ThreeValueProps<T>, keyof ThreeCommonProps>;

/** Props that every Three.js element accepts. */
export interface ThreeCommonProps {
  position?: Vector3Prop;
  rotation?: EulerProp;
  scale?: Vector3Prop;

  // Shorthand transform props. The renderer writes them to position, rotation, and scale.
  x?: number;
  y?: number;
  z?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;

  visible?: boolean;
  name?: string;
  userData?: any;
  castShadow?: boolean;
  receiveShadow?: boolean;
  frustumCulled?: boolean;
  renderOrder?: number;

  children?: any;

  /** The constructor arguments of the Three.js class. */
  args?: Array<any>;

  // Special props of Crank elements.
  key?: unknown;
  ref?: unknown;
  copy?: unknown;
  hydrate?: unknown;

  // Event handlers. The renderer adds each "on" prop with addEventListener.
  onAdded?: ThreeEventHandler;
  onRemoved?: ThreeEventHandler;
  [event: \`on\${string}\`]: ThreeEventHandler | undefined;
}

/** Props of the virtual "texture" and "asset" elements. */
export interface ThreeAssetProps {
  /** The registry id. Other elements refer to it with "url(#id)". */
  id: string;
  /** A path to load the asset from. */
  src?: string;
  /** The asset type. The registry reads the file extension when you omit it. */
  type?: string;
  texture?: THREE.Texture;
  asset?: any;
  metadata?: Record<string, any>;
  onload?: ThreeEventHandler;
  onerror?: ThreeEventHandler;
  onLoad?: ThreeEventHandler;
  onError?: ThreeEventHandler;
  children?: any;

  // Special props of Crank elements.
  key?: unknown;
  ref?: unknown;
  copy?: unknown;
  hydrate?: unknown;
}

${interfaces}

/** Every element tag that this renderer supports. */
export interface ThreeIntrinsicElements {
${elementEntries}
  "texture": ThreeAssetProps;
  "asset": ThreeAssetProps;
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeIntrinsicElements {}
  }
}
`;

	writeGeneratedFile("generated/jsx-types.ts", code);
}

function propsInterfaceName(cls: ThreeClassInfo): string {
	return `${cls.name}Props`;
}

function generateThreeJSXInterface(cls: ThreeClassInfo): string {
	const props = cls.jsxProperties
		.map(prop => `  ${quotePropName(prop.name)}?: ${jsxPropType(cls, prop)};`)
		.join("\n");

	return `/** Props of the "${cls.tagName}" element (${cls.className}). */
export interface ${propsInterfaceName(cls)} extends ThreeCommonProps {
${props}
}`;
}

function quotePropName(name: string): string {
	return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : `"${name}"`;
}

/**
 * Build the prop type from the property type of the class.
 * An indexed access type keeps the generated file short and correct.
 */
function jsxPropType(cls: ThreeClassInfo, prop: JSXPropertyInfo): string {
	const indexed = `${cls.className}["${prop.name}"]`;
	const alternatives: string[] = [indexed];

	if (prop.typeText.includes("Texture")) {
		// The renderer resolves "#id", "url(#id)", and paths.
		alternatives.push("string");
	}

	if (/\bColor\b/.test(prop.typeText)) {
		alternatives.push("THREE.ColorRepresentation");
	}

	if (/\bVector3\b/.test(prop.typeText)) {
		alternatives.push("Vector3Prop");
	}

	if (/\bEuler\b/.test(prop.typeText)) {
		alternatives.push("EulerProp");
	}

	return alternatives.join(" | ");
}

function writeGeneratedFile(relativePath: string, content: string) {
	const fullPath = Path.join(process.cwd(), "src", relativePath);
	const dir = Path.dirname(fullPath);
	
	// Ensure directory exists
	FS.mkdirSync(dir, { recursive: true });
	
	FS.writeFileSync(fullPath, content);
	console.log(`📄 Generated: ${relativePath}`);
}

if ((import.meta as any).main) {
	main();
}