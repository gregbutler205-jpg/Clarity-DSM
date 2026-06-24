# ClarityDSM proxy

A tiny Express server that holds **one** Anthropic API key so the app's devices
never store one. Clients authenticate with a shared **access code**.

It exists for the "shared with colleagues" setup. If only one person uses
ClarityDSM, you don't need this at all — the app can use direct/BYO-key mode.

## What it does

- `POST /api/chat` — body `{ "system": "...", "message": "..." }`, header
  `x-access-code: <code>`. Returns `{ "text": "..." }` (or `{ "refusal": true }`).
- `GET /health` — returns `{ "ok": true }`.

Hardening: required access-code gate (constant-time compare; refuses to start
without it), CORS allow-list, per-IP rate limiting, input-size caps, and a fixed
model (`claude-sonnet-4-6`) so callers can't request an expensive one.

## Run locally

```bash
cd proxy
npm install
ANTHROPIC_API_KEY=sk-ant-... ACCESS_CODE=some-long-code npm start
# listens on http://localhost:8787
```

## Deploy to Render

1. Push this repo to GitHub (the proxy lives in the `proxy/` subfolder).
2. Render dashboard → **New → Web Service** → connect the `clarity-dsm` repo.
3. Settings:
   - **Root Directory:** `proxy`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free is fine (note: free instances sleep when idle and
     cold-start in ~30–60s on the first request).
4. **Environment** tab — add:
   - `ANTHROPIC_API_KEY` = your Anthropic key
   - `ACCESS_CODE` = a long random code you'll give users
   - `ALLOWED_ORIGINS` = `https://gregbutler205-jpg.github.io`
     (Render also sets `PORT` automatically — don't set it yourself.)
5. Deploy. Confirm `https://<your-service>.onrender.com/health` returns
   `{"ok":true}`.

## Point the app at the proxy

In the **app** repo on GitHub: **Settings → Secrets and variables → Actions →
Variables** → add variable `VITE_PROXY_URL` = `https://<your-service>.onrender.com`.
Re-run the Pages deploy. The site now runs in proxy mode and prompts users for
the **access code** instead of an API key.

## Backstop

Set a **monthly spend limit** in the Anthropic console. The access code + CORS +
rate limit reduce abuse, but a hard cap is your guarantee against surprise bills.
Rotate the `ACCESS_CODE` (and redeploy) if it leaks.
