---
"@toolbench/runtime": minor
"@toolbench/sdk": minor
---

Add an optional `highlight` hook on `defineToolHost` so a host can paint `code` results with its own highlighter. The hook returns a `Node`, not a string, so the runtime never assigns `innerHTML`. A host that omits it still gets readable preformatted text. Runtime API only: `SDK_VERSION` stays.
