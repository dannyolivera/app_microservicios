from typing import List
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
import schemas
from database import engine, get_db, Base, ensure_catalog_schema

# =============================================================================
# INICIALIZACIÓN DEL MICROSERVICIO DE CATÁLOGO (PUERTO 8001)
# =============================================================================

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)
ensure_catalog_schema()

app = FastAPI(
    title="InkaPharmacy - Catalog & Inventory Microservice (Click & Collect)",
    description="Microservicio para la gestión de catálogo e inventario farmacéutico con bloqueo atómico en tiempo real.",
    version="1.1.0",
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
    summary="Listar productos con paginación y filtros"
)
@app.get(
    "/api/v1/products",
    response_model=schemas.ProductPaginatedResponse,
    tags=["Products"],
    include_in_schema=False
)
def list_products(
    skip: int = Query(0, ge=0, description="Número de registros a omitir para paginación"),
    limit: int = Query(50, ge=1, le=100, description="Cantidad máxima de productos a retornar"),
    category_id: int = Query(None, description="Filtrar por ID de categoría"),
    db: Session = Depends(get_db)
):
    """
    Retorna la lista de productos farmacéuticos de manera paginada,
    con soporte para filtrado por categoría y sede.
    """
    query = db.query(models.Product)
    if category_id is not None:
        query = query.filter(models.Product.category_id == category_id)

    total = query.count()
    products = query.offset(skip).limit(limit).all()

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
@app.get(
    "/api/v1/products/{product_id}",
    response_model=schemas.ProductResponse,
    tags=["Products"],
    include_in_schema=False
)
def get_product_by_id(product_id: int, db: Session = Depends(get_db)):
    """
    Recupera los datos detallados de un producto a partir de su ID.
    Este endpoint es consumido internamente por el Microservicio de Pedidos (Orders Service)
    para verificar existencia, precio y stock antes de procesar una reserva Click & Collect.
    """
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} was not found in catalog."
        )
    return product


@app.patch(
    "/products/{product_id}/stock",
    response_model=schemas.ProductResponse,
    tags=["Stock & Concurrencia"],
    summary="Bloqueo o reposición atómica de inventario (Click & Collect)"
)
@app.patch(
    "/api/v1/products/{product_id}/stock",
    response_model=schemas.ProductResponse,
    tags=["Stock & Concurrencia"],
    include_in_schema=False
)
def update_product_stock(
    product_id: int,
    stock_in: schemas.StockUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Ejecuta el BLOQUEO ATÓMICO o la LIBERACIÓN/REVERSIÓN de stock en base de datos.
    Implementa bloqueo transaccional a nivel de fila (Row Locking con with_for_update)
    para prevenir sobreventas concurrentes cuando múltiples clientes intentan
    reservar simultáneamente la última unidad en la misma botica (Slides 7 y 8).
    
    Acciones:
    - 'block' / 'decrease': Descuenta del stock físico inmediatamente.
    - 'release' / 'increase': Repone el stock (usado en rollbacks por fallo de orden).
    """
    # Bloqueo a nivel de fila (SELECT ... FOR UPDATE) para evitar race conditions
    product = (
        db.query(models.Product)
        .filter(models.Product.id == product_id)
        .with_for_update()
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Producto con ID {product_id} no encontrado en el catálogo."
        )

    action = stock_in.action.lower()

    if action in ["block", "decrease", "reserve"]:
        if product.stock < stock_in.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Quiebre de stock: existencias insuficientes para '{product.name}'. "
                    f"Disponible: {product.stock}, Solicitado: {stock_in.quantity}."
                )
            )
        product.stock -= stock_in.quantity

    elif action in ["release", "increase", "rollback"]:
        product.stock += stock_in.quantity

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Acción '{stock_in.action}' no válida. Use 'block' o 'release'."
        )

    db.commit()
    db.refresh(product)
    return product

