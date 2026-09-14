/**
 * The three DOM helpers this package uses, and nothing more.
 *
 * No framework, on purpose: a host site should be able to drop `<tool-host>` into Astro, Next,
 * WordPress or a hand-written HTML file without installing anything. That trade means writing these
 * ourselves — about forty lines, which is cheaper than the alternative for everyone downstream.
 */

type Attrs = Record<string, string | number | boolean | undefined>;
type Child = Node | string | null | undefined | false;

/** `el("button", { class: "run", type: "button" }, "Run")` */
export function el<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	attrs?: Attrs,
	...children: Child[]
): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	apply(node, attrs, children);
	return node;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** Same, for SVG — the chart renderer's whole vocabulary. */
export function svg<K extends keyof SVGElementTagNameMap>(
	tag: K,
	attrs?: Attrs,
	...children: Child[]
): SVGElementTagNameMap[K] {
	const node = document.createElementNS(SVG_NS, tag);
	apply(node, attrs, children);
	return node;
}

function apply(node: Element, attrs: Attrs | undefined, children: Child[]): void {
	for (const [key, value] of Object.entries(attrs ?? {})) {
		if (value === undefined || value === false) continue;
		node.setAttribute(key, value === true ? "" : String(value));
	}
	for (const child of children.flat()) {
		if (child === null || child === undefined || child === false) continue;
		node.append(typeof child === "string" ? document.createTextNode(child) : child);
	}
}

/** Replace the contents of an element or a shadow root in one operation. */
export function fill(target: Element | ShadowRoot | DocumentFragment, ...children: Child[]): void {
	target.replaceChildren();
	for (const child of children.flat()) {
		if (child === null || child === undefined || child === false) continue;
		target.append(typeof child === "string" ? document.createTextNode(child) : child);
	}
}
