'use client'

import { useEffect, useRef } from 'react'

export default function CustomCursor() {
    const dotRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Only show on non-touch devices
        if (window.matchMedia('(hover: none)').matches) return

        const dot = dotRef.current
        if (!dot) return

        let mx = -100, my = -100
        let rafId: number
        let isHovering = false

        const onMove = (e: MouseEvent) => {
            mx = e.clientX
            my = e.clientY
        }

        const onEnter = () => {
            isHovering = true
        }
        const onLeave = () => {
            isHovering = false
        }

        // Attach to all interactive elements
        const attachHoverListeners = () => {
            const targets = document.querySelectorAll('a, button, [role="button"], input, [data-cursor-hover]')
            targets.forEach(el => {
                el.addEventListener('mouseenter', onEnter)
                el.addEventListener('mouseleave', onLeave)
            })
        }

        window.addEventListener('mousemove', onMove)
        attachHoverListeners()

        // Observe DOM changes to catch dynamically added elements
        const observer = new MutationObserver(attachHoverListeners)
        observer.observe(document.body, { childList: true, subtree: true })

        const tick = () => {
            // Dot snaps instantly
            dot.style.left = `${mx}px`
            dot.style.top = `${my}px`

            // Scale dot on hover
            dot.style.transform = `translate(-50%, -50%) scale(${isHovering ? 2.0 : 1})`
            dot.style.opacity = isHovering ? '0.85' : '1'

            rafId = requestAnimationFrame(tick)
        }

        tick()

        return () => {
            cancelAnimationFrame(rafId)
            window.removeEventListener('mousemove', onMove)
            observer.disconnect()
        }
    }, [])

    return (
        <div
            ref={dotRef}
            style={{
                position: 'fixed',
                pointerEvents: 'none',
                zIndex: 9999,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--refine)',
                boxShadow: '0 0 8px var(--refine)',
                transform: 'translate(-50%, -50%)',
                transition: 'transform 0.15s ease, opacity 0.15s ease',
                mixBlendMode: 'normal',
                left: -100,
                top: -100,
            }}
        />
    )
}
