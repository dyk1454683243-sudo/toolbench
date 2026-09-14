/**
 * Every tool's fixtures, run against the current contract.
 *
 * This one file is the mechanism behind the compatibility promise in `docs/versioning.md`. It walks
 * the tools directory, so a new tool is covered the moment it exists — nobody has to remember to add
 * a test — and it re-runs **every** tool's cases on **every** change to the SDK or the runtime. That
 * is what makes "old tools keep working" a tested claim rather than an intention.
 *
 * It also enforces three things a tool cannot enforce about itself:
 *
 *  - the manifest is valid and its declared `sdk` is one this SDK can read;
 *  - `cases.json` exists and is not empty — a tool with no fixtures is a tool nobody can refactor;
 *  - every case's `expect.kind` is a kind the manifest declared, so `kinds` cannot drift into fiction.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { type Case, type Manifest, assertCases, upgradeManifest, validateManifest } from "../packages/sdk/src/index.ts";

const here = new URL(".", import.meta.url).pathname;
const toolDirs = readdirSync(here, { withFileTypes: true })
	.filter((entry) => entry.isDirectory() && existsSync(join(here, entry.name, "tool.json")))
	.map((entry) => entry.name)
	.sort();

/** A tool that is not in this list is not being tested, which would defeat the point. */
assert.ok(toolDirs.length > 0, "no tools found — this suite only means something if it finds them");

for (const dir of toolDirs) {
	describe(`tools/${dir}`, () => {
		const root = join(here, dir);
		const raw = JSON.parse(readFileSync(join(root, "tool.json"), "utf8")) as Record<string, unknown>;
		let manifest: Manifest;

		it("has a manifest this contract version can read", () => {
			manifest = validateManifest(upgradeManifest(raw));
			assert.equal(manifest.id, dir, "a tool's id must match its directory name — links and routes are derived from it");
		});

		it("declares fixtures", () => {
			assert.ok(existsSync(join(root, "cases.json")), `${dir}/cases.json is missing`);
			const cases = JSON.parse(readFileSync(join(root, "cases.json"), "utf8")) as Case[];
			assert.ok(cases.length > 0, "cases.json is empty");
			for (const testCase of cases) {
				assert.ok(
					manifest.kinds.includes(testCase.expect.kind),
					`case "${testCase.name}" expects a "${testCase.expect.kind}" output, which the manifest does not declare in kinds`,
				);
			}
		});

		it("passes its own fixtures", async () => {
			const cases = JSON.parse(readFileSync(join(root, "cases.json"), "utf8")) as Case[];
			const module = await import(join(root, manifest.runtime.entry));
			assert.equal(typeof module.default?.run, "function", "a tool must default-export { run }");
			/*
			 * A main-thread tool is held to a time bound, because on the main thread there is nothing
			 * to interrupt it: if a fixture takes 200 ms, a reader's browser will too, and the tool
			 * belongs in a worker instead.
			 */
			await assertCases(module.default, cases, {
				timeoutMs: 5000,
				...(manifest.runtime.thread === "main" ? { maxMs: 50 } : {}),
			});
		});
	});
}
