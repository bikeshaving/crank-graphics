# @b9g/crank-three

A Three.js renderer for Crank.js. Write your 3D scene as JSX, and let Crank keep the
scene graph in sync with your state.

## Installation

```bash
npm install @b9g/crank-three @b9g/crank three
```

`@b9g/crank` and `three` are peer dependencies. Install both.

## Basic Usage

Render elements into a `THREE.Scene`. The renderer creates one Three.js object for each
element, and adds it to the parent object.

```tsx
import {renderer} from "@b9g/crank-three";
import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
const threeRenderer = new THREE.WebGLRenderer({antialias: true});

camera.position.z = 5;
threeRenderer.setSize(800, 600);
document.body.appendChild(threeRenderer.domElement);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({color: 0x00ff00});

function* Cube() {
  let rotation = 0;
  while (true) {
    rotation += 0.01;
    yield (
      <group>
        <mesh geometry={geometry} material={material} rotationY={rotation} />
        <ambientlight intensity={0.4} />
        <directionallight intensity={0.8} x={5} y={5} z={5} />
      </group>
    );
  }
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(<Cube />, scene);
  threeRenderer.render(scene, camera);
}

animate();
```

## ThreeCanvas

`ThreeCanvas` is a bridge component. It creates a `WebGLRenderer`, a `Scene`, and a
default `PerspectiveCamera`. It yields the canvas element, so you can put it in a DOM
tree that the Crank DOM renderer controls.

```tsx
import {renderer as domRenderer} from "@b9g/crank/dom";
import {ThreeCanvas} from "@b9g/crank-three";

function App() {
  return (
    <div class="stage">
      <ThreeCanvas width={800} height={600} background={0x101820}>
        <mesh geometry={geometry} material={material} />
        <ambientlight intensity={0.5} />
      </ThreeCanvas>
    </div>
  );
}

domRenderer.render(<App />, document.body);
```

The component accepts `width`, `height`, `background`, and `antialias`. It sends the
other props to the `WebGLRenderer` constructor. It disposes the renderer when the
component unmounts.

## Element Catalog

The element tags come from `src/generated/tag-mapping.ts`. A ts-morph script reads the
Three.js type declarations and writes that file. The script keeps every concrete
exported class that carries one of the Three.js hierarchy markers: `isObject3D`,
`isBufferGeometry`, `isMaterial`, `isTexture`, `isLight`, or `isCamera`. The same script
writes the property appliers, the constructor helper, and the JSX prop types. To
generate the files again after a Three.js upgrade, run `bun run generate`.

The catalog holds 94 tags. A tag is the class name in lower case, with no hyphens:
`BoxGeometry` becomes `boxgeometry`, and `LOD` becomes `lod`.

| Group | Tags |
| --- | --- |
| Containers | `object3d`, `scene`, `group`, `bone`, `lod` |
| Meshes and lines | `mesh`, `skinnedmesh`, `instancedmesh`, `batchedmesh`, `sprite`, `points`, `line`, `lineloop`, `linesegments` |
| Geometries | `buffergeometry`, `instancedbuffergeometry`, `boxgeometry`, `capsulegeometry`, `circlegeometry`, `conegeometry`, `cylindergeometry`, `dodecahedrongeometry`, `edgesgeometry`, `extrudegeometry`, `icosahedrongeometry`, `lathegeometry`, `octahedrongeometry`, `planegeometry`, `polyhedrongeometry`, `ringgeometry`, `shapegeometry`, `spheregeometry`, `tetrahedrongeometry`, `torusgeometry`, `torusknotgeometry`, `tubegeometry`, `wireframegeometry` |
| Materials | `meshbasicmaterial`, `meshstandardmaterial`, `meshphysicalmaterial`, `meshphongmaterial`, `meshlambertmaterial`, `meshtoonmaterial`, `meshmatcapmaterial`, `meshnormalmaterial`, `meshdepthmaterial`, `meshdistancematerial`, `shadermaterial`, `rawshadermaterial`, `shadowmaterial`, `spritematerial`, `pointsmaterial`, `linebasicmaterial`, `linedashedmaterial` |
| Lights | `ambientlight`, `directionallight`, `pointlight`, `spotlight`, `hemispherelight`, `rectarealight`, `lightprobe` |
| Cameras | `camera`, `perspectivecamera`, `orthographiccamera`, `arraycamera`, `cubecamera`, `stereocamera` |
| Helpers | `arrowhelper`, `axeshelper`, `box3helper`, `boxhelper`, `camerahelper`, `directionallighthelper`, `gridhelper`, `hemispherelighthelper`, `planehelper`, `pointlighthelper`, `polargridhelper`, `skeletonhelper`, `spotlighthelper` |
| Textures | `canvastexture`, `datatexture`, `data3dtexture`, `dataarraytexture`, `depthtexture`, `cubetexture`, `compressedtexture`, `compressedarraytexture`, `compressedcubetexture`, `framebuffertexture`, `videotexture` |
| Audio | `audio`, `audiolistener`, `positionalaudio` |
| Assets | `texture`, `asset` |

Two base classes have no tag. `Material` renders nothing without a shader, and the
`texture` tag belongs to the asset element below.

Scene fog is not an element, because `Fog` and `FogExp2` are not objects of the scene
graph. Set the `fog` prop of the scene instead: `<scene fog={new THREE.Fog(0x000000)}>`.

## Constructor Arguments

The renderer calls the constructor of the class with no arguments. Pass the `args` prop
when the class needs arguments, or when a constructor argument is more direct than a
property:

```tsx
<mesh args={[geometry, material]} />
<boxgeometry args={[2, 2, 2]} />
<audio args={[listener]} />
```

Eleven classes need `args`, because their constructors have a required parameter. The
audio classes, the light helpers, `camerahelper`, `skeletonhelper`,
`compressedcubetexture`, and `videotexture` are the classes.

## Resources and Disposal

A geometry child or a material child is not a child of the scene graph. Three.js holds
these as properties, so `<mesh>` takes them as its `geometry` and its `material`.

```tsx
<mesh>
  <boxgeometry args={[2, 2, 2]} />
  <meshstandardmaterial color={0x2266ff} />
</mesh>
```

The renderer never disposes a geometry, a material, or a texture. Call `dispose()`
yourself when you drop a resource. The one exception is the asset registry: it disposes
what it holds when the `texture` element or the `asset` element unmounts.

A re-render patches the object in place, so the object keeps its identity. The `args`
prop applies only at creation. To build the object again with new arguments, change the
`key` prop of the element.

## Custom Renderables

`register()` adds a class that the generated catalog does not hold: your own subclass,
or a class of `three/examples/jsm`. The function mirrors `customElements.define()`.

A registered tag must contain a dash. Generated tags never contain a dash, so a
registered tag cannot collide with one.

```tsx
import {register, renderer} from "@b9g/crank-three";
import type {ThreeElementProps} from "@b9g/crank-three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";

register("orbit-controls", OrbitControls);

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "orbit-controls": ThreeElementProps<OrbitControls>;
    }
  }
}

<orbit-controls args={[camera, threeRenderer.domElement]} enableDamping={true} />;
```

`ThreeElementProps<T>` gives the common props of an element, and the value properties
of the class. The renderer applies the props of a registered tag through the same path
as a generated tag.

Call `unregister(tag)` to remove a registration.

## Shorthand Props

Every element accepts the vector props `position`, `rotation`, and `scale`. Each of
them accepts a Three.js object, a triple, or a partial object such as `{x: 1}`.

Every element also accepts shorthand props for a single axis:

- `x`, `y`, `z` write to `position`
- `rotationX`, `rotationY`, `rotationZ` write to `rotation`
- `scaleX`, `scaleY`, `scaleZ` write to `scale`
- `scale` with a number writes the same value to all three axes

```tsx
<mesh x={2} y={-1} rotationY={Math.PI / 4} scale={0.5} />
```

## Assets and url(#id) References

The asset registry holds textures and other assets under an id. Define an asset with
the `texture` element or the `asset` element. These elements do not create a visible
object.

Refer to an asset from another element with `url(#id)` or with `#id`. The renderer also
accepts a direct path, and loads it with a `TextureLoader`.

```tsx
<scene>
  <texture id="bricks" src="/textures/bricks.png" onload={() => console.log("ready")} />

  <mesh geometry={geometry}>
    <meshbasicmaterial map="url(#bricks)" />
  </mesh>
</scene>
```

A reference can come before the definition. The renderer holds the reference, and
resolves it when the render finishes. You can also register an existing object:

```tsx
<texture id="checker" texture={createCheckerTexture()} />
```

The `asset` element takes the same props, and accepts other asset types through the
`type` prop.

## Event Handling

Three.js objects are event dispatchers. A prop that starts with `on` becomes an event
listener. The renderer removes the previous listener when the prop changes.

```tsx
<mesh onAdded={(event) => console.log("added", event)} />
```

## License

MIT
