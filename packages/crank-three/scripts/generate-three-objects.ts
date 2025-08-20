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

interface ThreeClassInfo {
	name: string;
	tagName: string;
	className: string;
	extendsClause?: string;
	implementsClause?: string[];
	constructors: ConstructorInfo[];
	properties: PropertyInfo[];
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

interface PropMapping {
	jsxProp: string;
	constructorParam: string;
	transformation?: string;
}

// Important Three.js classes we want to support
const IMPORTANT_CLASSES = [
	// Object3D hierarchy
	"Object3D",
	"Scene",
	"Group",
	
	// Mesh and geometry
	"Mesh",
	"BoxGeometry",
	"SphereGeometry",
	"PlaneGeometry",
	"CylinderGeometry",
	"ConeGeometry",
	"TorusGeometry",
	
	// Materials
	"MeshBasicMaterial",
	"MeshStandardMaterial",
	"MeshPhongMaterial",
	"MeshLambertMaterial",
	"PointsMaterial",
	"LineBasicMaterial",
	"LineDashedMaterial",
	
	// Lights
	"AmbientLight",
	"DirectionalLight",
	"PointLight",
	"SpotLight",
	"HemisphereLight",
	
	// Camera
	"PerspectiveCamera",
	"OrthographicCamera",
	
	// Helpers
	"AxesHelper",
	"GridHelper",
	"DirectionalLightHelper",
	"CameraHelper",
	
	// Others
	"Points",
	"Line",
	"LineLoop",
	"LineSegments",
	"Sprite",
];

function main() {
	console.log("🔍 Starting Three.js type introspection...");
	
	const project = new Project({
		tsConfigFilePath: "tsconfig.json",
	});

	// Add Three.js types - need to load individual files since they're distributed
	const threeTypesDir = Path.join(process.cwd(), "node_modules/@types/three/src");
	console.log(`📄 Loading types from: ${threeTypesDir}`);
	
	if (!FS.existsSync(threeTypesDir)) {
		console.error("❌ Three.js types not found. Install @types/three");
		process.exit(1);
	}

	// Load specific type files for the classes we care about
	const typeFilePaths = [
		"core/Object3D.d.ts",
		"scenes/Scene.d.ts", 
		"objects/Group.d.ts",
		"objects/Mesh.d.ts",
		"geometries/BoxGeometry.d.ts",
		"geometries/SphereGeometry.d.ts",
		"geometries/PlaneGeometry.d.ts",
		"geometries/CylinderGeometry.d.ts",
		"geometries/ConeGeometry.d.ts",
		"geometries/TorusGeometry.d.ts",
		"materials/MeshBasicMaterial.d.ts",
		"materials/MeshStandardMaterial.d.ts",
		"materials/MeshPhongMaterial.d.ts",
		"materials/MeshLambertMaterial.d.ts",
		"lights/AmbientLight.d.ts",
		"lights/DirectionalLight.d.ts",
		"lights/PointLight.d.ts",
		"lights/SpotLight.d.ts",
		"lights/HemisphereLight.d.ts",
		"cameras/PerspectiveCamera.d.ts",
		"cameras/OrthographicCamera.d.ts",
	];

	const sourceFiles = [];
	for (const filePath of typeFilePaths) {
		const fullPath = Path.join(threeTypesDir, filePath);
		if (FS.existsSync(fullPath)) {
			sourceFiles.push(project.addSourceFileAtPath(fullPath));
		}
	}
	
	// Find classes from all loaded files
	let allClasses = [];
	for (const sourceFile of sourceFiles) {
		allClasses.push(...sourceFile.getClasses());
	}
	console.log(`📊 Found ${allClasses.length} classes in Three.js types`);

	const threeClasses: ThreeClassInfo[] = [];

	for (const cls of allClasses) {
		const className = cls.getName();
		if (!className || !IMPORTANT_CLASSES.includes(className)) {
			continue;
		}

		console.log(`✅ Processing ${className}`);

		const classInfo = analyzeClass(cls);
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

function analyzeClass(cls: ClassDeclaration): ThreeClassInfo | null {
	const name = cls.getName();
	if (!name) return null;

	const tagName = classNameToTagName(name);
	const extendsClause = cls.getExtends()?.getText();
	
	// Determine what type of class this is
	const isObject3D = extendsClause?.includes("Object3D") || name === "Object3D";
	const isMaterial = name.includes("Material");
	const isGeometry = name.includes("Geometry");

	const constructors = cls.getConstructors().map(analyzeConstructor);
	const properties = cls.getProperties().map(analyzeProperty);

	return {
		name,
		tagName,
		className: `THREE.${name}`,
		extendsClause,
		implementsClause: cls.getImplements().map(i => i.getText()),
		constructors,
		properties,
		isObject3D,
		isMaterial,
		isGeometry,
	};
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

function classNameToTagName(className: string): string {
	// Convert PascalCase to kebab-case
	return className
		.replace(/([A-Z])/g, "-$1")
		.toLowerCase()
		.replace(/^-/, "");
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
import { textureRegistry } from '../core/texture-registry';

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
        return new THREE.Texture(); // Temporary fallback
      } else {
        console.warn(\`Texture reference "\${textureRef}" not found in registry. Available textures: \${textureRegistry.getIds().join(', ')}\`);
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

	// Add texture handling for materials
	if (cls.isMaterial) {
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
	console.log("🏗️  Generating constructor helpers...");
	
	const cases = classes.map(generateConstructorCase).join("\n");

	const code = `// Auto-generated Three.js constructor helpers
// Generated by scripts/generate-three-objects.ts

import * as THREE from 'three';
import type { ThreeTag } from './tag-mapping';

export function createThreeObject(tag: ThreeTag, ThreeClass: any, props: Record<string, any>): any {
  try {
    switch (tag) {
${cases}
      default:
        return new ThreeClass();
    }
  } catch (error) {
    console.warn(\`Failed to create \${tag} with constructor args, falling back to default:\`, error);
    return new ThreeClass();
  }
}
`;

	writeGeneratedFile("generated/constructors.ts", code);
}

function generateConstructorCase(cls: ThreeClassInfo): string {
	// Simple default constructors for now
	return `      case '${cls.tagName}':
        return new ThreeClass();`;
}

function generateJSXTypes(classes: ThreeClassInfo[]) {
	console.log("📝 Generating TypeScript definitions...");
	
	const interfaces = classes.map(cls => 
		`      "${cls.tagName}": {}; // TODO: Add proper props interface`
	).join("\n");

	const code = `// Auto-generated Three.js JSX type definitions
// Generated by scripts/generate-three-objects.ts

import * as THREE from 'three';

declare global {
  namespace JSX {
    interface IntrinsicElements {
${interfaces}
    }
  }
}

export {};
`;

	writeGeneratedFile("generated/jsx-types.ts", code);
}

function writeGeneratedFile(relativePath: string, content: string) {
	const fullPath = Path.join(process.cwd(), "src", relativePath);
	const dir = Path.dirname(fullPath);
	
	// Ensure directory exists
	FS.mkdirSync(dir, { recursive: true });
	
	FS.writeFileSync(fullPath, content);
	console.log(`📄 Generated: ${relativePath}`);
}

if (import.meta.main) {
	main();
}