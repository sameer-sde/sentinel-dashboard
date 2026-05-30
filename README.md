# Sentinel Dashboard

React + Vite + Tailwind v4 + Recharts dashboard for [Sentinel](https://github.com/sameer-sde/sentinel),
a real-time fraud detection ML serving system.

## What it shows

- **Live RPS chart** — polled from `/metrics` every 1 second
- **Stat cards** — total requests, decisions, cache hit rate, avg batch size
- **A/B Test Controls** — load candidate, set split %, promote or abort
- **Drift Detection** — bar chart of top |z-score| features; baseline progress
  bar before the tracker locks
- **Built-in Load Tester** — fires `/predict` from the browser, computes
  p50/p95/p99 client-side
- **Model panel** — threshold, allow/block counts, errors, cache size

## Run

The Sentinel server must be running on `:8080` first ([sentinel repo](https://github.com/sameer-sde/sentinel)).

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Stack

- Vite 8 + React 18
- Tailwind CSS v4 (with `@tailwindcss/postcss`)
- Recharts for time-series + bar charts
- Plain `fetch()` polling — no React Query, no Redux. ~400 LOC.


