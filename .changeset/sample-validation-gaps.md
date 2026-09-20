---
"@toolbench/sdk": minor
"@toolbench/runtime": minor
---

Refuse two samples that fill the same input values, even when their labels differ. Duplicate label and input-id errors now name the second colliding field instead of the whole array. `maxLength` still does not bound `default`; that stays documented rather than a silent contract narrowing.

Minor rather than patch: a manifest that loaded before this can fail to load after it, and at 0.x a minor bump is the only signal available for that. The `default` gap stays open because a long default can be deliberate, where two identical buttons cannot.
