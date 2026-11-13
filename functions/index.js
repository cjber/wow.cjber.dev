// The home page with live download counts: every element marked data-downloads="<repo>" or
// data-downloads="total" gets the current count. If CurseForge cannot be reached, the page is
// served as committed, with the counts it was last edited with.

import { compact, getStats } from "../lib/stats.js";

export async function onRequestGet(context) {
	const page = await context.next();
	let stats;
	try {
		stats = await getStats(context);
	} catch (error) {
		console.error(`download counts unavailable: ${error.message}`);
		return page;
	}
	const text = { total: compact(stats.total) };
	for (const [repo, { downloads }] of Object.entries(stats.addons)) text[repo] = compact(downloads);

	return new HTMLRewriter()
		.on("[data-downloads]", {
			element(el) {
				const value = text[el.getAttribute("data-downloads")];
				if (value !== undefined) el.setInnerContent(value);
			},
		})
		.transform(page);
}
