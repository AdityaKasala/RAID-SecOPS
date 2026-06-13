import { useState, useRef, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { useNavigate } from 'react-router-dom'
import { fetchAlerts } from '../../lib/api'
import type { AlertDetail, AlertRow, UserRole } from '../../lib/api'
import { pct, roleLabel } from '../../lib/utils'

interface Message {
  who:  'ai' | 'user'
  text: string
}

const SUGGESTIONS = [
  'Summarize this alert',
  'Explain the MITRE technique',
  'Why was this flagged for human review?',
  'What should the SOC Analyst do next?',
  'What should the Security Engineer validate?',
  'What is the business impact for CISO / GRC?',
  'What does a negative Isolation Forest score mean?',
  'Show me all open ATTACK alerts',
]

// ── Generate response based on real alert data ────────────────
function generateResponse(
  query:         string,
  alert:         AlertDetail | null,
  role:          UserRole | null,
  openAttacks:   AlertRow[]
): string {
  const q = query.toLowerCase().trim()

  // ── Summarize this alert ──────────────────────────────────
  if (q.includes('summarize') || q.includes('summarise')) {
    if (!alert) return 'No alert is currently loaded. Open an alert from the Alerts Queue first, then come back and ask me to summarise it.'
    return [
      `Alert Summary — ${alert.sampleId}`,
      ``,
      `Status:         ${alert.status}`,
      `Confidence:     ${pct(alert.confidence)}`,
      `Attack Type:    ${alert.attackType}`,
      `MITRE:          ${alert.mitreTechnique}`,
      `Source SIEM:    ${alert.sourceSiem}`,
      `Assigned Role:  ${roleLabel(alert.assignedRole)}`,
      `Investigation:  ${alert.investigationStatus}`,
      `Defer to Human: ${alert.deferToHuman ? 'Yes — human review required' : 'No — pipeline confidence sufficient'}`,
      ``,
      `ML Pipeline:`,
      `  Isolation Forest Score:  ${alert.modelScores.isolationForestScore?.toFixed(3) ?? '—'}  ${(alert.modelScores.isolationForestScore ?? 0) < 0 ? '(Anomalous)' : '(Normal)'}`,
      `  Random Forest Confidence: ${pct(alert.modelScores.randomForestConfidence ?? 0)}`,
      `  Models Agree:            ${alert.modelScores.modelsAgree ? 'Yes' : 'No — review recommended'}`,
      `  Final Prediction:        ${alert.modelScores.finalPrediction ?? '—'}`,
    ].join('\n')
  }

  // ── MITRE technique ───────────────────────────────────────
  if (q.includes('mitre')) {
    if (!alert || alert.mitreTechnique === '—') return 'No alert loaded or no MITRE technique assigned. Open an alert first.'
    const explanations: Record<string, string> = {
      'T1021': 'Remote Services — adversaries use legitimate remote services (SMB, RDP, SSH, WinRM) to move laterally. Key indicators: NTLM logon type 3 from unexpected hosts, SMB connections to domain controllers.',
      'T1003': 'OS Credential Dumping — adversaries extract credentials from LSASS memory, SAM database, or NTDS. Key indicator: Sysmon Event ID 10 (process access to lsass.exe).',
      'T1048': 'Exfiltration Over Alternative Protocol — data moved out via DNS tunnelling, ICMP, or other non-standard channels. Key indicator: high-volume DNS queries to external domains.',
      'T1068': 'Exploitation for Privilege Escalation — kernel or application exploits used to gain SYSTEM or root. Key indicator: new service installs by non-admin users, CVE matches.',
      'T1190': 'Exploit Public-Facing Application — adversaries exploit vulnerabilities in internet-facing apps. Review web application logs and WAF alerts.',
      'T1498': 'Network Denial of Service — flooding attacks to disrupt availability. Monitor for abnormal traffic volume and connection rates.',
      'T1595': 'Active Scanning — adversaries probe the network for open ports, services, and vulnerabilities before attacking.',
      'T1078': 'Valid Accounts — use of legitimate credentials to blend in. Often follows credential dumping.',
      'T1059': 'Command and Scripting Interpreter — execution via PowerShell, cmd, bash, or other interpreters.',
      'T1543': 'Create or Modify System Process — persistence via services or launch daemons.',
      'T1210': 'Exploitation of Remote Services — targeting vulnerabilities in SMB, RDP, or other remote service protocols.',
    }
    const code = alert.mitreTechnique.split('–')[0].trim()
    const explanation = Object.entries(explanations).find(([k]) => code.includes(k))
    return explanation
      ? `MITRE ${alert.mitreTechnique}\n\n${explanation[1]}\n\nIn RAID-SecOps, this mapping was assigned by the Random Forest classifier after the Isolation Forest flagged the event as anomalous (IF score: ${alert.modelScores.isolationForestScore?.toFixed(3) ?? '—'}).`
      : `MITRE ${alert.mitreTechnique}\n\nThis technique was mapped by the Random Forest classifier based on features extracted from the raw SIEM event. Check the MITRE ATT&CK framework at attack.mitre.org for full details.`
  }

  // ── Why flagged for human review ─────────────────────────
  if (q.includes('flagged') || q.includes('human review')) {
    if (!alert) return 'No alert loaded. Open an alert first.'
    if (!alert.deferToHuman) {
      return `Alert ${alert.sampleId} was NOT flagged for human review.\n\nThe pipeline had sufficient confidence (${pct(alert.confidence)}) to classify this event automatically. Both models ${alert.modelScores.modelsAgree ? 'agreed' : 'disagreed'} on the outcome.\n\nAny analyst can still review and take manual action.`
    }
    const reasons = []
    if (alert.confidence < 0.7) reasons.push(`• Model confidence is low (${pct(alert.confidence)}) — below the 70% threshold`)
    if (!alert.modelScores.modelsAgree) reasons.push('• Isolation Forest and Random Forest disagree on this event')
    if (reasons.length === 0) reasons.push('• Alert confidence or attack type triggered the human-in-the-loop rule')
    return [
      `Alert ${alert.sampleId} was flagged deferToHuman = true.`,
      ``,
      `Reasons:`,
      ...reasons,
      ``,
      `This means the pipeline is not confident enough for automated remediation. A human analyst must review and decide the action before any response is taken.`,
      ``,
      `Assigned to: ${roleLabel(alert.assignedRole)}`,
      `Current status: ${alert.investigationStatus}`,
    ].join('\n')
  }

  // ── SOC Analyst recommendation ────────────────────────────
  if (q.includes('soc analyst') || q.includes('analyst')) {
    if (!alert) return 'No alert loaded. Open an alert first.'
    return `SOC Analyst Recommendation — ${alert.sampleId}:\n\n${alert.recommendations.analyst ?? 'No recommendation available.'}`
  }

  // ── Security Engineer recommendation ─────────────────────
  if (q.includes('security engineer') || q.includes('engineer')) {
    if (!alert) return 'No alert loaded. Open an alert first.'
    return `Security Engineer Recommendation — ${alert.sampleId}:\n\n${alert.recommendations.engineer ?? 'No recommendation available.'}`
  }

  // ── CISO / GRC recommendation ─────────────────────────────
  if (q.includes('ciso') || q.includes('grc') || q.includes('business impact')) {
    if (!alert) return 'No alert loaded. Open an alert first.'
    return `CISO / GRC Recommendation — ${alert.sampleId}:\n\n${alert.recommendations.grc ?? 'No recommendation available.'}`
  }

  // ── Isolation Forest explanation ──────────────────────────
  if (q.includes('isolation forest') || q.includes('negative')) {
    const specific = alert
      ? `\n\nFor ${alert.sampleId}: IF score = ${alert.modelScores.isolationForestScore?.toFixed(3) ?? '—'} → ${(alert.modelScores.isolationForestScore ?? 0) < 0 ? 'Anomalous — deviates from normal traffic baseline.' : 'Normal — within the expected baseline distribution.'}`
      : ''
    return `Isolation Forest scores range from −1 to +1.\n\n• Negative score → sample was isolated quickly → ANOMALOUS relative to training baseline\n• Positive score → sample blends with normal distribution → BENIGN\n\nIn RAID-SecOps:\n• Score < 0     → anomaly flag set → fed to Random Forest as a weighted feature\n• Score < −0.2  → high-priority anomaly\n• Score > 0     → within normal baseline${specific}`
  }

  // ── Show open ATTACK alerts ───────────────────────────────
  if (q.includes('open attack') || q.includes('show') || q.includes('all attack')) {
    if (openAttacks.length === 0) return 'No open ATTACK alerts found in the database.'
    return [
      `Open ATTACK alerts (${openAttacks.length} total):`,
      ``,
      ...openAttacks.map((a) =>
        `• ${a.sampleId} — ${a.attackType} (${pct(a.confidence)}) — ${a.investigationStatus} — Defer: ${a.deferToHuman ? 'Yes' : 'No'} — Assigned: ${roleLabel(a.assignedRole)}`
      ),
    ].join('\n')
  }

  // ── Your role recommendation ──────────────────────────────
  if (role && alert && (q.includes('my recommendation') || q.includes('what should i'))) {
    const rec = alert.recommendations[role]
    return rec
      ? `Your recommendation as ${roleLabel(role)} for ${alert.sampleId}:\n\n${rec}`
      : `No specific recommendation available for your role on this alert.`
  }

  // ── Default fallback ──────────────────────────────────────
  return `I understand you're asking about: "${query}"\n\nIn a live deployment, UB would query the full RAID-SecOps knowledge base and ML pipeline context to answer this.\n\nFor now, try one of the suggested prompts — they are fully connected to real alert data from the database.`
}

// ── Main UBChat component ─────────────────────────────────────
export function UBChat() {
  const { selectedAlert, role } = useApp()
  const navigate                = useNavigate()
  const alert = selectedAlert as AlertDetail | null

  const [messages, setMessages] = useState<Message[]>([
    {
      who: 'ai',
      text: "Hello, I'm UB — the RAID-SecOps decision support assistant.\n\nI can help you understand alert model outputs, MITRE techniques, pipeline behaviour, and role-based recommendations.\n\nTip: Open an alert from the Alerts Queue first to load its context, then ask me questions about it.",
    },
  ])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [openAttacks, setOpenAttacks] = useState<AlertRow[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  // Pre-load open ATTACK alerts for the summary question
  useEffect(() => {
    fetchAlerts({ status: 'ATTACK' })
      .then((data) => setOpenAttacks(data.filter((a) => a.investigationStatus !== 'closed')))
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = { who: 'user', text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Simulate slight delay for natural feel
    setTimeout(() => {
      const reply = generateResponse(text, alert, role, openAttacks)
      setMessages((prev) => [...prev, { who: 'ai', text: reply }])
      setLoading(false)
    }, 400)
  }

  return (
    <div className="flex flex-col max-w-2xl">
      <div
        className="bg-white border border-gray-200 rounded-xl shadow-md flex flex-col"
        style={{ height: 'calc(100vh - 52px - 48px - 16px)', minHeight: 440 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <div className="w-8 h-8 bg-[#0e1726] rounded-lg flex items-center justify-center text-[13px] font-bold text-[#93c5fd]">
            UB
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-gray-900">UB Assistant</div>
            <div className="text-[10px] text-gray-400 truncate">
              {alert
                ? `Context loaded: ${alert.sampleId} · ${alert.attackType} · ${pct(alert.confidence)} confidence`
                : 'No alert loaded — open an alert from the Alerts Queue'}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 rounded-md shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot" />
            Active
          </span>
        </div>

        {/* Context banner — shown when no alert is loaded */}
        {!alert && (
          <div className="mx-4 mt-3 flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-3.5 py-2.5">
            <span className="text-blue-500 text-[13px] shrink-0 mt-0.5">ℹ</span>
            <div className="flex-1">
              <div className="text-[11px] font-semibold text-blue-800">
                No alert context loaded
              </div>
              <div className="text-[11px] text-blue-600 mt-0.5">
                Go to the{' '}
                <button
                  onClick={() => navigate('/alerts')}
                  className="underline hover:text-blue-800"
                >
                  Alerts Queue
                </button>
                , open an alert, then come back. UB will have full context to answer your questions.
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.who === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[78%] px-3.5 py-2.5 text-[12px] leading-relaxed whitespace-pre-wrap ${
                  m.who === 'user'
                    ? 'bg-[#0e1726] text-blue-100 rounded-xl rounded-br-sm'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 rounded-xl rounded-bl-sm'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-50 border border-gray-200 rounded-xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex flex-col gap-2.5">
          {/* Suggestion pills */}
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={loading}
                className="border border-gray-200 rounded-full px-2.5 py-1 text-[11px] text-gray-400 bg-white hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
              placeholder="Ask UB about this alert, MITRE technique, model output…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !loading) send(input) }}
              disabled={loading}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-[#0e1726] text-white text-[12px] font-medium rounded-lg hover:bg-[#1c2d45] transition-colors disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
