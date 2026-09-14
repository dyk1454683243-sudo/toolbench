/**
 * A tool that misbehaves on purpose.
 *
 * It lives in the bench rather than in `tools/` because it is not an example of a good tool — it is an
 * example of what the runtime does when a tool is bad. Every failure path deserves to be visible in a
 * browser and asserted in a test, rather than described in a comment and hoped for:
 *
 *  - `spin` never returns and never checks its abort signal, so only `worker.terminate()` can stop it.
 *    This is the case that justifies worker mode existing at all.
 *  - `throw` is a bug in the tool: the runtime must say so, distinctly from bad input.
 *  - `bad-input` is the tool working correctly on input it cannot use.
 *  - `slow` reports progress, so the bar and the partial-result path get exercised.
 */
import type { Output, Tool } from "@toolbench/sdk";

type Input = { mode: string; ms: number };

const tool: Tool<Input> = {
	async run({ mode, ms }, ctx) {
		switch (mode) {
			case "spin": {
				/*
				 * Deliberately ignores ctx.signal: nothing but `worker.terminate()` stops this.
				 *
				 * ⚠️ The work has to be real, and the result has to be returned. The first version was an
				 * empty timing loop — `while (true) { if (Date.now() - started > 60_000) break; }` — and
				 * **the minifier deleted it**, because a loop with no observable effect is dead code. The
				 * built tool returned instantly and the timeout never fired, which is a lesson worth more
				 * than the fixture: a busy-wait is not something you can portably express, and this was
				 * only visible because the tests run against the built bundle rather than dev mode.
				 */
				let hash = 0;
				const started = Date.now();
				while (Date.now() - started < 60_000) {
					for (let i = 0; i < 200_000; i++) hash = (hash * 31 + i) % 2147483647;
				}
				return { kind: "fields", fields: [{ label: "unreachable", value: `the timeout should have fired (${hash})` }] };
			}
			case "throw":
				throw new TypeError("this tool has a bug: cannot read properties of undefined (reading 'nope')");
			case "bad-input":
				return { kind: "error", message: "That mode is not something I can work with.", input: "mode" };
			case "slow": {
				const steps = 20;
				for (let i = 0; i < steps; i++) {
					if (ctx.signal.aborted) return { kind: "error", message: "cancelled" };
					await new Promise((resolve) => setTimeout(resolve, Math.max(1, ms / steps)));
					ctx.progress((i + 1) / steps, {
						kind: "fields",
						fields: [{ label: "progress", value: `${Math.round(((i + 1) / steps) * 100)}%` }],
					});
				}
				return { kind: "fields", fields: [{ label: "finished", value: `${ms} ms of pretending to work` }] } satisfies Output;
			}
			default:
				return { kind: "fields", fields: [{ label: "status", value: "worked normally" }, { label: "mode", value: mode }] };
		}
	},
};

export default tool;
