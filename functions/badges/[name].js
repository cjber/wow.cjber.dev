// shields.io endpoint badges: /badges/total.json and /badges/<repo>.json.
// https://img.shields.io/endpoint?url=https://wow.cjber.dev/badges/total.json

import { compact, getStats } from "../../lib/stats.js";

export async function onRequestGet(context) {
	const name = String(context.params.name).replace(/\.json$/, "");
	let stats;
	try {
		stats = await getStats(context);
	} catch (error) {
		return Response.json({ error: error.message }, { status: 502 });
	}
	const downloads = name === "total" ? stats.total : stats.addons[name]?.downloads;
	if (downloads === undefined) return Response.json({ error: "no such addon" }, { status: 404 });

	return Response.json(
		{
			schemaVersion: 1,
			label: name === "total" ? "CurseForge downloads" : "downloads",
			message: compact(downloads),
			color: "d9a441",
		},
		{ headers: { "Cache-Control": "public, max-age=3600" } },
	);
}
