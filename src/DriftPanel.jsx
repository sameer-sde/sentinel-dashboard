import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const SERVER = 'http://localhost:8080'

export default function DriftPanel() {
  const [drift, setDrift] = useState(null)

  useEffect(() => {
    let alive = true
    async function poll() {
      try {
        const res = await fetch(`${SERVER}/admin/drift`)
        if (!res.ok) return
        const data = await res.json()
        if (alive) setDrift(data)
      } catch {}
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  if (!drift) {
    return (
      <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-5">
        <h2 className="text-lg font-semibold mb-3 text-white">Drift Detection</h2>
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    )
  }

  // Baseline not locked yet — show progress
  if (!drift.baseline_locked) {
    const progress = (drift.baseline_count / 500) * 100
    return (
      <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-5">
        <h2 className="text-lg font-semibold mb-3 text-white">Drift Detection</h2>
        <div className="text-sm text-gray-400 mb-2">
          Capturing baseline: {drift.baseline_count} / 500 samples
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-500 h-2 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Drift detection becomes active after baseline is locked.
        </div>
      </div>
    )
  }

  // Baseline locked — show top features by |z-score|
  const features = (drift.per_feature || [])
    .map(f => ({ ...f, absZ: Math.abs(f.z_score || 0) }))
    .sort((a, b) => b.absZ - a.absZ)
    .slice(0, 10)
    .map(f => ({
      name: `f${f.feature_index}`,
      z: Number((f.z_score || 0).toFixed(2)),
      drifted: f.drifted,
    }))

  return (
    <div className={`bg-[#1a1d24] border rounded-lg p-5 ${
      drift.drift_detected ? 'border-red-700' : 'border-gray-800'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-white">Drift Detection</h2>
        <span className={`text-xs px-2 py-1 rounded ${
          drift.drift_detected
            ? 'bg-red-900/40 text-red-300 border border-red-700'
            : 'bg-green-900/40 text-green-300 border border-green-700'
        }`}>
          {drift.drift_detected ? `DRIFT ${drift.drifted_features.length} features` : 'NORMAL'}
        </span>
      </div>
      <div className="text-xs text-gray-500 mb-2">
        Baseline: {drift.baseline_count} • Current window: {drift.current_count} • Top 10 |z-score|
      </div>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={features}>
            <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 11 }} />
            <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#1a1d24', border: '1px solid #374151', borderRadius: '6px' }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Bar dataKey="z" isAnimationActive={false}>
              {features.map((f, i) => (
                <Cell key={i} fill={f.drifted ? '#ef4444' : '#3b82f6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
