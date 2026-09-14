/**
 * Backward compatibility, as a mechanism rather than a promise.
 *
 * A tool is pinned to the contract version it was written against. The runtime keeps moving. So
 * every version boundary gets a **migration**: a pair of pure functions that carry an old manifest
 * and an old output forward one step. Loading a tool runs the chain from its declared version up to
 * the current one, and after that the rest of the system only ever sees current shapes.
 *
 * ```
 *  tool declares sdk: 1        runtime speaks 3
 *          │
 *          └──▶ migrate 1→2 ──▶ migrate 2→3 ──▶ current
 * ```
 *
 * Why a chain and not one big adapter: each step is small enough to read, and each step is testable
 * on its own. Adding version 4 means writing one 3→4 step, not revisiting the previous three.
 *
 * The rules that keep this honest, and that `docs/versioning.md` states as policy:
 *
 *  - **Additive only.** A new version may add output kinds, input types and optional fields. It may
 *    not remove or repurpose anything, because a migration cannot invent information an old tool
 *    never had.
 *  - **A migration never fails.** If a step would need to guess, the change was not additive and
 *    does not belong in a version bump.
 *  - **Old fixtures run forever.** Every tool's cases are checked against the current runtime in CI,
 *    which is what turns this file from a good intention into a tested claim.
 */
import type { Manifest, Output } from "./types.ts";
import { SDK_VERSION } from "./version.ts";

export interface Migration {
	/** Migrates a manifest from `from` to `from + 1`. */
	readonly from: number;
	manifest(raw: Record<string, unknown>): Record<string, unknown>;
	/** Migrates an output produced by a tool written against `from`. */
	output(out: Output): Output;
}

/**
 * The chain, ordered by `from`.
 *
 * Empty at contract version 1 — there is nothing before it. The machinery exists now, with tests,
 * because a compatibility mechanism written at the moment it is first needed is a compatibility
 * mechanism written under pressure.
 *
 * A future entry looks like this (from the real plan for version 2, which adds a `bytes` output for
 * hex dumps):
 *
 * ```ts
 * {
 *   from: 1,
 *   // A v1 manifest cannot mention `bytes`, so nothing to change.
 *   manifest: (m) => m,
 *   // A v1 tool cannot return `bytes` either. Identity — and that is the shape of a healthy
 *   // additive change: the migration is trivial precisely because nothing was taken away.
 *   output: (o) => o,
 * }
 * ```
 */
export const MIGRATIONS: readonly Migration[] = [];

export class VersionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "VersionError";
	}
}

/**
 * The steps needed to carry `version` up to `currentVersion`, in order.
 *
 * ⚠️ `currentVersion` is a parameter, not the module constant. It was the constant in the first
 * draft, which meant the injected version was ignored and the chain silently did nothing — the
 * migration tests caught it, which is the argument for testing a compatibility mechanism before the
 * day you need it.
 */
function chainFrom(version: number, migrations: readonly Migration[], currentVersion: number): Migration[] {
	const steps: Migration[] = [];
	for (let v = version; v < currentVersion; v++) {
		const step = migrations.find((m) => m.from === v);
		if (!step) {
			throw new VersionError(
				`No migration from contract version ${v} to ${v + 1}. This is a bug in @toolbench/sdk: ` +
					`the current version is ${currentVersion}, so every version below it needs a migration step.`,
			);
		}
		steps.push(step);
	}
	return steps;
}

/**
 * Read a raw manifest of any supported version and return one shaped for the current contract.
 *
 * `migrations` is injectable so the chain itself can be tested without shipping a fake version.
 */
export function upgradeManifest(
	raw: unknown,
	migrations: readonly Migration[] = MIGRATIONS,
	currentVersion: number = SDK_VERSION,
): Record<string, unknown> {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		throw new VersionError("A manifest must be an object.");
	}
	const manifest = raw as Record<string, unknown>;
	const declared = manifest.sdk;
	if (typeof declared !== "number" || !Number.isInteger(declared) || declared < 1) {
		throw new VersionError(
			`A manifest must declare an integer contract version, e.g. { "sdk": ${currentVersion} }. Got ${JSON.stringify(declared)}.`,
		);
	}
	if (declared > currentVersion) {
		throw new VersionError(
			`This tool needs contract version ${declared}; this runtime speaks ${currentVersion}. ` +
				"Upgrade @toolbench/runtime, or lower the tool's sdk if it does not use the newer features.",
		);
	}

	let out = manifest;
	for (const step of chainFrom(declared, migrations, currentVersion)) {
		out = step.manifest(out);
		out = { ...out, sdk: step.from + 1 };
	}
	return { ...out, sdk: currentVersion };
}

/** Carry an output produced by a tool written against `declaredVersion` up to the current shape. */
export function upgradeOutput(
	out: Output,
	declaredVersion: number,
	migrations: readonly Migration[] = MIGRATIONS,
	currentVersion: number = SDK_VERSION,
): Output {
	if (declaredVersion > currentVersion) {
		throw new VersionError(`Cannot downgrade an output from version ${declaredVersion} to ${currentVersion}.`);
	}
	let value = out;
	for (const step of chainFrom(declaredVersion, migrations, currentVersion)) value = step.output(value);
	return value;
}

/** True when this runtime can load a tool declaring `version`. */
export function canLoad(version: number, currentVersion: number = SDK_VERSION): boolean {
	return Number.isInteger(version) && version >= 1 && version <= currentVersion;
}

export type { Manifest };
