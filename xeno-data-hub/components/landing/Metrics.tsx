'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

const SUB_METRICS = [
    {
        value: '2.1M rows/min',
        label: 'sustained streaming throughput on a single worker pool',
    },
    {
        value: '<400ms',
        label: 'p95 validation latency per chunk, end to end',
    },
    {
        value: '40M+',
        label: 'transactions validated for customers last quarter',
    },
]

export default function Metrics() {
    const ref = useRef<HTMLDivElement>(null)
    const isInView = useInView(ref, { once: true, margin: '-20% 0px' })
    const [display, setDisplay] = useState('0.00%')
    const animStarted = useRef(false)

    useEffect(() => {
        if (!isInView || animStarted.current) return
        animStarted.current = true
        const target = 99.97
        const start = performance.now()
        const duration = 1400
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration)
            const eased = 1 - Math.pow(1 - t, 3)
            const val = target * eased
            setDisplay(val.toFixed(2) + '%')
            if (t < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
    }, [isInView])

    return (
        <section
            style={{
                position: 'relative',
                zIndex: 2,
                paddingBlock: 'clamp(80px, 12vw, 160px)',
                borderTop: '1px solid var(--line-soft)',
            }}
        >
            <div
                ref={ref}
                style={{
                    width: '100%',
                    maxWidth: 1280,
                    margin: '0 auto',
                    paddingInline: 32,
                }}
            >
                {/* Big metric */}
                <div
                    style={{ display: 'flex', alignItems: 'baseline', gap: 18, flexWrap: 'wrap' }}
                >
                    <span
                        style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontWeight: 600,
                            fontSize: 'clamp(4rem, 12vw, 8.5rem)',
                            lineHeight: 0.9,
                            background: 'linear-gradient(100deg, var(--paper), var(--signal))',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            color: 'transparent',
                        }}
                    >
                        {display}
                    </span>
                    <div
                        style={{
                            maxWidth: 280,
                            color: 'var(--mist)',
                            fontSize: 15,
                            lineHeight: 1.5,
                            paddingBottom: 18,
                        }}
                    >
                        validation accuracy maintained across every batch processed last
                        quarter
                    </div>
                </div>

                {/* Sub metrics */}
                <div
                    style={{
                        display: 'flex',
                        gap: 64,
                        marginTop: 56,
                        flexWrap: 'wrap',
                        borderTop: '1px solid var(--line-soft)',
                        paddingTop: 40,
                    }}
                >
                    {SUB_METRICS.map((m) => (
                        <div key={m.value}>
                            <b
                                style={{
                                    display: 'block',
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    fontSize: 28,
                                    color: 'var(--paper)',
                                    fontWeight: 500,
                                }}
                            >
                                {m.value}
                            </b>
                            <span
                                style={{
                                    display: 'block',
                                    marginTop: 8,
                                    fontSize: 13.5,
                                    color: 'var(--mist-dim)',
                                    maxWidth: 220,
                                }}
                            >
                                {m.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}