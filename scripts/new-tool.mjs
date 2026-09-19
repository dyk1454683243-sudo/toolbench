/**
 * Scaffold a tool directory so a first-time author is not copying boilerplate.
 *
 *   pnpm new-tool base64
 *
 * writes `tools/base64/` with `tool.json`, `index.ts`, `cases.json` and `README.md`,
 * filled in enough that `pnpm check` is green immediately: one input, one field of
 * output, one fixture, and an `error` return with a fixture for it.
 *
 * The error path is in the template on purpose. A starter that only shows the happy
 * path is how that return, and the fixture for it, get skipped.
 *
 * This is a repo script, not a published initialiser. Extract later if hosts want
 * the same start on their own site.
 *
 * `--dir <parent>` writes under a different parent than `tools/`. Tests use it so
 * a run cannot leave a stub in the gallery.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Same rule the validator applies: a directory name, a URL segment, a registry key. */
export const ID = /^[a-z0-9][a-z0-9-]*$/;

const FILES = ["tool.json", "index.ts", "cases.json", "README.md"];

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const defaultToolsDir = join(repoRoot, "tools");

/**
 * Sentence case from an id. "base64" -> "Base64", "queue-explorer" -> "Queue explorer".
 * The authoring guide wants a heading, not a title.
 */
export function titleFromId(id) {
	const [first, ...rest] = id.split("-");
	return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ");
}

/**
 * The four files, keyed by name. Parameterised only where the id has to appear;
 * the function and its fixtures are the same for every starter so the expected
 * bytes can be derived from the issue rather than captured from a run.
 */
export function filesFor(id) {
	const name = titleFromId(id);
	return {
		"tool.json": `{
  "sdk": 3,
  "id": ${JSON.stringify(id)},
  "name": ${JSON.stringify(name)},
  "blurb": "A starter tool that counts characters in its input. Replace the function, the fixtures, and this sentence.",
  "version": "0.0.0",
  "capabilities": ["pure"],
  "runtime": { "entry": "index.ts", "thread": "main" },
  "kinds": ["fields", "error"],
  "card": "live",
  "cardFields": 1,
  "inputs": [
    {
      "id": "value",
      "type": "textarea",
      "label": "Input",
      "description": "The text this starter measures. Replace the function before shipping.",
      "primary": true,
      "dir": "ltr",
      "rows": 3,
      "default": "hello"
    }
  ],
  "help": "README.md"
}
`,
		"index.ts": `/**
 * Starter tool. The scaffold writes a working function so \`pnpm check\` is green
 * before the real tool exists. Replace \`run\` and the fixtures; a template that
 * never returns \`error\` is how that path gets skipped.
 */
import type { Output, Tool } from "@toolbench/sdk";

// A type alias, not an interface: an interface does not satisfy the SDK's index-signature constraint.
type Input = { value: string };

export default {
	run({ value }): Output {
		if (value.length === 0) {
			return { kind: "error", message: "Nothing to measure. Type some text.", input: "value" };
		}

		return {
			kind: "fields",
			fields: [
				{
					label: "Characters",
					value: String([...value].length),
					note: "Unicode code points, not UTF-16 units",
				},
			],
		};
	},
} satisfies Tool<Input>;
`,
		"cases.json": `[
  {
    "name": "counts the default input",
    "input": { "value": "hello" },
    "expect": {
      "kind": "fields",
      "fields": [
        { "label": "Characters", "value": "5", "note": "Unicode code points, not UTF-16 units" }
      ]
    }
  },
  {
    "name": "empty input is an error, not a zero",
    "input": { "value": "" },
    "expect": { "kind": "error", "message": "Nothing to measure. Type some text.", "input": "value" }
  }
]
`,
		"README.md": `# ${name}

Counts the Unicode code points in its input. This is a starter the scaffold wrote so \`pnpm check\` is green before you have written the real tool. Replace the function, the fixtures, and this sentence.

## What it computes

The number of Unicode code points in \`value\`. \`hello\` is 5. Replace this with what the tool actually computes.

## What this does not handle

- **Replace this list.** A reader needs the cases the tool refuses, not a claim that it handles everything. Name the encodings, the edge cases, or the inputs that belong in a different tool.
`,
	};
}

export class ScaffoldError extends Error {
	constructor(message) {
		super(message);
		this.name = "ScaffoldError";
	}
}

/**
 * Write the four files under `<toolsDir>/<id>/`.
 * Refuses an existing directory so a second run cannot clobber work.
 */
export function scaffold(id, { toolsDir = defaultToolsDir } = {}) {
	if (typeof id !== "string" || id.length === 0) {
		throw new ScaffoldError("pass a tool id: pnpm new-tool base64");
	}
	if (!ID.test(id)) {
		throw new ScaffoldError(
			`"${id}" must be lowercase letters, digits and hyphens. It is also a directory name and a URL segment`,
		);
	}

	const root = join(toolsDir, id);
	if (existsSync(root)) {
		throw new ScaffoldError(`${root} already exists`);
	}

	const files = filesFor(id);
	mkdirSync(root, { recursive: true });
	for (const name of FILES) {
		writeFileSync(join(root, name), files[name]);
	}
	return root;
}

function parseArgs(argv) {
	const positional = [];
	let toolsDir = defaultToolsDir;
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--dir") {
			const value = argv[++i];
			if (!value) throw new ScaffoldError("--dir needs a path");
			toolsDir = resolve(value);
			continue;
		}
		if (arg === "--help" || arg === "-h") {
			return { help: true, id: undefined, toolsDir };
		}
		if (arg.startsWith("-")) {
			throw new ScaffoldError(`unknown flag ${arg}`);
		}
		positional.push(arg);
	}
	if (positional.length > 1) {
		throw new ScaffoldError(`unexpected extra arguments: ${positional.slice(1).join(" ")}`);
	}
	return { help: false, id: positional[0], toolsDir };
}

const USAGE = `Usage: pnpm new-tool <id>

Writes tools/<id>/{tool.json,index.ts,cases.json,README.md}

<id> must be lowercase letters, digits and hyphens, and must not already exist.
`;

export function main(argv = process.argv.slice(2), io = process) {
	try {
		const { help, id, toolsDir } = parseArgs(argv);
		if (help || id === undefined) {
			io.stdout.write(USAGE);
			return help ? 0 : 1;
		}
		const root = scaffold(id, { toolsDir });
		const rel = root.startsWith(repoRoot + "/") ? root.slice(repoRoot.length + 1) : root;
		io.stdout.write(
			`Wrote ${rel}/{${FILES.join(",")}}\n\n` +
				"`pnpm check` should be green. `pnpm bench` will show it in the gallery.\n" +
				'Replace the function, add real fixtures, and fill in "What this does not handle".\n',
		);
		return 0;
	} catch (error) {
		io.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		return 1;
	}
}

const invokedAsCli =
	process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedAsCli) {
	process.exitCode = main();
}
