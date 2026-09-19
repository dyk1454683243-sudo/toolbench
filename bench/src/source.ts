/**
 * Links from a bench host back to its directory in the repository.
 *
 * Imported only from gallery and page scripts, not from `boot`. This is bench chrome
 * (a host site has its own repository links) and must not spend the published runtime figure.
 */
export const SOURCE_REPO = "https://github.com/eknowledger/toolbench";

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
