# Versioning

The promise: **a tool written today keeps working, untouched, when the runtime has moved on.**

This document is the policy that makes that true, and the mechanism that tests it.

## Two version numbers, and they are not the same thing

| | What it means | Who bumps it |
|---|---|---|
| `sdk` in a tool's manifest | The **contract version** the tool was written against | The tool author, deliberately, when adopting something new |
| `version` in a tool's manifest | The tool's own version | The tool author, whenever the tool changes |

Package versions (`@toolbench/sdk@0.1.0`) follow semver as usual and are a separate matter. The
contract version is the one that governs compatibility, and it is a single integer because there is
only one question to answer: *which shapes may this tool use?*

## The rule: additive only

A new contract version may:

- **add** an output kind;
- **add** an input type;
- **add** an optional field to an existing shape;
- **add** a capability.

A new contract version may **not**:

- remove anything;
- make an optional field required;
- change what an existing field means;
- narrow what an existing field accepts.

The reason is mechanical rather than philosophical. Compatibility works by migrating an old tool's
manifest and output forward, and **a migration cannot invent information the old tool never had.** If
a change would require guessing, it is not additive, and it does not belong in a version bump.

## The mechanism

```
tool declares sdk: 1                     runtime speaks 3
        │
        └──▶ migrate 1→2 ──▶ migrate 2→3 ──▶ current shapes
```

Each version boundary has one `Migration` (`packages/sdk/src/migrate.ts`): a pair of pure functions,
one for the manifest and one for the output. Loading a tool runs the chain from its declared version
to the current one. After that, nothing downstream knows or cares how old the tool is.

A healthy migration is usually trivial:

```ts
{
  from: 1,
  // Version 2 adds a `bytes` output for hex dumps. A version-1 manifest cannot mention it.
  manifest: (m) => m,
  // A version-1 tool cannot return it either.
  output: (o) => o,
}
```

That triviality is the signal that the change was additive. A migration that needs to be clever is
telling you the change was not.

## How the promise is tested

Three things, all automatic:

1. **Every tool's fixtures run against the current runtime, on every change.**
   `tools/cases.test.ts` walks the tools directory, so a tool is covered the moment it exists and
   stays covered forever. This is the load-bearing test: if a change to the SDK or the runtime breaks
   a tool written against version 1, this goes red.
2. **The migration chain has its own tests** (`packages/sdk/src/migrate.test.ts`), using *synthetic*
   versions. This matters: it means the compatibility machinery is exercised before the day it is
   first needed, rather than being written under pressure on that day. It has already earned its
   keep — it caught a bug where the chain silently did nothing.
3. **A missing step is a loud error.** If the current version is 3 and no 2→3 migration exists,
   loading any older tool throws with the message "this is a bug in @toolbench/sdk". Compatibility
   cannot be forgotten quietly.

## What happens when a tool is from the future

A tool declaring a version the runtime does not have fails immediately, with the two things a reader
or an author actually needs:

```
This tool needs contract version 4; this runtime speaks 3.
Upgrade @toolbench/runtime, or lower the tool's sdk if it does not use the newer features.
```

And if a tool returns an output *kind* this runtime cannot draw — which is the same situation arriving
by a different route — the reader gets a visible message saying the page needs a newer runtime, not an
empty space. Silence is the failure mode this design works hardest to avoid.

## The checklist for raising the contract version

1. Add the new kind, type or field to `packages/sdk/src/types.ts`, and to `OUTPUT_KINDS` or
   `INPUT_TYPES` if applicable.
2. Bump `SDK_VERSION` and append to `SUPPORTED_SDK_VERSIONS` and `SDK_CHANGELOG` in `version.ts`.
   **Never remove a version from the supported list.**
3. Add the `Migration` for the boundary you just created. Both functions are usually the identity;
   if they are not, re-read "additive only".
4. Add a renderer in `packages/runtime/src/render/` for a new output kind. The dispatcher's
   `const _exhaustive: never` will refuse to compile until you do — that is intentional.
5. Extend `validateManifest` if the new thing has invariants.
6. Run `pnpm check`. Every existing tool's fixtures must still pass **without being edited**. If one
   needs editing, the change was not additive.
