# Vercel Deployment

This project is ready to deploy to Vercel as a static Astro site.

## Recommended path: GitHub + Vercel

Astro's official deployment guide says static Astro sites deploy to Vercel with no extra adapter or special config, and Vercel should auto-detect the framework. Sources:

- [Astro Vercel deployment guide](https://docs.astro.build/en/guides/deploy/vercel/)
- [Vercel Astro framework docs](https://vercel.com/docs/frameworks/frontend/astro)

### 1. Put the project on GitHub

This workspace was created from a ZIP download, so it is currently **not** a Git repository yet.

Run:

```powershell
git init
git add .
git commit -m "Initial overtone.zoean site"
```

Then create a GitHub repo and push:

```powershell
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

### 2. Import into Vercel

In Vercel:

1. Click `Add New...` -> `Project`
2. Import the GitHub repository
3. Confirm the detected settings

Expected settings:

- Framework Preset: `Astro`
- Install Command: `pnpm install`
- Build Command: `pnpm build`
- Output Directory: `dist`

### 3. Set the canonical site URL

This project reads `PUBLIC_SITE_URL` in `astro.config.mjs`.

Before the first production deploy, set this in Vercel Project Settings -> Environment Variables:

```text
PUBLIC_SITE_URL=https://<your-vercel-domain-or-custom-domain>
```

Examples:

- `https://overtone-zoean.vercel.app`
- `https://overtone.zoean.com`

After changing it, redeploy once so sitemap, RSS, and canonical URLs use the correct domain.

### 4. Optional custom domain

If you later bind a custom domain in Vercel:

1. Add the domain in Vercel Project Settings -> Domains
2. Update `PUBLIC_SITE_URL` to that domain
3. Redeploy

## Alternative path: Vercel CLI

If you want to deploy directly from the local folder:

```powershell
npm i -g vercel
vercel
```

For production:

```powershell
vercel --prod
```

Set the same environment variable in Vercel:

```text
PUBLIC_SITE_URL=https://<your-vercel-domain-or-custom-domain>
```

## Local verification before deploy

```powershell
corepack pnpm check
corepack pnpm build
```
