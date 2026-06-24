import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");
const assetsIgnorePath = path.join(distDir, ".assetsignore");

await mkdir(distDir, { recursive: true });
await writeFile(assetsIgnorePath, "_worker.js\n", "utf8");

console.log(`[cloudflare] wrote ${assetsIgnorePath}`);
