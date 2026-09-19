/**
 * Point `@toolbench/sdk` at TypeScript source.
 *
 * ⚠️ The published export is `dist/index.js`. `packages/runtime/src/sources.ts` imports the
 * package name, and this repository does not keep `dist/` in git. Without the remap, any
 * script that loads a runtime `.ts` file fails with "Cannot find module .../dist/index.js"
 * unless someone has just run `pnpm build`. The measurement must stay runnable from a
 * clean checkout, because that is how a later reader reproduces the number in
 * docs/architecture.md §15.
 */
export async function resolve(specifier, context, nextResolve) {
	if (specifier === "@toolbench/sdk") {
		return nextResolve(new URL("../packages/sdk/src/index.ts", import.meta.url).href, context);
	}
	return nextResolve(specifier, context);
}
