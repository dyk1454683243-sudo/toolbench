import "./boot.ts";
import { source } from "./boot.ts";
import { exampleToolIds, toolSourceDir } from "./registry.ts";
import { appendSource } from "./source.ts";
import { installThemeControl } from "./theme.ts";

installThemeControl();

/**
 * Builds a card per example tool, twice: once plain, once inside a themed container.
 *
 * Written with `document.createElement` rather than a template so it is obvious that the host does
 * nothing but set two attributes. Bench fixtures stay off this grid: a first visitor should not
 * meet a tool whose job is to time out.
 */
const manifests = await source.list();

/*
 * Two filters, and they compose. `exampleToolIds` is the real tools without the bench fixtures, so a
 * first visitor to the demo does not meet a tool whose job is to time out. The status filter then drops
 * anything not live: a deprecated tool still runs on its own page, but a card among current tools
 * presents it as current, which is the thing status exists to prevent. Both states have their own
 * section further down, so they get looked at rather than staying a field nobody opens.
 */
const liveExampleIds = exampleToolIds.filter((id) => {
	const manifest = manifests.find((m) => m.id === id);
	return (manifest?.status ?? "live") === "live";
});

for (const [containerId, mode] of [["cards", "card"], ["themed", "card"]] as const) {
	const container = document.getElementById(containerId);
	if (!container) continue;
	for (const id of liveExampleIds) {
		const slot = document.createElement("div");
		slot.className = "card-slot";
		const host = document.createElement("tool-host");
		host.setAttribute("tool", id);
		host.setAttribute("mode", mode);
		slot.append(host);
		container.append(slot);
		const dir = toolSourceDir[id];
		if (dir) appendSource(host, dir);
	}
}

// A small proof that the manifests are just data: the page can read them without loading any tool.
console.info(
	`[bench] ${manifests.length} tools from their manifests alone: ` +
		manifests.map((m) => `${m.id} (sdk ${m.sdk}, ${m.runtime.thread})`).join(", "),
);
