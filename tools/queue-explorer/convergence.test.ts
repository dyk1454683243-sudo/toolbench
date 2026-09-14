/**
 * The property that makes this tool trustworthy: the simulation and the formula agree.
 *
 * This is a *unit* test rather than a fixture because the assertion is a tolerance, not a value — and
 * because it is the claim the tool makes about itself. If Lindley's recursion or the generator were
 * wrong, the numbers would still be deterministic and the fixtures would still pass; only convergence
 * would break.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analytic, simulate } from "./index.ts";

describe("queue-explorer: the simulation converges on the closed form", () => {
	for (const rho of [0.5, 0.8, 0.9]) {
		it(`agrees within 5% at ρ = ${rho}, across four seeds`, () => {
			const mu = 1000;
			const lambda = rho * mu;
			const expected = analytic(lambda, mu).w;
			for (const seed of [1, 42, 7777, 123456]) {
				const got = simulate(lambda, mu, 400_000, seed);
				const error = Math.abs((got - expected) / expected) * 100;
				assert.ok(
					error < 5,
					`ρ=${rho} seed=${seed}: simulated ${got.toFixed(3)}ms against a formula value of ${expected.toFixed(3)}ms — ${error.toFixed(1)}% apart`,
				);
			}
		});
	}

	it("is deterministic: the same seed gives the same answer twice", () => {
		assert.equal(simulate(800, 1000, 50_000, 99), simulate(800, 1000, 50_000, 99));
	});

	it("different seeds give different answers, or the seed is not being used", () => {
		assert.notEqual(simulate(800, 1000, 50_000, 1), simulate(800, 1000, 50_000, 2));
	});

	it("gets closer as samples grow — the whole reason the sample count is an input", () => {
		const expected = analytic(800, 1000).w;
		const err = (n: number) =>
			Math.abs(
				[1, 2, 3, 4, 5].reduce((sum, seed) => sum + (simulate(800, 1000, n, seed) - expected) / expected, 0) / 5,
			);
		assert.ok(err(1_000_000) < err(2_000), `averaged error should shrink with samples: ${err(2_000)} → ${err(1_000_000)}`);
	});

	it("Little's law holds: L = λ × W", () => {
		const a = analytic(800, 1000);
		assert.ok(Math.abs(a.l - 800 * (a.w / 1000)) < 1e-9, `L=${a.l} but λW=${800 * (a.w / 1000)}`);
	});
});
