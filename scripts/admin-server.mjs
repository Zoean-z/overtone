import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const adminDir = path.join(rootDir, "admin");
const postsDir = path.join(rootDir, "src", "content", "posts");
const publicDir = path.join(rootDir, "public");
const siteSettingsPath = path.join(rootDir, "src", "data", "site-settings.json");
const projectsPath = path.join(rootDir, "src", "data", "projects.json");

const host = "127.0.0.1";
const port = 4312;

const accentPalette = [
	"from-[oklch(0.34_0.08_330)] via-[oklch(0.26_0.04_265)] to-[oklch(0.18_0.02_250)]",
	"from-[oklch(0.31_0.07_230)] via-[oklch(0.22_0.04_235)] to-[oklch(0.16_0.02_240)]",
	"from-[oklch(0.33_0.09_170)] via-[oklch(0.24_0.05_195)] to-[oklch(0.16_0.02_215)]",
	"from-[oklch(0.38_0.10_60)] via-[oklch(0.25_0.05_30)] to-[oklch(0.15_0.02_20)]",
	"from-[oklch(0.34_0.08_25)] via-[oklch(0.24_0.04_10)] to-[oklch(0.15_0.02_355)]",
];

function json(data, statusCode = 200) {
	return {
		statusCode,
		headers: { "Content-Type": "application/json; charset=utf-8" },
		body: JSON.stringify(data),
	};
}

function sanitizeSlug(value) {
	return (value || "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\u4e00-\u9fa5\s/-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/\/+/g, "/")
		.replace(/^\/|\/$/g, "");
}

function createMark(title) {
	const ascii = (title || "")
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "")
		.slice(0, 2);
	if (ascii.length >= 2) return ascii;
	const compact = (title || "").replace(/\s+/g, "").slice(0, 2);
	return compact || "PR";
}

function normalizeProject(project, index) {
	return {
		title: project.title?.trim() || "未命名项目",
		tagline: project.tagline?.trim() || "",
		description: project.description?.trim() || "",
		stack: Array.isArray(project.stack)
			? project.stack.map((x) => String(x).trim()).filter(Boolean)
			: String(project.stack || "")
					.split(",")
					.map((x) => x.trim())
					.filter(Boolean),
		github: project.github?.trim() || "",
		demo: project.demo?.trim() || "",
		status: project.status?.trim() || "项目",
		mark: project.mark?.trim() || createMark(project.title),
		accent: project.accent?.trim() || accentPalette[index % accentPalette.length],
	};
}

function postSlugToPath(slug) {
	return path.join(postsDir, `${slug}.md`);
}

function pathToPostSlug(filePath) {
	const relative = path.relative(postsDir, filePath).replace(/\\/g, "/");
	return relative.replace(/\.md$/i, "").replace(/\/index$/i, "");
}

async function ensureDir(dirPath) {
	await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath) {
	const content = await fs.readFile(filePath, "utf8");
	return JSON.parse(content);
}

async function writeJson(filePath, value) {
	await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseFrontmatter(content) {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) {
		return {
			meta: {
				title: "",
				published: "",
				description: "",
				image: "",
				tags: [],
				category: "",
				draft: false,
			},
			body: content,
		};
	}

	const meta = {
		title: "",
		published: "",
		description: "",
		image: "",
		tags: [],
		category: "",
		draft: false,
	};

	for (const line of match[1].split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		const separator = trimmed.indexOf(":");
		if (separator < 0) continue;
		const key = trimmed.slice(0, separator).trim();
		let value = trimmed.slice(separator + 1).trim();
		value = value.replace(/^["']|["']$/g, "");
		if (key === "tags") {
			const tagText = value.replace(/^\[|\]$/g, "");
			meta.tags = tagText
				.split(",")
				.map((tag) => tag.trim().replace(/^["']|["']$/g, ""))
				.filter(Boolean);
			continue;
		}
		if (key === "draft") {
			meta.draft = value === "true";
			continue;
		}
		if (key in meta) {
			meta[key] = value;
		}
	}

	return { meta, body: match[2] };
}

function serializePost(post) {
	const tagsText = `[${post.tags.map((tag) => tag).join(", ")}]`;
	return `---\n`
		+ `title: ${post.title}\n`
		+ `published: ${post.published}\n`
		+ `description: ${post.description}\n`
		+ `image: ${post.image || ""}\n`
		+ `tags: ${tagsText}\n`
		+ `category: ${post.category || ""}\n`
		+ `draft: ${post.draft ? "true" : "false"}\n`
		+ `---\n\n`
		+ `${post.body || ""}\n`;
}

async function collectPostFiles(dirPath) {
	const entries = await fs.readdir(dirPath, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await collectPostFiles(fullPath)));
			continue;
		}
		if (entry.isFile() && entry.name.endsWith(".md")) {
			files.push(fullPath);
		}
	}
	return files;
}

async function listPosts() {
	const files = await collectPostFiles(postsDir);
	const posts = [];
	for (const filePath of files) {
		const content = await fs.readFile(filePath, "utf8");
		const { meta, body } = parseFrontmatter(content);
		posts.push({
			slug: pathToPostSlug(filePath),
			...meta,
			body,
		});
	}
	posts.sort((a, b) => String(b.published).localeCompare(String(a.published)));
	return posts;
}

function parseDataUrl(dataUrl) {
	const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
	if (!match) throw new Error("Invalid data url");
	return {
		mimeType: match[1],
		buffer: Buffer.from(match[2], "base64"),
	};
}

function extensionFromMime(mimeType, fileName = "") {
	const direct =
		{
			"image/png": ".png",
			"image/jpeg": ".jpg",
			"image/webp": ".webp",
			"image/gif": ".gif",
		}[mimeType] || "";
	if (direct) return direct;
	return path.extname(fileName) || ".png";
}

async function saveImageUpload(payload) {
	const { mimeType, buffer } = parseDataUrl(payload.dataUrl);
	const ext = extensionFromMime(mimeType, payload.fileName);

	if (payload.kind === "avatar" || payload.kind === "banner") {
		const targetPath = path.join(publicDir, "brand", `${payload.kind}${ext}`);
		await ensureDir(path.dirname(targetPath));
		await fs.writeFile(targetPath, buffer);
		return `/brand/${payload.kind}${ext}`;
	}

	if (payload.kind === "post-cover") {
		const slug = sanitizeSlug(payload.slug);
		if (!slug) throw new Error("Post slug is required for cover upload");
		const targetPath = path.join(publicDir, "uploads", "posts", `${slug}${ext}`);
		await ensureDir(path.dirname(targetPath));
		await fs.writeFile(targetPath, buffer);
		return `/uploads/posts/${slug}${ext}`;
	}

	throw new Error("Unsupported upload kind");
}

function runCommand(command, args) {
	const result = spawnSync(command, args, {
		cwd: rootDir,
		encoding: "utf8",
		shell: false,
	});
	return {
		status: result.status ?? 0,
		stdout: result.stdout || "",
		stderr: result.stderr || "",
	};
}

async function handlePublish(message) {
	const statusResult = runCommand("git", ["status", "--short"]);
	if (statusResult.status !== 0) {
		throw new Error(statusResult.stderr || statusResult.stdout || "git status failed");
	}

	const hasChanges = statusResult.stdout.trim().length > 0;
	if (!hasChanges) {
		return { ok: true, message: "没有可提交的改动。", output: statusResult.stdout };
	}

	const addResult = runCommand("git", ["add", "."]);
	if (addResult.status !== 0) throw new Error(addResult.stderr || "git add failed");

	const commitResult = runCommand("git", ["commit", "-m", message || "Update site content"]);
	if (commitResult.status !== 0) {
		throw new Error(commitResult.stderr || commitResult.stdout || "git commit failed");
	}

	const pushResult = runCommand("git", ["push"]);
	if (pushResult.status !== 0) {
		throw new Error(pushResult.stderr || pushResult.stdout || "git push failed");
	}

	return {
		ok: true,
		message: "已提交并推送。",
		output: [commitResult.stdout, commitResult.stderr, pushResult.stdout, pushResult.stderr]
			.filter(Boolean)
			.join("\n"),
	};
}

async function handleValidate() {
	const checkResult = runCommand("corepack", ["pnpm", "check"]);
	const buildResult = runCommand("corepack", ["pnpm", "build"]);
	const ok = checkResult.status === 0 && buildResult.status === 0;
	return {
		ok,
		output: [
			"$ corepack pnpm check",
			checkResult.stdout,
			checkResult.stderr,
			"$ corepack pnpm build",
			buildResult.stdout,
			buildResult.stderr,
		]
			.filter(Boolean)
			.join("\n"),
	};
}

async function parseRequestBody(req) {
	const chunks = [];
	for await (const chunk of req) chunks.push(chunk);
	const raw = Buffer.concat(chunks).toString("utf8");
	return raw ? JSON.parse(raw) : {};
}

async function serveFile(filePath) {
	const content = await fs.readFile(filePath);
	const ext = path.extname(filePath);
	const contentType =
		{
			".html": "text/html; charset=utf-8",
			".js": "application/javascript; charset=utf-8",
			".css": "text/css; charset=utf-8",
			".json": "application/json; charset=utf-8",
		}[ext] || "application/octet-stream";
	return { statusCode: 200, headers: { "Content-Type": contentType }, body: content };
}

const server = createServer(async (req, res) => {
	try {
		const requestUrl = new URL(req.url || "/", `http://${host}:${port}`);

		if (req.method === "GET" && requestUrl.pathname === "/api/bootstrap") {
			const settings = await readJson(siteSettingsPath);
			const projects = await readJson(projectsPath);
			const posts = await listPosts();
			const response = json({ settings, projects, posts });
			res.writeHead(response.statusCode, response.headers);
			res.end(response.body);
			return;
		}

		if (req.method === "POST" && requestUrl.pathname === "/api/settings") {
			const body = await parseRequestBody(req);
			await writeJson(siteSettingsPath, body.settings);
			const response = json({ ok: true });
			res.writeHead(response.statusCode, response.headers);
			res.end(response.body);
			return;
		}

		if (req.method === "POST" && requestUrl.pathname === "/api/projects") {
			const body = await parseRequestBody(req);
			const projects = (body.projects || []).map(normalizeProject);
			await writeJson(projectsPath, projects);
			const response = json({ ok: true, projects });
			res.writeHead(response.statusCode, response.headers);
			res.end(response.body);
			return;
		}

		if (req.method === "POST" && requestUrl.pathname === "/api/post") {
			const body = await parseRequestBody(req);
			const slug = sanitizeSlug(body.slug || body.title);
			if (!slug) throw new Error("文章 slug 不能为空");
			const originalSlug = sanitizeSlug(body.originalSlug || slug);
			const postPath = postSlugToPath(slug);
			const originalPath = postSlugToPath(originalSlug);
			await ensureDir(path.dirname(postPath));
			await fs.writeFile(
				postPath,
				serializePost({
					title: body.title?.trim() || slug,
					published: body.published?.trim() || new Date().toISOString().slice(0, 10),
					description: body.description?.trim() || "",
					image: body.image?.trim() || "",
					tags: Array.isArray(body.tags)
						? body.tags.map((tag) => String(tag).trim()).filter(Boolean)
						: String(body.tags || "")
								.split(",")
								.map((tag) => tag.trim())
								.filter(Boolean),
					category: body.category?.trim() || "",
					draft: Boolean(body.draft),
					body: body.body || "",
				}),
				"utf8",
			);
			if (originalSlug && originalSlug !== slug) {
				try {
					await fs.unlink(originalPath);
				} catch {}
			}
			const response = json({ ok: true, slug });
			res.writeHead(response.statusCode, response.headers);
			res.end(response.body);
			return;
		}

		if (req.method === "POST" && requestUrl.pathname === "/api/delete-post") {
			const body = await parseRequestBody(req);
			const slug = sanitizeSlug(body.slug);
			if (!slug) throw new Error("文章 slug 不能为空");
			await fs.unlink(postSlugToPath(slug));
			const response = json({ ok: true });
			res.writeHead(response.statusCode, response.headers);
			res.end(response.body);
			return;
		}

		if (req.method === "POST" && requestUrl.pathname === "/api/upload-image") {
			const body = await parseRequestBody(req);
			const assetPath = await saveImageUpload(body);
			const response = json({ ok: true, path: assetPath });
			res.writeHead(response.statusCode, response.headers);
			res.end(response.body);
			return;
		}

		if (req.method === "POST" && requestUrl.pathname === "/api/publish") {
			const body = await parseRequestBody(req);
			const result = await handlePublish(body.message);
			const response = json(result);
			res.writeHead(response.statusCode, response.headers);
			res.end(response.body);
			return;
		}

		if (req.method === "POST" && requestUrl.pathname === "/api/validate") {
			const result = await handleValidate();
			const response = json(result);
			res.writeHead(response.statusCode, response.headers);
			res.end(response.body);
			return;
		}

		const filePath =
			requestUrl.pathname === "/"
				? path.join(adminDir, "index.html")
				: path.join(adminDir, requestUrl.pathname.replace(/^\/+/, ""));
		const response = await serveFile(filePath);
		res.writeHead(response.statusCode, response.headers);
		res.end(response.body);
	} catch (error) {
		const response = json(
			{ ok: false, message: error instanceof Error ? error.message : String(error) },
			500,
		);
		res.writeHead(response.statusCode, response.headers);
		res.end(response.body);
	}
});

server.listen(port, host, () => {
	console.log(`Local admin running at http://${host}:${port}`);
});
