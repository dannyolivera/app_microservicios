import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env local del microservicio
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# =============================================================================
# CONFIGURACIÓN DE CONEXIÓN A BASE DE DATOS (ORDERS SERVICE)
# =============================================================================
# Conexión aislada para el microservicio de pedidos (Database-per-Service)
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "db_pedidos_inka")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600
)

from sqlalchemy import text

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_orders_schema():
    """
    Garantiza de forma idempotente que las columnas de Click & Collect
    (pickup_code, branch, payment_method) y compatibilidad de status
    existan en la tabla orders de db_pedidos_inka.
    """
    statements = [
        "ALTER TABLE orders ADD COLUMN pickup_code VARCHAR(50) NULL UNIQUE",
        "ALTER TABLE orders ADD COLUMN branch VARCHAR(150) NULL DEFAULT 'Sede Inkafarma - Miraflores (Av. Larco 450)'",
        "ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) NULL DEFAULT 'PAGO_EN_CAJA_PRESENCIAL'",
        "ALTER TABLE orders MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'RESERVED'"
    ]
    try:
        with engine.connect() as conn:
            for stmt in statements:
                try:
                    conn.execute(text(stmt))
                    conn.commit()
                except Exception:
                    pass
    except Exception:
        pass


def get_db():
    """
    Función inyectora de dependencia para obtener la sesión de base de datos
    correspondiente a cada petición en el microservicio de órdenes/pedidos.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
