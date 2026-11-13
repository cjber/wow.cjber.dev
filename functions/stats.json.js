// Exact downloads per addon and in total, as JSON.

import { getStats } from "../lib/stats.js";

export async function onRequestGet(context) {
	try {
		return Response.json(await getStats(context), {
			headers: { "Cache-Control": "public, max-age=3600" },
		});
	} catch (error) {
		return Response.json({ error: error.message }, { status: 502 });
	}
}
