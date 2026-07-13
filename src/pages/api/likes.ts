import { Redis } from "@upstash/redis";
import type { APIRoute } from "astro";

type RuntimeEnv = Record<string, unknown>;

type RuntimeLocals = {
	runtime?: {
		env?: RuntimeEnv;
	};
};

export const prerender = false;

function getEnvironmentValue(env: RuntimeEnv | undefined, key: string) {
	const runtimeValue = env?.[key];
	if (typeof runtimeValue === "string" && runtimeValue.trim())
		return runtimeValue;

	// Keeps the endpoint usable when it is deployed through a Node-style runtime.
	if (typeof process !== "undefined") return process.env?.[key];
	return undefined;
}

function getRedis(locals: unknown) {
	const env = (locals as RuntimeLocals | undefined)?.runtime?.env;
	const redisUrl =
		getEnvironmentValue(env, "UPSTASH_REDIS_REST_URL") ||
		getEnvironmentValue(env, "KV_REST_API_URL");
	const redisToken =
		getEnvironmentValue(env, "UPSTASH_REDIS_REST_TOKEN") ||
		getEnvironmentValue(env, "KV_REST_API_TOKEN");

	return redisUrl && redisToken
		? new Redis({
				url: redisUrl,
				token: redisToken,
			})
		: null;
}

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

async function readLikeState(
	redis: Redis | null,
	itemId: string,
	viewerId?: string,
) {
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

export const GET = (async ({ request, locals }) => {
	const url = new URL(request.url);
	const itemId = normalizeItemId(url.searchParams.get("id"));
	const viewerId = normalizeViewerId(url.searchParams.get("viewer"));

	if (!itemId) {
		return json({ ok: false, message: "Missing like item id." }, 400);
	}

	const result = await readLikeState(getRedis(locals), itemId, viewerId);
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

export const POST = (async ({ request, locals }) => {
	const body = await request.json().catch(() => null);
	const itemId = normalizeItemId(body?.id);
	const viewerId = normalizeViewerId(body?.viewerId);

	if (!itemId || !viewerId) {
		return json(
			{ ok: false, message: "Missing like item id or viewer id." },
			400,
		);
	}

	const redis = getRedis(locals);
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
