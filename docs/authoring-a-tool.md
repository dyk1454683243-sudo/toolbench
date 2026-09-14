# Authoring a tool

Four files in a directory. No build step, no framework, no browser needed to develop or test it.

```
tools/my-tool/
  tool.json      what it is, what it asks for, what it returns
  index.ts       the function
  cases.json     known-answer fixtures — its test suite
  README.md      the help text shown on its page
```

## 1. The function

```ts
import type { Output, Tool } from "@toolbench/sdk";

/** ⚠️ A `type`, not an `interface` — see the note at the bottom. */
type Input = { text: string; upper: boolean };

const tool: Tool<Input> = {
  run({ text, upper }, ctx) {
    if (text.trim() === "") {
      // The input was wrong, and saying so IS the tool working. Naming the input lets the form
      // mark that control invalid and point a screen reader at the message.
      return { kind: "error", message: "Nothing to reverse yet.", input: "text" };
    }
    const reversed = [...text].reverse().join("");
    return {
      kind: "fields",
      fields: [{ label: "reversed", value: upper ? reversed.toUpperCase() : reversed }],
    } satisfies Output;
  },
};

export default tool;
```

Rules, all of them:

- **`run` is a function of its inputs.** No DOM, no clock, no unseeded randomness, no network. That
  is what lets it be tested by fixture and run at build time.
- **Return `error` for bad input. Throw for a bug in the tool.** They render differently on purpose.
- **A loop whose length depends on an input must check `ctx.signal`**, and the tool should declare
  `thread: "worker"` so a timeout can stop it.

## 2. The manifest

```jsonc
{
  "sdk": 1,                          // the contract version — see docs/versioning.md
  "id": "my-tool",                   // must match the directory name
  "name": "My tool",
  "blurb": "One sentence. Used on cards and as a page description.",
  "version": "1.0.0",
  "capabilities": ["pure"],
  "runtime": { "entry": "index.ts", "thread": "main" },
  "kinds": ["fields", "error"],      // every kind `run` can return
  "card": "live",                    // live | info | none
  "cardFields": 4,
  "autoRun": false,                  // default. true = update as the reader types
  "inputs": [
    {
      "id": "text",
      "type": "textarea",
      "label": "Text",
      "description": "Shown under the control, and read by a screen reader.",
      "primary": true,               // the one input a card shows. At most one
      "default": "hello"
    },
    { "id": "upper", "type": "toggle", "label": "Shout", "default": false }
  ],
  "help": "README.md",
  "links": [{ "label": "The spec", "href": "https://example.org/spec" }]
}
```

The validator refuses things that would fail later, and says which field is wrong. A few worth
knowing about before you hit them:

- a `number` input **must** declare `min` and `max` — they are the only guard against an input that
  turns a bounded computation into an unbounded one;
- `kinds` must include `"error"`, because every tool can be given bad input;
- `timeoutMs` is rejected unless `thread` is `"worker"`. On the main thread there is nothing to
  terminate, so the field would be a lie;
- only a `pure` tool may be `card: "live"` — a compact slot must not read files or call networks;
- `autoRun` is rejected on a worker-mode tool. A tool declared `thread: "worker"` did so because its
  running time depends on its input, which is the definition of a tool that should not run on every
  keystroke.

**Nothing runs by itself.** The reader presses Run (or Enter). Changing an input marks the previous
result stale rather than recomputing it. `autoRun: true` opts a genuinely instant tool into updating as
you type — reach for it rarely.

## 3. The fixtures

`cases.json` is the tool's test suite, and it runs in Node in milliseconds.

```jsonc
[
  {
    "name": "reverses, and shouts when asked",
    "input": { "text": "abc", "upper": true },
    "expect": { "kind": "fields", "fields": [{ "label": "reversed", "value": "CBA" }] }
  },
  {
    "name": "empty input is a question, not a crash",
    "input": { "text": "  ", "upper": false },
    "expect": { "kind": "error", "message": "Nothing to reverse yet.", "input": "text" }
  }
]
```

**Matching is exact by default.** That is what catches a field emitted twice, fields reordered, a
field quietly dropped, or garbage returned beside a correct error message.

When a tool's output is genuinely open-ended — a `group` with several parts, say — a case may opt out,
and it owes two things in return:

```jsonc
{
  "name": "the summary half",
  "input": { "values": "1 2 3" },
  "match": "subset",
  "why": "this case is about the summary fields; the full group is asserted exactly elsewhere",
  "fieldCount": 6,
  "expect": { "kind": "fields", "fields": [{ "label": "p50", "value": "2" }] }
}
```

Subset matching looks **inside a group** for a part of the expected kind, identifies fields by
*group + label*, and matches an error message by substring. `fieldCount` is mandatory so a dropped
field still fails.

Run them:

```
pnpm test                     # every tool's fixtures, plus the SDK's own tests
```

## 4. The help

`README.md` beside the tool. A host renders it on the tool's page. Write it for someone who has the
tool in front of them and wants to know what the numbers mean.

---

## Two gotchas worth reading before you hit them

**Declare your input type as a `type`, not an `interface`.** TypeScript gives an implicit index
signature to a type alias and not to an interface, so an interface will not satisfy `InputValues` and
the error message ("index signature is missing") does not hint at the fix.

**No `enum`, `namespace`, decorators or constructor parameter properties.** Tools are compiled with
`erasableSyntaxOnly`, because Node runs them directly by stripping types — anything that *emits* code
would work through a bundler and fail in the fixture runner. The compiler enforces this, so you will
find out immediately rather than in CI.
