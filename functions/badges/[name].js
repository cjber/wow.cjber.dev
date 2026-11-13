// shields.io endpoint badges: /badges/total.json and /badges/<repo>.json.
// https://img.shields.io/endpoint?url=https://wow.cjber.dev/badges/total.json

import { compact, getStats, listAddons } from "../../lib/stats.js";

export async function onRequestGet(context) {
	const name = String(context.params.name).replace(/\.json$/, "");
	let stats;
	try {
		// Check the name against the page first, so an unknown badge never reaches CurseForge.
		if (name !== "total" && !(await listAddons(context)).some((a) => a.repo === name)) {
			return Response.json({ error: "no such addon" }, { status: 404 });
		}
		stats = await getStats(context);
	} catch (error) {
		return Response.json({ error: error.message }, { status: 502 });
	}
	const downloads = name === "total" ? stats.total : stats.addons[name].downloads;

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

// HEAD gets the same headers as GET; without this it would skip the function and get the static page.
export const onRequestHead = onRequestGet;
