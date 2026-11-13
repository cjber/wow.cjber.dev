// CurseForge download counts for every addon on the page, shared by the Pages Functions.
//
// The addon list is the page itself: each <article class="addon"> carries its CurseForge project
// ID in data-curseforge, so a new section is counted without touching this file. ForeverCore has
// no section and is left out on purpose: every player of any addon downloads it as a dependency,
// so adding it would count the same players twice.
//
// One CurseForge request covers every addon. The result is cached at the edge for an hour under
// one fixed key, and requests in the same isolate share one in-flight load, so a burst on a cold
// cache makes one request rather than one each.

const API = "https://api.curseforge.com/v1/mods";
const TTL_SECONDS = 3600;
const CACHE_KEY = "https://wow.cjber.dev/__cache/stats.json";

// Our own markup, written by hand in site/index.html: the article id is the addon's repository.
const ARTICLE = /<article class="addon" id="([a-z0-9-]+)" data-curseforge="(\d+)">/g;

let shared = null; // { expires, promise } for this isolate

/** Round down, so the site never claims more downloads than CurseForge reports. */
export function compact(n) {
	if (n >= 1_000_000) return `${Math.floor(n / 100_000) / 10}M`;
	if (n >= 10_000) return `${Math.floor(n / 1_000)}K`;
	if (n >= 1_000) return `${Math.floor(n / 100) / 10}K`;
	return String(n);
}

/** [{ repo, id }] for every addon section on the page, read from the static asset. */
export async function listAddons(context) {
	const page = await (await context.env.ASSETS.fetch(new URL("/", context.request.url))).text();
	const addons = [...page.matchAll(ARTICLE)].map(([, repo, id]) => ({ repo, id: Number(id) }));
	if (addons.length === 0) throw new Error("no <article> in index.html carries data-curseforge");
	return addons;
}

/** { generated, source, total, addons: { <repo>: { curseforge_id, downloads } } } */
export function getStats(context) {
	const now = Date.now();
	if (shared && shared.expires > now) return shared.promise;
	const promise = load(context).catch((error) => {
		if (shared?.promise === promise) shared = null;
		throw error;
	});
	shared = { expires: now + TTL_SECONDS * 1000, promise };
	return promise;
}

async function load(context) {
	const cache = caches.default;
	const hit = await cache.match(CACHE_KEY);
	if (hit) return hit.json();

	const apiKey = context.env.CURSEFORGE_API_KEY;
	if (!apiKey) throw new Error("CURSEFORGE_API_KEY is not set on the Pages project");
	const addons = await listAddons(context);

	const response = await fetch(API, {
		method: "POST",
		headers: {
			"x-api-key": apiKey,
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify({ modIds: addons.map((a) => a.id) }),
	});
	if (!response.ok) throw new Error(`CurseForge answered ${response.status}`);
	const { data } = await response.json();
	const counts = new Map(data.map((mod) => [mod.id, Number(mod.downloadCount)]));
	const missing = addons.filter((a) => !counts.has(a.id)).map((a) => a.id);
	if (missing.length) throw new Error(`CurseForge returned no project for IDs ${missing}`);

	const stats = {
		generated: new Date().toISOString(),
		source: "CurseForge",
		total: addons.reduce((sum, a) => sum + counts.get(a.id), 0),
		addons: Object.fromEntries(
			addons.map((a) => [a.repo, { curseforge_id: a.id, downloads: counts.get(a.id) }]),
		),
	};
	const cached = Response.json(stats, {
		headers: { "Cache-Control": `public, max-age=${TTL_SECONDS}` },
	});
	context.waitUntil(cache.put(CACHE_KEY, cached));
	return stats;
}
