// Event mapping types for JSX prop names to actual event names in Three.js
// Following DOM conventions where event names are lowercase

export interface EventMapping {
  jsxProp: string;
  eventName: string;
  description: string;
  implementationNote?: string;
}

// Three.js doesn't have built-in UI events like Pixi.js
// Interactions are typically handled via raycasting and intersection detection
// However, we can provide a similar interface for consistency
export const THREE_EVENT_MAPPING: EventMapping[] = [
  // Simulated UI events (would need to be implemented via raycasting in the framework)
  { 
    jsxProp: 'onClick', 
    eventName: 'click', 
    description: 'Raycast click interaction',
    implementationNote: 'Requires raycasting implementation to detect mouse intersections'
  },
  { 
    jsxProp: 'onPointerDown', 
    eventName: 'pointerdown', 
    description: 'Raycast pointer down interaction',
    implementationNote: 'Requires raycasting implementation to detect pointer intersections'
  },
  { 
    jsxProp: 'onPointerUp', 
    eventName: 'pointerup', 
    description: 'Raycast pointer up interaction',
    implementationNote: 'Requires raycasting implementation to detect pointer intersections'
  },
  { 
    jsxProp: 'onPointerMove', 
    eventName: 'pointermove', 
    description: 'Raycast pointer move interaction',
    implementationNote: 'Requires raycasting implementation to detect pointer movement over objects'
  },
  { 
    jsxProp: 'onPointerOver', 
    eventName: 'pointerover', 
    description: 'Raycast pointer over interaction',
    implementationNote: 'Requires raycasting implementation to detect when pointer enters object bounds'
  },
  { 
    jsxProp: 'onPointerOut', 
    eventName: 'pointerout', 
    description: 'Raycast pointer out interaction',
    implementationNote: 'Requires raycasting implementation to detect when pointer leaves object bounds'
  },
  
  // Real Three.js EventDispatcher events (these work out of the box)
  { 
    jsxProp: 'onAdded', 
    eventName: 'added', 
    description: 'Object added to scene graph',
    implementationNote: 'Built-in Three.js EventDispatcher event'
  },
  { 
    jsxProp: 'onRemoved', 
    eventName: 'removed', 
    description: 'Object removed from scene graph',
    implementationNote: 'Built-in Three.js EventDispatcher event'
  }
];

// Helper function to get event name from JSX prop
export function getEventNameFromProp(jsxProp: string): string | undefined {
  const mapping = THREE_EVENT_MAPPING.find(m => m.jsxProp === jsxProp);
  return mapping?.eventName;
}

// Helper function to get JSX prop from event name
export function getJsxPropFromEvent(eventName: string): string | undefined {
  const mapping = THREE_EVENT_MAPPING.find(m => m.eventName === eventName);
  return mapping?.jsxProp;
}

// Generate event handler type for Three.js
export type ThreeEventHandler = (event: any) => void;

// Most commonly used events (focusing on the simulated UI events)
export const COMMON_THREE_EVENTS = [
  'onClick',
  'onPointerDown', 
  'onPointerUp',
  'onPointerMove',
  'onPointerOver',
  'onPointerOut'
] as const;

// TypeScript interfaces for event handlers
export interface ThreeEventHandlers {
  // Simulated UI events (would need raycasting implementation)
  onClick?: ThreeEventHandler;
  onPointerDown?: ThreeEventHandler;
  onPointerUp?: ThreeEventHandler;
  onPointerMove?: ThreeEventHandler;
  onPointerOver?: ThreeEventHandler;
  onPointerOut?: ThreeEventHandler;

  // Real Three.js EventDispatcher events
  onAdded?: ThreeEventHandler;
  onRemoved?: ThreeEventHandler;
}

// Note: The main difference from Pixi.js is that Three.js doesn't have
// built-in event handling for UI interactions. The framework would need
// to implement raycasting to support onClick, onPointerDown, etc.
// 
// Here's how it would typically work:
// 1. Set up a Raycaster and mouse/pointer event listeners on the canvas
// 2. On mouse/pointer events, use raycaster.intersectObjects() to find intersected objects
// 3. Fire the appropriate simulated events on the intersected Three.js objects
// 4. This allows JSX components to use familiar event handler props

export const IMPLEMENTATION_NOTES = {
  raycasting: `
    To implement UI events in Three.js, you'll typically need:
    
    1. Set up event listeners on the canvas/renderer
    2. Convert mouse/pointer coordinates to normalized device coordinates
    3. Use THREE.Raycaster to find intersected objects
    4. Fire custom events on intersected objects
    
    Example:
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    
    function onPointerDown(event) {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      if (intersects.length > 0) {
        const object = intersects[0].object;
        // Fire onClick event on the object
        object.dispatchEvent({ type: 'click', originalEvent: event });
      }
    }
  `,
  
  eventDispatcher: `
    Three.js objects inherit from EventDispatcher, so you can:
    
    - addEventListener(type, listener)
    - removeEventListener(type, listener) 
    - dispatchEvent(event)
    
    This works for custom events and built-in events like 'added' and 'removed'.
  `
};