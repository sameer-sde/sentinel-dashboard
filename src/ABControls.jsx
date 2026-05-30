import { useEffect, useState } from 'react'

const SERVER = 'http://localhost:8080'

export default function ABControls() {
  const [status, setStatus] = useState(null)
  const [candidateVersion, setCandidateVersion] = useState('v2')
  const [splitPct, setSplitPct] = useState(50)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    let alive = true
    async function poll() {
      try {
        const res = await fetch(`${SERVER}/admin/ab/status`)
        if (!res.ok) return
        const data = await res.json()
        if (alive) setStatus(data)
      } catch {}
    }
    poll()
    const id = setInterval(poll, 1000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  async function call(path, body) {
    setMsg(null)
    try {
      const res = await fetch(`${SERVER}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const text = await res.text()
      if (!res.ok) {
        setMsg({ kind: 'err', text: text || `HTTP ${res.status}` })
      } else {
        try {
          const data = JSON.parse(text)
          setMsg({ kind: 'ok', text: data.status || 'ok' })
        } catch {
          setMsg({ kind: 'ok', text: 'ok' })
        }
      }
    } catch (e) {
      setMsg({ kind: 'err', text: e.message })
    }
  }

  const active = status?.ab_active

  return (
    <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">A/B Test Controls</h2>
        {active && (
          <span className="text-xs px-2 py-1 rounded bg-amber-900/40 text-amber-300 border border-amber-700">
            LIVE • split {status.split_percent}%
          </span>
        )}
      </div>

      {/* Setup */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Candidate version</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={candidateVersion}
              onChange={(e) => setCandidateVersion(e.target.value)}
              placeholder="v2"
              className="flex-1 bg-[#0f1115] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              disabled={active}
            />
            <button
              onClick={() => call('/admin/ab/setup', { candidate_version: candidateVersion })}
              disabled={active || !candidateVersion}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium text-white"
            >
              Setup B
            </button>
          </div>
        </div>

        {/* Split */}
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <label className="block text-xs text-gray-500 uppercase tracking-wide">Split to B</label>
            <span className="text-sm text-white">{splitPct}%</span>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="range"
              min="0"
              max="100"
              value={splitPct}
              onChange={(e) => setSplitPct(Number(e.target.value))}
              disabled={!active}
              className="flex-1"
            />
            <button
              onClick={() => call('/admin/ab/split', { percent: splitPct })}
              disabled={!active}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium text-white"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Promote / Abort */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => call('/admin/ab/promote')}
            disabled={!active}
            className="flex-1 px-3 py-2 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium text-white"
          >
            Promote B → A
          </button>
          <button
            onClick={() => call('/admin/ab/abort')}
            disabled={!active}
            className="flex-1 px-3 py-2 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium text-white"
          >
            Abort B
          </button>
        </div>

        {msg && (
          <div className={`text-xs px-2 py-1 rounded ${
            msg.kind === 'ok' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
          }`}>
            {msg.text}
          </div>
        )}
      </div>

      {/* Live counts */}
      {status && (
        <div className="mt-5 pt-4 border-t border-gray-800 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-gray-500 uppercase mb-1">Variant A ({status.version_a})</div>
            <div className="text-white">{(status.predictions_a || 0).toLocaleString()} predictions</div>
            <div className="text-gray-400 text-xs">{(status.blocks_a || 0).toLocaleString()} blocked ({((status.block_rate_a || 0) * 100).toFixed(1)}%)</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase mb-1">
              Variant B {status.version_b ? `(${status.version_b})` : ''}
            </div>
            <div className="text-white">{(status.predictions_b || 0).toLocaleString()} predictions</div>
            <div className="text-gray-400 text-xs">{(status.blocks_b || 0).toLocaleString()} blocked ({((status.block_rate_b || 0) * 100).toFixed(1)}%)</div>
          </div>
        </div>
      )}
    </div>
  )
}
