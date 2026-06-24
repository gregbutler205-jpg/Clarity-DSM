# ClarityDSM

A mobile-first PWA — a **DSM-5-TR clinical reference and AI assistant for LCSWs**.
Built with **Vite + React**, deployed to **GitHub Pages**.

> ⚠️ **Clinical use.** Answers are AI-generated and may be incomplete or wrong.
> Every answer is labeled and ends with a reminder to **verify against the
> DSM-5-TR before clinical use**. This tool supports clinical judgment; it does
> not replace the DSM-5-TR or a clinician's own assessment.

## What it does

Eight modes, each a focused DSM-5-TR lens on a disorder or topic:

| Mode | Purpose |
| --- | --- |
| Search | Structured clinical overview |
| Compare | Side-by-side of two disorders |
| Criteria | Paraphrased outline of the criteria structure |
| Specifiers | Specifiers by type, with coding implications |
| Differential | Differential analysis + assessment questions |
| ICD-10 | ICD-10-CM codes by specifier, billing notes |
| Risk & Safety | Risk/safety guidance, codes, documentation language |
| Medications | Medication-class context for care coordination |

Each answer cites the DSM-5-TR chapter/section and ICD-10-CM code where
applicable (page numbers only when confident — never invented), and the prompts
are written to **paraphrase rather than reproduce** copyrighted DSM-5-TR text.

## The API key

No Anthropic key is ever bundled or committed. The app runs in one of two modes,
chosen at build time by whether `VITE_PROXY_URL` is set. Model: `claude-sonnet-4-6`.

**Direct mode (default — single user / local dev).** `VITE_PROXY_URL` unset. On
first use, tap the key button (top-right) and paste a key from
[console.anthropic.com](https://console.anthropic.com). It's stored only in that
browser's `localStorage`. Calls go straight to the Anthropic Messages API with the
`anthropic-dangerous-direct-browser-access` header.

**Proxy mode (shared with colleagues).** `VITE_PROXY_URL` set to the deployed
[`proxy/`](proxy/README.md) server (e.g. on Render), which holds the single key
server-side. Users authenticate with a shared **access code** — no Anthropic key
ever touches a device. See [`proxy/README.md`](proxy/README.md) for the Render
deploy and how to set the `VITE_PROXY_URL` repo variable.

> **Either mode**, the only outbound call carries the text the user typed —
> so the "never enter client-identifiable information" rule always applies, and
> a proxy does not make it HIPAA-covered.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
```

## Deploy to GitHub Pages

Deployment is automated by GitHub Actions (`.github/workflows/deploy.yml`):
every push to `main` builds the site and publishes it to Pages. No local deploy
command needed.

One-time setup in the repo: **Settings → Pages → Build and deployment →
Source: GitHub Actions**.

Live at: https://gregbutler205-jpg.github.io/clarity-dsm/

(`base` is relative in `vite.config.js`, so the build works under the project
subpath without further configuration.)
