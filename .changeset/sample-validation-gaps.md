---
"@toolbench/sdk": patch
"@toolbench/runtime": patch
---

Refuse two samples that fill the same input values, even when their labels differ. Duplicate label and input-id errors now name the second colliding field instead of the whole array. `maxLength` still does not bound `default`; that stays documented rather than a silent contract narrowing.
