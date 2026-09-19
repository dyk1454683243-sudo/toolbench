# Regex explainer

Walks a JavaScript regular expression token by token, tests it against a subject, and shows the
matches as JSON. It updates as you type.

## What it computes

The walk is a reading of the pattern, not a different engine. Each token is the source text plus a
short meaning: the atom, then a comma, then how many times it may repeat. Capturing groups are
numbered in the order JavaScript numbers them.

The match is whatever `RegExp` does with the chosen flags. Without `g` that is the first match.
With `g` it is every match. The JSON block is the `data-lang` hook: the runtime does not highlight
it, and a host that wants highlighting can.

## What this does not handle

- **Other dialects.** JavaScript `RegExp` only. POSIX, PCRE, RE2 and .NET have different rules,
  especially around lookbehind, word characters and what `\\s` includes.
- **Replacement and split.** The tool tests; it does not rewrite.
- **The `u` and `v` flags.** Unicode property escapes and set notation need those flags, and they
  are not on the menu. A `\\p{L}` without `u` is just a `p`.
- **Host highlighting.** `code` sets `data-lang`. Colouring the block is a host concern, see the
  project issue on highlighting.
- **Catastrophic patterns.** A group that already contains an unbounded repeat (`+`, `*`, `{n,}`)
  and is itself unbounded is refused. The tool runs on every keystroke, on the main thread, and
  those patterns are the ones that would not finish.
- **A full static analysis.** Possessive quantifiers, recursion and atomic constructs do not exist
  in JavaScript; things that do exist but this walk does not name are shown as the characters they
  are.

## Why it auto-runs

A one-line pattern against a short subject is instant, and the point of an explainer is to see
what changed when a character is added. A worker-mode tool cannot set `autoRun`; this one is
main-thread on purpose, with the input lengths and the nested-repeat rule as the bound.
