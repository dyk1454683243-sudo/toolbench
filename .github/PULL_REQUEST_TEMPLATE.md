## What and why

<!-- What changed, and what problem it solves. If it came from a defect, say what was on screen and
     what should have been: those descriptions are what the defect register is built from. -->

## Checks

- [ ] `pnpm check` passes
- [ ] `pnpm bench:build && pnpm test:bench` passes
- [ ] Every existing tool's fixtures pass **without being edited** (if one needed editing, explain why
      the change is not a breaking one)
- [ ] New behaviour has a test in the layer that can see it: browser tests for rendering, SDK tests for
      the contract
- [ ] A changeset (`pnpm changeset`), if a consumer would notice this
- [ ] `pnpm size` if `packages/runtime` grew

## Contract change?

<!-- Delete this section if you did not touch packages/sdk/src/types.ts. -->

- [ ] `SDK_VERSION` raised, `SUPPORTED_SDK_VERSIONS` appended to, `SDK_CHANGELOG` entry written
- [ ] Migration added, and **both halves are the identity function**. If not, the change was not
      additive: say why it has to be, per docs/versioning.md §7
- [ ] Renderer or control added
- [ ] docs/authoring-a-tool.md documents the new feature

## Anything you are unsure about

<!-- Optional, and genuinely useful. A PR that names its own weak spot gets a better review. -->
