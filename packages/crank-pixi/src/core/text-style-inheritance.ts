import * as PIXI from "pixi.js";
import {TEXT_PARENT} from "./symbols.js";

// Collect inherited text styles from parent chain
export function collectParentTextStyles(node: PIXI.Text): Record<string, any> {
	const styles: Record<string, any> = {};
	
	// First check for textParent (direct text parent that couldn't be a container)
	if ((node as any)[TEXT_PARENT] && (node as any)[TEXT_PARENT] instanceof PIXI.Text) {
		const textParent = (node as any)[TEXT_PARENT] as PIXI.Text;
		const parentStyle = textParent.style;
		
		// Always inherit key properties from text parent
		const parentStyleObj: Record<string, any> = {
			fontSize: parentStyle.fontSize,
			fontFamily: parentStyle.fontFamily,
			fill: parentStyle.fill,
		};
		
		// Only inherit non-normal values for weight/style to avoid overriding
		if (parentStyle.fontWeight !== "normal") parentStyleObj.fontWeight = parentStyle.fontWeight;
		if (parentStyle.fontStyle !== "normal") parentStyleObj.fontStyle = parentStyle.fontStyle;
		
		Object.assign(styles, parentStyleObj);
	}
	
	// Then walk up the actual parent chain for any other text ancestors
	let current = node.parent;
	while (current) {
		if (current instanceof PIXI.Text) {
			const parentStyle = current.style;
			const parentStyleObj: Record<string, any> = {};
			
			// Only inherit non-default values
			if (parentStyle.fontSize !== 26) parentStyleObj.fontSize = parentStyle.fontSize;
			if (parentStyle.fontFamily !== "Arial") parentStyleObj.fontFamily = parentStyle.fontFamily;
			if (parentStyle.fill !== 0x000000) parentStyleObj.fill = parentStyle.fill;
			if (parentStyle.fontWeight !== "normal") parentStyleObj.fontWeight = parentStyle.fontWeight;
			if (parentStyle.fontStyle !== "normal") parentStyleObj.fontStyle = parentStyle.fontStyle;
			
			// Merge parent's style (lower priority)
			Object.assign(parentStyleObj, styles);
			Object.assign(styles, parentStyleObj);
		}
		current = current.parent;
	}

	return styles;
}