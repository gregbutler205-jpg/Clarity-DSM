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

The Anthropic API key is **not** bundled or committed. On first use, tap the key
button (top-right) and paste a key from
[console.anthropic.com](https://console.anthropic.com). It is stored only in the
browser's `localStorage` on that device. Anyone the app is shared with simply
enters their own key.

Model: `claude-sonnet-4-6`. Calls go directly from the browser to the Anthropic
Messages API using the `anthropic-dangerous-direct-browser-access` header.

> **Want to share it without each person needing a key?** Move to a small
> server-side proxy that holds one key, and point `src/lib/anthropic.js` at the
> proxy URL (dropping the `x-api-key` header). See `.env.example`.

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
