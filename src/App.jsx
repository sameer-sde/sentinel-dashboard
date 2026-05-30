import { useEffect, useState, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const SERVER = 'http://localhost:8080'
const POLL_MS = 1000

export default function App() {
  const [metrics, setMetrics] = useState(null)
  const [rpsHistory, setRpsHistory] = useState([])
  const [error, setError] = useState(null)
  const lastTotalRef = useRef(null)
  const lastTimeRef = useRef(null)

  useEffect(() => {
    let alive = true
    async function poll() {
      try {
        const res = await fetch(`${SERVER}/metrics`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!alive) return

        // Compute instantaneous RPS: change in total_requests over change in time
        const now = Date.now()
        const total = data.total_requests
        let instRps = 0
        if (lastTotalRef.current !== null && lastTimeRef.current !== null) {
          const dt = (now - lastTimeRef.current) / 1000
          if (dt > 0) instRps = (total - lastTotalRef.current) / dt
        }
        lastTotalRef.current = total
        lastTimeRef.current = now

        setMetrics(data)
        setError(null)
        setRpsHistory(h => {
          const next = [...h, { t: new Date().toLocaleTimeString().split(' ')[0], rps: Number(instRps.toFixed(2)) }]
          return next.slice(-60) // keep last 60 seconds
        })
      } catch (err) {
        if (alive) setError(err.message)
      }
    }
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => { alive = false; clearInterval(id) }
  }, [])

  if (error && !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-semibold text-red-300 mb-2">Cannot reach server</h2>
          <p className="text-sm text-red-200 mb-3">{error}</p>
          <p className="text-xs text-red-200/70">
            Make sure the Sentinel server is running at <code>{SERVER}</code>.
          </p>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
  }

  const total = metrics.total_requests || 0
  const allow = metrics.allow || 0
  const block = metrics.block || 0
  const blockPct = total > 0 ? ((block / total) * 100).toFixed(1) : '0.0'
  const cacheTotal = (metrics.cache_hits || 0) + (metrics.cache_misses || 0)
  const cacheHitPct = cacheTotal > 0 ? ((metrics.cache_hits / cacheTotal) * 100).toFixed(1) : '0.0'

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Sentinel</h1>
          <p className="text-sm text-gray-400">Real-time fraud detection — operator dashboard</p>
        </div>
        <div className="flex gap-6 text-sm">
          <Stat label="Uptime" value={formatUptime(metrics.uptime_seconds)} />
          <Stat label="Avg RPS" value={(metrics.avg_rps || 0).toFixed(2)} />
          <Stat label="A/B Active" value={metrics.ab_active ? 'YES' : 'no'} valueColor={metrics.ab_active ? '#fbbf24' : '#9ca3af'} />
          <Stat label="Drift" value={metrics.drift_detected ? 'DETECTED' : 'normal'} valueColor={metrics.drift_detected ? '#ef4444' : '#10b981'} />
        </div>
      </div>

      {/* Cards row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card title="Total Requests" value={total.toLocaleString()} hint={`${(metrics.avg_rps || 0).toFixed(2)} avg RPS`} />
        <Card title="Decisions" value={`${block}/${total}`} hint={`${blockPct}% blocked`} accent="#ef4444" />
        <Card title="Cache Hit Rate" value={`${cacheHitPct}%`} hint={`${metrics.cache_size} cached entries`} accent="#10b981" />
        <Card title="Avg Batch Size" value={(metrics.avg_batch_size || 0).toFixed(2)} hint={`${metrics.batches_run} batches run`} accent="#3b82f6" />
      </div>

      {/* Live RPS chart */}
      <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-5 mb-6">
        <h2 className="text-lg font-semibold mb-3 text-white">Live RPS (last 60 seconds)</h2>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={rpsHistory}>
              <XAxis dataKey="t" stroke="#6b7280" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1a1d24', border: '1px solid #374151', borderRadius: '6px' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Line type="monotone" dataKey="rps" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Model">
          <Row label="Threshold" value={(metrics.threshold || 0).toFixed(3)} />
          <Row label="Allow" value={allow.toLocaleString()} />
          <Row label="Block" value={block.toLocaleString()} valueColor="#ef4444" />
          <Row label="Errors" value={(metrics.errors || 0).toLocaleString()} valueColor={metrics.errors > 0 ? '#ef4444' : undefined} />
        </Section>
        <Section title="A/B Test">
          {metrics.ab_active ? (
            <>
              <Row label="Split %" value={`${metrics.split_percent}%`} />
              <Row label="Predictions A" value={(metrics.predictions_a || 0).toLocaleString()} />
              <Row label="Predictions B" value={(metrics.predictions_b || 0).toLocaleString()} />
            </>
          ) : (
            <div className="text-sm text-gray-500 py-2">No A/B test running</div>
          )}
        </Section>
      </div>

      <div className="mt-6 text-xs text-gray-500 text-center">
        Polling {SERVER}/metrics every {POLL_MS}ms
      </div>
    </div>
  )
}

function Stat({ label, value, valueColor }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-base font-semibold" style={{ color: valueColor || '#e4e6eb' }}>{value}</div>
    </div>
  )
}

function Card({ title, value, hint, accent }) {
  return (
    <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-5">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">{title}</div>
      <div className="text-2xl font-bold" style={{ color: accent || '#e4e6eb' }}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{hint}</div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-5">
      <h2 className="text-lg font-semibold mb-3 text-white">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value, valueColor }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span style={{ color: valueColor || '#e4e6eb' }}>{value}</span>
    </div>
  )
}

function formatUptime(seconds) {
  const s = Math.floor(seconds || 0)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}
