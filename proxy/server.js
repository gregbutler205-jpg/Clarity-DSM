// ClarityDSM proxy — holds the single Anthropic API key server-side so that
// devices never store one. Clients authenticate with a shared ACCESS_CODE.
//
// Defense in depth for a public, key-holding relay:
//   1. ACCESS_CODE gate (constant-time compare) — required; server refuses to
//      start without it, so it can never run as an open relay.
//   2. CORS allow-list (ALLOWED_ORIGINS) — only your site's origin may call it.
//   3. Per-IP rate limiting.
//   4. Input size caps + a fixed model (clients can't pick an expensive model).
// Pair this with a hard monthly spend cap in the Anthropic console as a backstop.

import crypto from 'node:crypto'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import Anthropic from '@anthropic-ai/sdk'

const {
  ANTHROPIC_API_KEY,
  ACCESS_CODE,
  ALLOWED_ORIGINS = '',
  PORT = 8787,
} = process.env

if (!ANTHROPIC_API_KEY) {
  console.error('FATAL: ANTHROPIC_API_KEY is not set.')
  process.exit(1)
}
if (!ACCESS_CODE) {
  console.error('FATAL: ACCESS_CODE is not set — refusing to start an ungated key relay.')
  process.exit(1)
}

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 1000
const MAX_INPUT_CHARS = 4000
const MAX_SYSTEM_CHARS = 8000

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
const allowList = ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1) // Render terminates TLS upstream; needed for rate-limit IPs
app.use(express.json({ limit: '64kb' }))

app.use(
  cors({
    origin(origin, cb) {
      // Allow no-origin (curl/health checks) and any configured origin.
      if (!origin || allowList.length === 0 || allowList.includes(origin)) {
        return cb(null, true)
      }
      cb(new Error('Origin not allowed'))
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['content-type', 'x-access-code'],
  }),
)

app.use(
  '/api/',
  rateLimit({
    windowMs: 60_000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { message: 'Too many requests. Wait a moment and try again.' } },
  }),
)

function accessOk(req) {
  const provided = Buffer.from(String(req.get('x-access-code') || ''))
  const expected = Buffer.from(String(ACCESS_CODE))
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected)
}

app.get('/health', (_req, res) => res.json({ ok: true }))

app.post('/api/chat', async (req, res) => {
  if (!accessOk(req)) {
    return res.status(401).json({ error: { message: 'Invalid access code.' } })
  }

  const system = typeof req.body?.system === 'string' ? req.body.system.slice(0, MAX_SYSTEM_CHARS) : ''
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
  if (!message) return res.status(400).json({ error: { message: 'Empty message.' } })
  if (message.length > MAX_INPUT_CHARS) {
    return res.status(400).json({ error: { message: 'Message is too long.' } })
  }

  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: 'user', content: message }],
    })
    if (resp.stop_reason === 'refusal') {
      return res.json({ refusal: true, text: '' })
    }
    const text = (resp.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
    res.json({ text })
  } catch (err) {
    console.error('Anthropic error:', err?.status, err?.message)
    if (err?.status === 429) {
      return res.status(429).json({ error: { message: 'Upstream rate limit. Try again shortly.' } })
    }
    res.status(502).json({ error: { message: 'Upstream error contacting the model.' } })
  }
})

app.listen(PORT, () => {
  console.log(`ClarityDSM proxy listening on :${PORT} (allowed origins: ${allowList.join(', ') || 'any'})`)
})
