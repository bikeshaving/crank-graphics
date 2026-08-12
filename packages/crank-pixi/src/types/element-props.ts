/**
 * Prop types for JSX elements.
 *
 * Consumers use PixiElementProps to declare the tags that register() adds.
 */

import type * as PIXI from "pixi.js";

export interface PixiCommonProps {
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	alpha?: number;
	visible?: boolean;
	rotation?: number;
	scale?: number | {x?: number; y?: number};
	anchor?: number | {x?: number; y?: number};
	tint?: PIXI.ColorSource;
	children?: any;
	// The renderer applies the other props to the instance
	[prop: string]: any;
}

/**
 * Props of an extended element. The type parameter is the display object class.
 *
 * declare global {
 *   namespace JSX {
 *     interface IntrinsicElements {
 *       "myshape": PixiElementProps<MyShape>;
 *     }
 *   }
 * }
 */
export type PixiElementProps<T> = PixiCommonProps & {
	[K in keyof T]?: T[K];
};
