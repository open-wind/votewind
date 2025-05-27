// components/ScrollHint.js
'use client'

import { useEffect, useState, useRef } from 'react'
import { FiChevronDown } from 'react-icons/fi'

/**
 * ScrollHint
 * Shows a small bouncing chevron when more content is available
 * on small screens. It hides automatically at the bottom and can
 * optionally scroll the view on tap.
 *
 * Props
 *   targetRef? – React ref to the scrollable element you want to track.
 *                If omitted, the whole document is observed.
 *   scrollBy?   – How far to scroll on click (default: 0.8× viewport).
 */
export default function ScrollHint({ targetRef, scrollBy }) {
  const [visible, setVisible] = useState(false)

  // Local fallback ref for document scrollingElement
  const docRef = useRef(null)

  useEffect(() => {
    if (!targetRef) {
      docRef.current = document.scrollingElement || document.documentElement
    }

    const el = targetRef?.current || docRef.current
    if (!el) return

    const update = () => {
      const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 2
      setVisible(!atEnd)
    }

    // Run once and add listeners
    update()
    const scrollTarget = targetRef ? el : window
    scrollTarget.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update) // account for orientation change

    return () => {
      scrollTarget.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [targetRef])

  if (!visible) return null

  /* -------------------- click handler -------------------- */
  const handleClick = () => {
    const el = targetRef?.current || document.scrollingElement || document.documentElement
    const delta = scrollBy ?? window.innerHeight * 0.8
    el.scrollBy({ top: delta, behavior: 'smooth' })
  }

  return (
    <button
      aria-label="Scroll down"
      onClick={handleClick}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:hidden
                 text-gray-500 animate-bounce z-50"
    >
      <FiChevronDown className="w-8 h-8" />
    </button>
  )
}
