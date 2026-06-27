import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target, Zap, Shield, Scale, Search, Wrench, Database,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle2,
  Copy, Check, ArrowRight, FileWarning, Clock, Layers,
  FileText, Download, Tag
} from 'lucide-react'

/* ── Severity styling ────────────────────────────────────────── */
const SEVERITY_META = {
  SEV1: { color: '#f47272', label: 'SEV1 · Critical' },
  SEV2: { color: '#f5a623', label: 'SEV2 · Major' },
  SEV3: { color: '#00e5c7', label: 'SEV3 · Minor' },
  SEV4: { color: '#8b90a0', label: 'SEV4 · Low' },
}

/* Trigger a client-side file download. */
function downloadFile(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ── Confidence Ring ─────────────────────────────────────────── */
function ConfidenceRing({ value, size = 140 }) {
  const pct = Math.round(value * 100)
  const color = pct >= 70 ? '#00e5c7' : pct >= 40 ? '#f5a623' : '#f47272'
  const r = (size - 16) / 2
  const c = 2 * Math.PI * r
  const offset = c - value * c

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
        {/* Outer glow track */}
        <circle cx={size/2} cy={size/2} r={r+6} fill="none" stroke={`${color}08`} strokeWidth="1" />
        {/* Value arc */}
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 10px ${color}50)` }}
        />
        {/* Tick marks */}
        {[0, 0.25, 0.5, 0.75].map((t) => {
          const angle = t * 2 * Math.PI - Math.PI / 2
          const x1 = size/2 + (r + 10) * Math.cos(angle)
          const y1 = size/2 + (r + 10) * Math.sin(angle)
          const x2 = size/2 + (r + 14) * Math.cos(angle)
          const y2 = size/2 + (r + 14) * Math.sin(angle)
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-bold tabular-nums font-mono"
          style={{ color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {pct}
        </motion.span>
        <span className="text-[9px] font-mono uppercase tracking-widest text-txt-3 mt-0.5">Confidence</span>
      </div>
    </div>
  )
}

/* ── Score Bar ───────────────────────────────────────────────── */
function ScoreBar({ label, value, delay = 0 }) {
  const pct = Math.round((value || 0) * 100)
  const color = pct >= 70 ? '#00e5c7' : pct >= 40 ? '#f5a623' : '#f47272'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-mono text-txt-3 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-mono" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-3 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.5 + delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  )
}

/* ── Collapsible Panel ───────────────────────────────────────── */
function Panel({ title, icon: Icon, iconColor, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-bg-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-2 transition-colors text-left"
      >
        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: iconColor || '#8b90a0' }} />
        <span className="text-xs font-semibold text-txt flex-1 tracking-wide">{title}</span>
        {badge && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-bg-3 text-txt-3">{badge}</span>
        )}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3.5 h-3.5 text-txt-3" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border pt-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Copy Button ─────────────────────────────────────────────── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <button onClick={copy} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-txt-3 hover:text-txt-2 hover:bg-bg-3 transition-colors">
      {copied ? <Check className="w-3 h-3 text-mint" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/* ── Minimal Markdown renderer (headings, lists, checklists, bold) ── */
function MarkdownLite({ text }) {
  const lines = (text || '').split('\n')
  const renderInline = (s) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i} className="text-txt font-semibold">{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    )
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const t = line.trim()
        if (!t) return <div key={i} className="h-1.5" />
        if (t.startsWith('## ')) return <h4 key={i} className="text-xs font-semibold text-txt uppercase tracking-wider mt-3 first:mt-0">{t.slice(3)}</h4>
        if (t.startsWith('# ')) return <h3 key={i} className="text-sm font-bold text-txt mt-2 first:mt-0">{t.slice(2)}</h3>
        if (/^- \[[ x]\]/.test(t)) {
          const checked = /^- \[x\]/i.test(t)
          return (
            <div key={i} className="flex items-start gap-2 text-xs text-txt-2 leading-relaxed">
              <span className={`mt-0.5 ${checked ? 'text-mint' : 'text-txt-3'}`}>{checked ? '☑' : '☐'}</span>
              <span>{renderInline(t.replace(/^- \[[ x]\]\s*/i, ''))}</span>
            </div>
          )
        }
        if (t.startsWith('- ') || t.startsWith('* ')) {
          return (
            <div key={i} className="flex items-start gap-2 text-xs text-txt-2 leading-relaxed">
              <span className="text-mint/50 mt-0.5">•</span>
              <span>{renderInline(t.slice(2))}</span>
            </div>
          )
        }
        return <p key={i} className="text-xs text-txt-2 leading-relaxed">{renderInline(t)}</p>
      })}
    </div>
  )
}

/* ── Agent Timeline (sidebar) ────────────────────────────────── */
const AGENT_META = {
  memory:       { icon: Database,     color: '#f5a623', label: 'Memory' },
  investigator: { icon: Search,       color: '#00e5c7', label: 'Investigator' },
  engineer:     { icon: Wrench,       color: '#a78bfa', label: 'Engineer' },
  arbiter:      { icon: Scale,        color: '#f5a623', label: 'Arbiter' },
  reporter:     { icon: FileText,     color: '#a78bfa', label: 'Reporter' },
  system:       { icon: CheckCircle2, color: '#00e5c7', label: 'System' },
}

function Timeline({ events }) {
  return (
    <div className="space-y-1">
      {events.map((evt, i) => {
        const meta = AGENT_META[evt.agent] || AGENT_META.system
        const Icon = meta.icon
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-2.5 py-2 px-2.5 rounded-lg hover:bg-bg-2 transition-colors"
          >
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}25` }}
            >
              <Icon className="w-3 h-3" style={{ color: meta.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: meta.color }}>
                {meta.label} <span className="text-txt-3">/ {evt.action}</span>
              </p>
              <p className="text-xs text-txt-2 mt-0.5 leading-relaxed">{evt.detail}</p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ── Main Dashboard ──────────────────────────────────────────── */
export default function DashboardView({ result, events }) {
  const verdict = result?.verdict || {}
  const hyp = result?.winning_hypothesis || {}
  const fix = result?.winning_fix || {}
  const allHyp = result?.all_hypotheses || []
  const allFixes = result?.all_fixes || []
  const evals = result?.evaluations || []
  const conf = verdict.overall_confidence || 0
  const severity = result?.severity || ''
  const sevMeta = SEVERITY_META[severity]
  const tags = result?.tags || []
  const postmortem = result?.postmortem_markdown || ''

  // Build a Markdown export of the full diagnosis when no postmortem was generated.
  const buildMarkdown = () => {
    if (postmortem) return postmortem
    return `# ${result?.title || hyp.title || 'Incident Diagnosis'}\n\n` +
      `**Severity:** ${severity || 'n/a'}  \n` +
      `**Confidence:** ${Math.round(conf * 100)}%\n\n` +
      `## Root Cause\n${hyp.title || ''}\n\n${verdict.reasoning || hyp.description || ''}\n\n` +
      `## Fix\n${fix.fix_title || ''}\n\n${fix.description || ''}\n\n` +
      (fix.code_snippet ? `\`\`\`\n${fix.code_snippet}\n\`\`\`\n` : '')
  }

  // 3D tilt for verdict card
  const cardRef = useRef(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const move = (e) => {
      const r = el.getBoundingClientRect()
      setTilt({
        x: ((e.clientY - r.top - r.height / 2) / r.height) * -3,
        y: ((e.clientX - r.left - r.width / 2) / r.width) * 3,
      })
    }
    const leave = () => setTilt({ x: 0, y: 0 })
    el.addEventListener('mousemove', move)
    el.addEventListener('mouseleave', leave)
    return () => { el.removeEventListener('mousemove', move); el.removeEventListener('mouseleave', leave) }
  }, [])

  return (
    <div className="min-h-screen pt-16 pb-20 px-5">
      <div className="max-w-6xl mx-auto">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 mb-6"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-mint" />
          <span className="text-[10px] font-mono text-txt-3 tracking-widest uppercase">Diagnosis Complete</span>
          <div className="flex-1 h-px bg-border ml-2" />
          <span className="text-[10px] font-mono text-txt-3 mr-2">{result?.rounds_taken || 1} round{(result?.rounds_taken || 1) > 1 ? 's' : ''}</span>
          <button
            onClick={() => downloadFile('madas-postmortem.md', buildMarkdown(), 'text/markdown')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono text-txt-3 bg-bg-2 border border-border hover:text-txt hover:border-bright transition-colors"
          >
            <FileText className="w-3 h-3" /> .md
          </button>
          <button
            onClick={() => downloadFile('madas-diagnosis.json', JSON.stringify(result, null, 2), 'application/json')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono text-txt-3 bg-bg-2 border border-border hover:text-txt hover:border-bright transition-colors"
          >
            <Download className="w-3 h-3" /> .json
          </button>
        </motion.div>

        {/* Main grid: 2 columns on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* ── Left Column: Verdict + Details ── */}
          <div className="space-y-5">
            {/* Verdict Card — 3D tilt */}
            <div className="perspective">
              <motion.div
                ref={cardRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative rounded-2xl border border-mint/15 bg-bg-1 overflow-hidden glow-mint"
                style={{
                  transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                  transition: 'transform 0.12s ease-out',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Top accent line */}
                <div className="h-px bg-gradient-to-r from-transparent via-mint/40 to-transparent" />

                <div className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start gap-5">
                    <ConfidenceRing value={conf} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Target className="w-3.5 h-3.5 text-mint" />
                          <span className="text-[10px] font-mono font-semibold tracking-widest uppercase text-mint">
                            Root Cause — {verdict.winning_hypothesis}
                          </span>
                        </div>
                        {sevMeta && (
                          <span
                            className="px-2 py-0.5 rounded text-[9px] font-mono font-semibold tracking-wider uppercase"
                            style={{ color: sevMeta.color, background: `${sevMeta.color}15`, border: `1px solid ${sevMeta.color}30` }}
                            title={result?.severity_reason || ''}
                          >
                            {sevMeta.label}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-txt mb-2 leading-snug">{result?.title || hyp.title || 'Unknown'}</h3>
                      <p className="text-sm text-txt-2 leading-relaxed">{verdict.reasoning || hyp.description}</p>

                      {result?.tldr && (
                        <p className="text-[12px] text-txt-3 leading-relaxed mt-3 pl-3 border-l-2 border-mint/20 italic">{result.tldr}</p>
                      )}

                      {tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <Tag className="w-3 h-3 text-txt-3" />
                          {tags.map((t) => (
                            <span key={t} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-bg-3 text-txt-3 border border-border">{t}</span>
                          ))}
                        </div>
                      )}

                      {hyp.category && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-bg-3 text-txt-3 border border-border">
                            {hyp.category}
                          </span>
                          {hyp.evidence?.length > 0 && (
                            <span className="text-[10px] font-mono text-txt-3">
                              {hyp.evidence.length} evidence item{hyp.evidence.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dissent / warning */}
                  {verdict.dissent && (
                    <div className="mt-4 flex items-start gap-2.5 p-3 rounded-lg bg-amber/5 border border-amber/15">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber/80 leading-relaxed">{verdict.dissent}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Proposed Fix */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Panel title="Proposed Fix" icon={Zap} iconColor="#00e5c7" badge={fix.risk_level} defaultOpen={true}>
                <p className="text-sm text-txt-2 leading-relaxed mb-3">{fix.description}</p>
                {fix.code_snippet && (
                  <div className="relative">
                    <div className="absolute top-2 right-2 z-10">
                      <CopyBtn text={fix.code_snippet} />
                    </div>
                    <div className="code-block">{fix.code_snippet}</div>
                  </div>
                )}
                <div className="flex items-center gap-4 mt-3 text-[10px] font-mono text-txt-3">
                  <span>Risk: <span className={
                    fix.risk_level === 'high' ? 'text-rose' : fix.risk_level === 'medium' ? 'text-amber' : 'text-mint'
                  }>{fix.risk_level}</span></span>
                  <span className="text-border">|</span>
                  <span>Effort: {fix.effort}</span>
                </div>
                {fix.side_effects?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-[10px] font-mono text-txt-3 mb-1.5 uppercase tracking-wider">Side effects</p>
                    {fix.side_effects.map((s, i) => (
                      <div key={i} className="flex items-start gap-1.5 mt-1">
                        <AlertTriangle className="w-3 h-3 text-amber/50 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-txt-2 leading-relaxed">{s}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </motion.div>

            {/* Postmortem report */}
            {postmortem && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Panel title="Incident Postmortem" icon={FileText} iconColor="#a78bfa" badge="Reporter">
                  <div className="flex justify-end mb-2">
                    <CopyBtn text={postmortem} />
                  </div>
                  <MarkdownLite text={postmortem} />
                </Panel>
              </motion.div>
            )}

            {/* All Hypotheses */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Panel title="All Hypotheses" icon={Layers} iconColor="#a78bfa" badge={allHyp.length}>
                <div className="space-y-3">
                  {allHyp.map((h) => {
                    const isWinner = h.id === verdict.winning_hypothesis
                    return (
                      <div
                        key={h.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          isWinner ? 'bg-mint/5 border-mint/15' : 'bg-bg-2 border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-semibold text-txt-3">{h.id}</span>
                            <span className="text-xs font-semibold text-txt">{h.title}</span>
                            {isWinner && <CheckCircle2 className="w-3 h-3 text-mint" />}
                          </div>
                          <span className="text-[10px] font-mono tabular-nums text-txt-3">{Math.round(h.confidence * 100)}%</span>
                        </div>
                        <p className="text-xs text-txt-2 leading-relaxed">{h.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-bg-3 text-txt-3">{h.category}</span>
                          {h.evidence?.map((e, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-bg-3 text-txt-3 max-w-[180px] truncate">
                              {e}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Panel>
            </motion.div>

            {/* Arbiter Evaluations */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Panel title="Arbiter Evaluations" icon={Scale} iconColor="#f5a623" badge={evals.length}>
                <div className="space-y-4">
                  {evals.map((ev, i) => (
                    <div key={ev.hypothesis_id} className="p-3 rounded-lg bg-bg-2 border border-border">
                      <p className="text-xs font-semibold text-txt mb-3">{ev.hypothesis_id}</p>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <ScoreBar label="Evidence" value={ev.evidence_score} delay={i * 0.1} />
                        <ScoreBar label="Fix Quality" value={ev.fix_completeness} delay={i * 0.1 + 0.05} />
                        <ScoreBar label="Safety" value={ev.risk_score} delay={i * 0.1 + 0.1} />
                      </div>
                      {ev.critique && (
                        <p className="text-[11px] text-txt-3 leading-relaxed">{ev.critique}</p>
                      )}
                      {ev.suggestion && (
                        <p className="text-[11px] text-mint/60 leading-relaxed mt-1">
                          <ArrowRight className="w-3 h-3 inline mr-1" />{ev.suggestion}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Panel>
            </motion.div>
          </div>

          {/* ── Right Column: Timeline + Metadata ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-5"
          >
            {/* Agent Activity Timeline */}
            <div className="border border-border rounded-xl bg-bg-1 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-txt-3" />
                <span className="text-[10px] font-mono text-txt-3 tracking-widest uppercase">Agent Activity</span>
                <span className="ml-auto text-[10px] font-mono text-txt-3">{events.length} events</span>
              </div>
              <div className="p-2 max-h-[600px] overflow-y-auto">
                <Timeline events={events} />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="border border-border rounded-xl bg-bg-1 p-4">
              <p className="text-[10px] font-mono text-txt-3 tracking-widest uppercase mb-3">Diagnosis Summary</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Hypotheses', value: allHyp.length },
                  { label: 'Fixes', value: allFixes.length },
                  { label: 'Rounds', value: result?.rounds_taken || 1 },
                  { label: 'Agents', value: 3 },
                ].map((s) => (
                  <div key={s.label} className="p-2.5 rounded-lg bg-bg-2 border border-border text-center">
                    <p className="text-lg font-bold font-mono text-txt">{s.value}</p>
                    <p className="text-[9px] font-mono text-txt-3 uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Investigation Summary */}
            {result?.investigation_summary && (
              <div className="border border-border rounded-xl bg-bg-1 p-4">
                <p className="text-[10px] font-mono text-txt-3 tracking-widest uppercase mb-2">Investigation Summary</p>
                <p className="text-xs text-txt-2 leading-relaxed">{result.investigation_summary}</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
