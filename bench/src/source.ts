/**
 * Links from a bench host back to its directory in the repository.
 *
 * Imported only from gallery and page scripts, not from `boot`. This is bench chrome
 * (a host site has its own repository links) and must not spend the published runtime figure.
 *
 * Paths come from a lazy glob: the keys are the directory names, so this chunk does not
 * re-embed every `tool.json` that `registry.ts` already put in `boot`.
 */
export const SOURCE_REPO = "https://github.com/eknowledger/toolbench";

const toolManifests = import.meta.glob("../../tools/*/tool.json");
const fixtureManifests = import.meta.glob("../fixtures/*/tool.json");

function sourceDirFromManifestPath(path: string): string {
	const tools = /\/tools\/([^/]+)\/tool\.json$/.exec(path);
	if (tools) return `tools/${tools[1]}`;
	const fixtures = /\/fixtures\/([^/]+)\/tool\.json$/.exec(path);
	if (fixtures) return `bench/fixtures/${fixtures[1]}`;
	throw new Error(`cannot place ${path} in the repository tree`);
}

export const toolSourceDir: Record<string, string> = {};
for (const path of [...Object.keys(toolManifests), ...Object.keys(fixtureManifests)]) {
	const dir = sourceDirFromManifestPath(path);
	const id = dir.split("/").at(-1);
	if (id) toolSourceDir[id] = dir;
}

/** Example tools only. Bench fixtures stay off the front-page grid. */
export const exampleToolIds = Object.keys(toolSourceDir)
	.filter((id) => toolSourceDir[id]?.startsWith("tools/"))
	.sort();

export function sourceHref(dir: string): string {
	return `${SOURCE_REPO}/tree/main/${dir}/`;
}

export function appendSource(after: Element, dir: string): void {
	const p = document.createElement("p");
	p.className = "source";
	p.dataset.tool = dir.split("/").at(-1) ?? dir;
	const a = document.createElement("a");
	a.href = sourceHref(dir);
	a.textContent = `Source: ${dir}/`;
	a.rel = "noopener";
	p.append(a);
	after.after(p);
}
