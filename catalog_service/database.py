import os
from pathlib import Path
from sqlalchemy import create_engine, text, func
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env local del microservicio
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# =============================================================================
# CONFIGURACIÓN DE CONEXIÓN A BASE DE DATOS (CATALOG SERVICE)
# =============================================================================
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "db_catalogo_inka")

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

DEFAULT_BRANCHES = [
    {
        "id": 1,
        "code": "INKA-MIR",
        "name": "Inkafarma Miraflores (Av. Larco 450)",
        "address": "Av. Larco 450",
        "district": "Miraflores",
    },
    {
        "id": 2,
        "code": "INKA-SIS",
        "name": "Inkafarma San Isidro (Av. Javier Prado 1200)",
        "address": "Av. Javier Prado 1200",
        "district": "San Isidro",
    },
    {
        "id": 3,
        "code": "INKA-LIM",
        "name": "Inkafarma Lima Centro (Jr. de la Unión 600)",
        "address": "Jr. de la Unión 600",
        "district": "Lima Centro",
    },
]

EXTRA_PRODUCTS = [
    {
        "id": 6,
        "name": "Alcohol Medicinal 70° - Frasco 250ml",
        "description": "Antiséptico tópico de uso externo para botiquín familiar.",
        "price": 7.90,
        "stock": 60,
        "category_id": 2,
    },
    {
        "id": 7,
        "name": "Loratadina 10mg - Caja 10 Tabletas",
        "description": "Antihistamínico para el alivio de síntomas de rinitis y alergias.",
        "price": 9.50,
        "stock": 33,
        "category_id": 1,
    },
    {
        "id": 8,
        "name": "Colágeno Hidrolizado + Magnesio - Frasco 300g",
        "description": "Suplemento nutricional para articulaciones y bienestar óseo.",
        "price": 54.90,
        "stock": 12,
        "category_id": 3,
    },
]

# Inventario inicial diferenciado por sede:
# - Algunas sedes no cuentan con ciertos productos (surtido distinto por botica).
# - Cada sede maneja su propio stock (incluyendo unidades bajas o agotadas en Lima Centro).
INITIAL_BRANCH_INVENTORY = {
    1: {1: 50, 2: 30, 3: 20, 4: 15, 5: 40, 8: 12},
    2: {1: 18, 2: 4, 4: 28, 5: 22, 6: 35, 7: 14},
    3: {1: 85, 2: 0, 3: 3, 5: 16, 6: 25, 7: 19},
}


def ensure_catalog_schema():
    """
    Garantiza de forma idempotente la compatibilidad de columnas y siembra inicial
    de sedes (`branches`) e inventario independiente (`branch_inventory`) cuando aún está vacío.
    """
    try:
        with engine.connect() as conn:
            conn.execute(
                text(
                    "ALTER TABLE products ADD COLUMN branch VARCHAR(150) "
                    "DEFAULT 'Sede Inkafarma - Miraflores'"
                )
            )
            conn.commit()
    except Exception:
        pass

    import models

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if db.query(models.Branch).count() == 0:
            for branch_data in DEFAULT_BRANCHES:
                db.add(models.Branch(**branch_data, is_active=True))
            db.commit()

        existing_cat_ids = {cid for (cid,) in db.query(models.Category.id).all()}
        if {1, 2, 3}.issubset(existing_cat_ids):
            inserted_extra = False
            for prod_data in EXTRA_PRODUCTS:
                exists = (
                    db.query(models.Product.id)
                    .filter(models.Product.id == prod_data["id"])
                    .first()
                )
                if not exists:
                    db.add(
                        models.Product(
                            id=prod_data["id"],
                            name=prod_data["name"],
                            description=prod_data["description"],
                            price=prod_data["price"],
                            stock=prod_data["stock"],
                            branch="Stock distribuido por sede",
                            category_id=prod_data["category_id"],
                        )
                    )
                    inserted_extra = True
            if inserted_extra:
                db.commit()

        if (
            db.query(models.BranchInventory).count() == 0
            and db.query(models.Product).count() > 0
        ):
            existing_branch_ids = {bid for (bid,) in db.query(models.Branch.id).all()}
            existing_prod_ids = {pid for (pid,) in db.query(models.Product.id).all()}

            for branch_id, stock_map in INITIAL_BRANCH_INVENTORY.items():
                if branch_id not in existing_branch_ids:
                    continue
                for product_id, qty in stock_map.items():
                    if product_id not in existing_prod_ids:
                        continue
                    db.add(
                        models.BranchInventory(
                            branch_id=branch_id,
                            product_id=product_id,
                            stock=qty,
                            is_available=True,
                        )
                    )

            db.flush()

            # Sincroniza el consolidado global inicial en `products.stock`
            for product in db.query(models.Product).all():
                total_stock = (
                    db.query(func.coalesce(func.sum(models.BranchInventory.stock), 0))
                    .filter(models.BranchInventory.product_id == product.id)
                    .scalar()
                )
                product.stock = int(total_stock or 0)

            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


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
