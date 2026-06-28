import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Terminal, ArrowRight, Clipboard, Search, Wrench, Scale, ChevronRight, Repeat, AlertCircle, Play, Sparkles } from 'lucide-react'

const AGENTS = [
  { name: 'Investigator', desc: 'Parses logs, forms ranked hypotheses', icon: Search, color: '#00e5c7' },
  { name: 'Engineer', desc: 'Proposes concrete fixes with code', icon: Wrench, color: '#a78bfa' },
  { name: 'Arbiter', desc: 'Scores pairs, renders final verdict', icon: Scale, color: '#f5a623' },
]

const EXAMPLES = [
  {
    label: 'API Timeout',
    text: `ERROR 2024-03-15 14:23:01 [api-gateway] POST /api/v2/orders → 500
Traceback:
  File "app/routes/orders.py", line 142, in create_order
    result = await order_service.process(order_data)
  File "app/services/order_service.py", line 89, in process
    inventory = await self.inventory_client.reserve(items)
  File "app/clients/inventory.py", line 34, in reserve
    response = await self.http.post("/reserve", json=payload, timeout=5.0)
httpx.ReadTimeout: timed out

Metrics (last 5 min):
  inventory-service response: p50=1.2s, p95=4.8s, p99=12.3s
  Connection pool: 48/50 active
  Upstream CPU: 94%, Memory: 87%`,
  },
  {
    label: 'Kafka Lag',
    text: `WARN [consumer-group-payments] Consumer lag detected
Topic: payment-events, Partition: 3, Lag: 52,211 messages
ERROR: CommitFailedException — group has already rebalanced
WARN: Heartbeat missed (35s > session.timeout.ms=30000)
INFO: Processing time/msg: avg 450ms (baseline: 120ms)
INFO: DB connection pool: 18/20 active, 12 waiting`,
  },
  {
    label: 'OOM Crash',
    text: `WARN [user-service] JVM Heap: 92% (7.4GB / 8GB)
ERROR: java.lang.OutOfMemoryError: Java heap space
  at com.app.cache.UserSessionCache.put(UserSessionCache.java:67)
  at com.app.service.AuthService.createSession(AuthService.java:112)
INFO: Active sessions in cache: 2,847,293 | TTL: 24h | DAU: ~50,000
INFO: Restarts last 7 days: 14`,
  },
]

export default function LandingView({ onSubmit, onDemo, providers }) {
  const [input, setInput] = useState('')
  const [rounds, setRounds] = useState(2)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const headingRef = useRef(null)
  const textareaRef = useRef(null)

  // Warn if neither a cloud key nor a ready local model is available.
  const noEngine = providers &&
    !providers.gemini?.available &&
    !providers.ollama?.ready

  useEffect(() => {
    const handler = (e) => {
      const el = headingRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setTilt({
        x: ((e.clientY - r.top - r.height / 2) / r.height) * -6,
        y: ((e.clientX - r.left - r.width / 2) / r.width) * 6,
      })
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  const submit = () => input.trim() && onSubmit(input.trim(), { maxRounds: rounds })
  const paste = async () => { try { setInput(await navigator.clipboard.readText()) } catch {} }

  return (
    <div className="min-h-screen pt-12">
      {/* Hero */}
      <header className="pt-16 pb-6 px-5">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-2 border border-border text-[11px] font-mono text-txt-3 tracking-wider uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-mint opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-mint" />
              </span>
              3-Agent Diagnosis Pipeline
            </span>
          </motion.div>

          {/* Title — 3D parallax tilt */}
          <div ref={headingRef} className="perspective mb-6">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
              style={{
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transition: 'transform 0.15s ease-out',
                transformStyle: 'preserve-3d',
              }}
            >
              <span className="text-txt">Diagnose incidents</span>
              <br />
              <span className="bg-gradient-to-r from-mint via-emerald-300 to-mint bg-clip-text text-transparent">
                with structured debate
              </span>
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-sm sm:text-base text-txt-2 max-w-lg mx-auto leading-relaxed mb-10"
          >
            Paste an error log. Three AI agents investigate, engineer fixes, and arbitrate
            — producing a scored diagnosis with concrete solutions.
          </motion.p>

          {/* Agent pipeline visualization */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="flex items-center justify-center gap-1 mb-14"
          >
            {AGENTS.map((agent, i) => (
              <div key={agent.name} className="flex items-center gap-1">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-2 border border-border group hover:border-bright transition-colors">
                  <agent.icon className="w-3.5 h-3.5" style={{ color: agent.color }} />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-txt leading-none">{agent.name}</p>
                    <p className="text-[10px] text-txt-3 mt-0.5 hidden sm:block">{agent.desc}</p>
                  </div>
                </div>
                {i < AGENTS.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-txt-3 mx-0.5 flex-shrink-0" />
                )}
              </div>
            ))}
          </motion.div>

          {/* Live demo CTA — runs a real recorded diagnosis with no backend/LLM */}
          {onDemo && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-col items-center gap-2 -mt-6 mb-2"
            >
              <button
                onClick={onDemo}
                className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold
                  bg-mint/10 text-mint border border-mint/25
                  hover:bg-mint/15 hover:border-mint/45 hover:shadow-[0_0_28px_rgba(0,229,199,0.15)]
                  transition-all duration-200"
              >
                <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-mint/15">
                  <Play className="w-2.5 h-2.5 fill-mint" />
                </span>
                Try it once — watch a live demo
                <Sparkles className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
              </button>
              <p className="text-[10px] font-mono text-txt-3">
                No setup, no API key — replays a real diagnosis so you can see the full pipeline
              </p>
            </motion.div>
          )}
        </div>
      </header>

      {/* Input panel */}
      <section className="px-5 pb-20">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            {/* No-engine warning */}
            {noEngine && (
              <div className="mb-3 flex items-start gap-2.5 p-3 rounded-xl bg-amber/5 border border-amber/20">
                <AlertCircle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber/90 leading-relaxed">
                  No LLM engine is ready. Set a <span className="font-mono">GEMINI_API_KEY</span>, or run a local
                  model with <span className="font-mono text-amber">ollama pull {providers?.ollama?.model || 'qwen2.5:7b'}</span> and restart the backend.
                </p>
              </div>
            )}

            {/* Input card */}
            <div className="relative group">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-mint/15 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="relative bg-bg-1 border border-border rounded-2xl overflow-hidden scanlines">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-txt-3" />
                    <span className="text-[10px] font-mono text-txt-3 tracking-wider uppercase">Input</span>
                  </div>
                  <button
                    onClick={paste}
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono text-txt-3 hover:text-txt-2 hover:bg-bg-3 transition-colors"
                  >
                    <Clipboard className="w-3 h-3" /> Paste
                  </button>
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.metaKey && submit()}
                  placeholder="Paste your error logs, stack traces, or describe the incident..."
                  rows={12}
                  className="w-full bg-transparent text-txt text-[13px] font-mono leading-relaxed px-4 py-4 resize-none focus:outline-none placeholder:text-txt-3/40"
                />

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
                  <span className="text-[10px] font-mono text-txt-3">
                    {input ? `${input.split('\n').length} lines · ${input.length} chars` : '\u2318+Enter to submit'}
                  </span>
                  <div className="flex items-center gap-1.5 ml-auto mr-1" title="Max debate rounds: the Arbiter can send the case back for another investigation pass.">
                    <Repeat className="w-3 h-3 text-txt-3" />
                    <span className="text-[10px] font-mono text-txt-3 hidden sm:inline">Rounds</span>
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        onClick={() => setRounds(n)}
                        className={`w-6 h-6 rounded text-[11px] font-mono transition-colors ${
                          rounds === n
                            ? 'bg-mint/15 text-mint border border-mint/30'
                            : 'text-txt-3 border border-border hover:text-txt-2'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={submit}
                    disabled={!input.trim()}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                      disabled:opacity-20 disabled:cursor-not-allowed
                      bg-mint/10 text-mint border border-mint/20
                      hover:bg-mint/15 hover:border-mint/40 hover:shadow-[0_0_20px_rgba(0,229,199,0.1)]
                      disabled:hover:bg-mint/10 disabled:hover:border-mint/20 disabled:hover:shadow-none"
                  >
                    Run Diagnosis <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Examples */}
            <div className="mt-5 text-center">
              <p className="text-[10px] font-mono text-txt-3 mb-2.5 tracking-wider uppercase">Try an example</p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.label}
                    onClick={() => { setInput(ex.text); textareaRef.current?.focus() }}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-txt-2 bg-bg-2 border border-border hover:border-bright hover:text-txt transition-colors"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
