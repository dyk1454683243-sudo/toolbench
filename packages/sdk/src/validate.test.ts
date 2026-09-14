import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ManifestError, validateManifest } from "./validate.ts";
import { SDK_VERSION } from "./version.ts";

/** A manifest that passes, so each test can break exactly one thing. */
const good = () => ({
	sdk: SDK_VERSION,
	id: "example",
	name: "Example",
	blurb: "Does a thing.",
	version: "1.0.0",
	capabilities: ["pure"],
	runtime: { entry: "index.ts" },
	inputs: [{ id: "value", type: "number", label: "Value", default: 1, min: 0, max: 10 }],
	kinds: ["fields", "error"],
});

const failsWith = (mutate: (m: Record<string, unknown>) => void, field: string, contains: string) => {
	const m = good();
	mutate(m as unknown as Record<string, unknown>);
	assert.throws(
		() => validateManifest(m),
		(error: unknown) => {
			assert.ok(error instanceof ManifestError, `expected a ManifestError, got ${error}`);
			assert.equal(error.field, field);
			assert.match(error.message, new RegExp(contains, "i"));
			return true;
		},
	);
};

describe("validateManifest", () => {
	it("accepts a minimal valid manifest and fills defaults", () => {
		const m = validateManifest(good());
		assert.equal(m.runtime.thread, "main", "thread defaults to main");
		assert.equal(m.card, "info", "card defaults to info, not live");
		assert.equal(m.status, "live");
	});

	it("rejects a contract version newer than this runtime, and says what to do", () => {
		failsWith((m) => { m.sdk = SDK_VERSION + 1; }, "sdk", "upgrade @toolbench/runtime");
	});

	it("rejects an id that is not a usable directory or URL segment", () => {
		failsWith((m) => { m.id = "Not Valid"; }, "id", "lowercase");
	});

	it("requires the error kind, because every tool can be given bad input", () => {
		failsWith((m) => { m.kinds = ["fields"]; }, "kinds", "error");
	});

	it("rejects duplicate input ids", () => {
		failsWith((m) => {
			m.inputs = [
				{ id: "a", type: "text", label: "A", default: "" },
				{ id: "a", type: "text", label: "B", default: "" },
			];
		}, "inputs", "unique");
	});

	it("allows at most one primary input, because a card shows exactly one", () => {
		failsWith((m) => {
			m.inputs = [
				{ id: "a", type: "text", label: "A", default: "", primary: true },
				{ id: "b", type: "text", label: "B", default: "", primary: true },
			];
		}, "inputs", "only one input may be primary");
	});

	it("requires min and max on a number input", () => {
		failsWith((m) => { m.inputs = [{ id: "n", type: "number", label: "N", default: 1 }]; }, "inputs[0].min/max", "runaway");
	});

	it("rejects a default outside min..max", () => {
		failsWith((m) => { m.inputs = [{ id: "n", type: "number", label: "N", default: 99, min: 0, max: 10 }]; }, "inputs[0].default", "outside");
	});

	it("requires two options on a select", () => {
		failsWith((m) => {
			m.inputs = [{ id: "s", type: "select", label: "S", default: "a", options: [{ value: "a", label: "A" }] }];
		}, "inputs[0].options", "at least two");
	});

	it("requires a select default to be one of its options", () => {
		failsWith((m) => {
			m.inputs = [{
				id: "s", type: "select", label: "S", default: "z",
				options: [{ value: "a", label: "A" }, { value: "b", label: "B" }],
			}];
		}, "inputs[0].default", "must be one of");
	});

	// --- the invariants: the rules the rest of the system leans on ------------------------------
	it("rejects timeoutMs on the main thread, where nothing can be terminated", () => {
		failsWith((m) => { m.timeoutMs = 2000; }, "timeoutMs", "nothing to terminate");
	});

	it("accepts timeoutMs in worker mode", () => {
		const m = good() as Record<string, unknown>;
		m.runtime = { entry: "index.ts", thread: "worker" };
		m.timeoutMs = 2000;
		assert.equal(validateManifest(m).timeoutMs, 2000);
	});

	it("accepts a live card for a pure tool", () => {
		const m = good() as Record<string, unknown>;
		m.card = "live";
		assert.equal(validateManifest(m).card, "live");
	});
});
