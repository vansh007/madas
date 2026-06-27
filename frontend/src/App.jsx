import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import LandingView from './components/LandingView'
import RunningView from './components/RunningView'
import DashboardView from './components/DashboardView'
import { useDiagnosis } from './hooks/useDiagnosis'

export default function App() {
  const { phase, events, result, error, startTime, providers, run, reset } = useDiagnosis()
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handler = (e) => {
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      })
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  return (
    <div className="min-h-screen relative bg-bg">
      {/* Noise overlay */}
      <div className="noise" />

      {/* Parallax grid background */}
      <div
        className="fixed inset-0 pointer-events-none grid-bg"
        style={{
          transform: `translate(${mouse.x * -6}px, ${mouse.y * -6}px)`,
          transition: 'transform 0.4s ease-out',
        }}
      />

      {/* Ambient glow orbs that follow cursor */}
      <div
        className="fixed w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          top: '20%', left: '30%',
          background: 'radial-gradient(circle, rgba(0,229,199,0.06) 0%, transparent 70%)',
          transform: `translate(${mouse.x * 24}px, ${mouse.y * 24}px)`,
          transition: 'transform 0.6s ease-out',
        }}
      />
      <div
        className="fixed w-[350px] h-[350px] rounded-full pointer-events-none"
        style={{
          bottom: '15%', right: '20%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 70%)',
          transform: `translate(${mouse.x * -18}px, ${mouse.y * -18}px)`,
          transition: 'transform 0.7s ease-out',
        }}
      />

      {/* Navbar */}
      <Navbar phase={phase} eventCount={events.length} providers={providers} onReset={reset} />

      {/* Views */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <LandingView onSubmit={run} providers={providers} />
            </motion.div>
          )}

          {phase === 'running' && (
            <motion.div key="running" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <RunningView startTime={startTime} events={events} />
            </motion.div>
          )}

          {phase === 'done' && result && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <DashboardView result={result} events={events} />
            </motion.div>
          )}

          {phase === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen pt-12 flex items-center justify-center px-5">
              <div className="max-w-md text-center">
                <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-rose/10 border border-rose/20 flex items-center justify-center">
                  <span className="text-rose text-xl font-bold">!</span>
                </div>
                <h2 className="text-lg font-semibold text-txt mb-2">Diagnosis Failed</h2>
                <p className="text-sm text-txt-2 mb-6 leading-relaxed">{error}</p>
                <button
                  onClick={reset}
                  className="px-5 py-2 bg-bg-3 hover:bg-bg-4 text-txt rounded-lg text-sm font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
