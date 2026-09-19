import os
from pydantic_settings import BaseSettings if False else object

class Settings:
    PROJECT_NAME: str = "VISTRA 3D Cadastre"
    API_PREFIX: str = "/api"
    HOST: str = os.getenv("VISTRA_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("VISTRA_PORT", "8000"))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///vistra_cadastre.db")
    DEFAULT_CRS: str = "EPSG:4326"
    DEFAULT_STATE: str = "KA"
    DEFAULT_DISTRICT: str = "BLR"

settings = Settings()
