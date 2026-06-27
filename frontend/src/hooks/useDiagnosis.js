import { useState, useCallback, useEffect } from 'react'

const API = '/api'

/* Parse a raw SSE chunk buffer into complete {event, data} messages.
   Returns [messages, remainingBuffer]. */
function parseSSE(buffer) {
  const messages = []
  let rest = buffer
  let idx
  while ((idx = rest.indexOf('\n\n')) !== -1) {
    const block = rest.slice(0, idx)
    rest = rest.slice(idx + 2)
    let event = 'message'
    let data = ''
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data += line.slice(5).trim()
      // lines starting with ':' are comments / keep-alive pings — ignore
    }
    if (data) messages.push({ event, data })
  }
  return [messages, rest]
}

export function useDiagnosis() {
  const [phase, setPhase] = useState('idle')
  const [events, setEvents] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [providers, setProviders] = useState(null)

  const refreshProviders = useCallback(async () => {
    try {
      const res = await fetch(`${API}/providers`)
      if (res.ok) setProviders(await res.json())
    } catch { /* backend may be down; UI degrades gracefully */ }
  }, [])

  useEffect(() => { refreshProviders() }, [refreshProviders])

  const reset = useCallback(() => {
    setPhase('idle'); setEvents([]); setResult(null); setError(null); setStartTime(null)
  }, [])

  // Fallback path: single blocking request.
  const runBlocking = useCallback(async (input, maxRounds) => {
    const res = await fetch(`${API}/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, max_rounds: maxRounds }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail || `Server error ${res.status}`)
    }
    const data = await res.json()
    setEvents(data.events || [])
    setResult(data.result)
    setPhase('done')
  }, [])

  const run = useCallback(async (input, opts = {}) => {
    const maxRounds = opts.maxRounds ?? 2
    reset()
    setPhase('running')
    setStartTime(Date.now())

    try {
      const res = await fetch(`${API}/diagnose/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, max_rounds: maxRounds }),
      })
      if (!res.ok || !res.body) {
        // Streaming unavailable — fall back to the blocking endpoint.
        await runBlocking(input, maxRounds)
        refreshProviders()
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalResult = null

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const [messages, rest] = parseSSE(buffer)
        buffer = rest
        for (const msg of messages) {
          if (msg.event === 'complete') {
            try { finalResult = JSON.parse(msg.data).result } catch {}
          } else if (msg.event === 'error') {
            let detail = 'Diagnosis failed'
            try { detail = JSON.parse(msg.data).error || detail } catch {}
            throw new Error(detail)
          } else {
            try {
              const evt = JSON.parse(msg.data)
              setEvents((prev) => [...prev, evt])
            } catch {}
          }
        }
      }

      if (finalResult) {
        setResult(finalResult)
        setPhase('done')
      } else {
        // Stream ended without a result — fall back so the user still gets output.
        await runBlocking(input, maxRounds)
      }
      refreshProviders()
    } catch (err) {
      setError(err.message)
      setPhase('error')
    }
  }, [reset, runBlocking, refreshProviders])

  return { phase, events, result, error, startTime, providers, run, reset, refreshProviders }
}
