/**
 * Side-effecting entry for hosts that would rather import than call.
 *
 *   import "@toolbench/runtime/register";     // defines <tool-host>
 *   window.toolbench.configure({ source });   // …then hand it a source
 *
 * `defineToolHost` from the main entry is the better path for anything with a module graph. This
 * exists for a page with a plain `<script type="module">` and no bundler at all — which is a real
 * case worth supporting, because it is the cheapest way for someone to try this.
 */
import { defineToolHost, type ToolHostConfig } from "./element.ts";

declare global {
	interface Window {
		toolbench?: { configure(config: ToolHostConfig): void };
	}
}

if (typeof window !== "undefined") {
	window.toolbench = { configure: (config) => defineToolHost(config) };
}
