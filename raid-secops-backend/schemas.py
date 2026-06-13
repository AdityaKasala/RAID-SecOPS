from pydantic import BaseModel
from typing import Literal


# ── Request ──────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str
    role:     Literal["analyst", "engineer", "grc"]


# ── Response ─────────────────────────────────────────────────
class LoginResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user: "UserPublic"


class UserPublic(BaseModel):
    id:        int
    username:  str
    role:      str
    full_name: str
    email:     str | None

    model_config = {"from_attributes": True}


LoginResponse.model_rebuild()
