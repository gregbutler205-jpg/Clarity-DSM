// Direct browser → Anthropic Messages API.
//
// The API key is NOT bundled. It is entered by the user in-app and stored in
// localStorage on their own device (mirrors the IntelliTrax `mi_ak` pattern).
// Calls include `anthropic-dangerous-direct-browser-access` so Anthropic's CORS
// allows the browser request.
//
// If this app is ever shared so that colleagues should NOT need their own key,
// the upgrade path is a small server-side proxy that holds one key (the
// IntelliTrax/Insina proxy pattern) — swap ENDPOINT for the proxy URL and drop
// the x-api-key header.

const ENDPOINT = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 1000

const KEY_STORAGE = 'clarity_anthropic_key'

export function getApiKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || ''
  } catch {
    return ''
  }
}

export function setApiKey(value) {
  try {
    if (value) localStorage.setItem(KEY_STORAGE, value.trim())
    else localStorage.removeItem(KEY_STORAGE)
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
}

export function hasApiKey() {
  return getApiKey().length > 0
}

/**
 * Send one request to Claude.
 * @param {string} system - the mode's system prompt
 * @param {string} userText - the user's question / inputs
 * @returns {Promise<string>} the assistant's plain-text reply
 */
export async function askClaude(system, userText) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('NO_KEY')
  }

  let res
  try {
    res = await fetch(ENDPOINT, {
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
    let detail = ''
    try {
      const body = await res.json()
      detail = body?.error?.message || ''
    } catch {
      /* ignore */
    }
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

export { MODEL }
