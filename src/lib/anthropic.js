// Talks to Claude in one of two modes, chosen at build time:
//
//  • PROXY mode  — when VITE_PROXY_URL is set. The app calls our own proxy
//    (proxy/server.js, e.g. on Render), which holds the single Anthropic key
//    server-side. Users authenticate with a shared ACCESS CODE, not a key, so
//    no Anthropic key ever lives on the device. This is the shared-with-
//    colleagues setup.
//
//  • DIRECT mode — when VITE_PROXY_URL is unset. The app calls Anthropic
//    directly and the user supplies their own API key (stored only in their
//    browser). This is the single-user / local-dev setup.
//
// The stored credential (access code or API key) lives in localStorage and is
// never bundled or committed.

const PROXY_URL = (import.meta.env.VITE_PROXY_URL || '').replace(/\/+$/, '')
export const PROXY_MODE = PROXY_URL.length > 0

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 1000

const STORAGE_KEY = PROXY_MODE ? 'clarity_access_code' : 'clarity_anthropic_key'

// UI-facing description of how the user authenticates, so the panel can label
// itself correctly without knowing which mode is active.
export const AUTH = PROXY_MODE
  ? {
      mode: 'proxy',
      label: 'Access code',
      placeholder: 'Enter your access code',
      help:
        'Enter the access code your practice shared with you. ' +
        'Stored only in this browser on this device — never uploaded.',
    }
  : {
      mode: 'direct',
      label: 'Anthropic API key',
      placeholder: 'sk-ant-…',
      help:
        'Stored only in this browser on this device — never uploaded or shared. ' +
        'Get a key at console.anthropic.com.',
    }

export function getCredential() {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function setCredential(value) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value.trim())
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
}

export function hasCredential() {
  return getCredential().length > 0
}

/**
 * Send one request to Claude (via the proxy or directly).
 * @param {string} system - the mode's system prompt
 * @param {string} userText - the user's question / inputs
 * @returns {Promise<string>} the assistant's plain-text reply
 */
export async function askClaude(system, userText) {
  const credential = getCredential()
  if (!credential) throw new Error('NO_CREDENTIAL')
  return PROXY_MODE
    ? askViaProxy(system, userText, credential)
    : askDirect(system, userText, credential)
}

async function askViaProxy(system, userText, accessCode) {
  let res
  try {
    res = await fetch(`${PROXY_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-access-code': accessCode,
      },
      body: JSON.stringify({ system, message: userText }),
    })
  } catch {
    throw new Error('Network error — check your connection and try again.')
  }

  if (!res.ok) {
    const detail = await errorDetail(res)
    if (res.status === 401 || res.status === 403) {
      throw new Error('Invalid access code. Open the panel (top right) and re-enter it.')
    }
    if (res.status === 429) {
      throw new Error('Too many requests right now. Wait a moment and try again.')
    }
    throw new Error(detail || `Request failed (HTTP ${res.status}).`)
  }

  const data = await res.json()
  if (data?.refusal) throw new Error('The model declined to answer this request.')
  return (data?.text || '').trim() || 'No response text was returned.'
}

async function askDirect(system, userText, apiKey) {
  let res
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: 'user', content: userText }],
      }),
    })
  } catch {
    throw new Error('Network error — check your connection and try again.')
  }

  if (!res.ok) {
    const detail = await errorDetail(res)
    if (res.status === 401) {
      throw new Error('Invalid API key. Open the key panel (top right) and re-enter it.')
    }
    if (res.status === 429) {
      throw new Error('Rate limited by Anthropic. Wait a moment and try again.')
    }
    throw new Error(detail || `Request failed (HTTP ${res.status}).`)
  }

  const data = await res.json()
  if (data?.stop_reason === 'refusal') {
    throw new Error('The model declined to answer this request.')
  }
  const text = (data?.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
  return text || 'No response text was returned.'
}

async function errorDetail(res) {
  try {
    const body = await res.json()
    return body?.error?.message || body?.error || ''
  } catch {
    return ''
  }
}

export { MODEL }
