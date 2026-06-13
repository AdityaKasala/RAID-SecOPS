"""
RAID-SecOps ML Inference — Connection Test (Fixed)
"""
import requests

BASE = "http://localhost:8000"

print("=" * 60)
print("  RAID-SecOps ML Inference — Connection Test")
print("=" * 60)

# Test 1
print("\n[1] GET /ml/status")
r = requests.get(f"{BASE}/ml/status", timeout=5)
d = r.json()
print(f"  Models ready: {d.get('models_ready')}")
print(f"  Features    : {d.get('feature_count')}")
print(f"  IF threshold: {d.get('if_threshold')}")

# Exact UNSW-NB15 feature names
features = {
    "dur": 0.121094, "spkts": 6, "dpkts": 4, "sbytes": 258,
    "dbytes": 172, "rate": 82.983, "sttl": 63, "dttl": 252,
    "sload": 10843.97, "dload": 7236.32, "sloss": 0, "dloss": 0,
    "sinpkt": 0.024, "dinpkt": 0.040, "sjit": 0.001, "djit": 0.002,
    "swin": 255, "stcpb": 3421, "dtcpb": 1234, "dwin": 255,
    "tcprtt": 0.012, "synack": 0.006, "ackdat": 0.006,
    "smean": 43, "dmean": 43, "trans_depth": 0, "response_body_len": 0,
    "ct_srv_src": 6, "ct_state_ttl": 2, "ct_dst_ltm": 1,
    "ct_src_dport_ltm": 1, "ct_dst_sport_ltm": 1, "ct_dst_src_ltm": 1,
    "is_ftp_login": 0, "ct_ftp_cmd": 0, "ct_flw_http_mthd": 0,
    "ct_src_ltm": 1, "ct_srv_dst": 6, "is_sm_ips_ports": 0,
    "proto": "tcp", "service": "-", "state": "FIN",
}

# Test 2
print("\n[2] POST /ml/predict")
r = requests.post(f"{BASE}/ml/predict",
    json={"features": features, "source_siem": "Mock", "attack_cat": "Generic"},
    timeout=15)
print(f"  Status    : {r.status_code}")
if r.status_code == 200:
    d = r.json()
    print(f"  Prediction: {d['status']}  ({d['confidence']:.1%})")
    print(f"  RF proba  : {d['random_forest_confidence']:.1%}")
    print(f"  IF score  : {d['isolation_forest_score']:+.4f}")
    print(f"  Defer     : {d['defer_to_human']}")
    print(f"  Latency   : {d['inference_time_ms']:.1f}ms")
    print("  ✓ Predict working")
else:
    print(f"  ✗ {r.text}")

# Test 3 - normal sample
print("\n[3] POST /ml/ingest — Generic sample")
r = requests.post(f"{BASE}/ml/ingest",
    json={"sample_id": "TEST-ML-001", "features": features,
          "source_siem": "Mock", "attack_cat": "Reconnaissance",
          "raw_log": "2026-03-23 09:00:00 src=192.168.1.45 proto=tcp flags=SYN",
          "assigned_role": "analyst", "assigned_to": "r.reddy"},
    timeout=15)
print(f"  Status    : {r.status_code}")
if r.status_code == 201:
    d = r.json()
    print(f"  Saved     : {d['sample_id']} — {d['status']} ({d['confidence']:.1%})")
    print(f"  MITRE     : {d['mitre_technique']}")
    print("  ✓ Ingest working — check Alerts Queue in UI")
elif r.status_code == 409:
    print("  ℹ Already exists — ✓ duplicate prevention working")
else:
    print(f"  ✗ {r.text}")

# Test 4 - DoS attack
print("\n[4] POST /ml/ingest — DoS attack sample")
dos = features.copy()
dos.update({"dur": 0.000001, "spkts": 5000, "dpkts": 0,
            "sbytes": 250000, "dbytes": 0, "rate": 5000000.0,
            "sload": 2000000.0, "dload": 0.0, "proto": "udp", "state": "CON"})
r = requests.post(f"{BASE}/ml/ingest",
    json={"sample_id": "TEST-ML-002", "features": dos,
          "source_siem": "Splunk", "attack_cat": "DoS",
          "raw_log": "2026-03-23 09:01:00 src=185.220.101.1 proto=udp bytes=250000",
          "assigned_role": "engineer", "assigned_to": "a.kasala"},
    timeout=15)
print(f"  Status    : {r.status_code}")
if r.status_code == 201:
    d = r.json()
    print(f"  Saved     : {d['sample_id']} — {d['status']} ({d['confidence']:.1%})")
    print(f"  MITRE     : {d['mitre_technique']}")
    print("  ✓ DoS alert saved")
elif r.status_code == 409:
    print("  ℹ Already exists")
else:
    print(f"  ✗ {r.text}")

print("\n" + "=" * 60)
print("  Done — open http://localhost:5173/alerts to see new alerts")
print("=" * 60)
