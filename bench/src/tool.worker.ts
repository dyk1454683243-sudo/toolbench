/**
 * The worker entry — six lines, and they live in the HOST rather than in the runtime package.
 *
 * The reason is worth knowing before you copy it: a worker has to `import()` the tool's module, and
 * only the host's bundler can resolve those paths. If the runtime tried to do it, it would need `eval`
 * or would emit URLs that break in a production build. Handing it a loader keeps the module graph
 * complete and keeps the runtime free of opinions about how you organise tools.
 */
import { createToolWorker } from "@toolbench/runtime/worker";
import { registry } from "./registry.ts";

createToolWorker({
	load: async (id) => {
		const entry = registry[id];
		if (!entry) throw new Error(`the worker has no tool with id "${id}"`);
		return (await entry.load()) as never;
	},
});
