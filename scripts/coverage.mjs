/**
 * Report Node-suite coverage. No threshold.
 *
 * Why a script rather than a one-liner on `node --test --experimental-test-coverage`:
 * the useful output is the uncovered list, and CI needs that list in $GITHUB_STEP_SUMMARY
 * as markdown, labelled as Node-only. Scraping the spec reporter for that is how a
 * formatter silently goes stale when Node rewords a column.
 *
 * `run({ coverage: true })` is the same collector as `--experimental-test-coverage`.
 * `lineCoverage` / `branchCoverage` / `functionCoverage` are deliberately omitted:
 * those options (and the matching CLI flags) fail the process on a percentage, which
 * produces tests written to satisfy the percentage.
 *
 * Browser coverage from `pnpm test:bench` never appears here. Files this process never
 * loads (the runtime, which needs a DOM) do not show as 0% rows either; they are listed
 * separately so a raw figure cannot be mistaken for "the runtime is well tested".
 */
import { appendFileSync, globSync } from "node:fs";
import { relative, resolve } from "node:path";
import { finished } from "node:stream/promises";
import { run } from "node:test";
import { spec } from "node:test/reporters";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

/** Same globs as the `test` script. Coverage measures what those tests load. */
const TEST_GLOBS = ["packages/**/*.test.ts", "tools/**/*.test.ts"];

const HEADER = `\
Node test coverage
==================
Suite: ${TEST_GLOBS.join(", ")}
Not included: browser / Playwright coverage from \`pnpm test:bench\`.
No fail-on-threshold. The useful output is the uncovered list, not the percentage.

`;

/**
 * Compress 1,2,3,7 into "1-3 7", matching the built-in report's uncovered-lines column.
 * @param {number[]} nums
 */
function ranges(nums) {
	if (nums.length === 0) return "";
	const sorted = [...new Set(nums)].sort((a, b) => a - b);
	/** @type {string[]} */
	const out = [];
	let start = sorted[0];
	let prev = sorted[0];
	for (let i = 1; i < sorted.length; i++) {
		const n = sorted[i];
		if (n === prev + 1) {
			prev = n;
			continue;
		}
		out.push(start === prev ? `${start}` : `${start}-${prev}`);
		start = prev = n;
	}
	out.push(start === prev ? `${start}` : `${start}-${prev}`);
	return out.join(" ");
}

/**
 * @param {string} abs
 */
function rel(abs) {
	return relative(ROOT, abs).replaceAll("\\", "/");
}

/**
 * Source files the include globs would accept. Used to name files the Node
 * process never loaded, which V8 coverage cannot report as 0%. `dist/` and
 * `.d.ts` are omitted: a typecheck emits them, and listing generated
 * declarations as uncovered is noise.
 */
function expectedSources() {
	return globSync("{packages,tools}/**/*.ts", { cwd: ROOT })
		.map((p) => p.replaceAll("\\", "/"))
		.filter((p) => !p.endsWith(".test.ts") && !p.endsWith(".d.ts") && !p.includes("/dist/"))
		.sort();
}

/**
 * @param {{ path: string, lines?: { line: number, count: number }[], branches?: { line: number, count: number }[], functions?: { name: string, line: number, count: number }[] }} file
 */
function gaps(file) {
	return {
		lines: ranges((file.lines ?? []).filter((l) => l.count === 0).map((l) => l.line)),
		branches: ranges((file.branches ?? []).filter((b) => b.count === 0).map((b) => b.line)),
		functions: (file.functions ?? [])
			.filter((fn) => fn.count === 0)
			.map((fn) => (fn.name ? `${fn.name} (${fn.line})` : `${fn.line}`))
			.join(", "),
	};
}

/**
 * @param {{ files: { path: string, coveredLinePercent: number, coveredBranchPercent: number, coveredFunctionPercent: number, lines?: { line: number, count: number }[], branches?: { line: number, count: number }[], functions?: { name: string, line: number, count: number }[] }[], totals: { coveredLinePercent: number, coveredBranchPercent: number, coveredFunctionPercent: number } }} summary
 */
function uncoveredText(summary) {
	const loaded = new Set(summary.files.map((f) => rel(f.path)));
	const missing = expectedSources().filter((p) => !loaded.has(p));
	const rows = [];
	for (const file of summary.files) {
		const g = gaps(file);
		if (!g.lines && !g.branches && !g.functions) continue;
		rows.push({ path: rel(file.path), ...g });
	}

	let text = "Uncovered lines and branches (Node suite)\n";
	text += "----------------------------------------\n";
	if (rows.length === 0) {
		text += "None in the files this process loaded.\n";
	} else {
		for (const row of rows) {
			text += `\n${row.path}\n`;
			if (row.lines) text += `  lines     ${row.lines}\n`;
			if (row.branches) text += `  branches  ${row.branches}\n`;
			if (row.functions) text += `  functions ${row.functions}\n`;
		}
	}
	text += "\nNot loaded by the Node suite\n";
	text += "----------------------------\n";
	if (missing.length === 0) {
		text += "Every source file under packages/ and tools/ was imported.\n";
	} else {
		text +=
			"These files were never imported, so they do not appear as 0% rows. The runtime\n" +
			"needs a DOM; `pnpm test:bench` is the layer that can see it, and that suite has\n" +
			"no coverage numbers in this report. A barrel such as `packages/sdk/src/index.ts`\n" +
			"is listed because tests import the modules directly.\n\n";
		for (const p of missing) text += `  ${p}\n`;
	}
	text += "\nRead this list once and file what it reveals.\n";
	return text;
}

/**
 * @param {{ files: { path: string, coveredLinePercent: number, coveredBranchPercent: number, coveredFunctionPercent: number, lines?: { line: number, count: number }[], branches?: { line: number, count: number }[], functions?: { name: string, line: number, count: number }[] }[], totals: { coveredLinePercent: number, coveredBranchPercent: number, coveredFunctionPercent: number } }} summary
 */
function markdown(summary) {
	const loaded = new Set(summary.files.map((f) => rel(f.path)));
	const missing = expectedSources().filter((p) => !loaded.has(p));
	const pct = (n) => n.toFixed(2);
	const lines = [
		"## Node test coverage",
		"",
		"This is the **Node** suite only (`packages/**/*.test.ts`, `tools/**/*.test.ts`).",
		"Browser / Playwright coverage from `pnpm test:bench` is **not** included.",
		"No percentage threshold: this step does not fail on a coverage number.",
		"The useful output is the uncovered list.",
		"",
		"### Per-file summary",
		"",
		"| file | line % | branch % | funcs % | uncovered lines |",
		"| --- | ---: | ---: | ---: | --- |",
	];
	for (const file of summary.files) {
		const g = gaps(file);
		lines.push(
			`| \`${rel(file.path)}\` | ${pct(file.coveredLinePercent)} | ${pct(file.coveredBranchPercent)} | ${pct(file.coveredFunctionPercent)} | ${g.lines || ""} |`,
		);
	}
	const t = summary.totals;
	lines.push(
		`| all files loaded by Node | ${pct(t.coveredLinePercent)} | ${pct(t.coveredBranchPercent)} | ${pct(t.coveredFunctionPercent)} | |`,
	);
	lines.push("", "### Uncovered lines and branches", "");
	const gapped = summary.files
		.map((file) => ({ path: rel(file.path), ...gaps(file) }))
		.filter((row) => row.lines || row.branches || row.functions);
	if (gapped.length === 0) {
		lines.push("None in the files this process loaded.");
	} else {
		for (const row of gapped) {
			lines.push(`**\`${row.path}\`**`);
			if (row.lines) lines.push(`- lines: ${row.lines}`);
			if (row.branches) lines.push(`- branches: ${row.branches}`);
			if (row.functions) lines.push(`- functions: ${row.functions}`);
			lines.push("");
		}
	}
	lines.push("### Not loaded by the Node suite", "");
	if (missing.length === 0) {
		lines.push("Every source file under `packages/` and `tools/` was imported.");
	} else {
		lines.push(
			"These files were never imported, so they do not appear as 0% rows.",
			"The runtime needs a DOM; `pnpm test:bench` is the layer that can see it, and that suite has no coverage numbers here.",
			"`packages/sdk/src/index.ts` is the public barrel: tests import the modules directly.",
			"",
		);
		for (const p of missing) lines.push(`- \`${p}\``);
	}
	lines.push("", "Read this list once and file what it reveals.", "");
	return lines.join("\n");
}

const stream = run({
	cwd: ROOT,
	globPatterns: TEST_GLOBS,
	coverage: true,
	coverageIncludeGlobs: ["packages/**", "tools/**"],
	coverageExcludeGlobs: ["**/*.test.ts"],
	// No lineCoverage / branchCoverage / functionCoverage: a 0 default still looks
	// like a threshold. Omitting them is the "report, do not gate" rule.
});

/** @type {null | { files: { path: string, coveredLinePercent: number, coveredBranchPercent: number, coveredFunctionPercent: number }[], totals: { coveredLinePercent: number, coveredBranchPercent: number, coveredFunctionPercent: number } }} */
let summary = null;
stream.on("test:coverage", (event) => {
	summary = event.summary;
});
stream.on("test:fail", () => {
	process.exitCode = 1;
});

process.stdout.write(HEADER);

const composed = stream.compose(spec);
composed.pipe(process.stdout, { end: false });
await finished(composed);

if (!summary) {
	console.error("Coverage collection produced no report.");
	process.exitCode = process.exitCode || 1;
} else {
	process.stdout.write(`\n${uncoveredText(summary)}\n`);
	const dest = process.env.GITHUB_STEP_SUMMARY;
	if (dest) appendFileSync(dest, markdown(summary));
}
