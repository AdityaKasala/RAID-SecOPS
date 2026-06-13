import type { AlertRecord } from '../types'

export const mockAlerts: AlertRecord[] = [
  {
    sampleId: 'ALT-0041',
    siemEventId: 'SPL-2026-03-18-08141',
    timestamp: '2026-03-18T08:14:22Z',
    sourceSiem: 'Splunk',
    status: 'ATTACK',
    confidence: 0.97,
    attackType: 'Lateral Movement',
    mitreTechnique: 'T1021 – Remote Services',
    deferToHuman: true,
    investigationStatus: 'escalated',
    assignedRole: 'analyst',
    assignedTo: 'j.chen',
    modelScores: {
      isolationForestScore: -0.312,
      randomForestConfidence: 0.97,
      finalPrediction: 'ATTACK',
      modelsAgree: true,
    },
    recommendations: {
      analyst:
        'Immediately isolate WIN-DC01 from the domain. Verify the SMB connection from 10.0.1.45 — this host is not authorised to reach the DC on port 445. Review svc_backup account for privilege escalation indicators. Check Event ID 4624 logon chains over the past 24 h. Raise P1 incident ticket and engage the IR team.',
      engineer:
        'Isolation Forest score −0.312 confirms significant deviation from baseline SMB traffic. Random Forest classifies this at 97% confidence as Lateral Movement via T1021. Recommend tuning Splunk rule SPL-LM-04 to alert on NTLM logon type 3 from non-admin hosts to DCs. Deploy Zeek for deeper SMB session analysis.',
      grc: 'High-confidence lateral movement toward a domain controller. Potential compromise of crown-jewel assets. Business risk: HIGH. GDPR Art. 33 exposure if PII is accessible on DC — 72 h notification window applies if breach is confirmed. Recommend activating IR retainer and briefing DPO immediately.',
    },
    rawLog:
      '2026-03-18 08:14:22 host=WIN-DC01 src_ip=10.0.1.45 dst_ip=10.0.2.11\naction=SMB_CONNECT user=svc_backup dst_port=445\nevent_id=4624 logon_type=3 auth_pkg=NTLM',
    notes: [
      {
        id: 'N1',
        author: 'j.chen',
        role: 'analyst',
        createdAt: '2026-03-18T08:22:00Z',
        text: 'Confirmed SMB connect from non-admin subnet. svc_backup has no legitimate reason to reach DC. Escalating.',
      },
      {
        id: 'N2',
        author: 'r.patel',
        role: 'engineer',
        createdAt: '2026-03-18T08:35:00Z',
        text: 'Splunk alert SPL-LM-04 triggered. Checked Zeek pcap — NTLM logon confirmed. IF deviation consistent with pass-the-hash pattern.',
      },
    ],
  },
  {
    sampleId: 'ALT-0042',
    siemEventId: 'SEN-2026-03-18-08310',
    timestamp: '2026-03-18T08:31:05Z',
    sourceSiem: 'Sentinel',
    status: 'ATTACK',
    confidence: 0.89,
    attackType: 'Credential Dumping',
    mitreTechnique: 'T1003 – OS Credential Dumping',
    deferToHuman: false,
    investigationStatus: 'under_investigation',
    assignedRole: 'engineer',
    assignedTo: 'r.patel',
    modelScores: {
      isolationForestScore: -0.274,
      randomForestConfidence: 0.89,
      finalPrediction: 'ATTACK',
      modelsAgree: true,
    },
    recommendations: {
      analyst:
        'Block and quarantine WKSTN-047 immediately. The LSASS dump by mimikatz.exe under jdoe is confirmed credential theft. Reset jdoe credentials and all service accounts that authenticated from this host. Verify no lateral movement in the past 6 h.',
      engineer:
        'Sysmon Event ID 10 (process access to LSASS) triggered classification. RF at 89% confidence. Enable Credential Guard on remaining endpoints via GPO. Validate Sentinel analytic rule MS-LSASS-01 covers all Sysmon sources. Deploy canary credentials to detect downstream reuse.',
      grc: 'Credential dumping confirmed on a corporate workstation. Risk of enterprise-wide credential compromise if service account hashes are exposed — blast radius includes cloud tenants. Recommend mandatory password-reset campaign and board notification if IR escalates.',
    },
    rawLog:
      '2026-03-18 08:31:05 host=WKSTN-047 process=lsass.exe\nparent=mimikatz.exe pid=3812 user=CORP\\jdoe\nevent_id=10 TargetImage=C:\\Windows\\System32\\lsass.exe',
    notes: [
      {
        id: 'N3',
        author: 'r.patel',
        role: 'engineer',
        createdAt: '2026-03-18T08:40:00Z',
        text: 'Sysmon Event 10 confirmed. Credential Guard not yet enforced on WKSTN-047. Requesting emergency GPO push.',
      },
    ],
  },
  {
    sampleId: 'ALT-0043',
    siemEventId: 'SPL-2026-03-18-08471',
    timestamp: '2026-03-18T08:47:19Z',
    sourceSiem: 'Splunk',
    status: 'NORMAL',
    confidence: 0.91,
    attackType: '—',
    mitreTechnique: '—',
    deferToHuman: false,
    investigationStatus: 'closed',
    assignedRole: 'analyst',
    assignedTo: 'j.chen',
    modelScores: {
      isolationForestScore: 0.083,
      randomForestConfidence: 0.91,
      finalPrediction: 'NORMAL',
      modelsAgree: true,
    },
    recommendations: {
      analyst:
        'No action required. Isolation Forest score is positive — consistent with normal baseline. Standard document read by an authorised user on an expected host. Log and close.',
      engineer:
        'Normal classification at 91% confidence. IF score +0.083 sits within the trained baseline distribution. No pipeline anomaly.',
      grc: 'No business risk identified. Event auto-classified as NORMAL by the ML pipeline with high confidence. No escalation required.',
    },
    rawLog:
      '2026-03-18 08:47:19 host=WKSTN-019 user=a.smith\naction=FILE_READ path=C:\\Users\\a.smith\\Documents\\report.docx\nbytes=45120 duration_ms=12',
    notes: [],
  },
  {
    sampleId: 'ALT-0044',
    siemEventId: 'SEN-2026-03-18-09025',
    timestamp: '2026-03-18T09:02:44Z',
    sourceSiem: 'Sentinel',
    status: 'ATTACK',
    confidence: 0.76,
    attackType: 'Exfiltration',
    mitreTechnique: 'T1048 – Exfiltration Over Alt. Protocol',
    deferToHuman: true,
    investigationStatus: 'escalated',
    assignedRole: 'grc',
    assignedTo: 'm.okafor',
    modelScores: {
      isolationForestScore: -0.198,
      randomForestConfidence: 0.76,
      finalPrediction: 'ATTACK',
      modelsAgree: false,
    },
    recommendations: {
      analyst:
        'Block outbound DNS to 185.220.101.34 at the perimeter firewall. DNS tunnelling to exfil-c2.xyz is suspected. deferToHuman is set — escalate to a senior analyst before taking SRV-FILE01 offline to preserve forensic evidence.',
      engineer:
        'DNS exfiltration pattern: 1,204 queries, 892 KB outbound to a known-bad IP. IF score −0.198 moderate deviation. Models disagree — Random Forest ATTACK but IF score is borderline. Validate Sentinel playbook PB-DNS-EXFIL. Deploy Zeek DNS logging.',
      grc: 'Potential data exfiltration via DNS tunnelling from a file server to external C2. GDPR Art. 33 notification window is 72 h from discovery. Estimated volume: ~870 KB. Engage legal counsel and DPO immediately. Model confidence 76% — human review mandatory.',
    },
    rawLog:
      '2026-03-18 09:02:44 host=SRV-FILE01 dst_ip=185.220.101.34\nproto=DNS bytes_out=892400 query_count=1204\nuser=SYSTEM domain=exfil-c2.xyz',
    notes: [
      {
        id: 'N4',
        author: 'm.okafor',
        role: 'grc',
        createdAt: '2026-03-18T09:15:00Z',
        text: 'DPO notified. Legal counsel engaged. Awaiting IR confirmation before regulator notification.',
      },
    ],
  },
  {
    sampleId: 'ALT-0045',
    siemEventId: 'SPL-2026-03-18-09183',
    timestamp: '2026-03-18T09:18:33Z',
    sourceSiem: 'Splunk',
    status: 'ATTACK',
    confidence: 0.83,
    attackType: 'Privilege Escalation',
    mitreTechnique: 'T1068 – Exploitation for Priv. Esc.',
    deferToHuman: false,
    investigationStatus: 'under_investigation',
    assignedRole: 'engineer',
    assignedTo: 'r.patel',
    modelScores: {
      isolationForestScore: -0.251,
      randomForestConfidence: 0.83,
      finalPrediction: 'ATTACK',
      modelsAgree: true,
    },
    recommendations: {
      analyst:
        'Isolate WKSTN-031 immediately. CVE-2024-21338 exploitation has elevated mbrown to SYSTEM. Remove VulnDriver service, scan for persistence, and audit all sessions from this host. Reset mbrown account.',
      engineer:
        'Kernel exploit CVE-2024-21338 → SYSTEM escalation. RF 83%, IF −0.251. Push emergency patch to all Win11 22H2 endpoints via WSUS. Enable WDAC driver block rules. Update Splunk alert SPL-PE-03.',
      grc: 'Kernel-level privilege escalation on a domain-joined endpoint. Risk: HIGH. mbrown session grants SYSTEM rights with domain network access. Recommend emergency patching sprint and brief IT leadership.',
    },
    rawLog:
      '2026-03-18 09:18:33 host=WKSTN-031 cve=CVE-2024-21338\nprocess=exploit.exe user=CORP\\mbrown new_priv=SYSTEM\nevent_id=7045 service_name=VulnDriver',
    notes: [],
  },
  {
    sampleId: 'ALT-0046',
    siemEventId: 'SEN-2026-03-18-09352',
    timestamp: '2026-03-18T09:35:11Z',
    sourceSiem: 'Sentinel',
    status: 'NORMAL',
    confidence: 0.88,
    attackType: '—',
    mitreTechnique: '—',
    deferToHuman: false,
    investigationStatus: 'closed',
    assignedRole: 'analyst',
    assignedTo: 'j.chen',
    modelScores: {
      isolationForestScore: 0.061,
      randomForestConfidence: 0.88,
      finalPrediction: 'NORMAL',
      modelsAgree: true,
    },
    recommendations: {
      analyst: 'Routine SharePoint upload. Normal classification at 88% confidence. No action required. Auto-close.',
      engineer: 'Normal. IF score +0.061, RF 88%. Consistent with baseline OneDrive activity. No pipeline anomaly.',
      grc: 'No risk. Auto-classified NORMAL. No escalation needed.',
    },
    rawLog:
      '2026-03-18 09:35:11 host=WKSTN-022 user=k.jones\naction=SHAREPOINT_UPLOAD file=Q1_Report.xlsx\nbytes=128000 app=OneDrive',
    notes: [],
  },
]
