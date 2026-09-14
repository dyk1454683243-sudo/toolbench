import { resolve } from "node:path";
import { defineConfig } from "vite";

/**
 * The bench is a plain Vite app on purpose. No framework, no meta-framework — if the runtime needs
 * one, it is not "drop it into any page" and the design has failed.
 *
 * Three pages, because the three display modes are three different situations and putting them on one
 * page would let a bug in one hide behind another.
 */
export default defineConfig({
	/*
	 * ⚠️ `worker.format` defaults to "iife", which cannot code-split — so a worker that dynamically
	 * imports anything (ours imports one chunk per tool) builds fine in development and fails the
	 * production build. Every host that uses worker mode needs this line; it is in the README for that
	 * reason.
	 */
	worker: { format: "es" },
	build: {
		rollupOptions: {
			output: {
				/*
				 * Name each tool's chunk after the tool. Vite would otherwise call them all `index-*.js`
				 * because every tool's entry file is `index.ts` — which makes the network panel useless
				 * for the one thing this bench is trying to show, and made a test that matched on chunk
				 * names silently count the page's own entry as a tool.
				 */
				manualChunks(id: string) {
					const match = /\/(?:tools|fixtures)\/([^/]+)\/index\.ts$/.exec(id);
					return match ? `tool-${match[1]}` : null;
				},
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
