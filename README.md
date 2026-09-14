# Toolbench

Publish small interactive tools on a website, and let people run them in the browser.

A tool is **one function and one JSON file**. You write the function; Toolbench draws the form, runs
the function, and renders the result — in a compact card, on a full page, or in the middle of an
article. The tool knows nothing about the web, and the website needs no framework.

```ts
// tools/double/index.ts
import type { Tool } from "@toolbench/sdk";

export default {
  run({ n }) {
    return { kind: "fields", fields: [{ label: "doubled", value: String(Number(n) * 2) }] };
  },
} satisfies Tool<{ n: string }>;
```

```html
<!-- anywhere in any page -->
<tool-host tool="double" mode="card"></tool-host>
```

That's the whole idea. The rest of this file is what it costs and what it guarantees.

---

## Why this exists

Interactive widgets on a blog are usually one-offs: a script per widget, wired into one page by hand.
That works exactly once. The second one repeats the form handling, the error states, the loading
behaviour and the styling, and by the fourth they have all drifted apart.

Toolbench makes the *shape* of a tool a contract instead. What you get for accepting it:

- **Your fixtures become tests.** A tool ships known-answer cases; they run in plain Node, in a
  second, with no browser. A broken tool fails your build instead of someone's afternoon.
- **The interface is consistent** across every tool, and accessible by default — labels, error
  association, a status region, keyboard operation, reduced motion.
- **Nothing loads until it is needed.** A card downloads no tool code until someone clicks it.
- **Old tools keep working.** The contract is versioned, changes are additive, and the compatibility
  path is tested rather than promised.

## What is in this repository

| | |
|---|---|
| `packages/sdk` | The contract: types, manifest validation, version migration, the fixture runner. No dependencies, no DOM — runs in plain Node. |
| `packages/runtime` | The `<tool-host>` custom element: form, renderers, worker handling. No framework; ~15 KB gzipped. |
| `tools/` | Two real example tools. |
| `bench/` | The test bench: every display mode, both threading modes, and a tool that fails on purpose. |
| `docs/` | [Authoring a tool](docs/authoring-a-tool.md) · [Versioning](docs/versioning.md) · [Architecture](docs/architecture.md) |

```
pnpm install
pnpm check        # typecheck + every unit test and fixture
pnpm bench        # the bench at http://localhost:5180
pnpm test:bench   # the same bench, driven by a browser
```

## The three ways a tool appears

One declaration drives all three. The mode also decides **when the tool's code is downloaded**, which
is the difference between a page that stays fast and one that does not.

| `mode` | What it shows | When it loads |
|---|---|---|
| `card` | Name, blurb, the one input marked `primary`, the first few result fields | **When clicked.** Until then it is static markup |
| `page` | Everything: all inputs, the full result, the tool's links | When it scrolls near the viewport |
| `embed` | No title — sized for the middle of an article | When it scrolls near the viewport |

A card is a *facade*: real markup, no behaviour, no download. If your site renders HTML on the server,
give it a **seed** — the tool's result for its default inputs, computed at build time — and the card
shows a real answer before any JavaScript arrives:

```html
<tool-host tool="percentiles" mode="card">
  <script type="application/json" data-toolbench-seed>
    { "kind": "fields", "fields": [{ "label": "p99", "value": "1200" }] }
  </script>
</tool-host>
```

## Adding it to a website

Three things, once:

```ts
import { defineToolHost, RegistrySource } from "@toolbench/runtime";

defineToolHost({
  // 1. Where tools come from. This one reads a directory your bundler already sees.
  source: new RegistrySource({
    percentiles: {
      manifest: percentilesManifest,               // the parsed tool.json
      load: () => import("./tools/percentiles/index.ts"),
    },
  }),

  // 2. Only needed for tools that declare thread: "worker". See below.
  workerFactory: () => new Worker(new URL("./tool.worker.ts", import.meta.url), { type: "module" }),

  // 3. Where a card's "open the full tool" link points.
  pageUrl: (id) => `/tools/${id}/`,
});
```

With a bundler that supports directory globs (Vite, and most others) the source is four lines — see
[`bench/src/registry.ts`](bench/src/registry.ts) for the version this repository uses.

### Worker mode

A tool whose running time depends on its input declares `thread: "worker"`, and then the host needs
one small file. It has to live in *your* project, because only your bundler can resolve your tools:

```ts
// tool.worker.ts
import { createToolWorker } from "@toolbench/runtime/worker";
import { registry } from "./registry.ts";

createToolWorker({ load: (id) => registry[id].load() });
```

⚠️ **If you use Vite, set `worker: { format: "es" }`.** It defaults to a format that cannot split
code, so a worker that imports tools works in development and fails the production build.

### Theming

The runtime renders inside a shadow root, so your CSS cannot reach in and its CSS cannot leak out.
Theming is therefore explicit, and it is the only styling API:

```css
tool-host {
  --tb-accent: #0b6b5f;
  --tb-bg: #ffffff;
  --tb-border: #d8e2e0;
  --tb-radius: 2px;
  --tb-font: Georgia, serif;
}
```

Every colour, radius and font is a custom property with a sensible default that follows the page's
light or dark scheme. The full list is at the top of
[`packages/runtime/src/styles.ts`](packages/runtime/src/styles.ts).

## What a tool can return

A closed set of shapes, so the runtime can draw anything a tool produces and a tool cannot invent
something nobody can render:

| Kind | For |
|---|---|
| `fields` | Label-and-value pairs, optionally grouped |
| `table` | Columns and rows |
| `series` | A chart — with axes, a legend, annotations, and the same data as a table for anyone who cannot see it |
| `text`, `code` | Plain or monospaced output |
| `group` | Several of the above in one result. Common: a decode returns fields *and* a table |
| `error` | The input was wrong. Naming the input marks that control invalid |

**Returning `error` means the input was bad. Throwing means the tool has a bug.** The two render
differently, deliberately.

## Versioning, in one paragraph

Every tool declares the contract version it was written against (`"sdk": 1`). The runtime supports
every version it has ever shipped. Changes are additive only — new result kinds, new input types, new
optional fields — and each version boundary gets a small migration that carries an old tool's manifest
and output forward. A tool written today keeps working untouched when the runtime is three versions
ahead, and that claim is tested: every tool's fixtures run against the current runtime on every
change. A tool asking for a *newer* version than the runtime fails loudly with what it needs, rather
than rendering an empty box. Details in [docs/versioning.md](docs/versioning.md).

## What it costs

Measured on the built bench, gzipped:

| | |
|---|---|
| The runtime, once per page that uses a tool | **~15 KB** |
| Each tool | **~1 KB**, in its own chunk, loaded on demand |
| A page with no tool | **0 bytes** |
| A card nobody clicks | **0 bytes** of tool code |

## What it deliberately does not do

- **It is not a code playground.** Readers do not write code. That needs a compiler in the browser,
  which costs megabytes.
- **It is not a notebook.** No dataflow between tools.
- **It does not sandbox.** A tool is your own code, bundled by your own build. A worker here is a
  stability boundary — it lets a slow tool be stopped — not a security one. If you ever run code you
  did not write, that needs a different design.
- **Version 1 tools are pure functions.** No file input, no network. Both are planned as additive
  contract versions, which is exactly the case the versioning policy exists for.

## Requirements

Node 22.6+ (it runs TypeScript directly, which is how tool fixtures execute with no build step), and
any bundler for the host site. `pnpm` for this repository.

## Licence

MIT.
