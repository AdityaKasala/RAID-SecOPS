from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload
from typing import Optional

from database      import get_db
from alert_models  import Alert, AlertNote
from alert_schemas import (
    AlertOut, AlertRow, DashboardSummary,
    NoteCreate, NoteOut, UpdateInvStatus, AlertIngest,
    ModelScores, Recommendations
)

router = APIRouter(prefix="/alerts", tags=["alerts"])


# ── Helper: map DB row → AlertRow (list view) ────────────────
def to_alert_row(a: Alert) -> AlertRow:
    return AlertRow(
        sampleId=a.sample_id,
        siemEventId=a.siem_event_id,
        timestamp=a.timestamp,
        sourceSiem=a.source_siem,
        status=a.status,
        confidence=float(a.confidence),
        attackType=a.attack_type,
        mitreTechnique=a.mitre_technique,
        deferToHuman=a.defer_to_human,
        investigationStatus=a.investigation_status,
        assignedRole=a.assigned_role,
        assignedTo=a.assigned_to,
        modelsAgree=a.models_agree,
    )


# ── Helper: map DB row → AlertOut (full detail) ──────────────
def to_alert_out(a: Alert) -> AlertOut:
    return AlertOut(
        sampleId=a.sample_id,
        siemEventId=a.siem_event_id,
        timestamp=a.timestamp,
        sourceSiem=a.source_siem,
        status=a.status,
        confidence=float(a.confidence),
        attackType=a.attack_type,
        mitreTechnique=a.mitre_technique,
        deferToHuman=a.defer_to_human,
        investigationStatus=a.investigation_status,
        assignedRole=a.assigned_role,
        assignedTo=a.assigned_to,
        modelScores=ModelScores(
            isolationForestScore=float(a.isolation_forest_score) if a.isolation_forest_score is not None else None,
            randomForestConfidence=float(a.random_forest_confidence) if a.random_forest_confidence is not None else None,
            finalPrediction=a.final_prediction,
            modelsAgree=a.models_agree,
        ),
        recommendations=Recommendations(
            analyst=a.rec_analyst,
            engineer=a.rec_engineer,
            grc=a.rec_grc,
        ),
        rawLog=a.raw_log,
        notes=[
            NoteOut(
                id=n.id,
                author=n.author,
                role=n.role,
                text=n.text,
                createdAt=n.created_at,
            )
            for n in a.notes
        ],
    )


# ════════════════════════════════════════════════════════════
# GET /alerts/summary  — Dashboard stats
# ════════════════════════════════════════════════════════════
@router.get("/summary", response_model=DashboardSummary)
async def get_summary(db: AsyncSession = Depends(get_db)):
    """Returns counts for the Dashboard stat cards + recent alerts."""

    total     = await db.scalar(select(func.count()).select_from(Alert))
    attacks   = await db.scalar(select(func.count()).select_from(Alert).where(Alert.status == "ATTACK"))
    deferred  = await db.scalar(select(func.count()).select_from(Alert).where(Alert.defer_to_human == True))
    escalated = await db.scalar(select(func.count()).select_from(Alert).where(Alert.investigation_status == "escalated"))

    # 5 most recent alerts for the dashboard table
    recent_result = await db.execute(
        select(Alert).order_by(Alert.timestamp.desc()).limit(5)
    )
    recent = recent_result.scalars().all()

    return DashboardSummary(
        totalAlertsProcessed=total or 0,
        predictedAttacks=attacks or 0,
        humanReviewAlerts=deferred or 0,
        connectedSources=2,   # Splunk + Sentinel — update when dynamic
        openEscalations=escalated or 0,
        recentAlerts=[to_alert_row(a) for a in recent],
    )


# ════════════════════════════════════════════════════════════
# GET /alerts  — Alerts Queue (with filters)
# ════════════════════════════════════════════════════════════
@router.get("", response_model=list[AlertRow])
async def list_alerts(
    status:      Optional[str] = Query(None, description="ATTACK or NORMAL"),
    source_siem: Optional[str] = Query(None, description="Splunk or Sentinel"),
    defer:       Optional[bool]= Query(None, description="true or false"),
    search:      Optional[str] = Query(None, description="Search sample_id, attack_type, mitre"),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all alerts with optional filters.
    Used by the Alerts Queue page.
    """
    query = select(Alert).order_by(Alert.timestamp.desc())

    if status:
        query = query.where(Alert.status == status.upper())
    if source_siem:
        query = query.where(Alert.source_siem == source_siem)
    if defer is not None:
        query = query.where(Alert.defer_to_human == defer)
    if search:
        q = f"%{search.lower()}%"
        query = query.where(
            Alert.sample_id.ilike(q) |
            Alert.attack_type.ilike(q) |
            Alert.mitre_technique.ilike(q) |
            Alert.source_siem.ilike(q)
        )

    result = await db.execute(query)
    alerts = result.scalars().all()
    return [to_alert_row(a) for a in alerts]


# ════════════════════════════════════════════════════════════
# GET /alerts/{sample_id}  — Alert Detail
# ════════════════════════════════════════════════════════════
@router.get("/{sample_id}", response_model=AlertOut)
async def get_alert(sample_id: str, db: AsyncSession = Depends(get_db)):
    """
    Returns full alert detail including model scores,
    recommendations, raw log, and notes.
    Used by the Alert Detail / Investigation page.
    """
    result = await db.execute(
        select(Alert)
        .where(Alert.sample_id == sample_id)
        .options(selectinload(Alert.notes))
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert '{sample_id}' not found."
        )

    return to_alert_out(alert)


# ════════════════════════════════════════════════════════════
# PATCH /alerts/{sample_id}/status  — Update investigation status
# ════════════════════════════════════════════════════════════
@router.patch("/{sample_id}/status", response_model=AlertOut)
async def update_status(
    sample_id: str,
    body: UpdateInvStatus,
    db: AsyncSession = Depends(get_db),
):
    """
    Updates the investigation status of an alert.
    Called by action buttons: Investigate, Escalate, Close.
    """
    result = await db.execute(
        select(Alert)
        .where(Alert.sample_id == sample_id)
        .options(selectinload(Alert.notes))
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert '{sample_id}' not found.")

    alert.investigation_status = body.investigationStatus
    await db.commit()
    await db.refresh(alert)

    return to_alert_out(alert)


# ════════════════════════════════════════════════════════════
# POST /alerts/{sample_id}/notes  — Add a note
# ════════════════════════════════════════════════════════════
@router.post("/{sample_id}/notes", response_model=NoteOut, status_code=201)
async def add_note(
    sample_id: str,
    body: NoteCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Adds an analyst note to an alert.
    Called by the Notes panel Save Note button.
    """
    result = await db.execute(
        select(Alert).where(Alert.sample_id == sample_id)
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert '{sample_id}' not found.")

    note = AlertNote(
        alert_id=alert.id,
        author=body.author,
        role=body.role,
        text=body.text,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    return NoteOut(
        id=note.id,
        author=note.author,
        role=note.role,
        text=note.text,
        createdAt=note.created_at,
    )


# ════════════════════════════════════════════════════════════
# POST /alerts/ingest  — ML pipeline pushes a new alert
# ════════════════════════════════════════════════════════════
@router.post("/ingest", status_code=201)
async def ingest_alert(body: AlertIngest, db: AsyncSession = Depends(get_db)):
    """
    Called by the ML pipeline to push a new scored alert.
    This is the endpoint your ML team will call when the
    model finishes scoring an event from Splunk / Sentinel.
    """
    # Check if sample_id already exists
    existing = await db.execute(
        select(Alert).where(Alert.sample_id == body.sampleId)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"Alert '{body.sampleId}' already exists."
        )

    alert = Alert(
        sample_id=body.sampleId,
        siem_event_id=body.siemEventId,
        timestamp=body.timestamp,
        source_siem=body.sourceSiem,
        status=body.status,
        confidence=body.confidence,
        attack_type=body.attackType,
        mitre_technique=body.mitreTechnique,
        isolation_forest_score=body.isolationForestScore,
        random_forest_confidence=body.randomForestConfidence,
        final_prediction=body.finalPrediction,
        models_agree=body.modelsAgree,
        defer_to_human=body.deferToHuman,
        assigned_role=body.assignedRole,
        assigned_to=body.assignedTo,
        rec_analyst=body.recAnalyst,
        rec_engineer=body.recEngineer,
        rec_grc=body.recGrc,
        raw_log=body.rawLog,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    return {"message": "Alert ingested successfully.", "sample_id": alert.sample_id}
