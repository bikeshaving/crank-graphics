# Event Mapping Guide for Crank Graphics

This guide documents the comprehensive event mapping system created for both Pixi.js and Three.js packages, providing a unified JSX-based event handling interface following DOM conventions.

## Overview

Both crank-pixi and crank-three packages now support comprehensive event handlers through JSX props that map to lowercase event names, following standard DOM conventions.

### Key Principles

1. **JSX Props use PascalCase**: `onClick`, `onPointerDown`, `onMouseMove`
2. **Event names are lowercase**: `click`, `pointerdown`, `mousemove`
3. **Follow DOM conventions**: Same naming as standard HTML/DOM events
4. **Cross-platform consistency**: Same event prop names work across both packages

## Pixi.js Event Mapping

Pixi.js has comprehensive built-in event support through its FederatedEventSystem.

### Complete Event Support

#### Click Events
- `onClick` → `click` - Left mouse button click
- `onRightClick` → `rightclick` - Right mouse button click
- `onTap` → `tap` - Touch tap or click
- `onPointerTap` → `pointertap` - Pointer tap (unified touch/mouse)

#### Mouse Events
- `onMouseDown` → `mousedown` - Mouse button pressed down
- `onMouseUp` → `mouseup` - Mouse button released
- `onMouseMove` → `mousemove` - Mouse movement over element
- `onMouseOver` → `mouseover` - Mouse enters element
- `onMouseOut` → `mouseout` - Mouse leaves element
- `onMouseEnter` → `mouseenter` - Mouse enters element (no bubbling)
- `onMouseLeave` → `mouseleave` - Mouse leaves element (no bubbling)
- `onMouseUpOutside` → `mouseupoutside` - Mouse released outside element
- `onGlobalMouseMove` → `globalmousemove` - Global mouse movement during interaction

#### Right Mouse Events
- `onRightDown` → `rightdown` - Right mouse button pressed
- `onRightUp` → `rightup` - Right mouse button released
- `onRightUpOutside` → `rightupoutside` - Right mouse released outside element

#### Pointer Events (Recommended)
- `onPointerDown` → `pointerdown` - Pointer pressed (mouse/touch/pen)
- `onPointerUp` → `pointerup` - Pointer released
- `onPointerMove` → `pointermove` - Pointer movement
- `onPointerOver` → `pointerover` - Pointer enters element
- `onPointerOut` → `pointerout` - Pointer leaves element
- `onPointerEnter` → `pointerenter` - Pointer enters element (no bubbling)
- `onPointerLeave` → `pointerleave` - Pointer leaves element (no bubbling)
- `onPointerCancel` → `pointercancel` - Pointer interaction cancelled
- `onPointerUpOutside` → `pointerupoutside` - Pointer released outside element
- `onGlobalPointerMove` → `globalpointermove` - Global pointer movement during interaction

#### Touch Events
- `onTouchStart` → `touchstart` - Touch started
- `onTouchEnd` → `touchend` - Touch ended
- `onTouchMove` → `touchmove` - Touch movement
- `onTouchCancel` → `touchcancel` - Touch cancelled
- `onTouchEndOutside` → `touchendoutside` - Touch ended outside element

### Usage Example (Pixi.js)

```tsx
<sprite 
  texture="player.png" 
  x={100} 
  y={100}
  onClick={(event) => console.log('Sprite clicked!')}
  onPointerDown={(event) => console.log('Pointer down on sprite')}
  onPointerMove={(event) => console.log('Pointer moving over sprite')}
  onPointerOver={(event) => console.log('Pointer entered sprite')}
  onPointerOut={(event) => console.log('Pointer left sprite')}
/>
```

## Three.js Event Mapping

Three.js doesn't have built-in UI event handling like Pixi.js. Events are typically implemented through raycasting.

### Supported Events

#### Simulated UI Events (Require Framework Implementation)
- `onClick` → `click` - Raycast click interaction
- `onPointerDown` → `pointerdown` - Raycast pointer down
- `onPointerUp` → `pointerup` - Raycast pointer up  
- `onPointerMove` → `pointermove` - Raycast pointer movement
- `onPointerOver` → `pointerover` - Raycast pointer enter
- `onPointerOut` → `pointerout` - Raycast pointer leave

#### Real Three.js EventDispatcher Events
- `onAdded` → `added` - Object added to scene graph
- `onRemoved` → `removed` - Object removed from scene graph

### Usage Example (Three.js)

```tsx
<mesh 
  position={[0, 0, 0]}
  onClick={(event) => console.log('Mesh clicked!')}
  onPointerOver={(event) => console.log('Pointer over mesh')}
  onAdded={(event) => console.log('Mesh added to scene')}
>
  <boxgeometry args={[1, 1, 1]} />
  <meshstandardmaterial color="red" />
</mesh>
```

## Implementation Details

### Files Created/Updated

#### Pixi.js Package
- `src/types/event-mapping.ts` - Complete event mapping definitions
- `scripts/generate-pixi-objects.ts` - Updated to generate comprehensive event handlers
- `src/generated/jsx-types.ts` - Auto-generated with all event handlers

#### Three.js Package
- `src/types/event-mapping.ts` - Event mapping with raycasting notes
- `scripts/generate-three-objects.ts` - Updated to generate event handlers
- `src/generated/jsx-types.ts` - Auto-generated with event handlers

### Key Features

1. **Type Safety**: Full TypeScript support for all event handlers
2. **Consistent API**: Same prop names work across both libraries
3. **DOM Conventions**: Follows standard web event naming
4. **Comprehensive Coverage**: All Pixi.js events supported
5. **Future-Ready**: Three.js events ready for raycasting implementation

### Most Common Events (Focus Areas)

Based on your requirements, these are the most commonly used events:

- `onClick` → `click`
- `onPointerDown` → `pointerdown` 
- `onPointerUp` → `pointerup`
- `onPointerMove` → `pointermove`
- `onPointerOver` → `pointerover`
- `onPointerOut` → `pointerout`

## Raycasting Implementation Notes (Three.js)

The Three.js simulated UI events require a raycasting implementation:

```typescript
// Basic raycasting setup for Three.js events
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function handlePointerEvent(event: PointerEvent) {
  // Convert to normalized device coordinates
  pointer.x = (event.clientX / canvas.clientWidth) * 2 - 1;
  pointer.y = -(event.clientY / canvas.clientHeight) * 2 + 1;
  
  // Update raycaster
  raycaster.setFromCamera(pointer, camera);
  
  // Find intersections
  const intersects = raycaster.intersectObjects(scene.children, true);
  
  if (intersects.length > 0) {
    const object = intersects[0].object;
    // Dispatch event on the intersected object
    object.dispatchEvent({ 
      type: 'click', 
      originalEvent: event,
      intersection: intersects[0]
    });
  }
}
```

## Regenerating Types

Both packages use auto-generation scripts:

```bash
# Regenerate Pixi.js types
cd packages/crank-pixi
bun run scripts/generate-pixi-objects.ts

# Regenerate Three.js types  
cd packages/crank-three
bun run scripts/generate-three-objects.ts
```

The generated files will include all the comprehensive event handlers automatically.