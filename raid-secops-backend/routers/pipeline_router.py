from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Literal
from datetime import datetime, timezone

from database     import get_db
from alert_models import Alert

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


# ── Response schema ───────────────────────────────────────────
class SiemStatus(BaseModel):
    connected:           bool
    lastIngestionTime:   str
    totalAlertsReceived: int


class PipelineStatusResponse(BaseModel):
    splunk:                  SiemStatus
    sentinel:                SiemStatus
    preprocessingStatus:     Literal["healthy", "warning", "error"]
    isolationForestStatus:   Literal["loaded", "not_loaded", "error"]
    randomForestStatus:      Literal["loaded", "not_loaded", "error"]
    pipelineHealth:          Literal["healthy", "degraded", "down"]
    isoParams:               str
    rfParams:                str
    totalAlertsInDb:         int
    lastUpdated:             str


# ════════════════════════════════════════════════════════════
# GET /pipeline/status
# ════════════════════════════════════════════════════════════
@router.get("/status", response_model=PipelineStatusResponse)
async def get_pipeline_status(db: AsyncSession = Depends(get_db)):
    """
    Returns live pipeline and SIEM integration status.
    Counts are derived from the alerts table in real time.
    SIEM connection flags and model status are currently
    static — update these when the ML pipeline is live.
    """

    # Count alerts per SIEM source from the real database
    splunk_count = await db.scalar(
        select(func.count()).select_from(Alert)
        .where(Alert.source_siem == "Splunk")
    )
    sentinel_count = await db.scalar(
        select(func.count()).select_from(Alert)
        .where(Alert.source_siem == "Sentinel")
    )

    # Get the most recent ingestion timestamp per SIEM
    splunk_last = await db.scalar(
        select(func.max(Alert.timestamp))
        .where(Alert.source_siem == "Splunk")
    )
    sentinel_last = await db.scalar(
        select(func.max(Alert.timestamp))
        .where(Alert.source_siem == "Sentinel")
    )

    # Total alerts in database
    total = await db.scalar(select(func.count()).select_from(Alert))

    # Format timestamps
    def fmt(dt: datetime | None) -> str:
        if dt is None:
            return "No data yet"
        # Make sure it's timezone-aware
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

    now = datetime.now(timezone.utc).isoformat()

    return PipelineStatusResponse(
        splunk=SiemStatus(
            connected=True,                          # update when ML pipeline is live
            lastIngestionTime=fmt(splunk_last),
            totalAlertsReceived=splunk_count or 0,
        ),
        sentinel=SiemStatus(
            connected=True,                          # update when ML pipeline is live
            lastIngestionTime=fmt(sentinel_last),
            totalAlertsReceived=sentinel_count or 0,
        ),
        preprocessingStatus="healthy",               # update when ML pipeline is live
        isolationForestStatus="loaded",              # update when ML pipeline is live
        randomForestStatus="loaded",                 # update when ML pipeline is live
        pipelineHealth="healthy",                    # update when ML pipeline is live
        isoParams="contamination=0.499 · 200 estimators · random_state=42",
        rfParams="200 estimators · max_depth=None · class_weight=balanced",
        totalAlertsInDb=total or 0,
        lastUpdated=now,
    )
