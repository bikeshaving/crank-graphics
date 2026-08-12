/// <reference lib="dom" />
import {
	describe,
	test,
	expect,
	beforeEach,
	afterEach,
} from "@b9g/libuild/test";
import * as THREE from "three";

import {renderer} from "../src/index.js";

declare global {
	namespace JSX {
		interface IntrinsicElements {
			// An unknown tag, for the error path
			nonsense: Record<string, never>;
		}
	}
}

describe("basic three.js rendering", () => {
	let scene: THREE.Scene;

	beforeEach(() => {
		// Create a test Three.js scene
		scene = new THREE.Scene();
	});

	afterEach(() => {
		// Clean up scene
		scene.clear();
	});

	test("simple group", () => {
		renderer.render(<group />, scene);

		expect(scene.children.length).toBe(1);
		expect(scene.children[0]).toBeInstanceOf(THREE.Group);
	});

	test("group with position", () => {
		renderer.render(<group x={100} y={200} z={300} />, scene);

		const group = scene.children[0] as THREE.Group;
		expect(group.position.x).toBe(100);
		expect(group.position.y).toBe(200);
		expect(group.position.z).toBe(300);
	});

	test("nested groups", () => {
		renderer.render(
			<group>
				<group x={50} y={50} z={10} />
				<group x={100} y={100} z={20} />
			</group>,
			scene
		);

		const parentGroup = scene.children[0] as THREE.Group;
		expect(parentGroup.children.length).toBe(2);

		const child1 = parentGroup.children[0] as THREE.Group;
		const child2 = parentGroup.children[1] as THREE.Group;

		expect(child1.position.x).toBe(50);
		expect(child1.position.y).toBe(50);
		expect(child1.position.z).toBe(10);
		expect(child2.position.x).toBe(100);
		expect(child2.position.y).toBe(100);
		expect(child2.position.z).toBe(20);
	});

	test("mesh with geometry and material", () => {
		// Create geometry and material separately first
		const geometry = new THREE.BoxGeometry(1, 1, 1);
		const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

		renderer.render(
			<mesh geometry={geometry} material={material} />,
			scene
		);

		const mesh = scene.children[0] as THREE.Mesh;
		expect(mesh).toBeInstanceOf(THREE.Mesh);

		// Check that geometry and material are present
		expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
		expect(mesh.material).toBeInstanceOf(THREE.MeshBasicMaterial);
	});

	test("scene with camera and light", () => {
		renderer.render(
			<scene>
				<perspectivecamera x={0} y={0} z={5} />
				<ambientlight />
				<directionallight x={1} y={1} z={1} />
			</scene>,
			scene
		);

		expect(scene.children.length).toBe(1);
		const childScene = scene.children[0] as THREE.Scene;
		expect(childScene).toBeInstanceOf(THREE.Scene);

		// Check that the nested scene has the camera and lights
		expect(childScene.children.length).toBe(3);
		expect(childScene.children[0]).toBeInstanceOf(THREE.PerspectiveCamera);
		expect(childScene.children[1]).toBeInstanceOf(THREE.AmbientLight);
		expect(childScene.children[2]).toBeInstanceOf(THREE.DirectionalLight);
	});

	test("object visibility", () => {
		renderer.render(<group visible={false} />, scene);

		const group = scene.children[0] as THREE.Group;
		expect(group.visible).toBe(false);
	});

	test("object rotation", () => {
		renderer.render(<group rotationX={Math.PI} rotationY={Math.PI/2} rotationZ={Math.PI/4} />, scene);

		const group = scene.children[0] as THREE.Group;
		expect(group.rotation.x).toBe(Math.PI);
		expect(group.rotation.y).toBe(Math.PI/2);
		expect(group.rotation.z).toBe(Math.PI/4);
	});

	test("object scale", () => {
		renderer.render(<group scaleX={2} scaleY={0.5} scaleZ={3} />, scene);

		const group = scene.children[0] as THREE.Group;
		expect(group.scale.x).toBe(2);
		expect(group.scale.y).toBe(0.5);
		expect(group.scale.z).toBe(3);
	});

	test("uniform scale", () => {
		renderer.render(<group scale={1.5} />, scene);

		const group = scene.children[0] as THREE.Group;
		expect(group.scale.x).toBe(1.5);
		expect(group.scale.y).toBe(1.5);
		expect(group.scale.z).toBe(1.5);
	});

	test("a spread across the six class hierarchies constructs the right types", () => {
		// One shallow pass over the catalog: an object, a geometry, a material,
		// a light, a camera, and a texture.
		renderer.render(
			<group>
				<bone name="joint" />
				<skinnedmesh name="skinned" />
				<batchedmesh args={[1, 16, 16]} name="batched" />
				<pointlight args={[0xff0000, 2, 100]} name="lamp" />
				<perspectivecamera args={[50, 2, 0.1, 100]} name="eye" />
				<mesh name="assembled">
					<torusknotgeometry />
					<meshphysicalmaterial clearcoat={1} />
				</mesh>
			</group>,
			scene,
		);

		const group = scene.children[0] as THREE.Group;
		const [bone, skinned, batched, lamp, eye, assembled] = group.children;

		expect(bone).toBeInstanceOf(THREE.Bone);
		expect(skinned).toBeInstanceOf(THREE.SkinnedMesh);
		expect(batched).toBeInstanceOf(THREE.BatchedMesh);

		// A light and a camera take their constructor arguments through args.
		expect(lamp).toBeInstanceOf(THREE.PointLight);
		expect((lamp as THREE.PointLight).intensity).toBe(2);
		expect((lamp as THREE.PointLight).distance).toBe(100);
		expect(eye).toBeInstanceOf(THREE.PerspectiveCamera);
		expect((eye as THREE.PerspectiveCamera).fov).toBe(50);

		const mesh = assembled as THREE.Mesh;
		expect(mesh.geometry).toBeInstanceOf(THREE.TorusKnotGeometry);
		expect((mesh.material as any).isMeshPhysicalMaterial).toBe(true);
		expect((mesh.material as THREE.MeshPhysicalMaterial).clearcoat).toBe(1);
	});

	test("a texture element of the catalog builds outside the scene graph", () => {
		const value = renderer.render(<datatexture />, scene);

		// A texture is a resource, so it never joins the children of an object.
		expect(value).toBeInstanceOf(THREE.DataTexture);
		expect(scene.children.length).toBe(0);
	});

	test("the args prop reaches the constructor", () => {
		renderer.render(<mesh args={[new THREE.BoxGeometry(2, 3, 4)]} />, scene);

		const mesh = scene.children[0] as THREE.Mesh;
		const geometry = mesh.geometry as THREE.BoxGeometry;
		expect(geometry.parameters.width).toBe(2);
		expect(geometry.parameters.depth).toBe(4);
	});

	test("an unknown tag is an error that names the tag", () => {
		expect(() => renderer.render(<nonsense />, scene)).toThrow(
			/Unknown Three.js tag: nonsense/,
		);
	});
});
