from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class User(Base):
    __tablename__ = "users"

    id:            Mapped[int]           = mapped_column(primary_key=True)
    username:      Mapped[str]           = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str]           = mapped_column(nullable=False)
    role:          Mapped[str]           = mapped_column(String(20), nullable=False)
    full_name:     Mapped[str]           = mapped_column(String(150), nullable=False)
    email:         Mapped[str | None]    = mapped_column(String(200), nullable=True)
    is_active:     Mapped[bool]          = mapped_column(Boolean, default=True, nullable=False)
    created_at:    Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_login:    Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
