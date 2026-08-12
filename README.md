# Crank Graphics

> ⚠️ **Under construction.** These packages are not yet on npm. The first release
> will ship together with Crank 0.8. The current code works with Crank 0.7.

Graphics renderers for [Crank.js](https://crank.js.org). Write Pixi.js and
Three.js scenes as JSX, with components as plain functions, generators, and
promises.

## Packages

- **[@b9g/crank-pixi](./packages/crank-pixi)** — 2D rendering with Pixi.js
- **[@b9g/crank-three](./packages/crank-three)** — 3D rendering with Three.js

## Example

Every concrete class in each library is a typed JSX element. The tag name is
the class name in lowercase.

```tsx
// Pixi.js
import {renderer} from "@b9g/crank-pixi";

renderer.render(
  <container>
    <texture id="player" src="/sprites/player.png" />
    <sprite texture="url(#player)" x={100} y={100} />
    <text text="Score: 0" style={{fill: 0xffffff}} />
  </container>,
  app.stage,
);
```

```tsx
// Three.js
import {renderer} from "@b9g/crank-three";

renderer.render(
  <group>
    <mesh rotationY={0.5}>
      <torusknotgeometry args={[1, 0.4, 128, 32]} />
      <meshphysicalmaterial color={0x4488ff} clearcoat={1} />
    </mesh>
    <ambientlight intensity={0.4} />
    <directionallight intensity={0.8} x={5} y={5} z={5} />
  </group>,
  scene,
);
```

## How the elements are made

The element catalogs are generated, not written by hand. A ts-morph script in
each package introspects the library's type definitions. The script finds every
concrete class in the render hierarchy, selects a constructor, and emits the
tag map, the property appliers, and the JSX prop types.

This gives parity with each library by rule:

- **crank-pixi** accepts every concrete class that extends `Container`
  (20 tags).
- **crank-three** accepts every concrete class with a Three.js hierarchy
  marker, such as `isObject3D` or `isMaterial` (94 tags).

Run `bun run generate` after a Pixi or Three upgrade to refresh the catalogs.

## Custom renderables

Register your own classes with `register()`. A registered tag name must
contain a dash, like a custom element on the web. Dashless names stay
reserved for the generated elements.

```tsx
import {register} from "@b9g/crank-three";
register("orbit-controls", OrbitControls);
```

## Events

Event props use DOM conventions: `onClick`, `onPointerDown`, `onPointerMove`.
See the [event mapping guide](./EVENT_MAPPING_GUIDE.md).

## Development

The repository is a Bun workspace. Builds and tests run on
[@b9g/libuild](https://github.com/bikeshaving/libuild).

```bash
bun install
bun run build      # libuild build, each package
bun run test       # libuild test, in Chromium
bun run typecheck  # tsc --noEmit, each package
bun run generate   # regenerate the element catalogs
```

## License

MIT
