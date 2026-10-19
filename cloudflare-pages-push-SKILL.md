@---
name: cloudflare-pages-push
description: Inspect, build, deploy, and verify an existing GitHub project on Cloudflare Pages using current Wrangler CLI commands or Cloudflare Git integration. Use when asked to publish a repository, push a website live, create a pages.dev URL, or configure repeatable deployments.
---

# Cloudflare Pages Push Skill

## Goal

Publish an existing project to Cloudflare Pages with the least risky supported workflow, then report the exact live URL and any remaining setup steps.

## Operating rules

- Inspect the repository before changing files or deploying.
- Never assume the framework or build output directory. Read `package.json`, lockfiles, framework config, README, and existing Cloudflare configuration.
- Do not overwrite or delete project files without a clear need.
- Never print, commit, or place API tokens in source files. Use `wrangler login` for interactive local use or environment secrets for CI.
- Do not claim deployment succeeded until the CLI reports success and the URL has been checked.
- Ask before making a consequential choice that cannot easily be reversed, especially choosing between Cloudflare Pages Git integration and Direct Upload for a new project.
- If the project is a full-stack app that depends on unsupported server behavior, explain the mismatch and determine whether it needs Pages Functions or Cloudflare Workers rather than uploading it as static assets.
- Prefer a readable, lowercase, hyphenated project slug. Cloudflare may alter the resulting `pages.dev` hostname if the name is unavailable; use the actual URL reported by Cloudflare.
- Do not promise that a custom domain is available unless the user owns/configures it.

## Step 1 — Inspect the project

1. Confirm the repository root and current Git status.
2. Inspect:
   - `package.json` scripts and dependencies, if present
   - lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, etc.)
   - framework configuration files
   - `wrangler.toml` or `wrangler.jsonc`
   - existing `.github/workflows/`
   - `.gitignore` and environment-variable usage
3. Identify whether the project is:
   - plain static HTML/CSS/JS
   - a static-site generator
   - a frontend framework with a build step
   - a full-stack/server-rendered application
4. Determine the correct build command and output directory from the project itself and its framework documentation/configuration. Common output directories such as `dist`, `build`, or `out` are examples only, not assumptions.
5. Check whether the repository already has a Cloudflare Pages project or Git integration. Do not create a duplicate project without checking.

## Step 2 — Choose the deployment route

### Route A: Cloudflare Git integration (best for hands-off GitHub deploys)

Recommend this route when the user wants every push to GitHub to trigger a Cloudflare build and deployment.

1. In Cloudflare Dashboard, open **Workers & Pages** and create a Pages application connected to the correct GitHub repository.
2. Select the production branch.
3. Set the framework/build command and build output directory based on inspection.
4. Configure required environment variables in Cloudflare project settings; do not commit secrets.
5. Deploy and verify the production URL.
6. Explain that Cloudflare creates preview deployments for other branches/PRs where supported.
7. Important: Cloudflare documents that a Git-integrated Pages project cannot later be switched to Direct Upload. Make this trade-off clear before the project is created.

Use the dashboard connection when Git integration is the intended path. Do not pretend a local Wrangler command can connect a GitHub repository to Cloudflare's native Git integration.

### Route B: Wrangler Direct Upload

Use this for a project whose build artifacts should be uploaded by CLI or CI, or when the user explicitly asks for a CLI-driven deploy.

1. Check Node.js/npm are available.
2. Authenticate interactively if needed:

   ```bash
   npx wrangler login
   ```

3. Check existing Pages projects:

   ```bash
   npx wrangler pages project list
   ```

4. If the intended project does not exist, create it with a memorable slug and the actual production branch:

   ```bash
   npx wrangler pages project create <PROJECT_NAME> --production-branch <BRANCH_NAME>
   ```

   Use a lowercase, hyphenated slug, for example `bright-dashboard` or `cargo-flow-portal`. Check availability rather than promising the slug is free.

5. Install dependencies using the repository's existing package manager and lockfile. Run the repository's verified build command.
6. Confirm that the configured output directory exists and contains the expected built site. Do not upload the repository root unless it is genuinely the static output directory.
7. Deploy using the current Pages command:

   ```bash
   npx wrangler pages deploy <BUILD_OUTPUT_DIRECTORY> --project-name <PROJECT_NAME>
   ```

   Optional preview deployment:

   ```bash
   npx wrangler pages deploy <BUILD_OUTPUT_DIRECTORY> --project-name <PROJECT_NAME> --branch <BRANCH_NAME>
   ```

8. Capture the exact deployment URL from CLI output. Production URLs normally use `https://<PROJECT_NAME>.pages.dev`; branch previews may use a branch-specific hostname. The actual output is authoritative.
9. Verify the deployed URL with an HTTP request or browser if available. Check that it returns successfully and that the main page/assets load. If verification tools are unavailable, state that limitation honestly.

Use `npx wrangler ...` so the command can run without a global Wrangler installation. If the repository pins Wrangler locally, prefer the project's installed version and consult its CLI help before relying on flags.

## Step 3 — Keep GitHub deployments automatic (optional)

If the user wants CLI/CI deployments after each push, add a GitHub Actions workflow only after confirming the build command, output directory, project name, and production branch.

Use Cloudflare's maintained Wrangler action and GitHub repository secrets. The current official documentation uses `cloudflare/wrangler-action@v4`.

Example `.github/workflows/pages-deployment.yaml` (replace placeholders after inspection):

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy
        uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy <BUILD_OUTPUT_DIRECTORY> --project-name=<PROJECT_NAME>
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

Adapt the Node version, package manager, install/build commands, output directory, and branch to the repository. Do not copy this template unchanged when the project does not use npm, does not have a `build` script, or does not output to the placeholder directory.

Add these repository Actions secrets:
- `CLOUDFLARE_API_TOKEN` — a narrowly scoped token with Cloudflare Pages edit permission for the relevant account.
- `CLOUDFLARE_ACCOUNT_ID` — the Cloudflare account ID.

Never hard-code these values in the workflow or repository. Follow current Cloudflare docs for the exact minimum token permissions and action inputs.

**Avoid duplicate deploys:** If Cloudflare's native Git integration already builds the same branch, do not add a second workflow unless the user explicitly wants both and understands the duplication.

## Step 4 — Custom domain / “sexy URL”

- First deliver the `*.pages.dev` URL if available.
- If the user owns a domain and wants a branded URL, explain the supported setup:
  - For an apex/root domain (for example `example.com`), the domain must be configured as a Cloudflare zone and its nameservers must point to Cloudflare.
  - For a subdomain (for example `app.example.com`), add it through the Pages project's **Custom domains** workflow. A CNAME may be needed when DNS is hosted elsewhere.
- Do not merely add a DNS CNAME and assume the domain is active; associate the domain through Pages first.
- Never invent a domain or state that DNS/TLS is ready without verifying it.
- Ask the user for their domain only if they want to configure a custom domain.

## Step 5 — Troubleshooting

- **Build fails:** report the failing command and relevant error; do not deploy stale output.
- **Output directory missing:** inspect framework config and build logs; do not guess or upload the wrong folder.
- **Authentication fails:** guide the user through `npx wrangler login` locally, or verify GitHub secrets for CI. Never ask the user to paste a token into chat.
- **Project not found:** run `npx wrangler pages project list`, check the account/profile, and confirm the project slug.
- **URL returns an error:** inspect deployment status/logs and check the output contains `index.html` or the framework's expected entrypoint.
- **SPA deep links return 404:** inspect routing behavior and use the framework's recommended Pages configuration; do not blindly add redirects that could break Functions or assets.
- **Unsupported server runtime:** determine whether the app needs Pages Functions/Workers or another hosting target.
- **Custom domain pending:** verify it is attached to the correct Pages project and check DNS/CAA/TLS status using current Cloudflare guidance.

## Step 6 — Final report

Return a concise deployment summary with:

1. Project/repository name and detected framework.
2. Deployment route used (Git integration, Wrangler direct upload, or GitHub Actions).
3. Build command and output directory.
4. Exact production URL, plus preview URL if applicable.
5. Verification result (what was actually checked).
6. Whether future Git pushes deploy automatically.
7. Any remaining action required from the user, such as connecting GitHub, setting secrets, or adding a custom domain.

Never report success if the build or deployment failed. Distinguish between a URL printed by Wrangler and a URL actually tested.
