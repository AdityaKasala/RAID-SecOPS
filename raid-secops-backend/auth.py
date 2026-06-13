from datetime import datetime, timedelta, timezone
import bcrypt
from jose import jwt
from config import settings


def verify_password(plain: str, hashed: str) -> bool:
    """Compare plain-text password against bcrypt hash."""
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))


def hash_password(plain: str) -> str:
    """Hash a plain-text password."""
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt(12)).decode('utf-8')


def create_access_token(data: dict) -> str:
    """Create a signed JWT with expiry."""
    payload = data.copy()
    expire  = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload.update({"exp": expire})
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
