# @b9g/crank-pixi

A Pixi.js renderer for Crank.js that allows you to create interactive graphics and games using Crank's declarative component model.

## Installation

```bash
npm install @b9g/crank-pixi pixi.js @b9g/crank
```

## Basic Usage

```tsx
import { renderer } from "@b9g/crank-pixi";
import * as PIXI from "pixi.js";

// Create a Pixi application
const app = new PIXI.Application();
await app.init({
  width: 800,
  height: 600,
  backgroundColor: 0x1099bb,
});

document.body.appendChild(app.canvas);

// Define a Crank component
function* GameScene() {
  let rotation = 0;
  
  while (true) {
    rotation += 0.01;
    
    yield (
      <container>
        <sprite 
          texture="path/to/sprite.png"
          x={400}
          y={300}
          anchor={{ x: 0.5, y: 0.5 }}
          rotation={rotation}
        />
        <text 
          text="Hello Pixi + Crank!"
          x={400}
          y={100}
          anchor={{ x: 0.5, y: 0.5 }}
          style={{
            fontFamily: 'Arial',
            fontSize: 36,
            fill: 0xffffff,
          }}
        />
      </container>
    );
  }
}

// Render the component
renderer.render(<GameScene />, app.stage);

// Start the game loop
app.ticker.add(() => {
  // Crank will handle updates automatically
});
```

## Supported Elements

The generator reads the Pixi type definitions and emits one tag for each
concrete class that extends `PIXI.Container`. The tag is the class name in lower
case, with no hyphens:

`container`, `sprite`, `graphics`, `text`, `htmltext`, `bitmaptext`,
`splittext`, `splitbitmaptext`, `animatedsprite`, `tilingsprite`,
`nineslicesprite`, `particlecontainer`, `mesh`, `meshplane`, `meshrope`,
`meshsimple`, `perspectivemesh`, `domcontainer`, `renderlayer`,
`rendercontainer`.

`rendercontainer` needs a `render` function prop, because Pixi draws it through
that function.

### `<container>`
A basic display object container that can hold other display objects.

```tsx
<container x={100} y={100} alpha={0.8}>
  {/* child elements */}
</container>
```

### `<sprite>`
Displays an image or texture.

```tsx
<sprite 
  texture="path/to/image.png"
  x={100}
  y={100}
  width={64}
  height={64}
  anchor={{ x: 0.5, y: 0.5 }}
  tint={0xff0000}
/>
```

### `<text>`
Displays text with styling options.

```tsx
<text 
  text="Hello World"
  x={100}
  y={100}
  style={{
    fontFamily: 'Arial',
    fontSize: 24,
    fill: 0xffffff,
    align: 'center'
  }}
/>
```

### `<graphics>`
For drawing shapes and graphics programmatically.

```tsx
<graphics 
  x={100}
  y={100}
  draw={(g) => {
    g.circle(0, 0, 50);
    g.fill(0xff0000);
  }}
/>
```

## Common Properties

All Pixi display objects support these common properties:

- `x`, `y` - Position
- `width`, `height` - Size
- `alpha` - Transparency (0-1)
- `visible` - Visibility boolean
- `rotation` - Rotation in radians
- `scale` - Scale factor (number or {x, y} object)
- `anchor` - Anchor point for sprites/text (number or {x, y} object)
- `tint` - Color tint (hex color)

## Event Handling

Add event listeners with the `on*` prop pattern:

```tsx
<sprite 
  texture="button.png"
  interactive={true}
  onClick={(event) => console.log('Clicked!')}
  onMouseOver={(event) => console.log('Hovered!')}
/>
```

## Custom renderables

Use `register()` for your own `Container` subclasses and for third-party display
objects. The API mirrors `customElements.define()`.

```tsx
import { register, renderer } from "@b9g/crank-pixi";
import * as PIXI from "pixi.js";

class Radar extends PIXI.Container {
  sweep = 0;
}

register("my-radar", Radar);

renderer.render(<my-radar x={100} y={100} sweep={0.5} />, app.stage);
```

The tag name must contain a dash, as `customElements.define()` also requires.
Generated Pixi tags have no dash, so the two groups never collide.

To type the new tag, augment `JSX.IntrinsicElements` with `PixiElementProps`:

```tsx
import type { PixiElementProps } from "@b9g/crank-pixi";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "my-radar": PixiElementProps<Radar>;
    }
  }
}
```

## License

MIT