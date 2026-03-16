import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

export default function RouteProgressBar() {
  const location = useLocation()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Start progress on route change
    setVisible(true)
    setProgress(10)

    // Quickly ramp to ~80%, then slow down
    let p = 10
    intervalRef.current = setInterval(() => {
      p += p < 60 ? 12 : p < 80 ? 4 : 1
      if (p >= 90) {
        clearInterval(intervalRef.current!)
        p = 90
      }
      setProgress(p)
    }, 80)

    // Complete after a short delay (simulates page loaded)
    timerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current!)
      setProgress(100)
      setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 300)
    }, 400)

    return () => {
      clearInterval(intervalRef.current!)
      clearTimeout(timerRef.current!)
    }
  }, [location.pathname])

  if (!visible && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-0.5 bg-brand-600 transition-all duration-200 ease-out"
      style={{
        width: `${progress}%`,
        opacity: visible ? 1 : 0,
        transition: progress === 100 ? 'width 150ms ease-out, opacity 300ms ease 150ms' : 'width 200ms ease-out',
      }}
    />
  )
}
