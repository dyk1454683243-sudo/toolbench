# Percentiles

Paste measurements — latencies, sizes, durations, anything — and get p50 through p99.9.

## What the two definitions mean

A percentile is a **position in a sorted list**, and there is more than one convention for what to do
when that position falls between two measurements.

- **Nearest rank** returns a value you actually measured. Your p99 is a real event that really took
  that long.
- **Linear interpolation** returns a point between the two measurements either side of the position.
  It is what numpy and R return by default.

Neither is wrong, and on a large sample they nearly agree. On a small or skewed sample they do not —
the table shows the gap for your data. What *is* wrong is comparing two systems whose tools use
different definitions, which happens constantly.

## Why "averaged p99" is in the output

Percentiles do not average. The tool splits your measurements into four chunks — the way a real system
splits across hosts, or a dashboard splits across minutes — takes each chunk's p99, and averages
those. That average is what a great many dashboards display.

Beside it is the true p99 of everything pooled. The difference is usually large and always in the same
direction: **the averaged figure understates the tail**, because a long tail in one chunk is diluted by
the quiet ones. If you take one thing from this tool, take that.

## Notes

- Separators can be spaces, commas, semicolons or newlines. Units are yours; the tool does not care.
- A comma sitting between digits with no space after it is refused, because it is genuinely ambiguous:
  `1,204` is one number to a reader pasting from a dashboard and two to a reader pasting a list, and
  `120,140,180` is three latencies or one hundred and twenty million depending on who typed it. Nothing in
  the text says which, so the tool refuses rather than guessing. Write `1204`, or put a space after each
  comma.
- ⚠️ The same ambiguity exists for a decimal comma and for a full stop used as a grouping separator, and
  neither is handled: `1.204` is read as 1.204, which is what a reader writing 1204 in a locale that groups
  with full stops did not mean. The tool cannot know the locale, and unlike the comma case there is no
  reading that is obviously safe to refuse, since `12.5` must keep working.
- A non-numeric token is reported at the character where it starts.
- The mean is shown for contrast only. It is not a percentile and does not behave like one.
