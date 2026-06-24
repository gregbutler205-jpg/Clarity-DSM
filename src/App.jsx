import { useState, useRef, useEffect } from 'react'
import Logo from './components/Logo'
import { MODES } from './modes'
import { askClaude, getCredential, setCredential, hasCredential, AUTH } from './lib/anthropic'

let resultSeq = 0

export default function App() {
  const [modeId, setModeId] = useState(MODES[0].id)
  const [input, setInput] = useState('')
  const [cmpA, setCmpA] = useState('')
  const [cmpB, setCmpB] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyPanelOpen, setKeyPanelOpen] = useState(!hasCredential())
  const [keyDraft, setKeyDraft] = useState(getCredential())

  const mode = MODES.find((m) => m.id === modeId)
  const isCompare = mode.type === 'compare'
  const taRef = useRef(null)

  // Auto-grow the single-line textarea as it wraps.
  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [input, modeId])

  function saveKey() {
    setCredential(keyDraft)
    setKeyPanelOpen(false)
  }

  async function submit() {
    if (loading) return
    const userText = isCompare
      ? buildCompareText(cmpA, cmpB)
      : input.trim()
    if (!userText) return

    if (!hasCredential()) {
      setKeyPanelOpen(true)
      return
    }

    const id = ++resultSeq
    const heading = isCompare
      ? `${cmpA.trim()} vs ${cmpB.trim()}`
      : input.trim()

    setLoading(true)
    setResults((r) => [
      { id, modeLabel: mode.label, heading, status: 'loading', body: '' },
      ...r,
    ])

    try {
      const body = await askClaude(mode.system, userText)
      updateResult(id, { status: 'done', body })
    } catch (err) {
      if (err.message === 'NO_CREDENTIAL') {
        setResults((r) => r.filter((x) => x.id !== id))
        setKeyPanelOpen(true)
      } else {
        updateResult(id, { status: 'error', body: err.message })
      }
    } finally {
      setLoading(false)
    }
  }

  function updateResult(id, patch) {
    setResults((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !isCompare) {
      e.preventDefault()
      submit()
    }
  }

  const canSubmit = isCompare
    ? cmpA.trim() && cmpB.trim()
    : input.trim().length > 0

  return (
    <div className="app">
      {/* ---- Header ---- */}
      <header className="app-header">
        <div className="brand">
          <Logo size={44} />
          <div className="brand-text">
            <h1>ClarityDSM</h1>
            <p className="subtitle">DSM-5-TR reference · AI-assisted · for LCSWs</p>
          </div>
        </div>
        <button
          className="key-btn"
          onClick={() => {
            setKeyDraft(getCredential())
            setKeyPanelOpen((o) => !o)
          }}
          aria-label={`${AUTH.label} settings`}
          title={`${AUTH.label} settings`}
        >
          <i className={`ti ${hasCredential() ? 'ti-key' : 'ti-key-off'}`} aria-hidden="true" />
        </button>
      </header>

      {keyPanelOpen && (
        <div className="key-panel card">
          <label htmlFor="api-key">{AUTH.label}</label>
          <p className="key-help">{AUTH.help}</p>
          <div className="key-row">
            <input
              id="api-key"
              type="password"
              placeholder={AUTH.placeholder}
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              autoComplete="off"
            />
            <button className="primary" onClick={saveKey}>Save</button>
          </div>
        </div>
      )}

      {/* ---- Mode grid ---- */}
      <nav className="mode-grid" aria-label="Modes">
        {MODES.map((m) => {
          const active = m.id === modeId
          return (
            <button
              key={m.id}
              className={`mode-btn${active ? ' active' : ''}`}
              aria-pressed={active}
              onClick={() => setModeId(m.id)}
            >
              <i className={`ti ${m.icon}`} aria-hidden="true" />
              <span>{m.label}</span>
            </button>
          )
        })}
      </nav>

      {/* ---- Mode description ---- */}
      <div className="mode-desc">{mode.description}</div>

      {/* ---- Input ---- */}
      <div className="input-area">
        {isCompare ? (
          <div className="compare-inputs">
            <input
              placeholder="First disorder"
              value={cmpA}
              onChange={(e) => setCmpA(e.target.value)}
            />
            <input
              placeholder="Second disorder"
              value={cmpB}
              onChange={(e) => setCmpB(e.target.value)}
            />
            <button
              className="send-btn"
              onClick={submit}
              disabled={!canSubmit || loading}
              aria-label="Send"
            >
              <i className={`ti ${loading ? 'ti-loader-2 spin' : 'ti-arrow-up'}`} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="single-input">
            <textarea
              ref={taRef}
              rows={1}
              placeholder={mode.placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button
              className="send-btn"
              onClick={submit}
              disabled={!canSubmit || loading}
              aria-label="Send"
            >
              <i className={`ti ${loading ? 'ti-loader-2 spin' : 'ti-arrow-up'}`} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* ---- Results ---- */}
      <section className="results" aria-live="polite">
        {results.length === 0 && (
          <div className="empty-state">
            <i className="ti ti-message-2-search" aria-hidden="true" />
            <p>Pick a mode, enter a disorder, and ask. Answers appear here.</p>
          </div>
        )}
        {results.map((r) => (
          <article key={r.id} className={`result-card${r.status === 'error' ? ' is-error' : ''}`}>
            <header className="result-badge">
              <span className="badge-mode">{r.modeLabel}</span>
              {r.heading && <span className="badge-heading">{r.heading}</span>}
            </header>
            <div className="result-body">
              {r.status === 'loading' ? (
                <p className="loading-line">
                  <i className="ti ti-loader-2 spin" aria-hidden="true" /> Consulting…
                </p>
              ) : r.status === 'error' ? (
                <p className="result-error">
                  <i className="ti ti-alert-triangle" aria-hidden="true" /> {r.body}
                </p>
              ) : (
                <>
                  <pre className="result-text">{r.body}</pre>
                  <p className="result-disclaimer">
                    <i className="ti ti-info-circle" aria-hidden="true" /> AI-generated.
                    Verify against the DSM-5-TR before clinical use.
                  </p>
                </>
              )}
            </div>
          </article>
        ))}
      </section>

      {/* ---- Footer ---- */}
      <footer className="app-footer">
        <i className="ti ti-shield-check" aria-hidden="true" />
        <span>Clarity in data. Confidence in decisions.</span>
      </footer>
    </div>
  )
}

function buildCompareText(a, b) {
  const x = a.trim()
  const y = b.trim()
  if (!x || !y) return ''
  return `Compare these two disorders:\n1. ${x}\n2. ${y}`
}
