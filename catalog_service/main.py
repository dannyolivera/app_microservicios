from typing import List
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
import schemas
from database import engine, get_db, Base

# =============================================================================
# INICIALIZACIÓN DEL MICROSERVICIO DE CATÁLOGO (PUERTO 8001)
# =============================================================================

# Crear tablas si no existen (ideal para desarrollo rápido o antes de aplicar migraciones)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="InkaPharmacy - Catalog Microservice",
    description="Microservicio encargado de la gestión de categorías y productos farmacéuticos.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Habilitar CORS para permitir peticiones desde aplicaciones cliente frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# ENDPOINTS DE SALUD Y ESTADO
# =============================================================================

@app.get("/", tags=["Health"])
def root_status():
    """
    Ruta raíz para verificación rápida de disponibilidad del microservicio.
    """
    return {
        "service": "Catalog Service",
        "status": "online",
        "port": 8001,
        "database": "db_catalogo_inka"
    }


# =============================================================================
# ENDPOINTS PARA CATEGORÍAS
# =============================================================================

@app.post(
    "/categories/",
    response_model=schemas.CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Categories"],
    summary="Crear una nueva categoría"
)
def create_category(category_in: schemas.CategoryCreate, db: Session = Depends(get_db)):
    """
    Crea una nueva categoría farmacéutica en la base de datos.
    Verifica previamente que no exista otra categoría con el mismo nombre.
    """
    existing_category = db.query(models.Category).filter(
        func.lower(models.Category.name) == category_in.name.lower()
    ).first()

    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category with name '{category_in.name}' already exists."
        )

    category = models.Category(
        name=category_in.name,
        description=category_in.description
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@app.get(
    "/categories/",
    response_model=List[schemas.CategoryResponse],
    tags=["Categories"],
    summary="Listar todas las categorías"
)
def list_categories(db: Session = Depends(get_db)):
    """
    Obtiene la lista completa de categorías farmacéuticas disponibles.
    """
    categories = db.query(models.Category).order_by(models.Category.name.asc()).all()
    return categories


# =============================================================================
# ENDPOINTS PARA PRODUCTOS
# =============================================================================

@app.post(
    "/products/",
    response_model=schemas.ProductResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Products"],
    summary="Crear un nuevo producto"
)
def create_product(product_in: schemas.ProductCreate, db: Session = Depends(get_db)):
    """
    Registra un nuevo producto en el catálogo farmacéutico.
    Valida la existencia de la categoría referenciada.
    """
    # Validar que la categoría exista en la base de datos
    category = db.query(models.Category).filter(models.Category.id == product_in.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with id {product_in.category_id} not found."
        )

    product = models.Product(
        name=product_in.name,
        description=product_in.description,
        price=product_in.price,
        stock=product_in.stock,
        category_id=product_in.category_id
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@app.get(
    "/products/",
    response_model=schemas.ProductPaginatedResponse,
    tags=["Products"],
    summary="Listar productos con paginación"
)
def list_products(
    skip: int = Query(0, ge=0, description="Número de registros a omitir para paginación"),
    limit: int = Query(10, ge=1, le=100, description="Cantidad máxima de productos a retornar"),
    db: Session = Depends(get_db)
):
    """
    Retorna la lista de productos farmacéuticos de manera paginada,
    junto con el contador total de registros.
    """
    total = db.query(models.Product).count()
    products = db.query(models.Product).offset(skip).limit(limit).all()

    return schemas.ProductPaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=products
    )


@app.get(
    "/products/{product_id}",
    response_model=schemas.ProductResponse,
    tags=["Products"],
    summary="Obtener producto por ID (Utilizado por otros microservicios)"
)
def get_product_by_id(product_id: int, db: Session = Depends(get_db)):
    """
    Recupera los datos detallados de un producto a partir de su ID.
    Este endpoint es consumido internamente por el Microservicio de Pedidos (Orders Service)
    para verificar existencia, precio y stock antes de procesar una compra.
    """
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} was not found in catalog."
        )
    return product
