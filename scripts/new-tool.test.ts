/**
 * The scaffold has to emit a tool that is already a valid tool, or it is copying
 * boilerplate by another name. These tests pin the bytes against fixtures written
 * from the issue, then run the same directory harness `tools/cases.test.ts` uses.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { checkToolDirectory } from "../packages/sdk/src/fixtures.ts";
import { SDK_VERSION } from "../packages/sdk/src/version.ts";
import { filesFor, main, scaffold, titleFromId } from "./new-tool.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const goldenRoot = join(here, "fixtures", "new-tool", "base64");
const NAMES = ["tool.json", "index.ts", "cases.json", "README.md"] as const;

const tmp = mkdtempSync(join(tmpdir(), "toolbench-new-tool-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

function golden(name: (typeof NAMES)[number]): string {
	return readFileSync(join(goldenRoot, name), "utf8");
}

function capture(argv: string[]) {
	let stdout = "";
	let stderr = "";
	const code = main(argv, {
		stdout: { write(chunk: string) { stdout += chunk; return true; } },
		stderr: { write(chunk: string) { stderr += chunk; return true; } },
	} as unknown as typeof process);
	return { code, stdout, stderr };
}

describe("titleFromId", () => {
	it("sentence-cases a single token and a hyphenated id", () => {
		assert.equal(titleFromId("base64"), "Base64");
		assert.equal(titleFromId("queue-explorer"), "Queue explorer");
	});
});

describe("filesFor", () => {
	it("emits exactly the four files, matching the hand-written base64 fixtures", () => {
		const files = filesFor("base64");
		assert.deepEqual(Object.keys(files).sort(), [...NAMES].sort());
		for (const name of NAMES) {
			assert.equal(files[name], golden(name), name);
		}
	});

	/*
	 * The template reads SDK_VERSION rather than naming a version, so this cannot drift. What it can do
	 * is leave the hand-written fixture behind, and the byte comparison above would then fail with a
	 * one-character diff that reads like a mystery. This says what to do instead.
	 */
	it("emits the current contract version, and the fixture is kept in step with it", () => {
		const emitted = JSON.parse(filesFor("base64")["tool.json"] as string) as { sdk: number };
		assert.equal(emitted.sdk, SDK_VERSION, "a scaffolded tool declares the contract version the SDK is on");
		const fixture = JSON.parse(golden("tool.json")) as { sdk: number };
		assert.equal(
			fixture.sdk,
			SDK_VERSION,
			`the golden fixture still says sdk ${fixture.sdk} while the SDK is on ${SDK_VERSION}. Regenerate it: node scripts/new-tool.mjs base64 --dir <tmp> and copy the four files over scripts/fixtures/new-tool/base64/`,
		);
	});

	it("substitutes the id and the sentence-case name, and nothing else that would change the fixtures", () => {
		const files = filesFor("my-tool");
		const manifest = JSON.parse(files["tool.json"]) as { id: string; name: string };
		assert.equal(manifest.id, "my-tool");
		assert.equal(manifest.name, "My tool");
		assert.ok(files["README.md"].startsWith("# My tool\n"));
		assert.equal(files["index.ts"], golden("index.ts"));
		assert.equal(files["cases.json"], golden("cases.json"));
	});

	it("includes an error return and a fixture for it", () => {
		const files = filesFor("base64");
		assert.match(files["index.ts"], /kind: "error"/);
		const cases = JSON.parse(files["cases.json"]) as Array<{ expect: { kind: string } }>;
		assert.ok(cases.some((c) => c.expect.kind === "error"));
		assert.match(files["README.md"], /## What this does not handle/);
		assert.match(files["README.md"], /Replace this list/);
	});
});

describe("scaffold", () => {
	it("writes the four files under the given parent", () => {
		const parent = join(tmp, "writes");
		mkdirSync(parent);
		const root = scaffold("base64", { toolsDir: parent });
		assert.equal(root, join(parent, "base64"));
		for (const name of NAMES) {
			assert.equal(readFileSync(join(root, name), "utf8"), golden(name), name);
		}
	});

	it("refuses an existing directory", () => {
		const parent = join(tmp, "exists");
		mkdirSync(join(parent, "base64"), { recursive: true });
		writeFileSync(join(parent, "base64", "tool.json"), "{}");
		assert.throws(() => scaffold("base64", { toolsDir: parent }), { name: "ScaffoldError" });
	});

	it("refuses an id the validator would refuse", () => {
		const parent = join(tmp, "bad-id");
		mkdirSync(parent);
		assert.throws(() => scaffold("Base64", { toolsDir: parent }), /lowercase/);
		assert.throws(() => scaffold("-leading", { toolsDir: parent }), /lowercase/);
		assert.throws(() => scaffold("under_score", { toolsDir: parent }), /lowercase/);
	});
});

describe("a generated tool", () => {
	it("passes the same directory harness the repo tools use, with no edits", async () => {
		const parent = join(tmp, "harness");
		mkdirSync(parent);
		scaffold("base64", { toolsDir: parent });

		const registered = new Map<string, () => void | Promise<void>>();
		checkToolDirectory(parent, {
			describe: (_name, body) => body(),
			it: (name, fn) => registered.set(name, fn),
		});

		assert.ok(registered.size > 0, "the harness registered checks");
		for (const [name, fn] of registered) {
			await fn();
			void name;
		}
	});
});

describe("main", () => {
	/*
	 * Usage on stderr when the call was wrong, on stdout when help was asked for. The distinction is
	 * the difference between `pnpm new-tool 2>/dev/null` looking silent-but-fine and looking like what
	 * it is, a failure.
	 */
	it("prints usage to stderr and exits 1 when the id is missing", () => {
		const { code, stdout, stderr } = capture([]);
		assert.equal(code, 1);
		assert.match(stderr, /pnpm new-tool <id>/);
		assert.equal(stdout, "", "a failure must not write to stdout");
	});

	it("prints usage to stdout and exits 0 when help is asked for", () => {
		const { code, stdout, stderr } = capture(["--help"]);
		assert.equal(code, 0);
		assert.match(stdout, /pnpm new-tool <id>/);
		assert.equal(stderr, "", "asking for help is not an error");
	});

	it("writes under --dir and names the four files", () => {
		const parent = join(tmp, "cli");
		mkdirSync(parent);
		const { code, stdout, stderr } = capture(["base64", "--dir", parent]);
		assert.equal(code, 0, stderr);
		assert.equal(stderr, "");
		assert.match(stdout, /tool\.json,index\.ts,cases\.json,README\.md/);
		assert.equal(readFileSync(join(parent, "base64", "README.md"), "utf8"), golden("README.md"));
	});
});

describe("the script as a process", () => {
	it("exits 1 when asked to overwrite tools/percentiles", () => {
		const script = join(here, "new-tool.mjs");
		const result = spawnSync(process.execPath, [script, "percentiles"], { encoding: "utf8" });
		assert.equal(result.status, 1);
		assert.match(result.stderr, /already exists/);
	});
});
