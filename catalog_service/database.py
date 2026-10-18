import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env local del microservicio
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# =============================================================================
# CONFIGURACIÓN DE CONEXIÓN A BASE DE DATOS (CATALOG SERVICE)
# =============================================================================
# Por defecto se conecta a MySQL en localhost:3306 con usuario root y sin contraseña.
# Modifique las credenciales según su entorno local o configure el archivo .env.
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "db_catalogo_inka")

# Formato de URL de conexión usando el conector pymysql para MySQL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# Creación del motor de SQLAlchemy con pool_pre_ping para reconexiones automáticas
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600
)

from sqlalchemy import text

# Fábrica de sesiones para interactuar con la base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Clase base declarativa para la definición de los modelos ORM
Base = declarative_base()


def ensure_catalog_schema():
    """
    Garantiza de forma idempotente que columnas como 'branch' existan
    en la base de datos incluso si ya fue creada con el esquema previo.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE products ADD COLUMN branch VARCHAR(150) DEFAULT 'Sede Inkafarma - Miraflores'"))
            conn.commit()
    except Exception:
        pass


def get_db():
    """
    Función generadora de dependencia (Dependency Injection) para FastAPI.
    Proporciona una sesión de base de datos por cada petición HTTP y
    garantiza el cierre adecuado de la conexión al finalizar.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
