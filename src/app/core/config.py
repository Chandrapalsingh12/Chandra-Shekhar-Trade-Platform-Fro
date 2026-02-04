from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
import os

PROJECT_DIR = Path(__file__).resolve().parent.parent.parent.parent
ENV_PATH = PROJECT_DIR / ".env"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Trading Platform"
    API_V1_STR: str = "/api/v1"

    DATABENTO_KEY: str = "unset"
    # TradeStation
    TRADESTATION_REFRESH_TOKEN: str = "unset"
    TRADESTATION_CLIENT_ID: str = "unset"
    TRADESTATION_CLIENT_SECRET: str = "unset"

    USE_SIMULATION: bool = True
    TRADESTATION_ACCOUNT_ID: str = "SIM_123456" # must provide this for Real execution

    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_ignore_empty=True,
        extra="ignore"
    )

settings = Settings()
