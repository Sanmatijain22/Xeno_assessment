'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

const COUNTRY_RULES = [
    { flag: '🇮🇳', name: 'India', rule: '10 digits', initialOn: true },
    { flag: '🇸🇬', name: 'Singapore', rule: '8 digits', initialOn: true },
    { flag: '🇺🇸', name: 'USA', rule: '10 digits', initialOn: true },
    { flag: '🇩🇪', name: 'Germany', rule: '11 digits', initialOn: false },
]

const DATE_FORMATS = [
    { name: 'ISO', format: 'YYYY-MM-DD', initialOn: true },
    { name: 'EU', format: 'DD/MM/YYYY', initialOn: true },
    { name: 'US', format: 'MM/DD/YYYY', initialOn: true },
    { name: 'Unix epoch', format: 'seconds', initialOn: false },
]

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
        <button
            className={`rule-toggle${on ? ' on' : ''}`}
            onClick={onToggle}
            aria-pressed={on}
            style={{ flexShrink: 0 }}
        />
    )
}

function RuleValue({ value }: { value: string }) {
    const [flash, setFlash] = useState(false)
    return (
        <div
            style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                color: flash ? 'var(--paper)' : 'var(--mist)',
                padding: '5px 10px',
                border: `1px dashed ${flash ? 'var(--signal)' : 'var(--line)'}`,
                borderRadius: 6,
                background: 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease, color 0.2s ease',
                flexShrink: 0,
            }}
            onClick={() => {
                setFlash(true)
                setTimeout(() => setFlash(false), 600)
            }}
        >
            {value}
        </div>
    )
}

function GlassPanel({
    title,
    children,
}: {
    title: string
    children: React.ReactNode
}) {
    return (
        <div
            className="hover-card"
            style={{
                background:
                    'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
                border: '1px solid var(--line)',
                borderRadius: 18,
                backdropFilter: 'blur(20px) saturate(160%)',
                boxShadow:
                    '0 30px 80px -30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
                overflow: 'hidden',
            }}
        >
            {/* Panel header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 22px',
                    borderBottom: '1px solid var(--line-soft)',
                }}
            >
                <div
                    style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 12.5,
                        color: 'var(--mist)',
                    }}
                >
                    {title}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {[0, 1, 2].map((i) => (
                        <span
                            key={i}
                            style={{
                                width: 9,
                                height: 9,
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.12)',
                                display: 'inline-block',
                            }}
                        />
                    ))}
                </div>
            </div>
            {children}
        </div>
    )
}

function RuleRow({
    label,
    value,
    on,
    onToggle,
}: {
    label: React.ReactNode
    value: string
    on: boolean
    onToggle: () => void
}) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 22px',
                borderTop: '1px solid var(--line-soft)',
                fontSize: 14,
                gap: 12,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: 'var(--paper)',
                }}
            >
                {label}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <RuleValue value={value} />
                <Toggle on={on} onToggle={onToggle} />
            </div>
        </div>
    )
}

export default function RuleEngine() {
    const [countryToggles, setCountryToggles] = useState(
        COUNTRY_RULES.map((r) => r.initialOn)
    )
    const [dateToggles, setDateToggles] = useState(
        DATE_FORMATS.map((f) => f.initialOn)
    )

    const toggleCountry = (i: number) => {
        setCountryToggles((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
    }
    const toggleDate = (i: number) => {
        setDateToggles((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
    }

    return (
        <section
            id="rules"
            style={{
                position: 'relative',
                zIndex: 2,
                paddingBlock: 'clamp(80px, 12vw, 160px)',
                borderTop: '1px solid var(--line-soft)',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 1280,
                    margin: '0 auto',
                    paddingInline: 32,
                }}
            >
                {/* Head */}
                <div style={{ maxWidth: 600 }}>
                    <div
                        style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 12.5,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: 'var(--refine)',
                            marginBottom: 18,
                        }}
                    >
                        Configuration, not hardcoding
                    </div>
                    <h2
                        style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 'clamp(1.9rem, 3.6vw, 2.8rem)',
                            fontWeight: 600,
                            letterSpacing: '-0.01em',
                            lineHeight: 1.1,
                        }}
                    >
                        Validation rules you can see — and change.
                    </h2>
                    <p
                        style={{
                            marginTop: 18,
                            color: 'var(--mist)',
                            fontSize: 16,
                            lineHeight: 1.65,
                            maxWidth: 560,
                        }}
                    >
                        Phone formats and date parsing are configuration, not code. Add a
                        country or a format without shipping a release.
                    </p>
                </div>

                {/* Rules grid */}
                <motion.div
                    className="rules-panels"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10% 0px' }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 32,
                        marginTop: 56,
                    }}
                >
                    {/* Country rules panel */}
                    <GlassPanel title="country-rules.yaml">
                        {COUNTRY_RULES.map((rule, i) => (
                            <RuleRow
                                key={rule.name}
                                label={
                                    <>
                                        {rule.flag} {rule.name}
                                    </>
                                }
                                value={rule.rule}
                                on={countryToggles[i]}
                                onToggle={() => toggleCountry(i)}
                            />
                        ))}
                    </GlassPanel>

                    {/* Date formats panel */}
                    <GlassPanel title="date-formats.yaml">
                        {DATE_FORMATS.map((fmt, i) => (
                            <RuleRow
                                key={fmt.name}
                                label={fmt.name}
                                value={fmt.format}
                                on={dateToggles[i]}
                                onToggle={() => toggleDate(i)}
                            />
                        ))}
                    </GlassPanel>
                </motion.div>
            </div>

            <style>{`
        @media (max-width: 860px) {
          .rules-panels { grid-template-columns: 1fr !important; }
        }
        .rule-toggle {
          width: 38px;
          height: 20px;
          border-radius: 100px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--line);
          position: relative;
          cursor: pointer;
          transition: background 0.25s, border-color 0.25s;
        }
        .rule-toggle::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--mist);
          transition: transform 0.25s, background 0.25s;
        }
        .rule-toggle.on {
          background: rgba(155, 107, 255, 0.2);
          border-color: var(--refine);
        }
        .rule-toggle.on::after {
          transform: translateX(18px);
          background: var(--refine);
        }
      `}</style>
        </section>
    )
}