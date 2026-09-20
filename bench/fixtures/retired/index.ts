/**
 * A retired tool. Its module exists so the registry can point at it; the element must never
 * import this file. The bench test asserts the chunk is not fetched.
 */
import type { Output, Tool } from "@toolbench/sdk";

type Input = { value: number };

export default {
	run(): Output {
		return { kind: "fields", fields: [{ label: "unreachable", value: "a retired tool must not run" }] };
	},
} satisfies Tool<Input>;
