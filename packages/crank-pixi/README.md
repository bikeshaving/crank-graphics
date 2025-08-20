# @crank/pixi

A Pixi.js renderer for Crank.js that allows you to create interactive graphics and games using Crank's declarative component model.

## Installation

```bash
npm install @crank/pixi pixi.js @crank/core
```

## Basic Usage

```tsx
import { renderer } from "@crank/pixi";
import * as PIXI from "pixi.js";

// Create a Pixi application
const app = new PIXI.Application({
  width: 800,
  height: 600,
  backgroundColor: 0x1099bb,
});

document.body.appendChild(app.view);

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
    g.beginFill(0xff0000);
    g.drawCircle(0, 0, 50);
    g.endFill();
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

Event listeners can be added using the `on*` prop pattern:

```tsx
<sprite 
  texture="button.png"
  interactive={true}
  onclick={(event) => console.log('Clicked!')}
  onmouseover={(event) => console.log('Hovered!')}
/>
```

## License

MIT