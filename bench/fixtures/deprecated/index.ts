/**
 * A deprecated tool. It still runs: that is the difference from retired. The bench uses the
 * result to prove activation happened, and the card to prove it is not offered as live.
 */
import type { Output, Tool } from "@toolbench/sdk";

type Input = { value: number };

export default {
	run({ value }): Output {
		if (typeof value !== "number" || !Number.isFinite(value)) {
			return { kind: "error", message: "Value is not a number.", input: "value" };
		}
		return { kind: "fields", fields: [{ label: "state", value: "still runs" }, { label: "value", value: String(value) }] };
	},
} satisfies Tool<Input>;
