import { motion } from 'framer-motion'
import { Activity, Database, RotateCcw, Cpu, Cloud, AlertCircle } from 'lucide-react'

/* Which engine is (or would be) serving requests, derived from provider status. */
function deriveEngine(providers) {
  if (!providers) return { label: '…', color: '#555a6a', icon: Cpu, ok: false, title: 'Checking providers' }

  const used = providers.last_used
  const gemini = providers.gemini || {}
  const ollama = providers.ollama || {}

  if (used === 'gemini' || (!used && providers.configured !== 'ollama' && gemini.available)) {
    return { label: 'Gemini', color: '#00e5c7', icon: Cloud, ok: true, title: `Cloud · ${gemini.model}` }
  }
  if (used === 'ollama' || (!used && ollama.ready)) {
    return { label: 'Ollama', color: '#a78bfa', icon: Cpu, ok: true, title: `Local · ${ollama.model}` }
  }
  if (ollama.available && !ollama.ready) {
    return { label: 'No model', color: '#f5a623', icon: AlertCircle, ok: false, title: `Run: ollama pull ${ollama.model}` }
  }
  return { label: 'Offline', color: '#f47272', icon: AlertCircle, ok: false, title: 'No LLM provider reachable' }
}

export default function Navbar({ phase, eventCount, providers, onReset }) {
  const engine = deriveEngine(providers)
  const EngineIcon = engine.icon

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-12 px-5">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-6 h-6">
            <div className="absolute inset-0 rounded-full border border-mint/30" />
            <div className="w-2 h-2 rounded-full bg-mint" />
            {phase === 'running' && (
              <motion.div
                className="absolute inset-0 rounded-full border border-mint/40"
                animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
          <span className="text-sm font-semibold tracking-tight text-txt">MADAS</span>
          <span className="hidden sm:block text-[10px] font-mono text-txt-3 tracking-wider uppercase ml-1">v2.1</span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          {phase !== 'idle' && (
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-txt-3">
              <Activity className="w-3 h-3" />
              <span>{eventCount} events</span>
            </div>
          )}

          {/* Live LLM engine indicator */}
          <div
            title={engine.title}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-2 border border-border text-[11px] font-mono"
            style={{ color: engine.color }}
          >
            <EngineIcon className="w-3 h-3" />
            <span>{engine.label}</span>
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: engine.ok ? engine.color : '#555a6a' }}
            />
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-2 border border-border text-[11px] font-mono text-txt-3">
            <Database className="w-3 h-3" />
            <span>Memory</span>
            <div className="w-1.5 h-1.5 rounded-full bg-mint/60" />
          </div>

          {phase !== 'idle' && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono text-txt-3 hover:text-txt hover:bg-bg-3 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
