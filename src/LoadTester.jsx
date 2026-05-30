import { useState, useRef } from 'react'

const SERVER = 'http://localhost:8080'

const DEFAULT_PAYLOAD = {
  features: [
    57007.0, -1.271244, 2.462675, -2.851395, 2.324480, -1.372245,
    -0.948196, -3.065234, 1.166927, -2.268771, -4.881143, 2.255147,
    -4.686387, 0.652375, -6.174288, 0.594380, -4.849692, -6.536521,
    -3.119094, 1.715494, 0.560478, 0.652941, 0.081931, -0.221348,
    -0.523582, 0.224228, 0.756335, 0.632800, 0.250187, 0.010000,
  ],
}

export default function LoadTester() {
  const [rps, setRps] = useState(50)
  const [duration, setDuration] = useState(10)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ sent: 0, recv: 0, errors: 0 })
  const [result, setResult] = useState(null)
  const stopRef = useRef(false)

  async function runTest() {
    if (running) return
    setRunning(true)
    setResult(null)
    stopRef.current = false
    const sent = { count: 0 }
    const recv = { count: 0 }
    const errors = { count: 0 }
    const latencies = []

    const startTime = Date.now()
    const endTime = startTime + duration * 1000
    const intervalMs = 1000 / rps

    async function fire() {
      sent.count++
      setProgress({ sent: sent.count, recv: recv.count, errors: errors.count })
      const t0 = performance.now()
      try {
        const res = await fetch(`${SERVER}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(DEFAULT_PAYLOAD),
        })
        if (!res.ok) {
          errors.count++
        } else {
          await res.json()
          latencies.push(performance.now() - t0)
          recv.count++
        }
      } catch {
        errors.count++
      }
      setProgress({ sent: sent.count, recv: recv.count, errors: errors.count })
    }

    while (Date.now() < endTime && !stopRef.current) {
      fire()
      await new Promise(r => setTimeout(r, intervalMs))
    }

    // Wait for in-flight to settle (max 2 sec)
    const settleStart = Date.now()
    while (recv.count + errors.count < sent.count && Date.now() - settleStart < 2000) {
      await new Promise(r => setTimeout(r, 50))
    }

    latencies.sort((a, b) => a - b)
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0
    const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0

    setResult({
      duration: (Date.now() - startTime) / 1000,
      sent: sent.count,
      received: recv.count,
      errors: errors.count,
      actualRps: sent.count / ((Date.now() - startTime) / 1000),
      avgLatencyMs: avg,
      p50,
      p95,
      p99,
    })
    setRunning(false)
  }

  function stopTest() {
    stopRef.current = true
  }

  return (
    <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-5">
      <h2 className="text-lg font-semibold mb-3 text-white">Load Tester</h2>

      <div className="space-y-3 mb-4">
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <label className="text-xs text-gray-500 uppercase tracking-wide">Target RPS</label>
            <span className="text-sm text-white">{rps}</span>
          </div>
          <input type="range" min="1" max="200" value={rps}
            onChange={(e) => setRps(Number(e.target.value))}
            disabled={running}
            className="w-full" />
        </div>
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <label className="text-xs text-gray-500 uppercase tracking-wide">Duration (seconds)</label>
            <span className="text-sm text-white">{duration}s</span>
          </div>
          <input type="range" min="5" max="60" value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={running}
            className="w-full" />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={runTest}
          disabled={running}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium text-white"
        >
          {running ? `Running... ${progress.sent} sent` : 'Start Load Test'}
        </button>
        {running && (
          <button
            onClick={stopTest}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded text-sm font-medium text-white"
          >
            Stop
          </button>
        )}
      </div>

      {running && (
        <div className="text-xs text-gray-400 mb-3">
          Sent: {progress.sent} • Received: {progress.recv} • Errors: {progress.errors}
        </div>
      )}

      {result && (
        <div className="bg-[#0f1115] border border-gray-800 rounded p-3 text-sm space-y-1">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Last Test Result</div>
          <Row label="Duration" value={`${result.duration.toFixed(1)}s`} />
          <Row label="Sent / Received" value={`${result.sent} / ${result.received}`} />
          <Row label="Errors" value={result.errors} valueColor={result.errors > 0 ? '#ef4444' : undefined} />
          <Row label="Actual RPS" value={result.actualRps.toFixed(1)} />
          <Row label="Avg Latency" value={`${result.avgLatencyMs.toFixed(1)} ms`} />
          <Row label="p50 / p95 / p99" value={`${result.p50.toFixed(1)} / ${result.p95.toFixed(1)} / ${result.p99.toFixed(1)} ms`} />
        </div>
      )}
    </div>
  )
}

function Row({ label, value, valueColor }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span style={{ color: valueColor || '#e4e6eb' }}>{value}</span>
    </div>
  )
}
