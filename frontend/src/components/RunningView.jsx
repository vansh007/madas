import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Wrench, Scale, Loader2, Database, CheckCircle2, FileText } from 'lucide-react'

const STAGES = [
  { key: 'memory', label: 'Memory Retrieval', sub: 'Searching past incidents…', icon: Database, color: '#f5a623' },
  { key: 'investigator', label: 'Investigator', sub: 'Analyzing logs, forming hypotheses…', icon: Search, color: '#00e5c7' },
  { key: 'engineer', label: 'Engineer', sub: 'Proposing fixes for each hypothesis…', icon: Wrench, color: '#a78bfa' },
  { key: 'arbiter', label: 'Arbiter', sub: 'Scoring & rendering verdict…', icon: Scale, color: '#f5a623' },
  { key: 'reporter', label: 'Reporter', sub: 'Assessing severity, drafting postmortem…', icon: FileText, color: '#00e5c7' },
]

// Map each agent to its stage index so streamed events can drive the pipeline.
const STAGE_INDEX = STAGES.reduce((acc, s, i) => ((acc[s.key] = i), acc), {})

export default function RunningView({ startTime, events = [] }) {
  const [elapsed, setElapsed] = useState(0)

  // Timer
  useEffect(() => {
    const t = setInterval(() => {
      if (startTime) setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [startTime])

  // Derive progress from the *real* event stream. The agent of the most recent
  // event is the active stage; everything before it is complete.
  const lastAgent = [...events].reverse().find((e) => e.agent in STAGE_INDEX)?.agent
  const activeStage = lastAgent != null ? STAGE_INDEX[lastAgent] : 0
  const latestDetail = events.length ? events[events.length - 1].detail : null

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="min-h-screen pt-12 flex items-center justify-center px-5">
      <div className="w-full max-w-lg">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            >
              <Loader2 className="w-5 h-5 text-mint" />
            </motion.div>
            <h2 className="text-lg font-semibold text-txt">Diagnosis in progress</h2>
          </div>
          <p className="text-xs font-mono text-txt-3">Elapsed: {formatTime(elapsed)} · {events.length} events</p>
        </motion.div>

        {/* Pipeline stages */}
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

          {STAGES.map((stage, i) => {
            const isActive = i === activeStage
            const isDone = i < activeStage
            const Icon = stage.icon

            return (
              <motion.div
                key={stage.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="relative flex items-start gap-4 pb-8 last:pb-0"
              >
                {/* Node */}
                <div
                  className="relative z-10 w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0 transition-all duration-500"
                  style={{
                    background: isActive ? `${stage.color}15` : isDone ? `${stage.color}10` : '#13151c',
                    borderColor: isActive ? `${stage.color}40` : isDone ? `${stage.color}20` : '#1e2230',
                    boxShadow: isActive ? `0 0 24px ${stage.color}20` : 'none',
                  }}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5" style={{ color: stage.color }} />
                  ) : isActive ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
                      <Loader2 className="w-5 h-5" style={{ color: stage.color }} />
                    </motion.div>
                  ) : (
                    <Icon className="w-5 h-5 text-txt-3" />
                  )}
                </div>

                {/* Content */}
                <div className="pt-1.5 flex-1">
                  <p
                    className="text-sm font-semibold transition-colors duration-300"
                    style={{ color: isActive || isDone ? '#e8eaf0' : '#555a6a' }}
                  >
                    {stage.label}
                  </p>
                  <p
                    className="text-xs mt-0.5 transition-colors duration-300"
                    style={{ color: isActive ? stage.color : '#555a6a' }}
                  >
                    {isDone ? 'Complete' : isActive ? (latestDetail || stage.sub) : 'Waiting…'}
                  </p>

                  {/* Active stage pulse bar */}
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 h-1 rounded-full overflow-hidden bg-bg-3 w-full max-w-[200px]"
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: stage.color }}
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                      />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-[10px] font-mono text-txt-3 mt-10"
        >
          Agents are debating in real time. Cloud runs take ~15–30s; local models may take longer.
        </motion.p>
      </div>
    </div>
  )
}
