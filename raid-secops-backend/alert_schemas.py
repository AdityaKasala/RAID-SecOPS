from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime


# ── Shared types ─────────────────────────────────────────────
UserRole           = Literal["analyst", "engineer", "grc"]
AlertStatus        = Literal["ATTACK", "NORMAL"]
InvestigationStatus = Literal["open", "investigating", "escalated", "closed"]
SourceSiem         = Literal["Splunk", "Sentinel", "Mock"]


# ── Model Scores ─────────────────────────────────────────────
class ModelScores(BaseModel):
    isolationForestScore:    Optional[float]
    randomForestConfidence:  Optional[float]
    finalPrediction:         Optional[AlertStatus]
    modelsAgree:             bool

    model_config = {"from_attributes": True}


# ── Note ─────────────────────────────────────────────────────
class NoteOut(BaseModel):
    id:        int
    author:    str
    role:      UserRole
    text:      str
    createdAt: datetime

    model_config = {"from_attributes": True}


class NoteCreate(BaseModel):
    author: str
    role:   UserRole
    text:   str


# ── Recommendations ──────────────────────────────────────────
class Recommendations(BaseModel):
    analyst:  Optional[str]
    engineer: Optional[str]
    grc:      Optional[str]

    model_config = {"from_attributes": True}


# ── Alert (full) ─────────────────────────────────────────────
class AlertOut(BaseModel):
    sampleId:            str
    siemEventId:         Optional[str]
    timestamp:           datetime
    sourceSiem:          SourceSiem
    status:              AlertStatus
    confidence:          float
    attackType:          str
    mitreTechnique:      str
    deferToHuman:        bool
    investigationStatus: InvestigationStatus
    assignedRole:        UserRole
    assignedTo:          Optional[str]
    modelScores:         ModelScores
    recommendations:     Recommendations
    rawLog:              Optional[str]
    notes:               list[NoteOut] = []

    model_config = {"from_attributes": True}


# ── Alert (list row — no notes, no raw log) ──────────────────
class AlertRow(BaseModel):
    sampleId:            str
    siemEventId:         Optional[str]
    timestamp:           datetime
    sourceSiem:          SourceSiem
    status:              AlertStatus
    confidence:          float
    attackType:          str
    mitreTechnique:      str
    deferToHuman:        bool
    investigationStatus: InvestigationStatus
    assignedRole:        UserRole
    assignedTo:          Optional[str]
    modelsAgree:         bool

    model_config = {"from_attributes": True}


# ── Dashboard summary ────────────────────────────────────────
class DashboardSummary(BaseModel):
    totalAlertsProcessed: int
    predictedAttacks:     int
    humanReviewAlerts:    int
    connectedSources:     int
    openEscalations:      int
    recentAlerts:         list[AlertRow]


# ── Update investigation status ──────────────────────────────
class UpdateInvStatus(BaseModel):
    investigationStatus: InvestigationStatus


# ── Ingest (ML pipeline pushes new alert) ───────────────────
class AlertIngest(BaseModel):
    sampleId:                str
    siemEventId:             Optional[str]       = None
    timestamp:               Optional[datetime]  = None
    sourceSiem:              SourceSiem           = "Mock"
    status:                  AlertStatus
    confidence:              float
    attackType:              str                  = "—"
    mitreTechnique:          str                  = "—"
    isolationForestScore:    Optional[float]      = None
    randomForestConfidence:  Optional[float]      = None
    finalPrediction:         Optional[AlertStatus] = None
    modelsAgree:             bool                 = True
    deferToHuman:            bool                 = False
    assignedRole:            UserRole             = "analyst"
    assignedTo:              Optional[str]        = None
    recAnalyst:              Optional[str]        = None
    recEngineer:             Optional[str]        = None
    recGrc:                  Optional[str]        = None
    rawLog:                  Optional[str]        = None
