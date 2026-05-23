from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    APP_NAME: str = "Theatre Canteen API"
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    ALGORITHM: str = "HS256"
    DATABASE_URL: str
    CORS_ORIGINS: str = "http://localhost:5173"

    class Config:
        # Ensure we load backend/.env regardless of current working directory
        env_file = str(Path(__file__).resolve().parents[2] / ".env")
        env_file_encoding = "utf-8"

settings = Settings()
