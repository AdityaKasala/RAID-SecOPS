-- ============================================================
--  RAID-SecOps · Database Schema · Stage 2: Alerts + Notes
-- ============================================================
--  Run this in pgAdmin connected to your RAID-SecOps database
-- ============================================================


-- ── ALERTS TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (

    -- Identity
    id                      SERIAL PRIMARY KEY,
    sample_id               VARCHAR(50)  NOT NULL UNIQUE,
    siem_event_id           VARCHAR(100),
    timestamp               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    source_siem             VARCHAR(20)  NOT NULL CHECK (source_siem IN ('Splunk', 'Sentinel', 'Mock')),

    -- ML Classification Output
    status                  VARCHAR(10)  NOT NULL CHECK (status IN ('ATTACK', 'NORMAL')),
    confidence              NUMERIC(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    attack_type             VARCHAR(100) NOT NULL DEFAULT '—',
    mitre_technique         VARCHAR(200) NOT NULL DEFAULT '—',

    -- Model Scores
    isolation_forest_score  NUMERIC(8,4),
    random_forest_confidence NUMERIC(5,4),
    final_prediction        VARCHAR(10)  CHECK (final_prediction IN ('ATTACK', 'NORMAL')),
    models_agree            BOOLEAN      NOT NULL DEFAULT TRUE,

    -- Decision Support
    defer_to_human          BOOLEAN      NOT NULL DEFAULT FALSE,
    investigation_status    VARCHAR(25)  NOT NULL DEFAULT 'new'
                                CHECK (investigation_status IN ('new', 'under_investigation', 'escalated', 'closed')),
    assigned_role           VARCHAR(20)  NOT NULL DEFAULT 'analyst'
                                CHECK (assigned_role IN ('analyst', 'engineer', 'grc')),
    assigned_to             VARCHAR(100),

    -- Role-Aware Recommendations (stored as text)
    rec_analyst             TEXT,
    rec_engineer            TEXT,
    rec_grc                 TEXT,

    -- Raw log from SIEM
    raw_log                 TEXT,

    -- Audit
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ── NOTES TABLE ──────────────────────────────────────────────
-- One alert can have many notes (one-to-many relationship)
CREATE TABLE IF NOT EXISTS alert_notes (
    id          SERIAL PRIMARY KEY,
    alert_id    INTEGER      NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    author      VARCHAR(100) NOT NULL,
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('analyst', 'engineer', 'grc')),
    text        TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ── AUTO-UPDATE updated_at ───────────────────────────────────
-- Automatically updates updated_at whenever an alert row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();


-- ── INDEXES ──────────────────────────────────────────────────
-- Speed up the most common queries on the Alerts Queue page
CREATE INDEX IF NOT EXISTS idx_alerts_status       ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_source_siem  ON alerts(source_siem);
CREATE INDEX IF NOT EXISTS idx_alerts_defer        ON alerts(defer_to_human);
CREATE INDEX IF NOT EXISTS idx_alerts_inv_status   ON alerts(investigation_status);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp    ON alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notes_alert_id      ON alert_notes(alert_id);


-- ── SEED DATA ────────────────────────────────────────────────
-- 6 realistic mock alerts matching your ML pipeline outputs
-- These mirror the mock data already in the frontend

INSERT INTO alerts (
    sample_id, siem_event_id, timestamp, source_siem,
    status, confidence, attack_type, mitre_technique,
    isolation_forest_score, random_forest_confidence,
    final_prediction, models_agree,
    defer_to_human, investigation_status, assigned_role, assigned_to,
    rec_analyst, rec_engineer, rec_grc, raw_log
) VALUES

(
    'ALT-0041', 'SPL-2026-03-18-08141', '2026-03-18 08:14:22+00', 'Splunk',
    'ATTACK', 0.97, 'Lateral Movement', 'T1021 – Remote Services',
    -0.312, 0.97, 'ATTACK', TRUE,
    TRUE, 'escalated', 'analyst', 'r.reddy',
    'Immediately isolate WIN-DC01 from the domain. Verify the SMB connection from 10.0.1.45 — this host is not authorised to reach the DC on port 445. Review svc_backup account for privilege escalation indicators. Check Event ID 4624 logon chains over the past 24 h. Raise P1 incident ticket and engage the IR team.',
    'Isolation Forest score −0.312 confirms significant deviation from baseline SMB traffic. Random Forest classifies this at 97% confidence as Lateral Movement via T1021. Recommend tuning Splunk rule SPL-LM-04 to alert on NTLM logon type 3 from non-admin hosts to DCs. Deploy Zeek for deeper SMB session analysis.',
    'High-confidence lateral movement toward a domain controller. Potential compromise of crown-jewel assets. Business risk: HIGH. GDPR Art. 33 exposure if PII is accessible on DC — 72 h notification window applies if breach is confirmed. Recommend activating IR retainer and briefing DPO immediately.',
    '2026-03-18 08:14:22 host=WIN-DC01 src_ip=10.0.1.45 dst_ip=10.0.2.11
action=SMB_CONNECT user=svc_backup dst_port=445
event_id=4624 logon_type=3 auth_pkg=NTLM'
),

(
    'ALT-0042', 'SEN-2026-03-18-08310', '2026-03-18 08:31:05+00', 'Sentinel',
    'ATTACK', 0.89, 'Credential Dumping', 'T1003 – OS Credential Dumping',
    -0.274, 0.89, 'ATTACK', TRUE,
    FALSE, 'under_investigation', 'engineer', 'a.kasala',
    'Block and quarantine WKSTN-047 immediately. The LSASS dump by mimikatz.exe under jdoe is confirmed credential theft. Reset jdoe credentials and all service accounts that authenticated from this host. Verify no lateral movement in the past 6 h.',
    'Sysmon Event ID 10 (process access to LSASS) triggered classification. RF at 89% confidence. Enable Credential Guard on remaining endpoints via GPO. Validate Sentinel analytic rule MS-LSASS-01 covers all Sysmon sources. Deploy canary credentials to detect downstream reuse.',
    'Credential dumping confirmed on a corporate workstation. Risk of enterprise-wide credential compromise if service account hashes are exposed. Recommend mandatory password-reset campaign and board notification if IR escalates.',
    '2026-03-18 08:31:05 host=WKSTN-047 process=lsass.exe
parent=mimikatz.exe pid=3812 user=CORP\jdoe
event_id=10 TargetImage=C:\Windows\System32\lsass.exe'
),

(
    'ALT-0043', 'SPL-2026-03-18-08471', '2026-03-18 08:47:19+00', 'Splunk',
    'NORMAL', 0.91, '—', '—',
    0.083, 0.91, 'NORMAL', TRUE,
    FALSE, 'closed', 'analyst', 'r.reddy',
    'No action required. Isolation Forest score is positive — consistent with normal baseline. Standard document read by an authorised user on an expected host. Log and close.',
    'Normal classification at 91% confidence. IF score +0.083 sits within the trained baseline distribution. No pipeline anomaly.',
    'No business risk identified. Event auto-classified as NORMAL by the ML pipeline with high confidence. No escalation required.',
    '2026-03-18 08:47:19 host=WKSTN-019 user=a.smith
action=FILE_READ path=C:\Users\a.smith\Documents\report.docx
bytes=45120 duration_ms=12'
),

(
    'ALT-0044', 'SEN-2026-03-18-09025', '2026-03-18 09:02:44+00', 'Sentinel',
    'ATTACK', 0.76, 'Exfiltration', 'T1048 – Exfiltration Over Alt. Protocol',
    -0.198, 0.76, 'ATTACK', FALSE,
    TRUE, 'escalated', 'grc', 'f.sagayaraj',
    'Block outbound DNS to 185.220.101.34 at the perimeter firewall. DNS tunnelling to exfil-c2.xyz is suspected. deferToHuman is set — escalate to a senior analyst before taking SRV-FILE01 offline to preserve forensic evidence.',
    'DNS exfiltration pattern: 1,204 queries, 892 KB outbound to a known-bad IP. IF score −0.198 moderate deviation. Models disagree — Random Forest ATTACK but IF score is borderline. Validate Sentinel playbook PB-DNS-EXFIL.',
    'Potential data exfiltration via DNS tunnelling from a file server to external C2. GDPR Art. 33 notification window is 72 h from discovery. Estimated volume: ~870 KB. Engage legal counsel and DPO immediately.',
    '2026-03-18 09:02:44 host=SRV-FILE01 dst_ip=185.220.101.34
proto=DNS bytes_out=892400 query_count=1204
user=SYSTEM domain=exfil-c2.xyz'
),

(
    'ALT-0045', 'SPL-2026-03-18-09183', '2026-03-18 09:18:33+00', 'Splunk',
    'ATTACK', 0.83, 'Privilege Escalation', 'T1068 – Exploitation for Priv. Esc.',
    -0.251, 0.83, 'ATTACK', TRUE,
    FALSE, 'under_investigation', 'engineer', 'a.kasala',
    'Isolate WKSTN-031 immediately. CVE-2024-21338 exploitation has elevated mbrown to SYSTEM. Remove VulnDriver service, scan for persistence, and audit all sessions from this host. Reset mbrown account.',
    'Kernel exploit CVE-2024-21338 → SYSTEM escalation. RF 83%, IF −0.251. Push emergency patch to all Win11 22H2 endpoints via WSUS. Enable WDAC driver block rules.',
    'Kernel-level privilege escalation on a domain-joined endpoint. Risk: HIGH. Recommend emergency patching sprint and brief IT leadership within the hour.',
    '2026-03-18 09:18:33 host=WKSTN-031 cve=CVE-2024-21338
process=exploit.exe user=CORP\mbrown new_priv=SYSTEM
event_id=7045 service_name=VulnDriver'
),

(
    'ALT-0046', 'SEN-2026-03-18-09352', '2026-03-18 09:35:11+00', 'Sentinel',
    'NORMAL', 0.88, '—', '—',
    0.061, 0.88, 'NORMAL', TRUE,
    FALSE, 'closed', 'analyst', 'r.reddy',
    'Routine SharePoint upload. Normal classification at 88% confidence. No action required. Auto-close.',
    'Normal. IF score +0.061, RF 88%. Consistent with baseline OneDrive activity. No pipeline anomaly.',
    'No risk. Auto-classified NORMAL. No escalation needed.',
    '2026-03-18 09:35:11 host=WKSTN-022 user=k.jones
action=SHAREPOINT_UPLOAD file=Q1_Report.xlsx
bytes=128000 app=OneDrive'
)

ON CONFLICT (sample_id) DO NOTHING;


-- ── SEED NOTES ───────────────────────────────────────────────
INSERT INTO alert_notes (alert_id, author, role, text, created_at)
SELECT a.id, 'r.reddy', 'analyst',
       'Confirmed SMB connect from non-admin subnet. svc_backup has no legitimate reason to reach DC. Escalating.',
       '2026-03-18 08:22:00+00'
FROM alerts a WHERE a.sample_id = 'ALT-0041'
ON CONFLICT DO NOTHING;

INSERT INTO alert_notes (alert_id, author, role, text, created_at)
SELECT a.id, 'a.kasala', 'engineer',
       'Splunk alert SPL-LM-04 triggered. Checked Zeek pcap — NTLM logon confirmed. IF deviation consistent with pass-the-hash pattern.',
       '2026-03-18 08:35:00+00'
FROM alerts a WHERE a.sample_id = 'ALT-0041'
ON CONFLICT DO NOTHING;

INSERT INTO alert_notes (alert_id, author, role, text, created_at)
SELECT a.id, 'a.kasala', 'engineer',
       'Sysmon Event 10 confirmed. Credential Guard not yet enforced on WKSTN-047. Requesting emergency GPO push.',
       '2026-03-18 08:40:00+00'
FROM alerts a WHERE a.sample_id = 'ALT-0042'
ON CONFLICT DO NOTHING;

INSERT INTO alert_notes (alert_id, author, role, text, created_at)
SELECT a.id, 'f.sagayaraj', 'grc',
       'DPO notified. Legal counsel engaged. Awaiting IR confirmation before regulator notification.',
       '2026-03-18 09:15:00+00'
FROM alerts a WHERE a.sample_id = 'ALT-0044'
ON CONFLICT DO NOTHING;


-- ── VERIFY ───────────────────────────────────────────────────
SELECT
    sample_id,
    source_siem,
    status,
    ROUND(confidence * 100) || '%' AS confidence,
    attack_type,
    defer_to_human,
    investigation_status,
    assigned_to
FROM alerts
ORDER BY timestamp;
