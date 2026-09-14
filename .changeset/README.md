# Changesets

This directory holds release intents. One file per change that a consumer would notice.

**Adding one** (do this in the same pull request as the change):

```sh
pnpm changeset
```

Pick the packages, pick `patch` or `minor`, and write one sentence in the voice of someone reading a
changelog: what changed and what it means for them, not which files you touched.

`@toolbench/sdk` and `@toolbench/runtime` are a **fixed group**: they always share a version number,
because the SDK's types and the runtime's renderers are two halves of one contract. Selecting either one
bumps both. That is deliberate, and [docs/releasing.md](../docs/releasing.md) explains why.

**Not every change needs one.** Docs, tests, CI and the bench are not published, so they do not need a
changeset. If a change is invisible from outside the repository, skip it.

**Releasing** is automatic: merging to `main` opens a "Release" pull request that collects the pending
changesets. Merging *that* publishes to npm. See [docs/releasing.md](../docs/releasing.md).
