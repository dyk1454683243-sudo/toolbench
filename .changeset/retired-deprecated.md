---
"@toolbench/sdk": minor
"@toolbench/runtime": minor
---

Honour manifest `status`. A retired tool no longer activates: the element explains and renders `links` as the way onward, so a bookmarked URL is not a 404 and is not a silent run. A deprecated tool still runs, with a visible marker a host can style via `data-status` on `<tool-host>` and the `--tb-mark-*` tokens, and it is refused as a live card.

Minor rather than patch, because a manifest that loaded before this can now fail to load: `card: "live"` together with a `status` of `deprecated` or `retired` is refused. That combination states two contradictory things, so refusing it can only catch a mistake, but it is still a rule an existing manifest could trip, and at 0.x a minor bump is the only signal available for that.
