/**
 * Pretty-prints JSON as a `code` result.
 *
 * It lives in the bench rather than in `tools/` because it is not an example of a good tool. It
 * exists so the host `highlight` hook has a real `code` output to paint, which no shipped tool on
 * this branch returns. Host highlighting is a runtime API, not a reason to grow the collection.
 */
import type { Output, Tool } from "@toolbench/sdk";

// A type alias, not an interface: an interface does not satisfy the SDK's index-signature constraint.
type Input = { json: string };

export default {
	run({ json }): Output {
		const trimmed = json.trim();
		if (trimmed.length === 0) {
			return { kind: "error", message: "Nothing to format. Paste some JSON.", input: "json" };
		}
		try {
			return { kind: "code", lang: "json", source: JSON.stringify(JSON.parse(trimmed), null, 2) };
		} catch {
			return { kind: "error", message: "That is not valid JSON.", input: "json" };
		}
	},
} satisfies Tool<Input>;
