'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/shared/Navbar'
import CustomCursor from '@/components/shared/CustomCursor'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const POLL_INTERVAL = 3000

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed'

interface JobDetails {
  job_id: string
  status: JobStatus
  total_records: number | null
  valid_records: number | null
  invalid_records: number | null
  clean_file_path: string | null
  error_report_path: string | null
}

interface AIReport {
  quality_score: number
  common_errors: Array<{ field: string; error: string; count: number }>
  country_analysis: Record<string, { status: string; issue: string | null } | string>
  recommendations: string[]
  executive_summary: string
}

interface Downloads {
  clean_transactions_url: string | null
  error_report_url: string | null
  chunks_urls: string[]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: JobStatus | 'loading' }) {
  const colors: Record<string, string> = {
    loading: 'var(--mist-dim)',
    queued: 'var(--signal)',
    processing: 'var(--ingest)',
    completed: '#10b981',
    failed: '#f87171',
  }
  const labels: Record<string, string> = {
    loading: 'Connecting…',
    queued: 'Queued',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
  }
  const c = colors[status] ?? colors.loading
  const pulse = status === 'queued' || status === 'processing'
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 18px', borderRadius: 100,
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${c}`, color: c,
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 600,
      boxShadow: `0 0 15px -3px ${c}33`,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', background: c,
        animation: pulse ? 'pulse-dot 1.5s infinite' : 'none',
        boxShadow: `0 0 8px ${c}`,
      }} />
      {labels[status]}
    </div>
  )
}

function PipelineTracker({ status }: { status: JobStatus | 'loading' }) {
  const steps = ['Uploaded', 'Queued', 'Processing', 'Finished']
  const activeIdx =
    status === 'queued' ? 1 :
    status === 'processing' ? 2 :
    status === 'completed' ? 3 :
    status === 'failed' ? 3 : 0

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', maxWidth: 480, margin: '0 auto 36px' }}>
      <div style={{ position: 'absolute', top: 15, left: 30, right: 30, height: 2, background: 'var(--line)', zIndex: 0 }} />
      <div style={{
        position: 'absolute', top: 15, left: 30,
        width: `${Math.min((activeIdx / 3) * 100, 100)}%`,
        maxWidth: 'calc(100% - 60px)',
        height: 2,
        background: status === 'failed' ? '#f87171' : 'var(--refine)',
        transition: 'width 0.6s ease', zIndex: 0,
      }} />
      {steps.map((label, i) => {
        const done = i < activeIdx || (i === 3 && status === 'completed')
        const active = i === activeIdx && status !== 'completed' && status !== 'failed'
        const isFailed = i === 3 && status === 'failed'
        const col = isFailed ? '#f87171' : (done || active ? 'var(--refine)' : 'var(--line)')
        return (
          <div key={label} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#0a0b0e', border: `2px solid ${col}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: isFailed ? '#f87171' : (done ? 'var(--refine)' : (active ? 'var(--refine)' : 'var(--mist-dim)')),
              transition: 'all 0.3s ease',
            }}>
              {isFailed ? '✗' : done ? '✓' : active ? '●' : `0${i + 1}`}
            </div>
            <span style={{ fontSize: 11, color: done || active ? 'var(--mist)' : 'var(--mist-dim)', fontFamily: "'Space Grotesk', sans-serif" }}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function MetricCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)',
      borderRadius: 16, padding: '24px 20px', textAlign: 'center',
      flex: 1, minWidth: 130,
    }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, fontWeight: 700, color: accent, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--mist-dim)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  )
}

function QualityRing({ score }: { score: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ
  const color = score >= 80 ? '#10b981' : score >= 60 ? 'var(--signal)' : '#f87171'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={96} height={96} viewBox="0 0 96 96">
        <circle cx={48} cy={48} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7} />
        <circle
          cx={48} cy={48} r={r} fill="none"
          stroke={color} strokeWidth={7}
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x={48} y={53} textAnchor="middle" fontSize={18} fontWeight={700} fill={color} fontFamily="IBM Plex Mono, monospace">
          {score.toFixed(0)}
        </text>
      </svg>
      <span style={{ fontSize: 11, color: 'var(--mist-dim)', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Quality Score
      </span>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)', border: '1px solid var(--line)',
      borderRadius: 20, padding: '28px 24px', marginBottom: 16,
    }}>
      <h3 style={{
        fontFamily: "'Space Grotesk', sans-serif", fontSize: 13,
        fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--mist-dim)', marginBottom: 20,
      }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function DownloadButton({ label, url, accent, icon }: { label: string; url: string; accent: string; icon: string }) {
  return (
    <a
      href={`${API_BASE}${url}`}
      download
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 18px', borderRadius: 12,
        background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent}44`,
        color: accent, textDecoration: 'none',
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 13,
        transition: 'background 0.2s, border-color 0.2s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${accent}12`; (e.currentTarget as HTMLAnchorElement).style.borderColor = accent }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = `${accent}44` }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      {label}
    </a>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

function WorkspaceDashboard() {
  const searchParams = useSearchParams()
  const jobId = searchParams.get('job_id')

  const [job, setJob] = useState<JobDetails | null>(null)
  const [report, setReport] = useState<AIReport | null>(null)
  const [downloads, setDownloads] = useState<Downloads | null>(null)
  const [status, setStatus] = useState<JobStatus | 'loading'>('loading')
  const [error, setError] = useState('')

  const fetchJob = useCallback(async () => {
    if (!jobId) { setStatus('failed'); setError('No job_id in URL.'); return }
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}`)
      if (res.status === 404) { setStatus('failed'); setError(`Job ${jobId} not found.`); return }
      if (!res.ok) throw new Error(`Server ${res.status}`)
      const data: JobDetails = await res.json()
      setJob(data)
      setStatus(data.status)
    } catch (err: any) {
      console.error('fetchJob', err)
    }
  }, [jobId])

  const fetchReport = useCallback(async () => {
    if (!jobId) return
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/report`)
      if (res.ok) setReport(await res.json())
    } catch { /* non-fatal */ }
  }, [jobId])

  const fetchDownloads = useCallback(async () => {
    if (!jobId) return
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/downloads`)
      if (res.ok) setDownloads(await res.json())
    } catch { /* non-fatal */ }
  }, [jobId])

  // Initial load + poll until terminal state
  useEffect(() => {
    fetchJob()
    const id = setInterval(async () => {
      await fetchJob()
      if (status === 'completed' || status === 'failed') clearInterval(id)
    }, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchJob, status])

  // Fetch report + downloads once job completes
  useEffect(() => {
    if (status === 'completed') {
      fetchReport()
      fetchDownloads()
    }
  }, [status, fetchReport, fetchDownloads])

  const qualityScore = report?.quality_score ?? null

  return (
    <div style={{
      position: 'relative', minHeight: '100vh',
      paddingTop: 100, paddingBottom: 80, paddingInline: 20,
      zIndex: 2,
    }}>
      <CustomCursor />
      <div className="bg-grid" />
      <div className="spotlight" style={{ background: 'radial-gradient(800px circle at 50% 20%, rgba(155,107,255,0.07), transparent 60%)' }} />

      <div style={{ width: '100%', maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 600, marginBottom: 10 }}>
            Validation Workspace
          </h1>
          {jobId && (
            <div style={{
              display: 'inline-block',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
              color: 'var(--mist)', background: 'rgba(255,255,255,0.04)',
              padding: '5px 12px', borderRadius: 6, border: '1px solid var(--line-soft)',
              marginBottom: 20,
            }}>
              {jobId}
            </div>
          )}
          <div><StatusBadge status={status} /></div>
        </div>

        {/* Pipeline tracker */}
        {status !== 'loading' && <PipelineTracker status={status as JobStatus} />}

        {/* Loading spinner */}
        {status === 'loading' && (
          <div style={{ textAlign: 'center', paddingBlock: 60 }}>
            <div style={{
              width: 44, height: 44, border: '3px solid var(--line)',
              borderTopColor: 'var(--refine)', borderRadius: '50%',
              animation: 'spin 1s linear infinite', margin: '0 auto 16px',
            }} />
            <p style={{ color: 'var(--mist)', fontSize: 14 }}>Connecting to validation pipeline…</p>
          </div>
        )}

        {/* In-progress message */}
        {(status === 'queued' || status === 'processing') && (
          <div style={{
            background: 'rgba(255,255,255,0.015)', border: '1px solid var(--line-soft)',
            borderRadius: 16, padding: '24px 20px', textAlign: 'center',
            color: 'var(--mist)', fontSize: 14, lineHeight: 1.7, marginBottom: 16,
          }}>
            {status === 'queued'
              ? 'Waiting in the Redis task queue for an available worker…'
              : 'Running Polars validation — checking phone formats, date rules, duplicates, and generating output files…'}
          </div>
        )}

        {/* Failed message */}
        {status === 'failed' && (
          <div style={{
            background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 16, padding: '24px 20px', textAlign: 'center',
            color: '#f87171', fontSize: 14, lineHeight: 1.7, marginBottom: 16,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Pipeline failed</div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>{error || 'An error occurred during processing.'}</div>
          </div>
        )}

        {/* Completed — full dashboard */}
        {status === 'completed' && job && (
          <>
            {/* Metrics */}
            <SectionCard title="Processing Metrics">
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {qualityScore !== null && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginRight: 8 }}>
                    <QualityRing score={qualityScore} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1 }}>
                  <MetricCard label="Total Records" value={(job.total_records ?? 0).toLocaleString()} accent="var(--refine)" />
                  <MetricCard label="Valid Records" value={(job.valid_records ?? 0).toLocaleString()} accent="#10b981" />
                  <MetricCard label="Invalid Records" value={(job.invalid_records ?? 0).toLocaleString()} accent="#f87171" />
                  {job.total_records && job.valid_records !== null && (
                    <MetricCard
                      label="Pass Rate"
                      value={`${((job.valid_records / job.total_records) * 100).toFixed(1)}%`}
                      accent="var(--ingest)"
                    />
                  )}
                </div>
              </div>
            </SectionCard>

            {/* AI Insights */}
            {report && (
              <SectionCard title="AI Insights">
                {/* Executive summary */}
                <div style={{
                  background: 'rgba(155,107,255,0.06)', border: '1px solid rgba(155,107,255,0.2)',
                  borderRadius: 12, padding: '16px 18px', marginBottom: 20,
                  color: 'var(--mist)', fontSize: 14, lineHeight: 1.75,
                }}>
                  {report.executive_summary}
                </div>

                {/* Recommendations */}
                {report.recommendations.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, color: 'var(--mist-dim)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Recommendations
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {report.recommendations.map((rec, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--refine)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, paddingTop: 2, flexShrink: 0 }}>
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span style={{ color: 'var(--mist)', fontSize: 14, lineHeight: 1.6 }}>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Common errors */}
                {report.common_errors.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, color: 'var(--mist-dim)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Top Errors
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {report.common_errors.slice(0, 6).map((e, i) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 14px', borderRadius: 10,
                          background: 'rgba(255,255,255,0.025)', border: '1px solid var(--line-soft)',
                          gap: 12,
                        }}>
                          <div>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--signal)', marginRight: 8 }}>
                              {e.field}
                            </span>
                            <span style={{ fontSize: 13, color: 'var(--mist)' }}>{e.error}</span>
                          </div>
                          <span style={{
                            fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
                            color: '#f87171', background: 'rgba(248,113,113,0.1)',
                            padding: '2px 8px', borderRadius: 6, flexShrink: 0,
                          }}>
                            {e.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Country analysis */}
                {Object.keys(report.country_analysis).length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--mist-dim)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Country Analysis
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {Object.entries(report.country_analysis).map(([code, val]) => {
                        const s = typeof val === 'string' ? val : (val as any)?.status ?? 'unknown'
                        const col = s === 'passing' ? '#10b981' : s === 'warning' ? 'var(--signal)' : s === 'failing' ? '#f87171' : 'var(--mist-dim)'
                        return (
                          <div key={code} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 12px', borderRadius: 8,
                            background: 'rgba(255,255,255,0.03)', border: `1px solid ${col}44`,
                          }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: col }} />
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--mist)' }}>{code}</span>
                            <span style={{ fontSize: 11, color: col, textTransform: 'capitalize' }}>{s}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Downloads */}
            {downloads && (
              <SectionCard title="Download Results">
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {downloads.clean_transactions_url && (
                    <DownloadButton
                      label="Clean Dataset"
                      url={downloads.clean_transactions_url}
                      accent="#10b981"
                      icon="✓"
                    />
                  )}
                  {downloads.error_report_url && (
                    <DownloadButton
                      label="Error Report"
                      url={downloads.error_report_url}
                      accent="#f87171"
                      icon="⚠"
                    />
                  )}
                  {downloads.chunks_urls.map((url, i) => (
                    <DownloadButton
                      key={url}
                      label={`Chunk ${i + 1}`}
                      url={url}
                      accent="var(--ingest)"
                      icon="▦"
                    />
                  ))}
                  {!downloads.clean_transactions_url && !downloads.error_report_url && downloads.chunks_urls.length === 0 && (
                    <p style={{ color: 'var(--mist-dim)', fontSize: 13 }}>No output files available yet.</p>
                  )}
                </div>
              </SectionCard>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0a0b0e', color: 'var(--mist)', fontFamily: 'sans-serif', fontSize: 14,
        }}>
          Loading workspace…
        </div>
      }>
        <WorkspaceDashboard />
      </Suspense>
    </>
  )
}
