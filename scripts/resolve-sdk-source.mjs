/**
 * Point `@toolbench/sdk` at TypeScript source.
 *
 * ⚠️ The published export is `dist/index.js`. `packages/runtime/src/sources.ts` imports the
 * package name, and this repository does not keep `dist/` in git. Without the remap, any
 * script that loads a runtime `.ts` file fails with "Cannot find module .../dist/index.js"
 * unless someone has just run `pnpm build`. The measurement must stay runnable from a
 * clean checkout, because that is how a later reader reproduces the number in
 * docs/architecture.md §15.
 *
 * ⚠️ Exported as a hooks object for `registerHooks`, not as a loader module for `register`.
 * `module.register()` is deprecated from Node 26 (DEP0205) and prints a warning to stderr, which
 * is invisible on the Node 24 that CI pins and breaks anybody on a newer one: the first symptom
 * was this script's own `--help` test failing because stderr was not empty. `registerHooks` has
 * been available since Node 22.15, well below this repository's floor of 24, and its hooks are
 * synchronous rather than async.
 */
export const sdkSourceHooks = {
	resolve(specifier, context, nextResolve) {
		if (specifier === "@toolbench/sdk") {
			return nextResolve(new URL("../packages/sdk/src/index.ts", import.meta.url).href, context);
		}
		return nextResolve(specifier, context);
	},
};
