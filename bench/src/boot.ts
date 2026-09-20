/**
 * One place that wires the runtime up, imported by every bench page.
 *
 * This is the entire integration surface for a host site: a source, a worker factory, and a function
 * that turns a tool id into a URL. Everything else is `<tool-host>` in the markup.
 */
import { defineToolHost, RegistrySource } from "@toolbench/runtime";
import { hostHighlight } from "./highlight.ts";
import { registry } from "./registry.ts";
import { installThemeControl } from "./theme.ts";

installThemeControl();

export const source = new RegistrySource(registry);

// Which highlighter, including the deliberately broken ones a browser test needs. Chosen inside
// highlight.ts so the query-param read and those hooks stay out of the chunk the README publishes.
const hostHook = hostHighlight(location.search);

defineToolHost({
	source,
	/*
	 * Only tools declaring `thread: "worker"` ever cause this to be called, and it is called once. A
	 * host that has no worker-mode tools can leave it out; those tools then run on the main thread with
	 * a console warning, which is a slower tool rather than a broken page.
	 */
	workerFactory: () => new Worker(new URL("./tool.worker.ts", import.meta.url), { type: "module" }),
	/*
	 * Relative to the current page, not to the origin. Every bench HTML file sits in the same
	 * directory, so `./tool.html` works at `/` locally and at `/toolbench/` on project Pages.
	 * An origin-absolute `/tool.html` would 404 under that prefix.
	 */
	pageUrl: (id) => `./tool.html?id=${encodeURIComponent(id)}`,
	...(hostHook ? { highlight: hostHook } : {}),
});
