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

- Separators can be spaces, commas, semicolons or newlines. A comma sitting between digits with no
  space after it is a thousands grouping (`1,204`) and is refused. Units are yours; the tool does
  not care.
- A non-numeric token is reported at the character where it starts.
- The mean is shown for contrast only. It is not a percentile and does not behave like one.
