import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'

export const Grade = ({ g }) => (g ? <span className={`g ${g}`}>{g}</span> : null)

export const PageHead = ({ title, note }) => (
  <div className="head"><div><h1>{title}</h1>{note && <small>{note}</small>}</div></div>
)

// Charts read their text and grid colors from the current theme.
export function ChartBox({ type = 'bar', data, options }) {
  const ref = useRef()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const f = () => setTick((t) => t + 1)
    window.addEventListener('themechange', f)
    return () => window.removeEventListener('themechange', f)
  }, [])

  useEffect(() => {
    const css = getComputedStyle(document.documentElement)
    const text = css.getPropertyValue('--mute').trim()
    const grid = css.getPropertyValue('--line').trim()
    const sc = options?.scales || {}
    const c = new Chart(ref.current, {
      type, data,
      options: {
        responsive: true, maintainAspectRatio: false, color: text, ...options,
        plugins: { ...(options?.plugins || {}), legend: { ...(options?.plugins?.legend || {}), labels: { color: text } } },
        scales: { x: { ...sc.x, ticks: { color: text }, grid: { color: grid } }, y: { ...sc.y, ticks: { color: text }, grid: { color: grid } } },
      },
    })
    return () => c.destroy()
  }, [JSON.stringify(data), tick])

  return <div className="chart"><canvas ref={ref} /></div>
}
