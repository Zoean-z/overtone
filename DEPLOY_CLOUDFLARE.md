# Cloudflare 部署

这个仓库现在已经改成适合部署到 Cloudflare 的结构：

- 页面默认静态生成
- `/api/likes` 走 Astro 服务端 endpoint
- 运行时目标是 Cloudflare Workers
- 文章、首页、项目页仍然是预渲染，不会因为接口而整站动态化

## 1. 需要配置的环境变量

在 Cloudflare 项目里添加这些变量：

```txt
PUBLIC_SITE_URL=https://你的正式域名
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

如果你继续沿用 Vercel KV 风格变量名，也兼容：

```txt
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

## 2. 先创建 Cloudflare KV namespace

Cloudflare 这个 Astro adapter 默认会给 session 预留一个 `SESSION` KV 绑定，所以第一次部署前先跑：

```bash
npx wrangler kv namespace create SESSION
```

把返回的 namespace id 填进 [wrangler.jsonc](D:/website/wrangler.jsonc) 里的 `"id"`。

## 3. Cloudflare 后台创建项目

推荐直接用 `Workers Builds` 连 GitHub 仓库：

- 进入 `Compute > Workers & Pages`
- 选择 `Create application`
- 选择导入 GitHub 仓库
- 选这个仓库

构建配置填：

```txt
Build command: npx astro build
Deploy command: npx wrangler deploy
```

## 4. 本地预览

```bash
corepack pnpm install
corepack pnpm cf:dev
```

## 5. 自定义域名

部署成功后，在 Cloudflare 项目里绑定你的域名。

- 如果用子域名，例如 `blog.example.com`，通常只需要加一条 `CNAME`
- 如果用根域名，例如 `example.com`，一般需要把域名 DNS 托管到 Cloudflare

## 6. 迁移结果

你原来的这些内容都不需要重写：

- 文章
- 项目页
- 管理页
- 点赞前端交互

真正变化的只有：

- 部署平台从 Vercel 改成 Cloudflare
- 点赞接口从 Vercel 风格 `api/` 改成 Astro 原生 `src/pages/api/`
