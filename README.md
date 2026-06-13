RAID-SecOps: Hybrid ML Intrusion Detection System with Role-Aware Alert Governance

A full-stack, production-style cybersecurity platform that combines machine learning-based network intrusion detection with a governance-aware alert routing system. Built as a collaborative capstone project for the Yeshiva University M.S. Cybersecurity program.

My contribution to this project was the complete ML pipeline, risk scoring logic, and human-in-the-loop deferral mechanism described below.


What This System Does

Most intrusion detection systems stop at detection. RAID-SecOps goes further by asking: once a threat is detected, who needs to know, how urgently, and what should they do about it?

The system runs network traffic through a 14-stage ML pipeline that classifies threats, assigns calibrated risk scores, and then routes alerts based on severity and organizational role. Low-confidence detections are flagged for human review rather than acted on automatically, which is a deliberate responsible AI design choice.


Architecture Overview

Network Traffic (UNSW-NB15)
        |
        v
  Preprocessing Pipeline
  (feature engineering, normalization)
        |
        v
  Stage 1: Isolation Forest
  (anomaly detection - flags unusual traffic)
        |
        v
  Stage 2: Random Forest Classifier
  (threat classification - identifies attack type)
        |
        v
  Risk Scoring Engine
  (calibrated probability scoring per threat category)
        |
        v
  Human-in-the-Loop Gate
  (low-confidence predictions deferred for analyst review)
        |
        v
  Role-Aware Alert Router
  |              |              |
  v              v              v
SOC Analyst  Security Eng.   CISO
(Tier 1)     (Tier 2)      (Executive)


ML Pipeline Details

Dataset: UNSW-NB15 (Network Intrusion Dataset)

The UNSW-NB15 dataset contains network traffic with 49 features representing both normal behavior and nine attack categories including Fuzzers, DoS, Exploits, Reconnaissance, and Backdoors. It is a standard benchmark dataset for network intrusion detection research.

Model 1: Isolation Forest (Anomaly Detection)

The first stage uses an Isolation Forest to flag traffic that deviates meaningfully from baseline patterns. This unsupervised approach catches novel or low-signal threats that a classifier trained only on known attack types might miss.

Model 2: Random Forest Classifier (Threat Classification)

Traffic flagged by the Isolation Forest is passed to a Random Forest classifier that assigns a specific threat category and a confidence score. The Random Forest was chosen for its interpretability and strong performance on tabular network data.

Risk Scoring

Rather than binary alert or no-alert decisions, the system outputs a calibrated risk score that reflects both the predicted threat category and the model's confidence. This score is the primary input to the alert routing logic.

Human-in-the-Loop Deferral

Detections with risk scores below a defined confidence threshold are routed to a human analyst review queue rather than triggering automated responses. This design pattern is directly aligned with the GOVERN and MANAGE functions of the NIST AI Risk Management Framework, which emphasize keeping humans appropriately involved in consequential AI-assisted decisions.


Alert Routing Logic

Alerts are not sent to everyone. The routing engine maps risk score ranges and threat categories to specific organizational roles:

Risk LevelRecipientActionHigh confidence, critical threatCISOExecutive notification with impact summaryHigh confidence, operational threatSecurity EngineerTechnical remediation briefModerate confidenceSOC AnalystInvestigation queue with supporting dataLow confidenceHuman Review QueueManual triage before any action

This role-aware design reduces alert fatigue and ensures the right people receive the right information at the right level of detail.


Technology Stack

ML and Data
Python, scikit-learn, pandas, NumPy, Jupyter Notebook

Backend
FastAPI, SQLAlchemy, PostgreSQL, JWT authentication, role-based access control (RBAC)

Frontend
React, TypeScript, Tailwind CSS, Vite

Security Design
RBAC with JWT, bcrypt password hashing, input validation, role-segregated API endpoints


Repository Structure

Raid-SecOps/
  ML/
    raid-secops.ipynb          # Full ML pipeline: preprocessing, training, evaluation
    raid_outputs/
      charts/                  # Confusion matrices, ROC curves, feature importance plots
  raid-secops-backend/
    main.py                    # FastAPI application entry point
    models.py                  # Database models
    auth.py                    # JWT authentication logic
    routers/                   # API route handlers by function
    schemas.py                 # Pydantic validation schemas
    alert_models.py            # Alert data structures
  src/                         # React frontend source
  db schemes/                  # PostgreSQL schema definitions
  requirements.txt             # Python dependencies


Running the Project

Prerequisites: Python 3.10 or higher, Node.js 18 or higher, PostgreSQL

Backend setup

bashcd raid-secops-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

Frontend setup

bashnpm install
npm run dev

ML Pipeline

Open ML/raid-secops.ipynb in Jupyter Notebook and run all cells. The notebook trains both models from scratch and serializes evaluation outputs to raid_outputs/charts/.

Note: Pre-trained model files (.pkl) are excluded from this repository due to file size. Running the notebook reproduces all models from the dataset.

The UNSW-NB15 dataset is publicly available from the University of New South Wales Canberra Cyber Range Lab.


GRC Relevance

This project was deliberately designed with governance considerations in mind, not just detection performance:

The human-in-the-loop deferral mechanism addresses a core requirement in the NIST AI RMF: that organizations maintain appropriate human oversight of AI systems making or informing consequential decisions.

The role-based alert routing reflects information governance principles, specifically that access to security findings should be scoped to the roles and responsibilities of the recipient.

The calibrated risk scoring approach, rather than binary classification, supports more nuanced risk-based decision making consistent with risk management frameworks like NIST SP 800-53 and ISO 27001.


Team

This was a collaborative capstone project. My contributions: ML pipeline design and implementation, risk scoring engine and human-in-the-loop deferral logic.
