---
"@toolbench/runtime": minor
"@toolbench/sdk": minor
---

Add a `values` setter and `run()` on `<tool-host>` so a host can prefill inputs without reimplementing examples inside every tool.

Setting `values` is partial, validated like typed input, and does not run the tool. An existing result goes stale. `run()` is opt-in, and both work before the form has opened. Runtime API only: `SDK_VERSION` stays.
