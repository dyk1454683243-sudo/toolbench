/**
 * The tool registry, built from the tools directory at build time.
 *
 * This is the "local directory" source: a bundler glob over `tools/*`, which gives one lazily-imported
 * chunk per tool. Everything the harness needs to *draw* a tool comes from the manifest (data, eagerly
 * loaded and tiny); the tool's *code* stays behind a dynamic import until something asks for it.
 *
 * ⚠️ Both globs must be literal strings. A bundler can only follow an import it can see, so a computed
 * path would produce a URL that works in development and 404s in production — the classic version of
 * this bug. It is also why the same registry is imported by the worker: the worker's bundle needs its
 * own view of the module graph.
 */
import type { RegistryEntry } from "@toolbench/runtime";

/*
 * Two directories: the real examples, and the bench's own fixtures. `fixtures/stress` is a tool that
 * misbehaves on purpose, so the runtime's failure paths are something you can click rather than
 * something described in a comment. `fixtures/json-code` returns a `code` result so the host
 * `highlight` hook has something to paint.
 */
const manifests = {
	...(import.meta.glob("../../tools/*/tool.json", { eager: true, import: "default" }) as Record<string, unknown>),
	...(import.meta.glob("../fixtures/*/tool.json", { eager: true, import: "default" }) as Record<string, unknown>),
};
const modules = {
	...(import.meta.glob("../../tools/*/index.ts") as Record<string, () => Promise<unknown>>),
	...(import.meta.glob("../fixtures/*/index.ts") as Record<string, () => Promise<unknown>>),
};

export const registry: Record<string, RegistryEntry> = Object.fromEntries(
	Object.entries(manifests).map(([path, manifest]) => {
		const dir = path.slice(0, path.lastIndexOf("/"));
		const id = dir.split("/").at(-1) ?? path;
		const load = modules[`${dir}/index.ts`];
		if (!load) throw new Error(`${id} has a tool.json but no index.ts beside it`);
		return [id, { manifest, load: load as RegistryEntry["load"] }];
	}),
);

export const toolIds = Object.keys(registry).sort();
