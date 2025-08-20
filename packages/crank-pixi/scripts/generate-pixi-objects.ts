#!/usr/bin/env bun
/**
 * TypeScript introspection tool to automatically generate Pixi.js object mappings
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

interface PixiClassInfo {
	name: string;
	tagName: string;
	className: string;
	extendsClause?: string;
	implementsClause?: string[];
	constructors: ConstructorInfo[];
	properties: PropertyInfo[];
	isDisplayObject: boolean;
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
	semanticType: "texture" | "array" | "object" | "primitive" | "unknown";
	interfaceProperties?: InterfacePropertyInfo[];
}

interface InterfacePropertyInfo {
	name: string;
	type: string;
	isRequired: boolean;
	semanticType: "texture" | "array" | "object" | "primitive" | "unknown";
}

interface PropMapping {
	propName: string;
	parameterIndex: number;
	parameterName: string;
	transformCode: string; // Code to transform prop to constructor arg
}

interface PropertyInfo {
	name: string;
	type: string;
	isReadonly: boolean;
	hasSet: boolean;
	isTextureProperty?: boolean;
	handlingStrategy?: 'method-call' | 'constructor-only' | 'skip' | 'normal';
	methodMapping?: { [key: string]: string };
}

// Configuration for read-only property handlers
const READ_ONLY_HANDLERS: Record<string, {
	type: 'boolean-methods' | 'setter-method' | 'constructor-only' | 'skip';
	trueMethod?: string;
	falseMethod?: string;
	method?: string;
}> = {
	'AnimatedSprite.playing': {
		type: 'boolean-methods',
		trueMethod: 'play',
		falseMethod: 'stop'
	},
	// Internal PIXI properties to skip
	'Sprite.renderPipeId': { type: 'skip' },
	'Sprite._anchor': { type: 'skip' },
	'Sprite._visualBounds': { type: 'skip' },
	'Container.uid': { type: 'skip' },
	'Container.renderPipeId': { type: 'skip' },
	'AbstractText._styleClass': { type: 'skip' },
	'Text$1.renderPipeId': { type: 'skip' },
	'Graphics.renderPipeId': { type: 'skip' },
	'Graphics._ownedContext': { type: 'skip' },
	'ParticleContainer.renderPipeId': { type: 'skip' },
	'NineSliceSprite.renderPipeId': { type: 'skip' },
	'TilingSprite.renderPipeId': { type: 'skip' },
	'TilingSprite.batched': { type: 'skip' },
	'BitmapText.renderPipeId': { type: 'skip' },
	'HTMLText.renderPipeId': { type: 'skip' },
	'Mesh.renderPipeId': { type: 'skip' },
	// Computed properties to skip
	'Text.width': { type: 'skip' },
	'Text.height': { type: 'skip' },
	'Container.children': { type: 'skip' },
	'DisplayObject.parent': { type: 'skip' },
	'DisplayObject.worldTransform': { type: 'skip' }
};

// Function to detect texture properties by type and name analysis
function isTextureType(type: string, name: string): boolean {
	// Skip private properties - we want to generate handlers for public APIs
	if (name.startsWith('_')) {
		return false;
	}
	
	// Type-based detection
	if (type.includes('Texture') && !type.includes('TextureStyle')) {
		return true;
	}
	
	// Name-based detection for common texture property names
	const textureNames = ['texture', 'textures'];
	if (textureNames.includes(name.toLowerCase())) {
		return true;
	}
	
	return false;
}

function main() {
	console.log("🔍 Starting Pixi.js type introspection...");

	// Create ts-morph project
	const project = new Project({
		// Use local tsconfig for this package
		tsConfigFilePath: "./tsconfig.json",
	});

	// Find the main pixi.js type definition file
	const pixiMainPath = import.meta.resolve("pixi.js").replace("file://", "");
	const pixiPackageDir = Path.dirname(Path.dirname(pixiMainPath)); // Go up from lib/ to package root
	const pixiTypesPath = Path.join(pixiPackageDir, "dist/pixi.js.d.ts");
	console.log(`📄 Loading types from: ${pixiTypesPath}`);

	const sourceFile = project.addSourceFileAtPath(pixiTypesPath);

	// Extract all exported classes
	const exportedClasses = sourceFile
		.getClasses()
		.filter((cls) => cls.isExported() && cls.getName());

	console.log(`📊 Found ${exportedClasses.length} exported classes`);

	// Also analyze the export statements to get the actual exported names
	const exportMap = new Map<string, string>();

	// Look for export statements that rename classes
	sourceFile.getExportDeclarations().forEach((exportDecl) => {
		exportDecl.getNamedExports().forEach((namedExport) => {
			const name = namedExport.getName();
			const alias = namedExport.getAliasNode()?.getText() || name;
			if (name !== alias) {
				exportMap.set(name, alias);
				console.log(`📎 Found export alias: ${name} -> ${alias}`);
			}
		});
	});

	// Look for re-exports at the end of file
	const fileText = sourceFile.getFullText();
	const reExportMatches = fileText.match(/(\w+)\$1\s+as\s+(\w+)/g);
	if (reExportMatches) {
		reExportMatches.forEach((match) => {
			const [, internal, exported] = match.match(/(\w+)\$1\s+as\s+(\w+)/) || [];
			if (internal && exported) {
				exportMap.set(`${internal}$1`, exported);
				console.log(`📎 Found re-export: ${internal}$1 -> ${exported}`);
			}
		});
	}

	// Analyze each class for display object relevance
	const pixiClasses: PixiClassInfo[] = [];

	for (const cls of exportedClasses) {
		const classInfo = analyzeClass(cls, exportMap);
		if (classInfo && classInfo.isDisplayObject) {
			pixiClasses.push(classInfo);
			console.log(
				`✅ ${classInfo.name} (${classInfo.className}) -> ${classInfo.tagName}`,
			);
		}
	}

	console.log(`🎯 Found ${pixiClasses.length} display object classes`);

	// Generate the code
	generateTagMapping(pixiClasses);
	generatePropertyAppliers(pixiClasses);
	generateConstructorHelpers(pixiClasses);
	generateTypeDefinitions(pixiClasses);

	console.log("✨ Code generation complete!");
}

function analyzeClass(
	cls: ClassDeclaration,
	exportMap: Map<string, string>,
): PixiClassInfo | null {
	const name = cls.getName();
	if (!name) return null;

	// Skip non-display object classes
	if (!isDisplayObjectClass(cls)) return null;

	// Handle generic classes with reasonable defaults
	const typeParams = cls.getTypeParameters();
	let actualClassName: string;

	if (typeParams.length > 0) {
		// Handle common generic classes with sensible defaults
		if (name === "Container") {
			actualClassName = "PIXI.Container"; // Default generic
		} else if (name === "Mesh") {
			actualClassName = "PIXI.Mesh"; // Default generic
		} else if (name === "AbstractText") {
			actualClassName = "PIXI.AbstractText"; // Default generic
		} else {
			console.log(
				`⚠️  Skipping generic class ${name} with ${typeParams.length} type parameters`,
			);
			return null;
		}
	} else {
		// Use export map to get the actual exported name
		const exportedName = exportMap.get(name) || name;
		actualClassName = `PIXI.${exportedName}`;
	}

	const tagName = classNameToTag(name);
	const extendsClause = cls.getExtends()?.getText();
	const implementsClauses = cls.getImplements().map((impl) => impl.getText());

	// Analyze constructors and select the best one
	const allConstructors = cls.getConstructors().map(analyzeConstructor);
	const bestConstructor = selectBestConstructor(allConstructors);
	const constructors = allConstructors;

	// Analyze properties
	const properties = cls.getProperties().map(prop => analyzeProperty(prop, name));

	return {
		name,
		tagName,
		className: actualClassName,
		extendsClause: extendsClause,
		implementsClause: implementsClauses,
		constructors,
		properties,
		isDisplayObject: true,
		bestConstructor, // Store the best constructor for code generation
	};
}

function isDisplayObjectClass(cls: ClassDeclaration): boolean {
	const name = cls.getName() || "";

	// Exclude system, pipe, and internal classes
	const excludePatterns = [
		"System",
		"Pipe",
		"Adaptor",
		"Adapter",
		"Pool",
		"Data",
		"Metrics",
		"Batch",
		"Gpu",
		"Gl",
		"Buffer",
		"Shader",
		"Program",
		"Utils",
		"Parser",
	];

	if (excludePatterns.some((pattern) => name.includes(pattern))) {
		return false;
	}

	// Focus on main display object classes
	const displayObjectPatterns = [
		/^Container$/,
		/^Sprite$/,
		/^Graphics$/,
		/^Text$/,
		/^AnimatedSprite$/,
		/^TilingSprite$/,
		/^NineSliceSprite$/,
		/^ParticleContainer$/,
		/^BitmapText$/,
		/^HTMLText$/,
		/^Mesh$/,
		/.*Text$/, // Include all text-related classes that end with "Text"
	];

	const exactMatches = [
		"Container",
		"Sprite",
		"Graphics",
		"AnimatedSprite",
		"TilingSprite",
		"NineSliceSprite",
		"ParticleContainer",
		"BitmapText",
		"HTMLText",
		"Mesh",
	];

	// Check for exact matches first
	if (exactMatches.includes(name)) {
		return true;
	}

	// Handle Text$1 case (internal name for Text)
	if (name === "Text$1") {
		return true;
	}

	// For other classes, be more selective
	if (displayObjectPatterns.some((pattern) => pattern.test(name))) {
		// Double-check that it's not a system class
		return !excludePatterns.some((pattern) => name.includes(pattern));
	}

	return false;
}

function classNameToTag(className: string): string {
	// Special cases for cleaner tag names
	if (className === "Text$1") return "text";
	if (className === "HTMLText") return "htmltext";
	if (className === "BitmapText") return "bitmap-text";
	if (className === "AnimatedSprite") return "animated-sprite";
	if (className === "TilingSprite") return "tiling-sprite";
	if (className === "NineSliceSprite") return "nine-slice-sprite";
	if (className === "ParticleContainer") return "particle-container";

	// Convert PascalCase to kebab-case for others
	return className
		.replace(/([A-Z])/g, (match, letter, index) =>
			index === 0 ? letter : "-" + letter,
		)
		.toLowerCase();
}

function analyzeConstructor(ctor: ConstructorDeclaration): ConstructorInfo {
	const parameters = ctor.getParameters().map(analyzeParameter);

	// Rank constructor by usefulness (more parameters = higher rank, but consider semantic value)
	const constructorRank = calculateConstructorRank(parameters);

	// Determine if this is the main constructor
	const isMainConstructor = constructorRank > 0;

	// Generate prop mappings for this constructor
	const propMappings = generatePropMappings(parameters);

	return {
		parameters,
		isMainConstructor,
		constructorRank,
		propMappings,
	};
}

function analyzeParameter(param: ParameterDeclaration): ParameterInfo {
	const name = param.getName();
	const type = param.getType().getText();
	const semanticType = determineSemanticType(name, type);

	// Enhanced optional detection - check for union with undefined, question mark, or default value
	const isOptional =
		param.isOptional() ||
		param.hasQuestionToken() ||
		type.includes("undefined") ||
		param.getInitializer() !== undefined;

	// Analyze interface properties for object parameters
	let interfaceProperties: InterfacePropertyInfo[] | undefined;
	if (semanticType === "object") {
		interfaceProperties = analyzeInterfaceProperties(param);
		if (interfaceProperties.length > 0) {
			console.log(
				`🔍 Found interface properties for ${name}:`,
				interfaceProperties
					.map((p) => `${p.name}:${p.type}${p.isRequired ? "" : "?"}`)
					.join(", "),
			);
		} else {
			console.log(
				`⚠️  No interface properties found for ${name} (type: ${type})`,
			);
		}
	}

	return {
		name,
		type,
		isOptional,
		defaultValue: param.getInitializer()?.getText(),
		semanticType,
		interfaceProperties,
	};
}

function analyzeInterfaceProperties(
	param: ParameterDeclaration,
): InterfacePropertyInfo[] {
	const properties: InterfacePropertyInfo[] = [];

	try {
		// Get the type symbol and declaration
		const paramType = param.getType();

		// Handle union types - look for the "Options" interface
		if (paramType.isUnion()) {
			const unionTypes = paramType.getUnionTypes();

			for (const unionType of unionTypes) {
				const typeSymbol = unionType.getSymbol();
				const typeText = unionType.getText();

				// Look for types that end with "Options" (e.g., NineSliceSpriteOptions)
				if (typeText.includes("Options") && typeSymbol) {
					const interfaceProps = analyzeInterfaceFromSymbol(typeSymbol);
					properties.push(...interfaceProps);
					break; // Found the options interface, use it
				}
			}
		} else {
			// Single type - analyze directly
			const typeSymbol = paramType.getSymbol();
			if (typeSymbol) {
				const interfaceProps = analyzeInterfaceFromSymbol(typeSymbol);
				properties.push(...interfaceProps);
			}
		}
	} catch (error) {
		console.warn(
			`Failed to analyze interface properties for ${param.getName()}:`,
			error.message,
		);
	}

	return properties;
}

function analyzeInterfaceFromSymbol(typeSymbol: any): InterfacePropertyInfo[] {
	const properties: InterfacePropertyInfo[] = [];

	try {
		// Look for interface declarations
		const declarations = typeSymbol.getDeclarations();

		for (const decl of declarations) {
			if (decl.getKind() === SyntaxKind.InterfaceDeclaration) {
				const interfaceDecl = decl as any;

				// Get all properties from the interface
				const members = interfaceDecl.getMembers?.() || [];

				for (const member of members) {
					if (member.getKind() === SyntaxKind.PropertySignature) {
						const propName = member.getName?.();
						const propType = member.getType?.()?.getText() || "unknown";
						const isRequired = !member.hasQuestionToken?.();
						const semanticType = determineSemanticType(
							propName || "",
							propType,
						);

						if (propName) {
							properties.push({
								name: propName,
								type: propType,
								isRequired,
								semanticType,
							});
						}
					}
				}
			}
		}
	} catch (error) {
		console.warn("Failed to analyze interface from symbol:", error.message);
	}

	return properties;
}

function determineSemanticType(
	name: string,
	type: string,
): "texture" | "array" | "object" | "primitive" | "unknown" {
	// Analyze parameter name for semantic clues first (more reliable)
	const namePatterns = {
		array: /textures|frames|children|items/i, // Check array patterns first
		texture: /texture|image|sprite/i,
		object: /style|options|config|settings/i,
		primitive: /width|height|x|y|scale|alpha|rotation|speed|size|count/i,
	};

	for (const [semanticType, pattern] of Object.entries(namePatterns)) {
		if (pattern.test(name)) {
			return semanticType as any;
		}
	}

	// Analyze type for semantic clues
	const typePatterns = {
		array: /\[\]|Array|Frames/i, // Add "Frames" to catch AnimatedSpriteFrames
		texture: /Texture/i,
		object: /\{|\|.*\|/,
		primitive: /^(string|number|boolean)$/,
	};

	for (const [semanticType, pattern] of Object.entries(typePatterns)) {
		if (pattern.test(type)) {
			return semanticType as any;
		}
	}

	return "unknown";
}

function calculateConstructorRank(parameters: ParameterInfo[]): number {
	let rank = 0;

	for (const param of parameters) {
		// Higher scores for more useful parameter types
		switch (param.semanticType) {
			case "texture":
				rank += 10; // Very useful for graphics objects
				break;
			case "array":
				rank += 8; // Important for collections (textures, frames)
				break;
			case "object":
				rank += 6; // Configuration objects are useful
				break;
			case "primitive":
				rank += 3; // Basic configuration
				break;
			default:
				rank += 1; // Unknown but still counts
		}

		// Bonus for non-optional parameters (they're usually important)
		if (!param.isOptional) {
			rank += 2;
		}
	}

	return rank;
}

function generatePropMappings(parameters: ParameterInfo[]): PropMapping[] {
	const mappings: PropMapping[] = [];

	for (let i = 0; i < parameters.length; i++) {
		const param = parameters[i];

		// Map common aliases (e.g., textures -> frames for AnimatedSprite)
		let propName = param.name;
		if (param.name === "frames" && param.semanticType === "array") {
			propName = "textures"; // Use the more intuitive prop name
		}

		let transformCode: string;

		// Generate transformation code based on semantic type and required/optional status
		switch (param.semanticType) {
			case "texture":
				if (param.isOptional) {
					transformCode = `props.${propName} ? resolveTexture(props.${propName}) : undefined`;
				} else {
					// Required texture - provide fallback
					transformCode = `resolveTexture(props.${propName} || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')`;
				}
				break;
			case "array":
				if (param.name.includes("texture") || param.name === "frames") {
					if (param.isOptional) {
						transformCode = `props.${propName} ? props.${propName}.map(resolveTexture) : undefined`;
					} else {
						transformCode = `(props.${propName} || []).map(resolveTexture)`;
					}
				} else {
					if (param.isOptional) {
						transformCode = `props.${propName} || undefined`;
					} else {
						transformCode = `props.${propName} || []`;
					}
				}
				break;
			case "object":
				if (param.isOptional) {
					// Only pass object if it has properties to avoid empty object destructuring issues
					transformCode = `props.${propName} && Object.keys(props.${propName}).length > 0 ? props.${propName} : undefined`;
				} else {
					// Required object - provide appropriate default based on interface analysis
					if (param.name === "geometry") {
						transformCode = `props.${propName} || new PIXI.MeshGeometry({ positions: new Float32Array([0,0,100,0,100,100,0,100]), uvs: new Float32Array([0,0,1,0,1,1,0,1]), indices: new Uint32Array([0,1,2,0,2,3]) })`;
					} else if (
						param.interfaceProperties &&
						param.interfaceProperties.length > 0
					) {
						// Generate smart default object based on interface properties
						const requiredProps = param.interfaceProperties.filter(
							(p) => p.isRequired,
						);
						const defaultParts: string[] = [];

						for (const prop of requiredProps) {
							if (prop.semanticType === "texture") {
								defaultParts.push(
									`${prop.name}: resolveTexture(props.${prop.name}) || PIXI.Texture.EMPTY`,
								);
							} else if (prop.semanticType === "primitive") {
								if (prop.type.includes("string")) {
									defaultParts.push(`${prop.name}: props.${prop.name} || ""`);
								} else if (prop.type.includes("number")) {
									defaultParts.push(`${prop.name}: props.${prop.name} || 0`);
								} else if (prop.type.includes("boolean")) {
									defaultParts.push(
										`${prop.name}: props.${prop.name} !== undefined ? props.${prop.name} : false`,
									);
								}
							} else if (prop.semanticType === "array") {
								defaultParts.push(`${prop.name}: props.${prop.name} || []`);
							}
						}

						if (defaultParts.length > 0) {
							transformCode = `props.${propName} || { ${defaultParts.join(", ")} }`;
						} else {
							transformCode = `props.${propName} || {}`;
						}
					} else if (param.name === "options") {
						transformCode = `props.${propName} || {}`;
					} else {
						transformCode = `props.${propName} || {}`;
					}
				}
				break;
			case "primitive":
				if (param.isOptional) {
					transformCode = `props.${propName}`;
				} else {
					// Required primitive - provide type-appropriate default
					if (param.type.includes("string")) {
						transformCode = `props.${propName} || ""`;
					} else if (param.type.includes("number")) {
						transformCode = `props.${propName} || 0`;
					} else if (param.type.includes("boolean")) {
						transformCode = `props.${propName} !== undefined ? props.${propName} : false`;
					} else {
						transformCode = `props.${propName}`;
					}
				}
				break;
			default:
				if (param.isOptional) {
					transformCode = `props.${propName}`;
				} else {
					transformCode = `props.${propName} || null`;
				}
		}

		mappings.push({
			propName,
			parameterIndex: i,
			parameterName: param.name,
			transformCode,
		});
	}

	return mappings;
}

function selectBestConstructor(
	constructors: ConstructorInfo[],
): ConstructorInfo | undefined {
	if (constructors.length === 0) return undefined;

	// Special preference for constructors with interface properties (options object pattern)
	const interfaceConstructors = constructors.filter((c) =>
		c.parameters.some(
			(p) => p.interfaceProperties && p.interfaceProperties.length > 0,
		),
	);

	if (interfaceConstructors.length > 0) {
		// Prefer the interface constructor with the highest rank
		const best = interfaceConstructors.sort(
			(a, b) => b.constructorRank - a.constructorRank,
		)[0];
		console.log(
			`🏆 Selected interface constructor with rank ${best.constructorRank}, parameters: ${best.parameters.map((p) => `${p.name}:${p.semanticType}`).join(", ")}`,
		);
		return best;
	}

	// Sort by rank (highest first) and select the best one
	const sortedConstructors = constructors.sort(
		(a, b) => b.constructorRank - a.constructorRank,
	);

	// Log the selection for debugging
	const best = sortedConstructors[0];
	if (best.constructorRank > 0) {
		console.log(
			`🏆 Selected constructor with rank ${best.constructorRank}, parameters: ${best.parameters.map((p) => `${p.name}:${p.semanticType}`).join(", ")}`,
		);
	}

	return best.constructorRank > 0 ? best : undefined;
}

function analyzeProperty(prop: any, className: string): PropertyInfo {
	const name = prop.getName();
	const type = prop.getType ? prop.getType().getText() : "any";
	const isReadonly = prop.isReadonly ? prop.isReadonly() : false;
	const hasSet = prop.getSetAccessor ? prop.getSetAccessor() !== undefined : false;
	
	// Detect texture properties by type analysis
	const isTextureProperty = isTextureType(type, name);
	if (isTextureProperty) {
		console.log(`🖼️  Detected texture property: ${className}.${name} (type: ${type})`);
	}
	
	// Determine handling strategy for read-only properties
	let handlingStrategy: PropertyInfo['handlingStrategy'] = 'normal';
	let methodMapping: PropertyInfo['methodMapping'];
	
	if (isReadonly && !hasSet) {
		const propertyKey = `${className}.${name}`;
		const handler = READ_ONLY_HANDLERS[propertyKey];
		
		if (handler) {
			switch (handler.type) {
				case 'boolean-methods':
					handlingStrategy = 'method-call';
					methodMapping = {
						'true': handler.trueMethod!,
						'false': handler.falseMethod!
					};
					console.log(`🔧 Read-only property ${propertyKey} -> method calls: true=${handler.trueMethod}, false=${handler.falseMethod}`);
					break;
				case 'setter-method':
					handlingStrategy = 'method-call';
					methodMapping = { 'value': handler.method! };
					console.log(`🔧 Read-only property ${propertyKey} -> setter method: ${handler.method}`);
					break;
				case 'constructor-only':
					handlingStrategy = 'constructor-only';
					console.log(`🔧 Read-only property ${propertyKey} -> constructor-only`);
					break;
				case 'skip':
					handlingStrategy = 'skip';
					console.log(`🔧 Read-only property ${propertyKey} -> skip (computed/derived)`);
					break;
			}
		} else {
			// Unknown read-only property - warn and skip
			console.warn(`⚠️  Unknown read-only property ${propertyKey} - add to READ_ONLY_HANDLERS config`);
			handlingStrategy = 'skip';
		}
	}
	
	return {
		name,
		type,
		isReadonly,
		hasSet,
		isTextureProperty,
		handlingStrategy,
		methodMapping,
	};
}

function generateTagMapping(classes: PixiClassInfo[]) {
	console.log("🏷️  Generating tag mapping...");

	const tagMappingCode = `// Auto-generated Pixi.js tag mapping
// Generated by scripts/generate-pixi-objects.ts

import * as PIXI from 'pixi.js';

export const PIXI_TAG_MAP = {
${classes.map((cls) => `  "${cls.tagName}": ${cls.className},`).join("\n")}
  // Special virtual element for texture definitions
  texture: null,
} as const;

export type PixiTag = keyof typeof PIXI_TAG_MAP;
`;

	writeGeneratedFile("generated/tag-mapping.ts", tagMappingCode);
}

function generatePropertyAppliers(classes: PixiClassInfo[]) {
	console.log("⚙️  Generating property appliers...");

	const propertyApplierCode = `// Auto-generated Pixi.js property appliers
// Generated by scripts/generate-pixi-objects.ts

import * as PIXI from 'pixi.js';
import { createPropertyApplier } from '../core/property-applier';
import { parseTextureUrl } from '../core/texture-url-parser';
import { textureRegistry } from '../core/texture-registry';

// Enhanced texture resolution with URL reference support and deferred resolution
function resolveTexture(textureRef: any, node?: any, property?: string): PIXI.Texture {
  if (!textureRef) return PIXI.Texture.EMPTY;
  
  if (textureRef instanceof PIXI.Texture) {
    return textureRef;
  }
  
  if (typeof textureRef === "string") {
    // Check if it's a URL reference (url(#id) or #id)
    const parsed = parseTextureUrl(textureRef);
    if (parsed) {
      const texture = textureRegistry.acquire(parsed.id);
      if (texture) {
        return texture;
      } else if (node && property) {
        // Defer resolution - texture may be defined later in the tree
        textureRegistry.addPendingReference({
          textureId: parsed.id,
          node,
          property,
          resolver: (targetNode, resolvedTexture) => {
            // Simple direct assignment - only called during finalize()
            if (targetNode[property] !== resolvedTexture) {
              targetNode[property] = resolvedTexture;
            }
          }
        });
        return PIXI.Texture.EMPTY; // Temporary fallback
      } else {
        console.warn(\`Texture reference "\${textureRef}" not found in registry. Available textures: \${textureRegistry.getIds().join(', ')}\`);
        return PIXI.Texture.EMPTY;
      }
    }
    
    // Direct texture path
    return PIXI.Texture.from(textureRef);
  }
  
  return PIXI.Texture.EMPTY;
}

${classes.map((cls) => generateClassPropertyApplier(cls)).join("\n\n")}

export const PROPERTY_APPLIERS = {
${classes
	.map((cls) => {
		const functionName = cls.name === "Text$1" ? "Text" : cls.name;
		return `  "${cls.tagName}": apply${functionName}Props,`;
	})
	.join("\n")}
} as const;
`;

	writeGeneratedFile("generated/property-appliers.ts", propertyApplierCode);
}

function generateClassPropertyApplier(cls: PixiClassInfo): string {
	// Generate custom property handlers based on analysis
	const customHandlers: string[] = [];

	// Generate handlers based on property analysis
	for (const prop of cls.properties) {
		if (prop.handlingStrategy === 'skip') {
			continue; // Skip computed/derived properties
		}
		
		if (prop.handlingStrategy === 'method-call' && prop.methodMapping) {
			// Generate method call handlers for read-only properties
			if (prop.methodMapping['true'] && prop.methodMapping['false']) {
				// Boolean method pattern (like playing -> play/stop)
				customHandlers.push(`  ${prop.name}: (node: ${cls.className}, value: any) => {
    if (value === true) {
      node.${prop.methodMapping['true']}();
    } else if (value === false) {
      node.${prop.methodMapping['false']}();
    }
  }`);
			} else if (prop.methodMapping['value']) {
				// Single method pattern
				customHandlers.push(`  ${prop.name}: (node: ${cls.className}, value: any) => {
    if (value !== undefined) {
      node.${prop.methodMapping['value']}(value);
    }
  }`);
			}
		}
		
		// Generate texture property handlers
		if (prop.isTextureProperty && prop.handlingStrategy !== 'method-call') {
			if (prop.name === 'textures' && prop.type.includes('[]')) {
				// Array of textures (like AnimatedSprite.textures)
				customHandlers.push(`  ${prop.name}: (node: ${cls.className}, value: any) => {
    if (Array.isArray(value)) {
      // For arrays, we need to handle deferred resolution differently
      const resolvedTextures = value.map((textureRef, index) => {
        if (typeof textureRef === "string") {
          const parsed = parseTextureUrl(textureRef);
          if (parsed) {
            const texture = textureRegistry.acquire(parsed.id);
            if (texture) {
              return texture;
            } else {
              // Defer resolution for array elements
              textureRegistry.addPendingReference({
                textureId: parsed.id,
                node,
                property: '${prop.name}',
                resolver: (targetNode, resolvedTexture) => {
                  // Replace the EMPTY texture at the correct index
                  const textures = [...targetNode.${prop.name}];
                  if (textures[index] !== resolvedTexture) {
                    textures[index] = resolvedTexture;
                    targetNode.${prop.name} = textures;
                  }
                }
              });
              return PIXI.Texture.EMPTY;
            }
          }
        }
        return resolveTexture(textureRef);
      });
      node.${prop.name} = resolvedTextures;
    }
  }`);
			} else {
				// Single texture property
				customHandlers.push(`  ${prop.name}: (node: ${cls.className}, value: any) => {
    if (value) {
      const resolvedTexture = resolveTexture(value, node, '${prop.name}');
      // Only assign if we got a real texture, not a deferred one
      if (resolvedTexture !== PIXI.Texture.EMPTY || !value.toString().includes('#')) {
        node.${prop.name} = resolvedTexture;
      }
    }
  }`);
			}
		}
	}

	// Add texture handling for sprite-like objects
	if (cls.name.includes("Sprite") || cls.tagName.includes("sprite")) {
		// Check if we already have a texture handler from property analysis
		const hasTextureHandler = customHandlers.some(handler => handler.includes('texture:'));
		if (!hasTextureHandler) {
			customHandlers.push(`  texture: (node: ${cls.className}, value: any) => {
    if (value) {
      const resolvedTexture = resolveTexture(value, node, 'texture');
      // Only assign if we got a real texture, not a deferred one
      if (resolvedTexture !== PIXI.Texture.EMPTY || !value.toString().includes('#')) {
        node.texture = resolvedTexture;
      }
    }
  }`);
		}
	}

	// Add special handling for AnimatedSprite textures array
	if (cls.name === "AnimatedSprite") {
		customHandlers.push(`  textures: (node: ${cls.className}, value: any) => {
    if (Array.isArray(value)) {
      // For arrays, we need to handle deferred resolution differently
      const resolvedTextures = value.map((textureRef, index) => {
        if (typeof textureRef === "string") {
          const parsed = parseTextureUrl(textureRef);
          if (parsed) {
            const texture = textureRegistry.acquire(parsed.id);
            if (texture) {
              return texture;
            } else {
              // Defer resolution for array elements
              textureRegistry.addPendingReference({
                textureId: parsed.id,
                node,
                property: 'textures',
                resolver: (targetNode, resolvedTexture) => {
                  // Replace the EMPTY texture at the correct index
                  const textures = [...targetNode.textures];
                  if (textures[index] !== resolvedTexture) {
                    textures[index] = resolvedTexture;
                    targetNode.textures = textures;
                  }
                }
              });
              return PIXI.Texture.EMPTY;
            }
          }
        }
        return resolveTexture(textureRef);
      });
      node.textures = resolvedTextures;
    }
  }`);

	}

	// Add texture handling for other sprite types
	if ((cls.name === "NineSliceSprite" || cls.name === "TilingSprite") && !customHandlers.some(h => h.includes('texture:'))) {
		customHandlers.push(`  texture: (node: ${cls.className}, value: any) => {
    if (value) {
      const resolvedTexture = resolveTexture(value, node, 'texture');
      // Only assign if we got a real texture, not a deferred one
      if (resolvedTexture !== PIXI.Texture.EMPTY || !value.toString().includes('#')) {
        node.texture = resolvedTexture;
      }
    }
  }`);
	}

	// Add style handling for text objects
	if (cls.name.includes("Text")) {
		customHandlers.push(`  style: (node: ${cls.className}, value: any) => {
    if (value) {
      node.style = new PIXI.TextStyle(value);
    }
  }`);
	}

	// Add draw function for Graphics
	if (cls.name === "Graphics") {
		customHandlers.push(`  draw: (node: ${cls.className}, drawFn: (g: PIXI.Graphics) => void) => {
    if (typeof drawFn === 'function') {
      node.clear();
      drawFn(node);
    }
  }`);
	}

	// Add texture and size handling for Mesh
	if (cls.name === "Mesh") {
		customHandlers.push(`  texture: (node: ${cls.className}, value: any) => {
    if (value) {
      const resolvedTexture = resolveTexture(value, node, 'texture');
      // Only assign if we got a real texture, not a deferred one
      if (resolvedTexture !== PIXI.Texture.EMPTY || !value.toString().includes('#')) {
        node.texture = resolvedTexture;
      }
    }
  }`);
	}

	const customHandlersStr =
		customHandlers.length > 0 ? `, {\n${customHandlers.join(",\n")}\n}` : "";

	// Fix function names for Text$1 -> Text
	const functionName = cls.name === "Text$1" ? "Text" : cls.name;
	const displayName = cls.name === "Text$1" ? "Text" : cls.name;

	return `export const apply${functionName}Props = createPropertyApplier<${cls.className}>('${displayName}'${customHandlersStr});`;
}

function generateConstructorHelpers(classes: PixiClassInfo[]) {
	console.log("🏗️  Generating constructor helpers...");

	const constructorCode = `// Auto-generated Pixi.js constructor helpers
// Generated by scripts/generate-pixi-objects.ts

import * as PIXI from 'pixi.js';
import type { PixiTag } from './tag-mapping';

// Helper function to resolve textures (including URL references)
function resolveTexture(textureRef: any): PIXI.Texture {
  if (!textureRef) return PIXI.Texture.EMPTY;
  
  if (textureRef instanceof PIXI.Texture) {
    return textureRef;
  }
  
  if (typeof textureRef === "string") {
    // For generated constructors, we'll just use PIXI.Texture.from for now
    // URL reference resolution will be handled by property appliers
    return PIXI.Texture.from(textureRef);
  }
  
  return PIXI.Texture.EMPTY;
}

// Flag to track if we've added prototype modifications
let prototypesModified = false;

export function createPixiObject(tag: PixiTag, PixiClass: any, props: Record<string, any>): any {
  // Add prototype modifications on first use
  if (!prototypesModified) {
    // Add setter for AnimatedSprite playing property to override readonly nature
    if (PIXI.AnimatedSprite && PIXI.AnimatedSprite.prototype) {
      Object.defineProperty(PIXI.AnimatedSprite.prototype, 'playing', {
        get() {
          return this.currentFrame < this.totalFrames && !this._paused;
        },
        set(value: boolean) {
          if (value) {
            this.play();
          } else {
            this.stop();
          }
        },
        configurable: true
      });
    }
    prototypesModified = true;
  }

  try {
    switch (tag) {
${classes.map((cls) => generateConstructorCase(cls)).join("\n")}
      default:
        return new PixiClass();
    }
  } catch (error) {
    console.warn(\`Failed to create \${tag} with constructor args, falling back to default:\`, error);
    return new PixiClass();
  }
}
`;

	writeGeneratedFile("generated/constructors.ts", constructorCode);
}

function generateConstructorCase(cls: PixiClassInfo): string {
	const tagName = cls.tagName;

	// With enhanced required parameter detection, we can be more aggressive
	const safeClasses = [
		"AnimatedSprite",
		"TilingSprite",
		"Text",
		"BitmapText",
		"HTMLText",
		"NineSliceSprite",
		"Mesh",
	];

	if (
		cls.bestConstructor &&
		cls.bestConstructor.propMappings.length > 0 &&
		safeClasses.includes(cls.name)
	) {
		const mappings = cls.bestConstructor.propMappings;

		// Check if any parameter has interface properties (indicating options object pattern)
		const optionsParam = cls.bestConstructor.parameters.find(
			(p) => p.interfaceProperties && p.interfaceProperties.length > 0,
		);

		if (optionsParam && optionsParam.interfaceProperties) {
			// Generate smart options object constructor using interface analysis
			return generateOptionsObjectConstructor(tagName, optionsParam);
		}

		// Separate required and optional parameters for better handling
		const requiredParams = cls.bestConstructor.parameters.filter(
			(p) => !p.isOptional,
		);
		const hasRequiredParams = requiredParams.length > 0;

		if (hasRequiredParams) {
			// Constructor has required parameters - always provide them
			const constructorArgs = mappings
				.map((mapping) => mapping.transformCode)
				.join(", ");

			return `      case '${tagName}': {
        try {
          return new PixiClass(${constructorArgs});
        } catch (constructorError) {
          console.warn(\`Constructor for \${tag} failed with args:\`, constructorError);
          // Try with fallback defaults for complex cases
          return new PixiClass();
        }
      }`;
		} else {
			// All parameters are optional - use original logic
			const constructorArgs = mappings
				.map((mapping) => {
					return `props.${mapping.propName} !== undefined ? ${mapping.transformCode} : undefined`;
				})
				.join(", ");

			return `      case '${tagName}': {
        const args = [${constructorArgs}].filter(arg => arg !== undefined);
        if (args.length === 0) {
          return new PixiClass();
        }
        try {
          return new PixiClass(...args);
        } catch (constructorError) {
          console.warn(\`Constructor for \${tag} failed with args:\`, constructorError);
          return new PixiClass();
        }
      }`;
		}
	}

	// Fallback to simple constructor for safety
	return `      case '${tagName}':
        return new PixiClass();`;
}

function generateOptionsObjectConstructor(
	tagName: string,
	optionsParam: ParameterInfo,
): string {
	const interfaceProps = optionsParam.interfaceProperties!;
	const requiredProps = interfaceProps.filter((p) => p.isRequired);
	const optionalProps = interfaceProps.filter((p) => !p.isRequired);

	console.log(
		`🏗️  Generating smart constructor for ${tagName} with interface properties:`,
		requiredProps.map((p) => `${p.name}:${p.semanticType}!`).join(", "),
		optionalProps.map((p) => `${p.name}:${p.semanticType}?`).join(", "),
	);

	// Generate options object construction
	const optionsLines: string[] = [];

	// Add required properties with smart defaults
	for (const prop of requiredProps) {
		if (prop.semanticType === "texture") {
			optionsLines.push(
				`            ${prop.name}: resolveTexture(props.${prop.name}) || PIXI.Texture.EMPTY`,
			);
		} else if (prop.semanticType === "object" && prop.name === "geometry") {
			optionsLines.push(`            ${prop.name}: props.${prop.name} || new PIXI.MeshGeometry({
              positions: new Float32Array([0, 0, 100, 0, 100, 100, 0, 100]),
              uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
              indices: new Uint32Array([0, 1, 2, 0, 2, 3])
            })`);
		} else if (prop.semanticType === "array") {
			if (prop.name.includes("texture") || prop.name === "textures") {
				optionsLines.push(
					`            ${prop.name}: (props.${prop.name} || []).map(resolveTexture)`,
				);
			} else {
				optionsLines.push(`            ${prop.name}: props.${prop.name} || []`);
			}
		} else if (prop.semanticType === "texture") {
			// Handle single texture requirement
			optionsLines.push(
				`            ${prop.name}: (props.${prop.name} || []).map(resolveTexture)`,
			);
		} else if (prop.name === "textures" && prop.semanticType === "texture") {
			// Special case for textures array
			optionsLines.push(
				`            ${prop.name}: (props.${prop.name} || []).map(resolveTexture)`,
			);
		} else if (prop.semanticType === "primitive" && prop.name === "geometry") {
			// Special case - geometry should be object type but detected as primitive
			optionsLines.push(`            ${prop.name}: props.${prop.name} || new PIXI.MeshGeometry({
              positions: new Float32Array([0, 0, 100, 0, 100, 100, 0, 100]),
              uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
              indices: new Uint32Array([0, 1, 2, 0, 2, 3])
            })`);
		} else if (prop.semanticType === "primitive") {
			if (prop.type.includes("string")) {
				optionsLines.push(`            ${prop.name}: props.${prop.name} || ""`);
			} else if (prop.type.includes("number")) {
				optionsLines.push(`            ${prop.name}: props.${prop.name} || 0`);
			} else if (prop.type.includes("boolean")) {
				optionsLines.push(
					`            ${prop.name}: props.${prop.name} !== undefined ? props.${prop.name} : false`,
				);
			} else {
				optionsLines.push(`            ${prop.name}: props.${prop.name}`);
			}
		} else {
			optionsLines.push(`            ${prop.name}: props.${prop.name}`);
		}
	}

	// Add optional properties with conditional inclusion
	for (const prop of optionalProps) {
		if (prop.semanticType === "texture") {
			optionsLines.push(
				`            ...(props.${prop.name} && { ${prop.name}: resolveTexture(props.${prop.name}) })`,
			);
		} else if (prop.name === "shader" || prop.name === "state") {
			optionsLines.push(
				`            ...(props.${prop.name} && { ${prop.name}: props.${prop.name} })`,
			);
		} else {
			optionsLines.push(
				`            ...(props.${prop.name} !== undefined && { ${prop.name}: props.${prop.name} })`,
			);
		}
	}

	return `      case '${tagName}': {
        try {
          // Auto-generated constructor using interface analysis
          const options = {
${optionsLines.join(",\n")}
          };
          return new PixiClass(options);
        } catch (constructorError) {
          console.warn(\`Constructor for \${tag} failed with auto-generated options:\`, constructorError);
          return new PixiClass();
        }
      }`;
}

function generateTypeDefinitions(classes: PixiClassInfo[]) {
	console.log("📝 Generating TypeScript definitions...");

	const typeDefinitions = `// Auto-generated Pixi.js JSX type definitions
// Generated by scripts/generate-pixi-objects.ts

import * as PIXI from 'pixi.js';

declare global {
  namespace JSX {
    interface IntrinsicElements {
${classes.map((cls) => generateJSXElementType(cls)).join("\n")}
      // Texture definition element
      texture: {
        id?: string;
        src?: string;
        children?: any;
      };
    }
  }
}
`;

	writeGeneratedFile("generated/jsx-types.ts", typeDefinitions);
}

function generateJSXElementType(cls: PixiClassInfo): string {
	// Generate basic JSX element type with common props
	return `      "${cls.tagName}": {
        // Common display object props
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        alpha?: number;
        visible?: boolean;
        rotation?: number;
        scale?: number | { x?: number; y?: number };
        anchor?: number | { x?: number; y?: number };
        tint?: number;

        // Event handlers
        onclick?: (event: any) => void;
        onmousedown?: (event: any) => void;
        onmouseup?: (event: any) => void;

        // Class-specific props
        ${generateClassSpecificProps(cls)}

        // Children
        children?: any;
      };`;
}

function generateClassSpecificProps(cls: PixiClassInfo): string {
	const props: string[] = [];

	if (cls.name.includes("Sprite")) {
		props.push("texture?: PIXI.Texture | string;");
	}

	if (cls.name.includes("Text")) {
		props.push("text?: string;");
		props.push("style?: PIXI.TextStyleOptions;");
	}

	if (cls.name === "Graphics") {
		props.push("draw?: (g: PIXI.Graphics) => void;");
	}

	return props.join("\n        ");
}

function writeGeneratedFile(relativePath: string, content: string) {
	// Get src directory relative to this script
	const srcDir = Path.resolve(
		Path.dirname(import.meta.url.replace("file://", "")),
		"../src",
	);
	const fullPath = Path.join(srcDir, relativePath);

	// Ensure directory exists
	FS.mkdirSync(Path.dirname(fullPath), {recursive: true});

	// Write file
	FS.writeFileSync(fullPath, content, "utf8");
	console.log(`📄 Generated: ${relativePath}`);
}

// Run the generator
main();
