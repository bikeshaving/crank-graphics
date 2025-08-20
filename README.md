# @b9g/crank-graphics

> ⚠️ **Under Construction** - This project is in early development and is not yet published to npm. APIs are subject to change.

Graphics rendering packages for [Crank.js](https://crank.js.org) - supporting Pixi.js, Three.js and more.

## Packages

- **[@b9g/crank-pixi](./packages/crank-pixi)** - 2D graphics rendering with Pixi.js
- **[@b9g/crank-three](./packages/crank-three)** - 3D graphics rendering with Three.js  
- **[@b9g/crank-graphics-core](./packages/crank-graphics-core)** - Shared utilities and patterns

## Features

### 🎨 Declarative Graphics
Write graphics code using familiar JSX syntax:

```jsx
// Pixi.js
<PixiApplication width={800} height={600}>
  <texture id="player" src="/sprites/player.png" />
  <sprite texture="#player" x={100} y={100} />
</PixiApplication>

// Three.js  
<ThreeCanvas width={800} height={600}>
  <texture id="brick" src="/textures/brick.jpg" />
  <mesh>
    <boxGeometry />
    <meshStandardMaterial map="#brick" />
  </mesh>
</ThreeCanvas>
```

### 🔗 Asset Management
- **Registry-based assets**: Reference textures and models with `#id` syntax
- **Automatic loading**: Async asset loading with onload/onerror events
- **Reference counting**: Automatic cleanup when assets are no longer used
- **Deferred resolution**: Assets can be defined anywhere in the component tree

### 🎪 Framework Integration
- **EventTarget API**: Standard DOM-like event handling
- **Component patterns**: Proper Crank.js generator components
- **TypeScript**: Full type safety with auto-generated JSX types
- **Hot reload**: Development-friendly with fast refresh

## Getting Started

### Installation

> **Note**: Packages are not yet published to npm. For now, you can clone and build locally:

```bash
git clone https://github.com/bikeshaving/crank-graphics.git
cd crank-graphics
bun install
bun run build
```

Once published, you'll be able to install via:

```bash
# For 2D graphics with Pixi.js
bun add @b9g/crank-pixi

# For 3D graphics with Three.js  
bun add @b9g/crank-three

# For shared utilities
bun add @b9g/crank-graphics-core
```

### Basic Usage

#### Pixi.js 2D Graphics

```jsx
import {PixiApplication, renderer} from "@b9g/crank-pixi";
import {renderer as domRenderer} from "@b9g/crank/dom";

function* Game() {
  yield (
    <PixiApplication width={800} height={600} backgroundColor={0x1099bb}>
      <container>
        <text text="Hello Pixi!" x={100} y={100} />
        <sprite texture="path/to/sprite.png" x={200} y={200} />
      </container>
    </PixiApplication>
  );
}

domRenderer.render(<Game />, document.body);
```

#### Three.js 3D Graphics

```jsx
import {ThreeCanvas, renderer} from "@b9g/crank-three";
import {renderer as domRenderer} from "@b9g/crank/dom";

function* Scene() {
  yield (
    <ThreeCanvas width={800} height={600}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={0x00ff00} />
      </mesh>
    </ThreeCanvas>
  );
}

domRenderer.render(<Scene />, document.body);
```

## Development

This is a monorepo using Bun workspaces:

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Run tests
bun run test

# Type check
bun run typecheck

# Generate JSX types and property appliers
bun run generate
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run `bun run typecheck` and `bun run test`
6. Submit a pull request

## License

MIT © [Brian Kim](https://b9g.dev)