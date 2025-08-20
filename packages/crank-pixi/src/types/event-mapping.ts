// Event mapping types for JSX prop names to actual event names
// Following DOM conventions where event names are lowercase

export interface EventMapping {
  jsxProp: string;
  eventName: string;
  description: string;
}

// Comprehensive mapping of JSX event props to Pixi.js event names
export const PIXI_EVENT_MAPPING: EventMapping[] = [
  // Click events
  { jsxProp: 'onClick', eventName: 'click', description: 'Left mouse button click' },
  { jsxProp: 'onRightClick', eventName: 'rightclick', description: 'Right mouse button click' },
  { jsxProp: 'onTap', eventName: 'tap', description: 'Touch tap or click' },
  { jsxProp: 'onPointerTap', eventName: 'pointertap', description: 'Pointer tap (unified touch/mouse)' },

  // Mouse events
  { jsxProp: 'onMouseDown', eventName: 'mousedown', description: 'Mouse button pressed down' },
  { jsxProp: 'onMouseUp', eventName: 'mouseup', description: 'Mouse button released' },
  { jsxProp: 'onMouseMove', eventName: 'mousemove', description: 'Mouse movement over element' },
  { jsxProp: 'onMouseOver', eventName: 'mouseover', description: 'Mouse enters element' },
  { jsxProp: 'onMouseOut', eventName: 'mouseout', description: 'Mouse leaves element' },
  { jsxProp: 'onMouseEnter', eventName: 'mouseenter', description: 'Mouse enters element (no bubbling)' },
  { jsxProp: 'onMouseLeave', eventName: 'mouseleave', description: 'Mouse leaves element (no bubbling)' },
  { jsxProp: 'onMouseUpOutside', eventName: 'mouseupoutside', description: 'Mouse button released outside element' },
  { jsxProp: 'onGlobalMouseMove', eventName: 'globalmousemove', description: 'Global mouse movement while interacting' },

  // Right mouse button events
  { jsxProp: 'onRightDown', eventName: 'rightdown', description: 'Right mouse button pressed down' },
  { jsxProp: 'onRightUp', eventName: 'rightup', description: 'Right mouse button released' },
  { jsxProp: 'onRightUpOutside', eventName: 'rightupoutside', description: 'Right mouse button released outside element' },

  // Pointer events (unified touch/mouse/pen)
  { jsxProp: 'onPointerDown', eventName: 'pointerdown', description: 'Pointer pressed down (mouse/touch/pen)' },
  { jsxProp: 'onPointerUp', eventName: 'pointerup', description: 'Pointer released (mouse/touch/pen)' },
  { jsxProp: 'onPointerMove', eventName: 'pointermove', description: 'Pointer movement (mouse/touch/pen)' },
  { jsxProp: 'onPointerOver', eventName: 'pointerover', description: 'Pointer enters element' },
  { jsxProp: 'onPointerOut', eventName: 'pointerout', description: 'Pointer leaves element' },
  { jsxProp: 'onPointerEnter', eventName: 'pointerenter', description: 'Pointer enters element (no bubbling)' },
  { jsxProp: 'onPointerLeave', eventName: 'pointerleave', description: 'Pointer leaves element (no bubbling)' },
  { jsxProp: 'onPointerCancel', eventName: 'pointercancel', description: 'Pointer interaction cancelled' },
  { jsxProp: 'onPointerUpOutside', eventName: 'pointerupoutside', description: 'Pointer released outside element' },
  { jsxProp: 'onGlobalPointerMove', eventName: 'globalpointermove', description: 'Global pointer movement while interacting' },

  // Touch events
  { jsxProp: 'onTouchStart', eventName: 'touchstart', description: 'Touch started (mapped to pointerdown)' },
  { jsxProp: 'onTouchEnd', eventName: 'touchend', description: 'Touch ended (mapped to pointerup)' },
  { jsxProp: 'onTouchMove', eventName: 'touchmove', description: 'Touch movement (mapped to pointermove)' },
  { jsxProp: 'onTouchCancel', eventName: 'touchcancel', description: 'Touch cancelled' },
  { jsxProp: 'onTouchEndOutside', eventName: 'touchendoutside', description: 'Touch ended outside element' }
];

// Helper function to get event name from JSX prop
export function getEventNameFromProp(jsxProp: string): string | undefined {
  const mapping = PIXI_EVENT_MAPPING.find(m => m.jsxProp === jsxProp);
  return mapping?.eventName;
}

// Helper function to get JSX prop from event name
export function getJsxPropFromEvent(eventName: string): string | undefined {
  const mapping = PIXI_EVENT_MAPPING.find(m => m.eventName === eventName);
  return mapping?.jsxProp;
}

// Generate event handler type for Pixi.js
export type PixiEventHandler = (event: any) => void;

// Most commonly used events (as requested)
export const COMMON_PIXI_EVENTS = [
  'onClick',
  'onPointerDown', 
  'onPointerUp',
  'onPointerMove',
  'onPointerOver',
  'onPointerOut'
] as const;

// Three.js doesn't have built-in UI events like Pixi.js
// Interactions are typically handled via raycasting and intersection detection
// However, we can provide a similar interface for consistency
export const THREE_EVENT_MAPPING: EventMapping[] = [
  // These would need to be implemented via raycasting in the framework
  { jsxProp: 'onClick', eventName: 'click', description: 'Raycast click interaction' },
  { jsxProp: 'onPointerDown', eventName: 'pointerdown', description: 'Raycast pointer down interaction' },
  { jsxProp: 'onPointerUp', eventName: 'pointerup', description: 'Raycast pointer up interaction' },
  { jsxProp: 'onPointerMove', eventName: 'pointermove', description: 'Raycast pointer move interaction' },
  { jsxProp: 'onPointerOver', eventName: 'pointerover', description: 'Raycast pointer over interaction' },
  { jsxProp: 'onPointerOut', eventName: 'pointerout', description: 'Raycast pointer out interaction' },
  
  // Three.js specific events (these are real EventDispatcher events)
  { jsxProp: 'onAdded', eventName: 'added', description: 'Object added to scene graph' },
  { jsxProp: 'onRemoved', eventName: 'removed', description: 'Object removed from scene graph' }
];

export type ThreeEventHandler = (event: any) => void;

// Generate TypeScript interface for event handlers
export interface PixiEventHandlers {
  // Click events
  onClick?: PixiEventHandler;
  onRightClick?: PixiEventHandler;
  onTap?: PixiEventHandler;
  onPointerTap?: PixiEventHandler;

  // Mouse events
  onMouseDown?: PixiEventHandler;
  onMouseUp?: PixiEventHandler;
  onMouseMove?: PixiEventHandler;
  onMouseOver?: PixiEventHandler;
  onMouseOut?: PixiEventHandler;
  onMouseEnter?: PixiEventHandler;
  onMouseLeave?: PixiEventHandler;
  onMouseUpOutside?: PixiEventHandler;
  onGlobalMouseMove?: PixiEventHandler;

  // Right mouse events
  onRightDown?: PixiEventHandler;
  onRightUp?: PixiEventHandler;
  onRightUpOutside?: PixiEventHandler;

  // Pointer events (recommended for cross-platform)
  onPointerDown?: PixiEventHandler;
  onPointerUp?: PixiEventHandler;
  onPointerMove?: PixiEventHandler;
  onPointerOver?: PixiEventHandler;
  onPointerOut?: PixiEventHandler;
  onPointerEnter?: PixiEventHandler;
  onPointerLeave?: PixiEventHandler;
  onPointerCancel?: PixiEventHandler;
  onPointerUpOutside?: PixiEventHandler;
  onGlobalPointerMove?: PixiEventHandler;

  // Touch events
  onTouchStart?: PixiEventHandler;
  onTouchEnd?: PixiEventHandler;
  onTouchMove?: PixiEventHandler;
  onTouchCancel?: PixiEventHandler;
  onTouchEndOutside?: PixiEventHandler;
}

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