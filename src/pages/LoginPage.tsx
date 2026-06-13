import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { UserRole } from '../types'
import { cn } from '../lib/utils'

// ── API base URL ─────────────────────────────────────────────
// In dev Vite proxies /api → FastAPI. In prod set VITE_API_URL in .env
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface RoleCard {
  key: UserRole
  label: string
  desc: string
  icon: string
  defaultPage: string
  iconBg: string
}

const ROLE_CARDS: RoleCard[] = [
  {
    key: 'analyst',
    label: 'SOC Analyst',
    desc: 'Triage alerts, investigate model outputs, escalate incidents',
    icon: '🔍',
    defaultPage: '/alerts',
    iconBg: 'rgba(59,130,246,0.15)',
  },
  {
    key: 'engineer',
    label: 'Security Engineer',
    desc: 'Monitor SIEM ingestion, inspect model pipeline, validate detections',
    icon: '⚙',
    defaultPage: '/pipeline',
    iconBg: 'rgba(16,163,74,0.15)',
  },
  {
    key: 'grc',
    label: 'CISO / GRC',
    desc: 'Review business impact, risk posture, and escalated alerts',
    icon: '◈',
    defaultPage: '/dashboard',
    iconBg: 'rgba(124,58,237,0.15)',
  },
]

type Step = 'role' | 'credentials'

export default function LoginPage() {
  const [step, setStep]         = useState<Step>('role')
  const [selected, setSelected] = useState<UserRole | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const { setRole } = useApp()
  const navigate    = useNavigate()

  // Step 1 → Step 2
  const handleRoleNext = () => {
    if (!selected) return
    setError('')
    setUsername('')
    setPassword('')
    setStep('credentials')
  }

  // Step 2 → back
  const handleBack = () => {
    setStep('role')
    setError('')
  }

  // Final sign-in — calls FastAPI
  const handleSignIn = async () => {
    if (!selected) return
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password,
          role: selected,
        }),
      })

      if (res.ok) {
        const data = await res.json()

        // Store JWT in sessionStorage so other pages can use it
        sessionStorage.setItem('raid_token', data.access_token)
        sessionStorage.setItem('raid_user',  JSON.stringify(data.user))

        // Set role in app context and navigate
        setRole(selected)
        const card = ROLE_CARDS.find((c) => c.key === selected)
        navigate(card?.defaultPage ?? '/dashboard')
      } else {
        // FastAPI returns { detail: "..." } on 401/422
        const err = await res.json().catch(() => ({}))
        setError(err.detail ?? 'Invalid username, password, or role.')
        setLoading(false)
      }
    } catch {
      // Network error — FastAPI not running
      setError('Cannot reach the server. Make sure the FastAPI backend is running on port 8000.')
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleSignIn()
  }

  const selectedCard = ROLE_CARDS.find((c) => c.key === selected)

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background: 'linear-gradient(145deg, #0e1726 0%, #1c2d45 60%, #0e1726 100%)',
      }}
    >
      <div className="w-full max-w-[680px]">

        {/* Brand */}
        <div className="text-center mb-10">
          <div
            className="w-14 h-14 bg-[#3b82f6] rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold"
            style={{ boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}
          >
            R
          </div>
          <h1 className="text-[28px] font-bold text-white tracking-tight">RAID-SecOps</h1>
          <p className="text-[12px] text-white/40 mt-1.5">
            Role-Aware AI Decision Support System
          </p>
        </div>

        {/* ── STEP 1: Role Selection ── */}
        {step === 'role' && (
          <>
            <div className="flex items-center justify-center gap-2 mb-7">
              <div className="flex items-center gap-1.5 text-[11px] text-blue-400 font-medium">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                Select Role
              </div>
              <div className="w-8 h-px bg-white/15" />
              <div className="flex items-center gap-1.5 text-[11px] text-white/30 font-medium">
                <span className="w-5 h-5 rounded-full border border-white/20 text-white/30 text-[10px] font-bold flex items-center justify-center">2</span>
                Sign In
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6 max-sm:grid-cols-1">
              {ROLE_CARDS.map((card) => (
                <button
                  key={card.key}
                  onClick={() => setSelected(card.key)}
                  className={cn(
                    'text-left p-5 rounded-2xl border transition-all',
                    selected === card.key
                      ? 'border-[#3b82f6] bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.4)]'
                      : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]'
                  )}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px] mb-3"
                    style={{ background: card.iconBg }}
                  >
                    {card.icon}
                  </div>
                  <div className="text-[13px] font-bold text-white mb-1.5">{card.label}</div>
                  <div className={cn('text-[11px] leading-relaxed', selected === card.key ? 'text-blue-300/70' : 'text-white/40')}>
                    {card.desc}
                  </div>
                </button>
              ))}
            </div>

            <button
              disabled={!selected}
              onClick={handleRoleNext}
              className="w-full py-3.5 bg-[#3b82f6] text-white text-[13px] font-bold rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#2563eb]"
              style={{ boxShadow: selected ? '0 4px 14px rgba(59,130,246,0.35)' : 'none' }}
            >
              Continue →
            </button>
          </>
        )}

        {/* ── STEP 2: Credentials ── */}
        {step === 'credentials' && selectedCard && (
          <>
            <div className="flex items-center justify-center gap-2 mb-7">
              <div className="flex items-center gap-1.5 text-[11px] text-white/35 font-medium">
                <span className="w-5 h-5 rounded-full bg-white/15 text-white/40 text-[10px] font-bold flex items-center justify-center">✓</span>
                Select Role
              </div>
              <div className="w-8 h-px bg-white/15" />
              <div className="flex items-center gap-1.5 text-[11px] text-blue-400 font-medium">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                Sign In
              </div>
            </div>

            {/* Role summary pill */}
            <div className="flex items-center gap-3 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 mb-5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px] shrink-0"
                style={{ background: selectedCard.iconBg }}
              >
                {selectedCard.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-white">{selectedCard.label}</div>
                <div className="text-[10px] text-white/35 truncate">{selectedCard.desc}</div>
              </div>
              <button onClick={handleBack} className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors shrink-0 font-medium">
                Change
              </button>
            </div>

            {/* Form */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 mb-4">
              <h2 className="text-[13px] font-semibold text-white mb-5">
                Sign in as {selectedCard.label}
              </h2>

              {/* Username */}
              <div className="mb-4">
                <label className="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError('') }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your username"
                  className="w-full bg-white/[0.06] border border-white/15 rounded-lg px-3.5 py-2.5 text-[12px] text-white placeholder-white/20 outline-none focus:border-blue-400/60 focus:bg-white/[0.08] transition-all"
                />
              </div>

              {/* Password */}
              <div className="mb-5">
                <label className="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError('') }}
                    onKeyDown={handleKeyDown}
                    placeholder="••••••••"
                    className="w-full bg-white/[0.06] border border-white/15 rounded-lg px-3.5 py-2.5 pr-14 text-[12px] text-white placeholder-white/20 outline-none focus:border-blue-400/60 focus:bg-white/[0.08] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-white/30 hover:text-white/60 transition-colors font-medium"
                    tabIndex={-1}
                  >
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-lg px-3.5 py-2.5 mb-4">
                  <span className="text-red-400 text-[13px] leading-none shrink-0">⚠</span>
                  <span className="text-[12px] text-red-300">{error}</span>
                </div>
              )}

              {/* Sign in button */}
              <button
                onClick={() => void handleSignIn()}
                disabled={loading || !username.trim() || !password.trim()}
                className="w-full py-3 bg-[#3b82f6] text-white text-[13px] font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2563eb]"
                style={{ boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Signing in…
                  </span>
                ) : (
                  'Sign In →'
                )}
              </button>
            </div>

            {/* Server status note */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3">
              <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1">
                Backend required
              </p>
              <p className="text-[11px] text-white/25 leading-relaxed">
                Make sure the FastAPI server is running on <span className="font-mono text-white/40">localhost:8000</span> and your PostgreSQL database is connected.
              </p>
            </div>
          </>
        )}

        <p className="text-center text-[10px] text-white/18 mt-6">
          developed by Kelvin, Raghu, Aditya, Ruvimbo, Francina, Bipin
        </p>
      </div>
    </div>
  )
}
