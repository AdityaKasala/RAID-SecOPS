from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Always find .env relative to this file — works from any folder
ENV_FILE = Path(__file__).parent / ".env"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8"
    )

    DATABASE_URL:      str
    JWT_SECRET:        str
    JWT_ALGORITHM:     str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480
    FRONTEND_ORIGIN:   str = "http://localhost:5173"

    # ML model artifacts directory
    # Points to the raid_outputs/models folder from the ML pipeline
    ML_MODEL_DIR:      str = ""   # empty = auto-detect from common paths

settings = Settings()
