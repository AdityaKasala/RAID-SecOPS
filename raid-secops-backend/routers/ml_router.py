"""
RAID-SecOps ML Inference Router
================================
Loads trained model artifacts from the raid_outputs/models folder
and exposes two endpoints:

POST /ml/predict
    Receives raw network flow features as a dict,
    runs them through RF + IF + hybrid decision,
    returns ATTACK/NORMAL prediction with confidence.

POST /ml/ingest
    Full pipeline — receives a raw network event,
    scores it through both models,
    generates role-aware recommendations,
    saves the complete alert to the PostgreSQL alerts table,
    returns the saved alert record.

This is the bridge between the ML pipeline (.pkl files)
and the RAID-SecOps UI + database.
"""

import os
import json
import pickle
import time
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Any

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database    import get_db
from alert_models import Alert
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ml", tags=["ml-inference"])

# ── Model store — loaded once at startup ─────────────────────
_models: dict[str, Any] = {}


def get_model_dir() -> Path:
    """
    Find the raid_outputs/models folder.
    Checks several common locations relative to the backend folder.
    Update MODEL_DIR_PATH in your .env if needed.
    """
    # Try env variable first
    env_path = settings.ML_MODEL_DIR
    if env_path and Path(env_path).exists():
        return Path(env_path)

    # Try common relative paths from the backend folder
    backend_dir = Path(__file__).parent
    candidates = [
        backend_dir.parent / "ML" / "raid_outputs" / "models",
        backend_dir.parent / "ml" / "raid_outputs" / "models",
        backend_dir.parent / "raid_outputs" / "models",
        Path("raid_outputs") / "models",
    ]
    for path in candidates:
        if path.exists():
            return path

    raise FileNotFoundError(
        "Could not find raid_outputs/models folder.\n"
        "Set ML_MODEL_DIR in your .env file to the full path of "
        "the models folder, e.g.:\n"
        "ML_MODEL_DIR=C:/Users/kelvi/.../ML/raid_outputs/models"
    )


def load_ml_models():
    """
    Load all trained model artifacts from disk.
    Called once at FastAPI startup.
    """
    global _models

    try:
        model_dir = get_model_dir()
        logger.info(f"Loading ML models from: {model_dir}")
        print(f"[ML] Loading models from: {model_dir}")
    except FileNotFoundError as e:
        logger.warning(str(e))
        print(f"[ML] ⚠ {e}")
        return False

    # Files to load
    artifacts = {
        "rf_model":        "random_forest_model.pkl",
        "rf_preprocessor": "rf_preprocessor.pkl",
        "if_model":        "isolation_forest_model.pkl",
        "if_preprocessor": "if_preprocessor_fitted.pkl",
        "if_threshold":    "if_threshold.pkl",
        "feature_names":   "feature_names.pkl",
    }

    for key, filename in artifacts.items():
        path = model_dir / filename
        if not path.exists():
            logger.warning(f"[ML] Missing: {filename} — {key} will be unavailable")
            print(f"[ML] ⚠ Missing: {filename}")
            continue
        try:
            with open(path, "rb") as f:
                _models[key] = pickle.load(f)
            size_mb = path.stat().st_size / (1024 * 1024)
            print(f"[ML] Loaded {filename}  ({size_mb:.2f} MB)")
        except Exception as e:
            logger.error(f"[ML] Failed to load {filename}: {e}")
            print(f"[ML] ✗ Failed to load {filename}: {e}")

    # Load threshold JSON for display
    threshold_json = model_dir / "if_threshold.json"
    if threshold_json.exists():
        with open(threshold_json) as f:
            _models["if_threshold_meta"] = json.load(f)

    loaded = list(_models.keys())
    print(f"[ML] Models loaded: {loaded}")
    return len(loaded) > 0


def models_ready() -> bool:
    """Return True if minimum required models are loaded."""
    return all(k in _models for k in ["rf_model", "rf_preprocessor"])


# ── MITRE mapping (mirrors Stage 2 of pipeline) ──────────────
MITRE_MAP = {
    "Fuzzers":        "T1190 – Exploit Public-Facing Application",
    "Analysis":       "T1046 – Network Service Scanning",
    "Backdoor":       "T1543 – Create or Modify System Process",
    "Backdoors":      "T1543 – Create or Modify System Process",
    "DoS":            "T1498 – Network Denial of Service",
    "Exploits":       "T1203 – Exploitation for Client Execution",
    "Generic":        "T1078 – Valid Accounts",
    "Reconnaissance": "T1595 – Active Scanning",
    "Shellcode":      "T1059 – Command and Scripting Interpreter",
    "Worms":          "T1210 – Exploitation of Remote Services",
    "Normal":         "—",
    "Unknown":        "—",
}

BUSINESS_IMPACT_MAP = {
    "Fuzzers":        "Application exploitation attempt — risk of service disruption or data exposure",
    "Analysis":       "Network reconnaissance — attacker may be mapping infrastructure prior to attack",
    "Backdoor":       "Persistent access established — attacker may maintain long-term presence",
    "Backdoors":      "Persistent access established — attacker may maintain long-term presence",
    "DoS":            "Service availability risk — operations, SLAs, and revenue may be impacted",
    "Exploits":       "Client-side exploitation — endpoint compromise likely if unmitigated",
    "Generic":        "Credential abuse — account takeover risk, potential data breach",
    "Reconnaissance": "Pre-attack intelligence gathering — indicates targeted attack in progress",
    "Shellcode":      "Code execution attempt — malware or ransomware deployment likely next step",
    "Worms":          "Lateral movement risk — threat may self-propagate across the network",
    "Normal":         "No threat detected — routine network behaviour",
    "Unknown":        "Classification incomplete — manual review required",
}

ANALYST_INVESTIGATION_MAP = {
    "Fuzzers":        ["Check WAF logs for malformed input patterns", "Review source IP for prior reconnaissance", "Correlate with T1190 — public-facing app exploitation"],
    "Analysis":       ["Review port scan logs — SYN flood or stealth scan patterns", "Check if source IP has prior SIEM history", "Correlate with T1046 — network service discovery"],
    "Backdoor":       ["Inspect process creation logs — new services or scheduled tasks", "Check registry Run keys and startup folder", "Correlate with T1543 — system process creation", "Review outbound C2 traffic"],
    "Backdoors":      ["Inspect process creation logs — new services or scheduled tasks", "Check registry Run keys and startup folder", "Correlate with T1543 — system process creation", "Review outbound C2 traffic"],
    "DoS":            ["Monitor bandwidth vs baseline", "Identify flood source IPs — check if spoofed", "Correlate with T1498 — network denial of service", "Check if traffic targets single port or service"],
    "Exploits":       ["Review endpoint logs for unusual process spawning", "Check for Office macro or PDF reader execution", "Correlate with T1203 — client execution exploitation", "Inspect email gateway for malicious attachments"],
    "Generic":        ["Check auth logs for credential stuffing", "Review VPN logs for unusual logins", "Correlate with T1078 — valid account abuse", "Inspect privileged account activity"],
    "Reconnaissance": ["Identify scan scope — targeted vs subnet sweep", "Check if source is internal — may be compromised", "Correlate with T1595 — active scanning", "Review DNS query logs for enumeration"],
    "Shellcode":      ["Isolate affected host immediately", "Capture memory dump before remediation", "Correlate with T1059 — command interpreter", "Review PowerShell and script block logs"],
    "Worms":          ["Identify patient zero — initial infected host", "Map propagation path across hosts", "Correlate with T1210 — remote service exploitation", "Check SMB and RDP lateral movement logs"],
}

ENGINEER_REMEDIATION_MAP = {
    "Fuzzers":        ["Deploy WAF rule to block malformed input", "Patch public-facing application", "Update IDS signatures for fuzzing patterns"],
    "Analysis":       ["Block source IP at perimeter firewall", "Enable port scan detection rule in SIEM", "Deploy honeypot on scanned ports"],
    "Backdoor":       ["Terminate suspicious processes", "Remove unauthorised services/scheduled tasks", "Re-image if persistence confirmed", "Deploy detection rule for new service installs"],
    "Backdoors":      ["Terminate suspicious processes", "Remove unauthorised services/scheduled tasks", "Re-image if persistence confirmed", "Deploy detection rule for new service installs"],
    "DoS":            ["Activate rate limiting on affected service", "Engage ISP for traffic scrubbing if volumetric", "Deploy BGP blackhole routing for flood sources"],
    "Exploits":       ["Patch vulnerable application immediately", "Enable DEP/ASLR/Control Flow Guard", "Deploy application allow-listing on endpoint"],
    "Generic":        ["Force password reset on affected accounts", "Enable MFA on compromised accounts", "Revoke active sessions", "Update account lockout policy"],
    "Reconnaissance": ["Block source IP — add to threat intel feed", "Enable network deception/honeypot", "Review externally exposed services"],
    "Shellcode":      ["Isolate host from network immediately", "Collect forensic evidence before changes", "Deploy memory scanning across segment", "Block outbound C2 at perimeter"],
    "Worms":          ["Network segment infected hosts", "Block SMB/RDP between segments", "Patch exploited vulnerability across endpoints", "Run AV scan with latest signatures"],
}

REGULATORY_MAP = {
    "Fuzzers":        "GDPR Art.32 — review technical security measures",
    "Analysis":       "No immediate notification — log for trend analysis",
    "Backdoor":       "GDPR Art.33 — potential breach, 72-hour notification window starts",
    "Backdoors":      "GDPR Art.33 — potential breach, 72-hour notification window starts",
    "DoS":            "SLA obligations — notify customers if disruption exceeds thresholds",
    "Exploits":       "GDPR Art.33 if data accessed — assess scope",
    "Generic":        "GDPR Art.33 if credentials compromised — assess exposure",
    "Reconnaissance": "No immediate obligation — monitor for follow-on attack",
    "Shellcode":      "GDPR Art.33 likely — code execution implies data access",
    "Worms":          "GDPR Art.33 — lateral movement, broad scope assessment required",
    "Normal":         "No regulatory action required",
    "Unknown":        "Pending classification — reassess when confirmed",
}


# ─────────────────────────────────────────────────────────────
# INFERENCE FUNCTIONS
# ─────────────────────────────────────────────────────────────

def _run_rf(features_df: pd.DataFrame) -> tuple[int, float]:
    """Run Random Forest on preprocessed features. Returns (pred, proba)."""
    X = _models["rf_preprocessor"].transform(features_df)
    pred  = int(_models["rf_model"].predict(X)[0])
    proba = float(_models["rf_model"].predict_proba(X)[0][1])
    return pred, proba


def _run_if(features_df: pd.DataFrame) -> float:
    """Run Isolation Forest. Returns inverted anomaly score."""
    X = _models["if_preprocessor"].transform(features_df)
    score = float(-_models["if_model"].decision_function(X)[0])
    return score


def _hybrid_decision(
    rf_proba:     float,
    if_score:     float,
    if_threshold: float,
) -> tuple[int, float, bool, bool]:
    """
    Blend RF + IF into hybrid prediction.
    Returns: (pred, confidence, defer_to_human, models_agree)
    """
    # Normalise IF score to 0–1 using stored min/max
    # We use a fixed range based on typical UNSW-NB15 scores
    IF_MIN, IF_MAX = -0.20, 0.20
    if_norm = max(0.0, min(1.0, (if_score - IF_MIN) / (IF_MAX - IF_MIN)))

    # Weighted blend
    hybrid_score = 0.70 * rf_proba + 0.30 * if_norm

    # Prediction
    HYBRID_THRESHOLD = 0.55
    pred = 1 if hybrid_score >= HYBRID_THRESHOLD else 0

    # Models agree check
    rf_binary = 1 if rf_proba  >= 0.50       else 0
    if_binary = 1 if if_score  >= if_threshold else 0
    models_agree = (rf_binary == if_binary)

    # Defer-to-human logic
    uncertain_band = 0.45 <= hybrid_score <= 0.60
    rf_uncertain   = 0.25 <= rf_proba <= 0.75
    meaningful_disagree = (not models_agree) and rf_uncertain
    defer = uncertain_band or meaningful_disagree

    return pred, float(hybrid_score), defer, models_agree


def _build_role_recs(
    sample_id:   str,
    status:      str,
    confidence:  float,
    attack_cat:  str,
    if_score:    float,
    rf_proba:    float,
    defer:       bool,
    models_agree: bool,
) -> tuple[str, str, str]:
    """Build all three role recommendations. Returns (analyst, engineer, grc)."""

    mitre      = MITRE_MAP.get(attack_cat, "—")
    conf_pct   = f"{confidence:.0%}"
    defer_note = " ⚠ LOW CONFIDENCE — Do not take action until analyst reviews." if defer else ""
    agree_note = " ⚠ MODEL DISAGREEMENT — Manual verification required." if not models_agree else ""

    steps_a = ANALYST_INVESTIGATION_MAP.get(attack_cat, [
        "Review source and destination IPs in SIEM",
        "Check authentication logs around the event timestamp",
        "Correlate with other alerts from same source ±30 minutes",
        "Escalate if lateral movement indicators found",
    ])

    steps_e = ENGINEER_REMEDIATION_MAP.get(attack_cat, [
        "Review network segmentation for affected host",
        "Audit firewall rules for unnecessary exposure",
        "Update SIEM detection rule based on observed pattern",
        "Run vulnerability scan on affected assets",
    ])

    regulatory  = REGULATORY_MAP.get(attack_cat, "Assess regulatory exposure")
    biz_impact  = BUSINESS_IMPACT_MAP.get(attack_cat, "Business impact under assessment")

    if confidence >= 0.85 and not defer:
        impact_tier = "CRITICAL"
    elif confidence >= 0.70:
        impact_tier = "HIGH"
    elif status == "ATTACK":
        impact_tier = "MEDIUM"
    else:
        impact_tier = "LOW"

    if status == "ATTACK":
        rec_analyst = (
            f"Alert {sample_id} — {attack_cat} DETECTED ({conf_pct} confidence){defer_note}{agree_note}\n\n"
            f"MITRE Technique: {mitre}\n\n"
            f"ML Scores:\n"
            f"  Isolation Forest : {if_score:+.3f}  "
            f"({'anomalous' if if_score > 0 else 'within baseline'})\n"
            f"  Random Forest    : {rf_proba:.1%} attack probability\n\n"
            f"Investigation Priority Actions:\n"
        )
        for i, step in enumerate(steps_a, 1):
            rec_analyst += f"  {i}. {step}\n"
        rec_analyst += (
            f"\nEscalation Trigger:\n"
            f"  Escalate if lateral movement, multiple hosts, or data exfiltration signs detected."
        )

        rec_engineer = (
            f"Remediation Guidance — {sample_id} [{attack_cat}]{defer_note}\n\n"
            f"Technique: {mitre}\n"
            f"Confidence: {conf_pct}  |  IF Score: {if_score:+.3f}  "
            f"|  Models Agree: {'Yes' if models_agree else 'No — verify before acting'}\n\n"
            f"Remediation Steps:\n"
        )
        for i, step in enumerate(steps_e, 1):
            rec_engineer += f"  {i}. {step}\n"

        rec_grc = (
            f"Risk Summary — {sample_id}\n\n"
            f"Status     : {status}\n"
            f"Attack Type: {attack_cat}\n"
            f"Confidence : {conf_pct}{defer_note}\n"
            f"Impact     : {impact_tier}\n\n"
            f"Business Risk:\n  {biz_impact}\n\n"
            f"Regulatory Exposure:\n  {regulatory}\n\n"
        )
        if impact_tier == "CRITICAL":
            rec_grc += (
                "Executive Actions:\n"
                "  1. Activate incident response plan immediately\n"
                "  2. Notify DPO and legal counsel within 1 hour\n"
                "  3. Engage cyber insurance carrier if threshold met\n"
                "  4. Preserve all evidence for regulatory submission"
            )
        elif impact_tier == "HIGH":
            rec_grc += (
                "Executive Actions:\n"
                "  1. Notify DPO — assess 72-hour GDPR window\n"
                "  2. Brief IT leadership and legal counsel\n"
                "  3. Monitor for escalation to CRITICAL"
            )
        else:
            rec_grc += (
                "Executive Actions:\n"
                "  1. Monitor situation — escalation may not be required\n"
                "  2. Log for trend analysis and quarterly risk report"
            )
    else:
        rec_analyst  = f"Alert {sample_id} — NORMAL ({conf_pct} confidence)\nIF: {if_score:+.3f}  RF: {rf_proba:.1%}\nNo investigation required. Log and close."
        rec_engineer = f"Sample {sample_id} — NORMAL ({conf_pct} confidence)\nNo remediation required. Event within normal baseline."
        rec_grc      = f"Risk Summary — {sample_id}\nStatus: NORMAL ({conf_pct} confidence)\nNo business risk. No regulatory action required."

    return rec_analyst, rec_engineer, rec_grc


# ─────────────────────────────────────────────────────────────
# REQUEST / RESPONSE SCHEMAS
# ─────────────────────────────────────────────────────────────

class MLPredictRequest(BaseModel):
    """
    Raw network flow features as a flat dict.
    Keys must match the UNSW-NB15 feature names the model was trained on.
    Example keys: dur, proto, service, state, spkts, dpkts, sbytes, dbytes...
    """
    features: dict
    source_siem: str = "Mock"
    siem_event_id: Optional[str] = None
    attack_cat: Optional[str] = None   # if known from SIEM enrichment


class MLPredictResponse(BaseModel):
    status:               str
    confidence:           float
    isolation_forest_score: float
    random_forest_confidence: float
    models_agree:         bool
    defer_to_human:       bool
    attack_type:          str
    mitre_technique:      str
    inference_time_ms:    float


class MLIngestRequest(BaseModel):
    """
    Full event to score AND save to the alerts table.
    Used by Splunk/Sentinel integration and the ML pipeline.
    """
    sample_id:     str
    features:      dict
    source_siem:   str = "Mock"
    siem_event_id: Optional[str] = None
    attack_cat:    Optional[str] = None
    raw_log:       Optional[str] = None
    assigned_role: str = "analyst"
    assigned_to:   Optional[str] = None
    timestamp:     Optional[str] = None


# ─────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────

@router.get("/status")
async def ml_status():
    """
    Check which ML models are loaded and ready.
    Use this to verify the inference service is working.
    """
    if_meta = _models.get("if_threshold_meta", {})
    return {
        "models_ready":     models_ready(),
        "loaded_artifacts": list(_models.keys()),
        "rf_loaded":        "rf_model" in _models,
        "if_loaded":        "if_model" in _models,
        "if_threshold":     _models.get("if_threshold"),
        "if_threshold_meta": if_meta,
        "feature_count":    len(_models["feature_names"]) if "feature_names" in _models else None,
    }


@router.post("/predict", response_model=MLPredictResponse)
async def predict(body: MLPredictRequest):
    """
    Score a single network event through the ML pipeline.

    Receives raw feature dict → runs RF + IF → returns prediction.
    Does NOT save to database. Use /ml/ingest to save.

    Example call from Python:
        import requests
        requests.post("http://localhost:8000/ml/predict", json={
            "features": {"dur": 0.121, "proto": "tcp", "service": "-", ...},
            "source_siem": "Splunk"
        })
    """
    if not models_ready():
        raise HTTPException(
            status_code=503,
            detail="ML models not loaded. Check /ml/status for details."
        )

    start = time.time()

    try:
        # Convert feature dict to DataFrame
        # The preprocessor expects a DataFrame with named columns
        features_df = pd.DataFrame([body.features])

        # Run RF
        rf_pred, rf_proba = _run_rf(features_df)

        # Run IF
        if_threshold = _models.get("if_threshold", 0.008)
        if_score     = _run_if(features_df) if "if_model" in _models else 0.0

        # Hybrid decision
        hybrid_pred, confidence, defer, models_agree = _hybrid_decision(
            rf_proba, if_score, if_threshold
        )

        status = "ATTACK" if hybrid_pred == 1 else "NORMAL"

        # Resolve attack type
        attack_cat = body.attack_cat or "Unknown"
        mitre      = MITRE_MAP.get(attack_cat, "—")

        inference_ms = (time.time() - start) * 1000

        return MLPredictResponse(
            status                   = status,
            confidence               = round(confidence, 4),
            isolation_forest_score   = round(if_score, 4),
            random_forest_confidence = round(rf_proba, 4),
            models_agree             = models_agree,
            defer_to_human           = defer,
            attack_type              = attack_cat if attack_cat != "Normal" else "—",
            mitre_technique          = mitre,
            inference_time_ms        = round(inference_ms, 2),
        )

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/ingest", status_code=201)
async def ingest_from_model(
    body: MLIngestRequest,
    db:   AsyncSession = Depends(get_db),
):
    """
    Score a network event AND save the full alert to the database.

    This is the endpoint the ML pipeline calls for each scored event.
    It runs the full inference pipeline, builds role-aware recommendations,
    and saves everything to the PostgreSQL alerts table — ready for the UI.

    The ML pipeline calls this like:
        requests.post("http://localhost:8000/ml/ingest", json={
            "sample_id":   "ALT-0099",
            "features":    {...},            # raw network features
            "source_siem": "Splunk",
            "attack_cat":  "DoS",
            "raw_log":     "2026-03-20...",
        })
    """
    if not models_ready():
        raise HTTPException(
            status_code=503,
            detail="ML models not loaded. Check /ml/status for details."
        )

    # Check duplicate
    existing = await db.execute(
        select(Alert).where(Alert.sample_id == body.sample_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"Alert '{body.sample_id}' already exists."
        )

    start = time.time()

    try:
        features_df  = pd.DataFrame([body.features])
        rf_pred, rf_proba = _run_rf(features_df)
        if_threshold = _models.get("if_threshold", 0.008)
        if_score     = _run_if(features_df) if "if_model" in _models else 0.0

        hybrid_pred, confidence, defer, models_agree = _hybrid_decision(
            rf_proba, if_score, if_threshold
        )

        status     = "ATTACK" if hybrid_pred == 1 else "NORMAL"
        attack_cat = body.attack_cat or "Unknown"
        mitre      = MITRE_MAP.get(attack_cat, "—")

        # Build role-aware recommendations
        rec_analyst, rec_engineer, rec_grc = _build_role_recs(
            sample_id    = body.sample_id,
            status       = status,
            confidence   = confidence,
            attack_cat   = attack_cat if attack_cat != "Normal" else "—",
            if_score     = if_score,
            rf_proba     = rf_proba,
            defer        = defer,
            models_agree = models_agree,
        )

        # Determine assigned role based on attack type
        # CISO/GRC for high-confidence critical threats
        # Engineer for infrastructure attacks
        # Analyst for everything else
        if confidence >= 0.85 and status == "ATTACK":
            assigned_role = body.assigned_role or "analyst"
        else:
            assigned_role = body.assigned_role or "analyst"

        # Parse timestamp
        ts = datetime.now(timezone.utc)
        if body.timestamp:
            try:
                ts = datetime.fromisoformat(body.timestamp.replace("Z", "+00:00"))
            except Exception:
                pass

        # Save to database
        alert = Alert(
            sample_id                = body.sample_id,
            siem_event_id            = body.siem_event_id,
            timestamp                = ts,
            source_siem              = body.source_siem,
            status                   = status,
            confidence               = round(confidence, 4),
            attack_type              = attack_cat if attack_cat not in ("Normal", "Unknown") else "—",
            mitre_technique          = mitre,
            isolation_forest_score   = round(if_score, 4),
            random_forest_confidence = round(rf_proba, 4),
            final_prediction         = status,
            models_agree             = models_agree,
            defer_to_human           = defer,
            investigation_status     = "open",
            assigned_role            = assigned_role,
            assigned_to              = body.assigned_to,
            rec_analyst              = rec_analyst,
            rec_engineer             = rec_engineer,
            rec_grc                  = rec_grc,
            raw_log                  = body.raw_log,
        )
        db.add(alert)
        await db.commit()
        await db.refresh(alert)

        inference_ms = (time.time() - start) * 1000

        return {
            "message":          "Alert scored and saved successfully.",
            "sample_id":        alert.sample_id,
            "status":           status,
            "confidence":       round(confidence, 4),
            "defer_to_human":   defer,
            "models_agree":     models_agree,
            "attack_type":      alert.attack_type,
            "mitre_technique":  mitre,
            "inference_time_ms": round(inference_ms, 2),
        }

    except Exception as e:
        logger.error(f"Ingest error: {e}")
        raise HTTPException(status_code=500, detail=f"Ingest failed: {str(e)}")
