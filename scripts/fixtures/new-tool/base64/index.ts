/**
 * Starter tool. The scaffold writes a working function so `pnpm check` is green
 * before the real tool exists. Replace `run` and the fixtures; a template that
 * never returns `error` is how that path gets skipped.
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
