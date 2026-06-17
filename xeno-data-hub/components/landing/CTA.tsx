'use client'

import { motion } from 'framer-motion'

export default function CTA() {
    return (
        <section
            id="cta"
            style={{
                position: 'relative',
                zIndex: 2,
                paddingBlock: 120,
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
                <motion.div
                    initial={{ opacity: 0, y: 32 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10% 0px' }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        position: 'relative',
                        borderRadius: 28,
                        padding: 'clamp(48px, 8vw, 88px) clamp(24px, 6vw, 64px)',
                        textAlign: 'center',
                        overflow: 'hidden',
                        background:
                            'radial-gradient(circle at 50% 0%, rgba(245,176,66,0.12), transparent 60%), var(--surface)',
                        border: '1px solid var(--line)',
                    }}
                >
                    <h2
                        style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 'clamp(2rem, 4.4vw, 3.4rem)',
                            fontWeight: 600,
                            letterSpacing: '-0.01em',
                        }}
                    >
                        Every transaction,
                        <br />
                        verified.
                    </h2>
                    <p
                        style={{
                            marginTop: 18,
                            color: 'var(--mist)',
                            fontSize: 16,
                            maxWidth: 460,
                            marginInline: 'auto',
                        }}
                    >
                        Bring your messiest export. Leave with data your finance team
                        actually trusts.
                    </p>
                    <div
                        style={{
                            marginTop: 36,
                            display: 'flex',
                            justifyContent: 'center',
                            gap: 14,
                            flexWrap: 'wrap',
                        }}
                    >
                        <motion.a
                            href="#"
                            whileHover={{ y: -2 }}
                            style={{
                                padding: '14px 26px',
                                borderRadius: 10,
                                fontSize: 14.5,
                                fontWeight: 600,
                                color: '#0a0b0e',
                                background: 'linear-gradient(120deg, #fff, #e7e9ee)',
                                boxShadow: '0 8px 30px rgba(245,176,66,0.18)',
                                display: 'inline-block',
                            }}
                        >
                            Start validating free
                        </motion.a>
                        <motion.a
                            href="#"
                            whileHover={{ y: -2 }}
                            style={{
                                padding: '14px 26px',
                                borderRadius: 10,
                                fontSize: 14.5,
                                fontWeight: 500,
                                border: '1px solid var(--line)',
                                background: 'rgba(255,255,255,0.02)',
                                backdropFilter: 'blur(10px)',
                                transition: 'border-color 0.2s ease',
                                display: 'inline-block',
                            }}
                            onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLElement).style.borderColor =
                                'rgba(255,255,255,0.25)')
                            }
                            onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLElement).style.borderColor =
                                'var(--line)')
                            }
                        >
                            Talk to the team
                        </motion.a>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}