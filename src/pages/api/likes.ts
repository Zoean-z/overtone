import { Redis } from "@upstash/redis";
import type { APIRoute } from "astro";

declare const process: {
	env: Record<string, string | undefined>;
};

export const prerender = false;

const redisUrl =
	process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken =
	process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const redis =
	redisUrl && redisToken
		? new Redis({
				url: redisUrl,
				token: redisToken,
			})
		: null;

const headers = {
	"Content-Type": "application/json; charset=utf-8",
	"Cache-Control": "no-store",
};

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers,
	});
}

function getLikeKey(itemId: string) {
	return `likes:item:${itemId}:users`;
}

function normalizeItemId(value: unknown) {
	return String(value || "")
		.trim()
		.slice(0, 160);
}

function normalizeViewerId(value: unknown) {
	return String(value || "")
		.trim()
		.slice(0, 160);
}

async function readLikeState(itemId: string, viewerId?: string) {
	if (!redis) {
		return { available: false, count: 0, liked: false };
	}

	const key = getLikeKey(itemId);
	const count = Number((await redis.scard(key)) || 0);
	const liked = viewerId
		? Boolean(await redis.sismember(key, viewerId))
		: false;

	return { available: true, count, liked };
}

export const GET = (async ({ request }) => {
	const url = new URL(request.url);
	const itemId = normalizeItemId(url.searchParams.get("id"));
	const viewerId = normalizeViewerId(url.searchParams.get("viewer"));

	if (!itemId) {
		return json({ ok: false, message: "Missing like item id." }, 400);
	}

	const result = await readLikeState(itemId, viewerId);
	if (!result.available) {
		return json(
			{
				ok: false,
				message: "Like storage is not configured.",
				code: "LIKE_STORAGE_MISSING",
			},
			503,
		);
	}

	return json({ ok: true, itemId, count: result.count, liked: result.liked });
}) satisfies APIRoute;

export const POST = (async ({ request }) => {
	const body = await request.json().catch(() => null);
	const itemId = normalizeItemId(body?.id);
	const viewerId = normalizeViewerId(body?.viewerId);

	if (!itemId || !viewerId) {
		return json(
			{ ok: false, message: "Missing like item id or viewer id." },
			400,
		);
	}

	if (!redis) {
		return json(
			{
				ok: false,
				message: "Like storage is not configured.",
				code: "LIKE_STORAGE_MISSING",
			},
			503,
		);
	}

	const key = getLikeKey(itemId);
	const alreadyLiked = Boolean(await redis.sismember(key, viewerId));

	if (alreadyLiked) {
		await redis.srem(key, viewerId);
	} else {
		await redis.sadd(key, viewerId);
	}

	const count = Number((await redis.scard(key)) || 0);

	return json({
		ok: true,
		itemId,
		count,
		liked: !alreadyLiked,
	});
}) satisfies APIRoute;
