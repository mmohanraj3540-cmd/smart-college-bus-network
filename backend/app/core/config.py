from pydantic_settings import BaseSettings
from typing import List, Union
from pydantic import field_validator
import json

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart College Bus Network"
    DATABASE_URL: str = "sqlite:///./sql_app.db"
    JWT_SECRET: str = "super_secret_jwt_key_for_development_only_12345"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    CORS_ORIGINS: Union[List[str], str] = ["*"]
    
    MAP_PROVIDER: str = "leaflet"
    MAP_API_KEY: str = ""

    GPS_UPDATE_INTERVAL: int = 7000
    GPS_STATIONARY_INTERVAL: int = 15000
    STALE_LOCATION_THRESHOLD: int = 30000
    MAX_ALTERNATIVE_STOP_DISTANCE: int = 1000

    @field_validator('CORS_ORIGINS', mode='after')
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped.startswith('[') and v_stripped.endswith(']'):
                try:
                    return json.loads(v_stripped)
                except Exception:
                    pass
            return [origin.strip() for origin in v_stripped.split(',') if origin.strip()]
        return list(v)
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
