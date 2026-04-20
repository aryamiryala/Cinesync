import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLES = [
  { id: 'Location Manager', label: 'Location Manager', abbr: 'LM', color: '#F5A623' },
  { id: 'Director', label: 'Director', abbr: 'DR', color: '#3ECFBF' },
  { id: 'Producer', label: 'Producer', abbr: 'PR', color: '#A78BFA' },
  { id: 'Production Designer', label: 'Prod. Designer', abbr: 'PD', color: '#60A5FA' },
  { id: 'Assistant Director (AD)', label: 'Assistant Director', abbr: 'AD', color: '#F472B6' },
]

const PARTICIPANTS = [
  { name: 'Maya Chen', role: 'Location Manager', online: true },
  { name: 'James Park', role: 'Director', online: true },
  { name: 'Sofia R.', role: 'Producer', online: true },
  { name: 'Leo Vasquez', role: 'Production Designer', online: false },
  { name: 'Dana Kim', role: 'Assistant Director (AD)', online: true },
]

const SUGGESTED_PROMPTS = [
  "Is Downtown LA's Arts District inside the TMZ zone?",
  "What's the permit lead time for a 80-person crew on city streets?",
  "What are the noise ordinance hours for residential filming?",
  "How much does truck parking affect logistics for Venice Beach?",
]

// ─── Sub-components ──────────────────────────────────────────────────────────
function RoleBadge({ role, size = 'sm' }) {
  const r = ROLES.find(x => x.id === role) || ROLES[0]
  const style = {
    sm: { fontSize: 10, padding: '2px 7px', borderRadius: 3 },
    xs: { fontSize: 9, padding: '1px 5px', borderRadius: 2 },
  }[size]
  return (
    <span style={{
      ...style,
      background: r.color + '22',
      color: r.color,
      border: `1px solid ${r.color}44`,
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    }}>
      {size === 'xs' ? r.abbr : r.label}
    </span>
  )
}

function Avatar({ role, size = 36, name }) {
  const r = ROLES.find(x => x.id === role) || ROLES[0]
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2) : r.abbr
  return (
    <div style={{
      width: size, height: size, borderRadius: 6,
      background: r.color + '20',
      border: `1.5px solid ${r.color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)',
      fontSize: size * 0.38,
      fontWeight: 700,
      color: r.color,
      flexShrink: 0,
      letterSpacing: '0.04em',
    }}>
      {initials}
    </div>
  )
}

function Message({ msg }) {
  const isAI = msg.sender === 'Cinesync'
  const participant = PARTICIPANTS.find(p => p.name === msg.sender)
  const role = participant?.role || msg.role || 'Location Manager'

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      padding: '14px 20px',
      background: isAI ? 'rgba(62, 207, 191, 0.04)' : 'transparent',
      borderLeft: isAI ? '2px solid var(--teal)' : '2px solid transparent',
      transition: 'background 0.2s',
    }}>
      <Avatar role={isAI ? 'ai' : role} size={36} name={isAI ? 'AI' : msg.sender} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 15,
            color: isAI ? 'var(--teal)' : 'var(--text-primary)',
            letterSpacing: '0.02em',
          }}>
            {msg.sender}
          </span>
          {isAI ? (
            <span style={{
              fontSize: 9, padding: '2px 6px',
              background: 'rgba(62,207,191,0.15)',
              color: 'var(--teal)',
              border: '1px solid rgba(62,207,191,0.3)',
              borderRadius: 3,
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              letterSpacing: '0.08em',
            }}>AI · RAG</span>
          ) : (
            <RoleBadge role={role} size="xs" />
          )}
          <span style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            marginLeft: 'auto',
          }}>
            {msg.time}
          </span>
        </div>

        {msg.imageUrl && (
          <div style={{ marginBottom: 10 }}>
            <img
              src={msg.imageUrl}
              alt="Location"
              style={{
                maxWidth: 320, maxHeight: 220,
                borderRadius: 8,
                border: '1px solid var(--border)',
                objectFit: 'cover',
              }}
            />
            <div style={{
              fontSize: 11, color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              marginTop: 4,
            }}>
              📎 location_photo.jpg
            </div>
          </div>
        )}

        {isAI ? (
          <div className="ai-content" style={{ color: 'var(--text-secondary)' }}>
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        ) : (
          <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {msg.content}
          </p>
        )}

        {isAI && msg.ragSources > 0 && (
          <div style={{
            marginTop: 10,
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            <span style={{ color: 'var(--amber)', fontSize: 10 }}>◆</span>
            {msg.ragSources} knowledge sources retrieved
          </div>
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{
      display: 'flex', gap: 12, padding: '14px 20px',
      background: 'rgba(62,207,191,0.04)',
      borderLeft: '2px solid var(--teal)',
    }}>
      <Avatar role="ai" size={36} name="AI" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 8 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--teal)',
            animation: 'pulse 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
            opacity: 0.7,
          }} />
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4, fontFamily: 'var(--font-mono)' }}>
          Cinesync analyzing...
        </span>
      </div>
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(1.3);opacity:1} }`}</style>
    </div>
  )
}

// ─── TMZ Lookup Panel ─────────────────────────────────────────────────────────
function TmzLookupPanel({ onClose }) {
  const [address, setAddress] = useState('')
  const [crewSize, setCrewSize] = useState('50')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleLookup = async () => {
    if (!address.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/tmz-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim(), crew_size: parseInt(crewSize) || 50 }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Lookup failed')
      }
      setResult(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const inside = result?.inside_tmz
  const statusColor = inside ? '#4ADE80' : '#E8416A'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: 480, maxWidth: '95vw',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-bright)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-elevated)',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
              color: 'var(--amber)', letterSpacing: '0.06em',
            }}>
              📍 TMZ ZONE LOOKUP
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              Thirty Mile Zone — Beverly Blvd &amp; La Cienega Blvd center
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 20, lineHeight: 1,
          }}>×</button>
        </div>

        {/* Input */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              LOCATION ADDRESS
            </label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
              placeholder="e.g. Griffith Observatory, Los Angeles"
              style={{
                width: '100%', padding: '9px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-bright)',
                borderRadius: 7, color: 'var(--text-primary)',
                fontSize: 13, fontFamily: 'var(--font-body)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                CREW SIZE (for budget estimate)
              </label>
              <input
                type="number"
                value={crewSize}
                onChange={e => setCrewSize(e.target.value)}
                min="1"
                style={{
                  width: '100%', padding: '9px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-bright)',
                  borderRadius: 7, color: 'var(--text-primary)',
                  fontSize: 13, fontFamily: 'var(--font-body)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              onClick={handleLookup}
              disabled={loading || !address.trim()}
              style={{
                padding: '9px 20px',
                background: loading || !address.trim() ? 'var(--bg-elevated)' : 'var(--amber)',
                color: loading || !address.trim() ? 'var(--text-muted)' : '#0A0C10',
                border: 'none', borderRadius: 7,
                fontSize: 13, fontWeight: 700,
                fontFamily: 'var(--font-display)', letterSpacing: '0.06em',
                cursor: loading || !address.trim() ? 'default' : 'pointer',
                transition: 'all 0.15s', flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? 'CHECKING...' : 'CHECK TMZ'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '14px 20px', background: 'rgba(232,65,106,0.08)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>⚠ {error}</span>
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ padding: '16px 20px' }}>
            {/* Status badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 8,
              background: inside ? 'rgba(74,222,128,0.08)' : 'rgba(232,65,106,0.08)',
              border: `1px solid ${statusColor}33`,
              marginBottom: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 8,
                background: statusColor + '20',
                border: `2px solid ${statusColor}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>
                {inside ? '✅' : '⚠️'}
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
                  color: statusColor, letterSpacing: '0.05em',
                }}>
                  {result.status_label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {result.distance_miles} mi from TMZ center · {result.miles_from_boundary} mi {inside ? 'inside' : 'outside'} boundary
                </div>
              </div>
            </div>

            {/* Location details */}
            <div style={{
              padding: '10px 14px', borderRadius: 6,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              marginBottom: 10,
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: 4 }}>RESOLVED ADDRESS</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{result.resolved_address}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                {result.latitude}, {result.longitude}
              </div>
            </div>

            {/* Budget impact */}
            <div style={{
              padding: '10px 14px', borderRadius: 6,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              marginBottom: 10,
            }}>
              <div style={{ fontSize: 10, color: 'var(--amber)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: 4 }}>💰 BUDGET IMPACT</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{result.budget_impact}</div>
            </div>

            {/* Union implications */}
            <div style={{
              padding: '10px 14px', borderRadius: 6,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--teal)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: 4 }}>⚖️ UNION IMPLICATIONS</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{result.union_implications}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sun Path Panel ───────────────────────────────────────────────────────────
function SunPathDiagram({ result }) {
  const W = 440, H = 210
  const cx = W / 2, cy = H - 10
  const R = 175

  // Parse "06:16 AM" → minutes since midnight
  const toMins = (str) => {
    if (!str) return 0
    const [time, period] = str.split(' ')
    let [h, m] = time.split(':').map(Number)
    if (period === 'PM' && h !== 12) h += 12
    if (period === 'AM' && h === 12) h = 0
    return h * 60 + m
  }

  const sunriseMins = toMins(result.sunrise)
  const sunsetMins  = toMins(result.sunset)
  const span = sunsetMins - sunriseMins

  // Map a time string to SVG coordinates on the arc
  // angle 0=east(left), 180=west(right), sun travels left→right
  const timeToPoint = (str) => {
    const mins = toMins(str)
    const t = Math.max(0, Math.min(1, (mins - sunriseMins) / span))
    const angleDeg = t * 180                          // 0° = east, 180° = west
    const angleRad = (angleDeg * Math.PI) / 180
    return {
      x: cx - R * Math.cos(Math.PI - angleRad),      // left→right
      y: cy - R * Math.sin(angleRad),
    }
  }

  // Build arc path segment between two time strings
  const arcSegment = (t1, t2) => {
    const p1 = timeToPoint(t1)
    const p2 = timeToPoint(t2)
    return `M ${p1.x} ${p1.y} A ${R} ${R} 0 0 1 ${p2.x} ${p2.y}`
  }

  const keyTimes = [
    { label: 'Sunrise', time: result.sunrise, color: '#F5A623' },
    { label: 'G.H.', time: result.golden_hour_morning_end, color: '#FCD34D' },
    { label: 'Noon', time: result.solar_noon, color: '#E4E8F0' },
    { label: 'G.H.', time: result.golden_hour_evening_start, color: '#FCD34D' },
    { label: 'Sunset', time: result.sunset, color: '#F5A623' },
  ]

  // Compute label offsets to avoid overlap — labels near the horizon get pushed outward
  const getLabelOffset = (pt) => {
    const nearLeft  = pt.x < cx * 0.5                 // left quarter → push label left
    const nearRight = pt.x > cx + cx * 0.5            // right quarter → push label right
    const nearTop   = pt.y < cy * 0.35                // near zenith → push label up more
    return {
      dx: nearLeft ? -4 : nearRight ? 4 : 0,
      dy: nearTop ? -18 : -12,
      anchor: nearLeft ? 'end' : nearRight ? 'start' : 'middle',
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Sky gradient background */}
      <defs>
        <radialGradient id="skygrad" cx="50%" cy="100%" r="60%">
          <stop offset="0%" stopColor="#1C2230" />
          <stop offset="100%" stopColor="#0D1117" />
        </radialGradient>
        <clipPath id="skyClip">
          <rect x="0" y="0" width={W} height={cy} />
        </clipPath>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="#0D1117" rx="8" />
      <ellipse cx={cx} cy={cy} rx={R + 20} ry={R * 0.4} fill="#0A1628" />

      {/* Horizon line */}
      <line x1={20} y1={cy} x2={W - 20} y2={cy} stroke="#252D3D" strokeWidth="1.5" />

      {/* Full arc (daylight track) */}
      <path
        d={`M ${timeToPoint(result.sunrise).x} ${timeToPoint(result.sunrise).y} A ${R} ${R} 0 0 1 ${timeToPoint(result.sunset).x} ${timeToPoint(result.sunset).y}`}
        fill="none" stroke="#1E2A3A" strokeWidth="6" strokeLinecap="round"
      />

      {/* Morning golden hour arc */}
      <path
        d={arcSegment(result.golden_hour_morning_start, result.golden_hour_morning_end)}
        fill="none" stroke="#F5A623" strokeWidth="6" strokeLinecap="round" opacity="0.85"
      />

      {/* Evening golden hour arc */}
      <path
        d={arcSegment(result.golden_hour_evening_start, result.golden_hour_evening_end)}
        fill="none" stroke="#F5A623" strokeWidth="6" strokeLinecap="round" opacity="0.85"
      />

      {/* Blue hour arc */}
      <path
        d={arcSegment(result.sunset, result.dusk)}
        fill="none" stroke="#3ECFBF" strokeWidth="4" strokeLinecap="round" opacity="0.6"
      />

      {/* Key time markers */}
      {keyTimes.map(({ label, time, color }) => {
        const pt = timeToPoint(time)
        const { dx, dy, anchor } = getLabelOffset(pt)
        return (
          <g key={label + time}>
            <circle cx={pt.x} cy={pt.y} r={5} fill={color} />
            <text
              x={pt.x + dx}
              y={pt.y + dy}
              textAnchor={anchor}
              fontSize="9"
              fill={color}
              fontFamily="monospace"
            >{time}</text>
          </g>
        )
      })}

      {/* Sun icon at solar noon */}
      {(() => {
        const pt = timeToPoint(result.solar_noon)
        return (
          <g>
            <circle cx={pt.x} cy={pt.y} r={8} fill="#FCD34D" opacity="0.9" />
            <circle cx={pt.x} cy={pt.y} r={12} fill="none" stroke="#FCD34D" strokeWidth="1.5" opacity="0.4" />
          </g>
        )
      })()}

      {/* Direction labels */}
      <text x={28} y={cy - 8} fontSize="10" fill="#4A5568" fontFamily="monospace">EAST</text>
      <text x={W - 48} y={cy - 8} fontSize="10" fill="#4A5568" fontFamily="monospace">WEST</text>

      {/* Legend */}
      <rect x={12} y={12} width={10} height={4} rx="2" fill="#F5A623" />
      <text x={26} y={19} fontSize="9" fill="#8A95A8" fontFamily="monospace">Golden Hour</text>
      <rect x={110} y={12} width={10} height={4} rx="2" fill="#3ECFBF" />
      <text x={124} y={19} fontSize="9" fill="#8A95A8" fontFamily="monospace">Blue Hour</text>
    </svg>
  )
}

function SunPathPanel({ onClose }) {
  const [address, setAddress] = useState('')
  const [shootDate, setShootDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleLookup = async () => {
    if (!address.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/sun-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim(), shoot_date: shootDate }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Lookup failed')
      }
      setResult(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const windowColors = { golden: '#F5A623', neutral: '#8A95A8', blue: '#3ECFBF' }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflowY: 'auto', padding: '20px 0',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: 500, maxWidth: '95vw',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-bright)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        margin: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-elevated)',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
              color: '#FCD34D', letterSpacing: '0.06em',
            }}>
              ☀️ SUN PATH ANALYZER
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              Golden hour, blue hour &amp; shooting windows
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 20, lineHeight: 1,
          }}>×</button>
        </div>

        {/* Inputs */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              LOCATION ADDRESS
            </label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
              placeholder="e.g. Griffith Observatory, Los Angeles"
              style={{
                width: '100%', padding: '9px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-bright)',
                borderRadius: 7, color: 'var(--text-primary)',
                fontSize: 13, fontFamily: 'var(--font-body)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                SHOOT DATE
              </label>
              <input
                type="date"
                value={shootDate}
                onChange={e => setShootDate(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-bright)',
                  borderRadius: 7, color: 'var(--text-primary)',
                  fontSize: 13, fontFamily: 'var(--font-body)',
                  outline: 'none', boxSizing: 'border-box',
                  colorScheme: 'dark',
                }}
              />
            </div>
            <button
              onClick={handleLookup}
              disabled={loading || !address.trim()}
              style={{
                padding: '9px 20px',
                background: loading || !address.trim() ? 'var(--bg-elevated)' : '#FCD34D',
                color: loading || !address.trim() ? 'var(--text-muted)' : '#0A0C10',
                border: 'none', borderRadius: 7,
                fontSize: 13, fontWeight: 700,
                fontFamily: 'var(--font-display)', letterSpacing: '0.06em',
                cursor: loading || !address.trim() ? 'default' : 'pointer',
                transition: 'all 0.15s', flexShrink: 0, whiteSpace: 'nowrap',
              }}
            >
              {loading ? 'CALCULATING...' : 'ANALYZE'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '14px 20px', background: 'rgba(232,65,106,0.08)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: '#E8416A', fontFamily: 'var(--font-mono)' }}>⚠ {error}</span>
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ padding: '16px 20px' }}>

            {/* Location + date summary */}
            <div style={{
              padding: '8px 14px', borderRadius: 6,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{result.resolved_address.split(',').slice(0, 2).join(',')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {result.total_daylight_hours}h daylight
              </div>
            </div>

            {/* SVG Diagram */}
            <div style={{
              borderRadius: 8, overflow: 'hidden',
              border: '1px solid var(--border)',
              marginBottom: 14,
            }}>
              <SunPathDiagram result={result} />
            </div>

            {/* Key times row */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
              marginBottom: 14,
            }}>
              {[
                { label: 'SUNRISE', value: result.sunrise, color: '#F5A623' },
                { label: 'SOLAR NOON', value: result.solar_noon, color: '#E4E8F0' },
                { label: 'SUNSET', value: result.sunset, color: '#F5A623' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  padding: '8px 10px', borderRadius: 6,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Shooting windows */}
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: 8 }}>
              SHOOTING WINDOWS
            </div>
            {result.shooting_windows.map((w, i) => (
              <div key={i} style={{
                padding: '10px 14px', borderRadius: 6,
                background: 'var(--bg-elevated)',
                border: `1px solid ${windowColors[w.type]}33`,
                marginBottom: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: windowColors[w.type], fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
                    {w.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {w.start} – {w.end}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#60A5FA', marginBottom: 3, fontFamily: 'var(--font-mono)' }}>{w.direction}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{w.notes}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Initial demo messages ────────────────────────────────────────────────────
const now = new Date()
const fmt = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

const INITIAL_MESSAGES = [
  {
    id: 1,
    sender: 'Maya Chen',
    role: 'Location Manager',
    content: "Team — I found a great potential location in the Arts District. Uploading now for AI review.",
    time: fmt(new Date(now - 8 * 60000)),
  },
  {
    id: 2,
    sender: 'Cinesync',
    role: 'ai',
    content: `📍 **LOCATION ASSESSMENT** — Arts District, Downtown LA\nStatus: **INSIDE TMZ** ✅ No travel pay triggered.\n\n⏱️ **PERMIT REQUIREMENTS**\nFor a 60-person crew on a public street: **Category 3 permit**. Lead time: 5–10 business days. Estimated base fee: ~$2,500 + location fee $1,200–3,500/day.\n\n💰 **BUDGET IMPACT**\nTMZ compliance confirmed — no hotel/per diem costs. LAPD film detail required for street work: ~$45/hr per officer.\n\n⚠️ **FLAGS & RISKS**\nIndustrial/residential mixed zone — noise ordinance hours apply: **7AM–10PM weekdays**. Truck access: verify alley clearance (14ft minimum) before committing.\n\n🎬 **CREATIVE NOTES**\nArts District brick facades excellent for gritty urban aesthetic. East-facing buildings get best light 7–11AM. West-facing buildings golden hour 4–7PM.\n\n🚛 **LOGISTICS**\nSeveral metered lots nearby. Recommend basecamp on Industrial St for 10–15 trucks. Book 2 weeks ahead.`,
    time: fmt(new Date(now - 7 * 60000)),
    ragSources: 4,
  },
  {
    id: 3,
    sender: 'James Park',
    role: 'Director',
    content: "Good. What's the sunset timing for a west-facing exterior? We need at least 45 minutes of magic hour.",
    time: fmt(new Date(now - 5 * 60000)),
  },
  {
    id: 4,
    sender: 'Cinesync',
    role: 'ai',
    content: `🎬 **NATURAL LIGHT — West-Facing Exterior**\n\nFor current season in LA:\n- **Golden hour begins:** ~5:45 PM\n- **Magic hour window:** approximately 5:45–7:00 PM (75 min total)\n- **Shadow intrusion risk:** Neighboring buildings typically create shadow creep after 6:30 PM in dense urban areas\n\n**Recommendation:** Schedule west-facing exteriors with camera rolling by 5:30 PM to capture the full 45+ minutes before shadow encroachment. Include a cloud/weather contingency day in the schedule.\n\n⚠️ Noise ordinance in residential-adjacent zones: you must wrap by **10:00 PM** on weekdays.`,
    time: fmt(new Date(now - 4 * 60000)),
    ragSources: 2,
  },
  {
    id: 5,
    sender: 'Sofia R.',
    role: 'Producer',
    content: "Great. Can we fit 3 semi trucks on the street or do we need a separate basecamp location?",
    time: fmt(new Date(now - 2 * 60000)),
  },
]

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [selectedRole, setSelectedRole] = useState('Location Manager')
  const [pendingImage, setPendingImage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [backendStatus, setBackendStatus] = useState('checking')
  const [history, setHistory] = useState([])
  const [showTmzLookup, setShowTmzLookup] = useState(false)
  const [showSunPath, setShowSunPath] = useState(false)

  const fileInputRef = useRef(null)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    fetch('/health')
      .then(r => r.json())
      .then(d => setBackendStatus(d.status === 'ok' ? 'ok' : 'error'))
      .catch(() => setBackendStatus('error'))
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleImageUpload = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      const base64 = dataUrl.split(',')[1]
      setPendingImage({ base64, url: dataUrl, type: file.type })
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    handleImageUpload(file)
  }, [handleImageUpload])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text && !pendingImage) return

    const participant = PARTICIPANTS.find(p => p.role === selectedRole)
    const senderName = participant?.name || selectedRole

    const userMsg = {
      id: Date.now(),
      sender: senderName,
      role: selectedRole,
      content: text || '📎 Uploaded location photo for analysis.',
      imageUrl: pendingImage?.url || null,
      time: fmt(new Date()),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setPendingImage(null)
    setIsLoading(true)

    const newHistory = [
      ...history,
      { role: 'user', content: text || 'Please analyze this location photo.' }
    ]

    try {
      const body = {
        message: text || 'Please analyze this uploaded location photo.',
        user_role: selectedRole,
        conversation_history: history,
        ...(pendingImage && {
          image_base64: pendingImage.base64,
          image_media_type: pendingImage.type,
        }),
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'Cinesync',
        role: 'ai',
        content: data.response,
        time: fmt(new Date()),
        ragSources: data.rag_sources_used,
      }

      setMessages(prev => [...prev, aiMsg])
      setHistory([
        ...newHistory,
        { role: 'assistant', content: data.response }
      ])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'Cinesync',
        role: 'ai',
        content: `⚠️ **Connection error.** Could not reach backend: ${err.message}\n\nMake sure the FastAPI server is running on port 8000 and your OPENAI_API_KEY is set.`,
        time: fmt(new Date()),
        ragSources: 0,
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const currentRole = ROLES.find(r => r.id === selectedRole)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'var(--font-body)' }}>

      {showTmzLookup && <TmzLookupPanel onClose={() => setShowTmzLookup(false)} />}
      {showSunPath && <SunPathPanel onClose={() => setShowSunPath(false)} />}

      {/* ── Left Sidebar ─────────────────────────────── */}
      <div style={{
        width: 240, flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
            letterSpacing: '0.06em', color: 'var(--amber)',
          }}>
            CINESYNC<span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>AI</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            Film Location Intelligence
          </div>
        </div>

        {/* Backend status */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: backendStatus === 'ok' ? '#4ADE80' : backendStatus === 'error' ? 'var(--red)' : 'var(--amber)',
            }} />
            <span style={{ color: 'var(--text-muted)' }}>
              {backendStatus === 'ok' ? 'RAG Engine Online' : backendStatus === 'error' ? 'Backend Offline' : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Channel */}
        <div style={{ padding: '12px 16px 8px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 8 }}>
            CHANNEL
          </div>
          <div style={{
            padding: '8px 10px', borderRadius: 6,
            background: 'var(--amber-glow)',
            border: '1px solid rgba(245,166,35,0.25)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: 'var(--amber)', fontSize: 13 }}>🎬</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>location-scout</span>
          </div>
        </div>

        {/* ── TMZ Lookup Tool ── */}
        <div style={{ padding: '8px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 8 }}>
            TOOLS
          </div>
          <button
            onClick={() => setShowTmzLookup(true)}
            style={{
              width: '100%',
              padding: '9px 12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-bright)',
              borderRadius: 7,
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer',
              transition: 'all 0.15s',
              textAlign: 'left',
              marginBottom: 8,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(245,166,35,0.5)'
              e.currentTarget.style.background = 'var(--amber-glow)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-bright)'
              e.currentTarget.style.background = 'var(--bg-elevated)'
            }}
          >
            <span style={{ fontSize: 15 }}>📍</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
                TMZ LOOKUP
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Check any address
              </div>
            </div>
          </button>

          <button
            onClick={() => setShowSunPath(true)}
            style={{
              width: '100%',
              padding: '9px 12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-bright)',
              borderRadius: 7,
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer',
              transition: 'all 0.15s',
              textAlign: 'left',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(252,211,77,0.5)'
              e.currentTarget.style.background = 'rgba(252,211,77,0.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-bright)'
              e.currentTarget.style.background = 'var(--bg-elevated)'
            }}
          >
            <span style={{ fontSize: 15 }}>☀️</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#FCD34D', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
                SUN PATH
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Golden hour & shoot windows
              </div>
            </div>
          </button>
        </div>

        {/* Participants */}
        <div style={{ padding: '12px 16px', flex: 1, overflow: 'auto' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 10 }}>
            PARTICIPANTS — {PARTICIPANTS.length}
          </div>
          {PARTICIPANTS.map(p => {
            const r = ROLES.find(x => x.id === p.role) || ROLES[0]
            return (
              <div key={p.name} style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
              }}>
                <div style={{ position: 'relative' }}>
                  <Avatar role={p.role} size={30} name={p.name} />
                  <div style={{
                    position: 'absolute', bottom: -1, right: -1,
                    width: 8, height: 8, borderRadius: '50%',
                    background: p.online ? '#4ADE80' : '#374151',
                    border: '1.5px solid var(--bg-surface)',
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, color: r.color, opacity: 0.8 }}>{p.role.replace('Assistant Director (AD)', 'Asst. Director')}</div>
                </div>
              </div>
            )
          })}

          {/* Cinesync bot */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginTop: 6,
            paddingTop: 10, borderTop: '1px solid var(--border)',
          }}>
            <div style={{ position: 'relative' }}>
              <Avatar role="ai" size={30} name="AI" />
              <div style={{
                position: 'absolute', bottom: -1, right: -1,
                width: 8, height: 8, borderRadius: '50%',
                background: '#4ADE80',
                border: '1.5px solid var(--bg-surface)',
              }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--teal)', lineHeight: 1.2 }}>Cinesync</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>AI Expert</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Chat Area ────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}># location-scout</span>
              <span style={{
                fontSize: 10, padding: '2px 7px',
                background: 'rgba(245,166,35,0.12)', color: 'var(--amber)',
                border: '1px solid rgba(245,166,35,0.3)', borderRadius: 3,
                fontFamily: 'var(--font-mono)',
              }}>LIVE</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Real-time AI-assisted location compliance &amp; scouting
            </div>
          </div>

          {/* Role selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Speaking as:</span>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                border: `1px solid ${currentRole?.color || 'var(--border)'}55`,
                color: currentRole?.color || 'var(--text-primary)',
                padding: '5px 10px', borderRadius: 6, fontSize: 13,
                fontFamily: 'var(--font-display)', fontWeight: 600,
                cursor: 'pointer', outline: 'none',
                letterSpacing: '0.04em',
              }}
            >
              {ROLES.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflow: 'auto',
          background: 'var(--bg-base)',
        }}>
          {messages.map(msg => <Message key={msg.id} msg={msg} />)}
          {isLoading && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>

        {/* Suggested Prompts */}
        {messages.length <= 5 && (
          <div style={{
            padding: '8px 20px',
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border)',
            display: 'flex', gap: 8, flexWrap: 'wrap',
          }}>
            {SUGGESTED_PROMPTS.map(p => (
              <button key={p} onClick={() => { setInput(p); inputRef.current?.focus() }} style={{
                padding: '5px 11px', borderRadius: 20,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-bright)',
                color: 'var(--text-secondary)', fontSize: 12,
                cursor: 'pointer', transition: 'all 0.15s',
                fontFamily: 'var(--font-body)',
              }}
                onMouseEnter={e => { e.target.style.borderColor = 'var(--amber)'; e.target.style.color = 'var(--amber)' }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--border-bright)'; e.target.style.color = 'var(--text-secondary)' }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div style={{
          padding: '12px 20px 16px',
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border)',
        }}>
          {pendingImage && (
            <div style={{
              marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 8,
              background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)',
            }}>
              <img src={pendingImage.url} alt="preview" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4 }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                Location photo ready for AI analysis
              </span>
              <button onClick={() => setPendingImage(null)} style={{
                marginLeft: 'auto', background: 'none', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16,
              }}>×</button>
            </div>
          )}

          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            style={{
              display: 'flex', gap: 10, alignItems: 'flex-end',
              padding: '10px 12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-bright)',
              borderRadius: 10,
              transition: 'border-color 0.2s',
            }}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Upload location photo"
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer',
                fontSize: 18, padding: '2px 4px',
                transition: 'color 0.15s', flexShrink: 0,
              }}
              onMouseEnter={e => e.target.style.color = 'var(--amber)'}
              onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
            >
              📎
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => handleImageUpload(e.target.files[0])}
            />

            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message as ${ROLES.find(r => r.id === selectedRole)?.label}... (drop image or 📎 to upload)`}
              rows={1}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text-primary)', fontSize: 14,
                fontFamily: 'var(--font-body)',
                resize: 'none', lineHeight: 1.5,
                maxHeight: 120, overflow: 'auto',
              }}
            />

            <button
              onClick={sendMessage}
              disabled={isLoading || (!input.trim() && !pendingImage)}
              style={{
                background: isLoading || (!input.trim() && !pendingImage) ? 'var(--bg-elevated)' : 'var(--amber)',
                color: isLoading || (!input.trim() && !pendingImage) ? 'var(--text-muted)' : '#0A0C10',
                border: 'none', borderRadius: 7,
                padding: '8px 16px', fontSize: 13, fontWeight: 700,
                fontFamily: 'var(--font-display)', letterSpacing: '0.06em',
                cursor: isLoading || (!input.trim() && !pendingImage) ? 'default' : 'pointer',
                transition: 'all 0.15s', flexShrink: 0,
              }}
            >
              {isLoading ? '...' : 'SEND'}
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            Enter to send · Shift+Enter for new line · Drop images directly into chat
          </div>
        </div>
      </div>
    </div>
  )
}