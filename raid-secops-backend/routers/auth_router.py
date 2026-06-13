from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timezone

from database import get_db
from models   import User
from schemas  import LoginRequest, LoginResponse, UserPublic
from auth import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate a user.
    Checks:
      1. Username exists in DB
      2. Role in DB matches role selected on the login screen
      3. Password matches the stored bcrypt hash
    Returns a JWT access token on success.
    """

    # 1. Look up the user
    result = await db.execute(select(User).where(User.username == body.username.strip().lower()))
    user: User | None = result.scalar_one_or_none()

    # Generic error — don't reveal whether username or password was wrong
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid username, password, or role.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not user or not user.is_active:
        raise credentials_error

    # 2. Check role matches
    if user.role != body.role:
        raise credentials_error

    # 3. Verify password
    if not verify_password(body.password, user.password_hash):
        raise credentials_error

    # 4. Update last_login timestamp
    await db.execute(
        update(User)
        .where(User.id == user.id)
        .values(last_login=datetime.now(timezone.utc))
    )
    await db.commit()

    # 5. Issue JWT
    token = create_access_token({
        "sub":       user.username,
        "role":      user.role,
        "full_name": user.full_name,
        "user_id":   user.id,
    })

    return LoginResponse(
        access_token=token,
        user=UserPublic.model_validate(user),
    )
