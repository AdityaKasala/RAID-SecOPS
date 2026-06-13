from datetime import datetime
from sqlalchemy import (
    String, Boolean, Numeric, Text,
    DateTime, Integer, ForeignKey, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id:                       Mapped[int]            = mapped_column(primary_key=True)
    sample_id:                Mapped[str]            = mapped_column(String(50),  unique=True, nullable=False)
    siem_event_id:            Mapped[str | None]     = mapped_column(String(100), nullable=True)
    timestamp:                Mapped[datetime]       = mapped_column(DateTime(timezone=True), server_default=func.now())
    source_siem:              Mapped[str]            = mapped_column(String(20),  nullable=False)

    status:                   Mapped[str]            = mapped_column(String(10),  nullable=False)
    confidence:               Mapped[float]          = mapped_column(Numeric(5,4),nullable=False)
    attack_type:              Mapped[str]            = mapped_column(String(100), nullable=False, default="—")
    mitre_technique:          Mapped[str]            = mapped_column(String(200), nullable=False, default="—")

    isolation_forest_score:   Mapped[float | None]   = mapped_column(Numeric(8,4), nullable=True)
    random_forest_confidence: Mapped[float | None]   = mapped_column(Numeric(5,4), nullable=True)
    final_prediction:         Mapped[str | None]     = mapped_column(String(10),  nullable=True)
    models_agree:             Mapped[bool]           = mapped_column(Boolean,     nullable=False, default=True)

    defer_to_human:           Mapped[bool]           = mapped_column(Boolean,     nullable=False, default=False)
    investigation_status:     Mapped[str]            = mapped_column(String(25),  nullable=False, default="new")
    assigned_role:            Mapped[str]            = mapped_column(String(20),  nullable=False, default="analyst")
    assigned_to:              Mapped[str | None]     = mapped_column(String(100), nullable=True)

    rec_analyst:              Mapped[str | None]     = mapped_column(Text, nullable=True)
    rec_engineer:             Mapped[str | None]     = mapped_column(Text, nullable=True)
    rec_grc:                  Mapped[str | None]     = mapped_column(Text, nullable=True)

    raw_log:                  Mapped[str | None]     = mapped_column(Text, nullable=True)

    created_at:               Mapped[datetime]       = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at:               Mapped[datetime]       = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationship — one alert has many notes
    notes: Mapped[list["AlertNote"]] = relationship(
        "AlertNote", back_populates="alert",
        cascade="all, delete-orphan",
        order_by="AlertNote.created_at"
    )


class AlertNote(Base):
    __tablename__ = "alert_notes"

    id:         Mapped[int]      = mapped_column(primary_key=True)
    alert_id:   Mapped[int]      = mapped_column(Integer, ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False)
    author:     Mapped[str]      = mapped_column(String(100), nullable=False)
    role:       Mapped[str]      = mapped_column(String(20),  nullable=False)
    text:       Mapped[str]      = mapped_column(Text,        nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Back reference to parent alert
    alert: Mapped["Alert"] = relationship("Alert", back_populates="notes")
