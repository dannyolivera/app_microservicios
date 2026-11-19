import os
import re
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env local del microservicio
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# =============================================================================
# CONFIGURACIÓN DE CONEXIÓN A BASE DE DATOS (PAYMENTS SERVICE)
# =============================================================================
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "db_pagos_inka")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_payments_database():
    """
    Crea automáticamente la base de datos db_pagos_inka si aún no existe en MySQL,
    permitiendo levantar el servicio sin fallar antes de re-ejecutar init_db.sql.
    """
    try:
        parsed_url = make_url(DATABASE_URL)
        target_db = parsed_url.database or DB_NAME
        if not target_db or not re.fullmatch(r"[A-Za-z0-9_]+", target_db):
            return

        server_url = parsed_url.set(database="")
        temp_engine = create_engine(server_url)
        try:
            with temp_engine.connect() as conn:
                conn.execute(
                    text(
                        f"CREATE DATABASE IF NOT EXISTS `{target_db}` "
                        "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                    )
                )
                conn.commit()
        finally:
            temp_engine.dispose()
    except Exception:
        pass


def get_db():
    """
    Función inyectora de dependencia para obtener la sesión de base de datos
    correspondiente a cada petición en el microservicio de pagos.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
