"""
RAID-SecOps — Batch Ingest from UNSW-NB15 Test Set
====================================================
Reads real samples from the UNSW-NB15 testing CSV,
scores each one through the ML inference endpoint,
and saves them to the PostgreSQL alerts table.

Usage:
    python batch_ingest_unsw.py

Place this file in the same folder as your backend
(raid-secops-backend/) and run with the venv active.

The script pushes N_SAMPLES records — change this number
at the top to control how many alerts appear in the UI.
"""

import requests
import pandas as pd
import numpy as np
import time
import os
from pathlib import Path

# ── Configuration ─────────────────────────────────────────────
BASE          = "http://localhost:8000"
N_SAMPLES     = 50        # how many alerts to push (change to 100, 200, etc.)
RANDOM_STATE  = 42        # for reproducible sampling
SLEEP_BETWEEN = 0.05      # seconds between requests (avoid hammering the server)

# Path to your UNSW-NB15 test CSV — update if different
TEST_CSV = Path(r"C:\Users\kelvi\Desktop\MS CYBERSECURITY\Spring 2026\Capstone\RAID SecOps\raid-secops\ML\UNSW_NB15_testing-set.csv")

# Feature columns the model was trained on
FEATURE_COLS = [
    "dur", "spkts", "dpkts", "sbytes", "dbytes", "rate",
    "sttl", "dttl", "sload", "dload", "sloss", "dloss",
    "sinpkt", "dinpkt", "sjit", "djit", "swin", "stcpb",
    "dtcpb", "dwin", "tcprtt", "synack", "ackdat",
    "smean", "dmean", "trans_depth", "response_body_len",
    "ct_srv_src", "ct_state_ttl", "ct_dst_ltm",
    "ct_src_dport_ltm", "ct_dst_sport_ltm", "ct_dst_src_ltm",
    "is_ftp_login", "ct_ftp_cmd", "ct_flw_http_mthd",
    "ct_src_ltm", "ct_srv_dst", "is_sm_ips_ports",
    "proto", "service", "state",
]

# SIEM source assignment based on attack category
SIEM_MAP = {
    "Fuzzers":        "Splunk",
    "Analysis":       "Sentinel",
    "Backdoor":       "Splunk",
    "DoS":            "Splunk",
    "Exploits":       "Sentinel",
    "Generic":        "Sentinel",
    "Reconnaissance": "Splunk",
    "Shellcode":      "Splunk",
    "Worms":          "Sentinel",
    "Normal":         "Sentinel",
}

# Assigned role based on attack type
ROLE_MAP = {
    "Fuzzers":        "analyst",
    "Analysis":       "analyst",
    "Backdoor":       "engineer",
    "DoS":            "engineer",
    "Exploits":       "analyst",
    "Generic":        "analyst",
    "Reconnaissance": "analyst",
    "Shellcode":      "engineer",
    "Worms":          "engineer",
    "Normal":         "analyst",
}

# Assigned user based on role
USER_MAP = {
    "analyst":  ["r.reddy", "b.bindu"],
    "engineer": ["a.kasala", "k.magora"],
    "grc":      ["f.sagayaraj", "r.mashinge"],
}


def clean_value(v):
    """Convert numpy types and NaN to Python-native for JSON serialisation."""
    if isinstance(v, float) and np.isnan(v):
        return 0.0
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        return float(v)
    if isinstance(v, float) and np.isinf(v):
        return 0.0
    return v


def build_raw_log(row: pd.Series, attack_cat: str) -> str:
    """Build a simple raw log string from UNSW-NB15 features."""
    return (
        f"proto={row.get('proto', '?')}  "
        f"service={row.get('service', '?')}  "
        f"state={row.get('state', '?')}  "
        f"dur={row.get('dur', 0):.4f}s  "
        f"sbytes={int(row.get('sbytes', 0))}  "
        f"dbytes={int(row.get('dbytes', 0))}  "
        f"spkts={int(row.get('spkts', 0))}  "
        f"dpkts={int(row.get('dpkts', 0))}  "
        f"attack_cat={attack_cat}"
    )


def main():
    print("=" * 60)
    print("  RAID-SecOps — Batch Ingest from UNSW-NB15")
    print("=" * 60)

    # ── Check FastAPI is running ───────────────────────────────
    print("\n[1] Checking FastAPI connection...")
    try:
        r = requests.get(f"{BASE}/ml/status", timeout=5)
        d = r.json()
        if not d.get("models_ready"):
            print("  ✗ ML models not loaded. Start FastAPI first.")
            return
        print(f"  ✓ FastAPI running  |  Models ready  |  Features: {d.get('feature_count')}")
    except Exception as e:
        print(f"  ✗ Cannot reach FastAPI: {e}")
        print("  Start it first: python -m uvicorn main:app --reload --port 8000")
        return

    # ── Load test CSV ──────────────────────────────────────────
    print(f"\n[2] Loading UNSW-NB15 test set...")
    if not TEST_CSV.exists():
        print(f"  ✗ File not found: {TEST_CSV}")
        print("  Update TEST_CSV path at the top of this script.")
        return

    df = pd.read_csv(TEST_CSV, low_memory=False)
    df.columns = df.columns.str.strip().str.lower()
    print(f"  ✓ Loaded {len(df):,} samples")

    # ── Sample N records ───────────────────────────────────────
    # Stratified sample — get a mix of attack types
    print(f"\n[3] Selecting {N_SAMPLES} stratified samples...")
    rng = np.random.RandomState(RANDOM_STATE)

  # Simple random sample — no groupby needed
    sampled = df.sample(n=min(N_SAMPLES, len(df)), random_state=RANDOM_STATE).reset_index(drop=True)
    print(f"  ✓ Selected {len(sampled)} samples")
    print(f"  Category breakdown: {dict(sampled['attack_cat'].value_counts())}")

    # ── Push to FastAPI ────────────────────────────────────────
    print(f"\n[4] Pushing to FastAPI /ml/ingest...")
    print(f"  Target: {BASE}/ml/ingest")
    print(f"  Samples: {N_SAMPLES}  |  Sleep: {SLEEP_BETWEEN}s between requests\n")

    success = 0
    skipped = 0
    failed  = 0
    start   = time.time()

    for i, (_, row) in enumerate(sampled.iterrows()):
        # Build sample_id
        sample_id = f"UNSW-{i+1:04d}"

        # Get attack category
        attack_cat = str(row.get("attack_cat", "Unknown")).strip()
        if not attack_cat or attack_cat == "nan":
            attack_cat = "Unknown"

        # Build feature dict — only the columns the model needs
        features = {}
        for col in FEATURE_COLS:
            if col in row.index:
                features[col] = clean_value(row[col])
            else:
                # Default values for missing columns
                if col in ("proto", "service", "state"):
                    features[col] = "-"
                else:
                    features[col] = 0

        # Replace inf values
        features = {k: (0.0 if isinstance(v, float) and np.isinf(v) else v)
                   for k, v in features.items()}

        # Determine SIEM source and assigned role
        siem         = SIEM_MAP.get(attack_cat, "Splunk")
        assigned_role = ROLE_MAP.get(attack_cat, "analyst")
        users        = USER_MAP.get(assigned_role, ["r.reddy"])
        assigned_to  = users[i % len(users)]

        # Build raw log
        raw_log = build_raw_log(row, attack_cat)

        try:
            r = requests.post(
                f"{BASE}/ml/ingest",
                json={
                    "sample_id":     sample_id,
                    "features":      features,
                    "source_siem":   siem,
                    "attack_cat":    attack_cat,
                    "raw_log":       raw_log,
                    "assigned_role": assigned_role,
                    "assigned_to":   assigned_to,
                },
                timeout=30,
            )

            if r.status_code == 201:
                d = r.json()
                success += 1
                # Print every 10th result
                if (i + 1) % 10 == 0 or i < 3:
                    print(f"  [{i+1:>3}/{N_SAMPLES}] {sample_id} "
                          f"{'ATTACK' if d['status']=='ATTACK' else 'NORMAL ':6} "
                          f"{d['confidence']:.0%}  "
                          f"{attack_cat:<20}  "
                          f"{'⚑ DEFER' if d['defer_to_human'] else 'AUTO  '}")
            elif r.status_code == 409:
                skipped += 1  # already exists
            else:
                failed += 1
                if failed <= 3:
                    print(f"  [{i+1}] ✗ {sample_id}: {r.text[:100]}")

        except Exception as e:
            failed += 1
            if failed <= 3:
                print(f"  [{i+1}] ✗ {sample_id}: {e}")

        time.sleep(SLEEP_BETWEEN)

    elapsed = time.time() - start

    # ── Summary ────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  BATCH INGEST COMPLETE")
    print("=" * 60)
    print(f"  Saved    : {success}")
    print(f"  Skipped  : {skipped}  (already existed)")
    print(f"  Failed   : {failed}")
    print(f"  Time     : {elapsed:.1f}s  ({elapsed/max(success,1):.2f}s per alert)")
    print(f"\n  Open http://localhost:5173/alerts to see all alerts")
    print(f"  Total in DB: {success + 8} alerts (including original seed data)")


if __name__ == "__main__":
    main()
