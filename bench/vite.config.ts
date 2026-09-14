import { resolve } from "node:path";
import { defineConfig } from "vite";

/**
 * The bench is a plain Vite app on purpose. No framework, no meta-framework — if the runtime needs
 * one, it is not "drop it into any page" and the design has failed.
 *
 * Three pages, because the three display modes are three different situations and putting them on one
 * page would let a bug in one hide behind another.
 */
/**
 * Name each tool's chunk after the tool. Vite would otherwise call them all `index-*.js`, because
 * every tool's entry file is `index.ts` — which makes the network panel useless for the one thing
 * this bench exists to show, and once made a test that matched on chunk names silently count the
 * page's own entry as a tool.
 */
function toolChunk(id: string, prefix: string): string | null {
	const match = /\/(?:tools|fixtures)\/([^/]+)\/index\.ts$/.exec(id);
	return match ? `${prefix}${match[1]}` : null;
}

export default defineConfig({
	/*
	 * ⚠️ `worker.format` defaults to "iife", which cannot code-split — so a worker that dynamically
	 * imports anything (ours imports one chunk per tool) builds fine in development and fails the
	 * production build. Every host that uses worker mode needs this line; it is in the README for that
	 * reason.
	 */
	worker: {
		format: "es",
		/*
		 * ⚠️ Vite builds the worker in a SEPARATE Rollup pass, so it shares no chunks with the main
		 * build and none of `build.rollupOptions` applies to it. Two consequences:
		 *
		 *  - every tool reachable from the worker is emitted a second time. That is unavoidable here,
		 *    and it costs deploy bytes rather than reader bytes: a tool declares one thread, so a
		 *    reader downloads one copy. Documented rather than hidden.
		 *  - without this block the worker's copies are all called `index-*.js`, which is how the
		 *    duplication stayed invisible in the first place. Naming them `worker-tool-<id>` makes the
		 *    network panel say which thread actually ran, which is the first thing you want to know
		 *    when a worker-mode tool misbehaves.
		 */
		rollupOptions: { output: { manualChunks: (id: string) => toolChunk(id, "worker-tool-") } },
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: (id: string) => toolChunk(id, "tool-"),
			},
			input: {
				index: resolve(import.meta.dirname, "index.html"),
				tool: resolve(import.meta.dirname, "tool.html"),
				article: resolve(import.meta.dirname, "article.html"),
			},
		},
	},
	server: { port: 5180, fs: { allow: [resolve(import.meta.dirname, "..")] } },
	preview: { port: 4173 },
});
