// The home page with live download counts: every element marked data-downloads="<repo>" or
// data-downloads="total" gets the current count. If CurseForge cannot be reached, the page is
// served as committed, with the counts it was last edited with.

import { compact, getStats } from "../lib/stats.js";

export async function onRequestGet(context) {
	let stats;
	try {
		stats = await getStats(context);
	} catch (error) {
		console.error(`download counts unavailable: ${error.message}`);
		return context.next();
	}

	// The asset's ETag and Last-Modified describe the committed file, not the rewritten page, so a
	// conditional request would get a 304 and keep old counts. Ask for the full file and drop them.
	const request = new Request(context.request);
	request.headers.delete("If-None-Match");
	request.headers.delete("If-Modified-Since");
	const page = await context.next(request);

	const text = { total: compact(stats.total) };
	for (const [repo, { downloads }] of Object.entries(stats.addons)) text[repo] = compact(downloads);
	const rewritten = new HTMLRewriter()
		.on("[data-downloads]", {
			element(el) {
				const value = text[el.getAttribute("data-downloads")];
				if (value !== undefined) el.setInnerContent(value);
			},
		})
		.transform(page);

	const headers = new Headers(rewritten.headers);
	for (const name of ["ETag", "Last-Modified", "Content-Length"]) headers.delete(name);
	headers.set("Cache-Control", "public, max-age=300");
	return new Response(rewritten.body, { status: rewritten.status, headers });
}
