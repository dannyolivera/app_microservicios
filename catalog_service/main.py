from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
import schemas
from database import engine, get_db, Base, ensure_catalog_schema

# =============================================================================
# INICIALIZACIÓN DEL MICROSERVICIO DE CATÁLOGO E INVENTARIO POR SEDE (PUERTO 8001)
# =============================================================================

Base.metadata.create_all(bind=engine)
ensure_catalog_schema()

app = FastAPI(
    title="InkaPharmacy - Catalog & Multi-Branch Inventory Microservice",
    description="Microservicio para gestión de catálogo, boticas e inventario independiente por sede con bloqueo atómico.",
    version="1.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _serialize_branch_product(
    product: models.Product,
    inv: models.BranchInventory,
    branch: models.Branch,
) -> schemas.ProductResponse:
    return schemas.ProductResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        price=product.price,
        stock=inv.stock,
        category_id=product.category_id,
        branch=branch.name,
        branch_id=branch.id,
        is_available=inv.is_available,
    )


def _query_branch_products(
    db: Session,
    branch_id: int,
    skip: int,
    limit: int,
    category_id: Optional[int],
) -> schemas.ProductPaginatedResponse:
    branch = (
        db.query(models.Branch)
        .filter(models.Branch.id == branch_id, models.Branch.is_active == True)
        .first()
    )
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Botica con ID {branch_id} no encontrada o inactiva.",
        )

    query = (
        db.query(models.Product, models.BranchInventory)
        .join(
            models.BranchInventory,
            models.BranchInventory.product_id == models.Product.id,
        )
        .filter(
            models.BranchInventory.branch_id == branch_id,
            models.BranchInventory.is_available == True,
        )
    )
    if category_id is not None:
        query = query.filter(models.Product.category_id == category_id)

    total = query.count()
    rows = (
        query.order_by(models.Product.id.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    items = [_serialize_branch_product(prod, inv, branch) for prod, inv in rows]
    return schemas.ProductPaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=items,
    )


def _sync_product_aggregate_stock(db: Session, product: models.Product) -> None:
    total_stock = (
        db.query(func.coalesce(func.sum(models.BranchInventory.stock), 0))
        .filter(models.BranchInventory.product_id == product.id)
        .scalar()
    )
    product.stock = int(total_stock or 0)


# =============================================================================
# ENDPOINTS DE SALUD Y ESTADO
# =============================================================================

@app.get("/", tags=["Health"])
def root_status():
    """Ruta raíz para verificación rápida de disponibilidad del microservicio."""
    return {
        "service": "Catalog & Multi-Branch Inventory Service",
        "status": "online",
        "port": 8001,
        "database": "db_catalogo_inka",
    }


# =============================================================================
# ENDPOINTS PARA BOTICAS / SEDES E INVENTARIO INDEPENDIENTE
# =============================================================================

@app.get(
    "/branches/",
    response_model=List[schemas.BranchResponse],
    tags=["Branches & Inventory"],
    summary="Listar boticas activas con cantidad de productos disponibles",
)
@app.get(
    "/api/v1/branches",
    response_model=List[schemas.BranchResponse],
    tags=["Branches & Inventory"],
    include_in_schema=False,
)
def list_branches(db: Session = Depends(get_db)):
    branches = (
        db.query(models.Branch)
        .filter(models.Branch.is_active == True)
        .order_by(models.Branch.id.asc())
        .all()
    )
    counts = dict(
        db.query(models.BranchInventory.branch_id, func.count(models.BranchInventory.id))
        .filter(models.BranchInventory.is_available == True)
        .group_by(models.BranchInventory.branch_id)
        .all()
    )
    return [
        schemas.BranchResponse(
            id=b.id,
            code=b.code,
            name=b.name,
            address=b.address,
            district=b.district,
            is_active=b.is_active,
            available_products_count=int(counts.get(b.id, 0)),
        )
        for b in branches
    ]


@app.post(
    "/branches/",
    response_model=schemas.BranchResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Branches & Inventory"],
    summary="Registrar una nueva botica / sede",
)
def create_branch(branch_in: schemas.BranchCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(models.Branch)
        .filter(
            (func.lower(models.Branch.code) == branch_in.code.lower())
            | (func.lower(models.Branch.name) == branch_in.name.lower())
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una botica con ese código o nombre.",
        )

    branch = models.Branch(
        code=branch_in.code.upper(),
        name=branch_in.name,
        address=branch_in.address,
        district=branch_in.district,
        is_active=branch_in.is_active,
    )
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return schemas.BranchResponse(
        id=branch.id,
        code=branch.code,
        name=branch.name,
        address=branch.address,
        district=branch.district,
        is_active=branch.is_active,
        available_products_count=0,
    )


@app.get(
    "/branches/{branch_id}/products",
    response_model=schemas.ProductPaginatedResponse,
    tags=["Branches & Inventory"],
    summary="Listar productos y stock disponibles en una botica específica",
)
@app.get(
    "/api/v1/branches/{branch_id}/products",
    response_model=schemas.ProductPaginatedResponse,
    tags=["Branches & Inventory"],
    include_in_schema=False,
)
def list_branch_products(
    branch_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    return _query_branch_products(db, branch_id, skip, limit, category_id)


@app.put(
    "/branches/{branch_id}/inventory/{product_id}",
    response_model=schemas.BranchInventoryResponse,
    tags=["Branches & Inventory"],
    summary="Asignar o actualizar stock y disponibilidad de un producto en una botica",
)
def upsert_branch_inventory(
    branch_id: int,
    product_id: int,
    inv_in: schemas.BranchInventoryUpsert,
    db: Session = Depends(get_db),
):
    branch = db.query(models.Branch).filter(models.Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Botica con ID {branch_id} no encontrada.",
        )

    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Producto con ID {product_id} no encontrado.",
        )

    inv = (
        db.query(models.BranchInventory)
        .filter(
            models.BranchInventory.branch_id == branch_id,
            models.BranchInventory.product_id == product_id,
        )
        .first()
    )
    if inv:
        inv.stock = inv_in.stock
        inv.is_available = inv_in.is_available
    else:
        inv = models.BranchInventory(
            branch_id=branch_id,
            product_id=product_id,
            stock=inv_in.stock,
            is_available=inv_in.is_available,
        )
        db.add(inv)

    db.flush()
    _sync_product_aggregate_stock(db, product)
    db.commit()
    db.refresh(inv)

    return schemas.BranchInventoryResponse(
        branch_id=branch.id,
        branch_name=branch.name,
        product_id=product.id,
        stock=inv.stock,
        is_available=inv.is_available,
    )


# =============================================================================
# ENDPOINTS PARA CATEGORÍAS
# =============================================================================

@app.post(
    "/categories/",
    response_model=schemas.CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Categories"],
    summary="Crear una nueva categoría",
)
def create_category(category_in: schemas.CategoryCreate, db: Session = Depends(get_db)):
    existing_category = db.query(models.Category).filter(
        func.lower(models.Category.name) == category_in.name.lower()
    ).first()

    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category with name '{category_in.name}' already exists.",
        )

    category = models.Category(
        name=category_in.name,
        description=category_in.description,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@app.get(
    "/categories/",
    response_model=List[schemas.CategoryResponse],
    tags=["Categories"],
    summary="Listar todas las categorías",
)
def list_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).order_by(models.Category.name.asc()).all()


# =============================================================================
# ENDPOINTS PARA PRODUCTOS
# =============================================================================

@app.post(
    "/products/",
    response_model=schemas.ProductResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Products"],
    summary="Crear un nuevo producto en el catálogo maestro",
)
def create_product(product_in: schemas.ProductCreate, db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.id == product_in.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with id {product_in.category_id} not found.",
        )

    product = models.Product(
        name=product_in.name,
        description=product_in.description,
        price=product_in.price,
        stock=product_in.stock,
        branch=product_in.branch,
        category_id=product_in.category_id,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@app.get(
    "/products/",
    response_model=schemas.ProductPaginatedResponse,
    tags=["Products"],
    summary="Listar productos con paginación y filtro opcional por botica (branch_id)",
)
@app.get(
    "/api/v1/products",
    response_model=schemas.ProductPaginatedResponse,
    tags=["Products"],
    include_in_schema=False,
)
def list_products(
    skip: int = Query(0, ge=0, description="Número de registros a omitir para paginación"),
    limit: int = Query(50, ge=1, le=100, description="Cantidad máxima de productos a retornar"),
    category_id: Optional[int] = Query(None, description="Filtrar por ID de categoría"),
    branch_id: Optional[int] = Query(None, gt=0, description="Filtrar catálogo y stock por ID de botica"),
    db: Session = Depends(get_db),
):
    """
    Si se envía `branch_id`, devuelve únicamente el surtido habilitado y el stock real
    de esa botica. Si se omite, retorna el catálogo maestro consolidado.
    """
    if branch_id is not None:
        return _query_branch_products(db, branch_id, skip, limit, category_id)

    query = db.query(models.Product)
    if category_id is not None:
        query = query.filter(models.Product.category_id == category_id)

    total = query.count()
    products = query.order_by(models.Product.id.asc()).offset(skip).limit(limit).all()

    return schemas.ProductPaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=products,
    )


@app.get(
    "/products/{product_id}",
    response_model=schemas.ProductResponse,
    tags=["Products"],
    summary="Obtener producto por ID (con stock específico si se envía branch_id)",
)
@app.get(
    "/api/v1/products/{product_id}",
    response_model=schemas.ProductResponse,
    tags=["Products"],
    include_in_schema=False,
)
def get_product_by_id(
    product_id: int,
    branch_id: Optional[int] = Query(None, gt=0, description="ID de botica para consultar disponibilidad y stock"),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} was not found in catalog.",
        )

    if branch_id is None:
        return product

    branch = (
        db.query(models.Branch)
        .filter(models.Branch.id == branch_id, models.Branch.is_active == True)
        .first()
    )
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Botica con ID {branch_id} no encontrada o inactiva.",
        )

    inv = (
        db.query(models.BranchInventory)
        .filter(
            models.BranchInventory.branch_id == branch_id,
            models.BranchInventory.product_id == product_id,
            models.BranchInventory.is_available == True,
        )
        .first()
    )
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El producto '{product.name}' no está disponible en {branch.name}.",
        )

    return _serialize_branch_product(product, inv, branch)


@app.patch(
    "/products/{product_id}/stock",
    response_model=schemas.ProductResponse,
    tags=["Stock & Concurrencia"],
    summary="Bloqueo o reposición atómica de inventario por sede",
)
@app.patch(
    "/api/v1/products/{product_id}/stock",
    response_model=schemas.ProductResponse,
    tags=["Stock & Concurrencia"],
    include_in_schema=False,
)
def update_product_stock(
    product_id: int,
    stock_in: schemas.StockUpdateRequest,
    db: Session = Depends(get_db),
):
    """
    Ejecuta bloqueo (`block`) o reposición (`release`) atómica mediante `SELECT ... FOR UPDATE`.
    Cuando se envía `branch_id`, bloquea la fila exacta en `branch_inventory` de esa botica
    y sincroniza el consolidado en `products.stock`.
    """
    action = stock_in.action.lower()

    if stock_in.branch_id is not None:
        branch = (
            db.query(models.Branch)
            .filter(models.Branch.id == stock_in.branch_id, models.Branch.is_active == True)
            .first()
        )
        if not branch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Botica con ID {stock_in.branch_id} no encontrada o inactiva.",
            )

        inv = (
            db.query(models.BranchInventory)
            .filter(
                models.BranchInventory.branch_id == stock_in.branch_id,
                models.BranchInventory.product_id == product_id,
            )
            .with_for_update()
            .first()
        )
        product = (
            db.query(models.Product)
            .filter(models.Product.id == product_id)
            .with_for_update()
            .first()
        )

        if not product or not inv or not inv.is_available:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"El producto #{product_id} no está disponible en {branch.name}.",
            )

        if action in ["block", "decrease", "reserve"]:
            if inv.stock < stock_in.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Quiebre de stock en {branch.name}: existencias insuficientes para "
                        f"'{product.name}'. Disponible: {inv.stock}, Solicitado: {stock_in.quantity}."
                    ),
                )
            inv.stock -= stock_in.quantity
        elif action in ["release", "increase", "rollback"]:
            inv.stock += stock_in.quantity
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Acción '{stock_in.action}' no válida. Use 'block' o 'release'.",
            )

        db.flush()
        _sync_product_aggregate_stock(db, product)
        db.commit()
        db.refresh(inv)
        db.refresh(product)
        return _serialize_branch_product(product, inv, branch)

    # Fallback de compatibilidad si se invoca sin branch_id
    product = (
        db.query(models.Product)
        .filter(models.Product.id == product_id)
        .with_for_update()
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Producto con ID {product_id} no encontrado en el catálogo.",
        )

    if action in ["block", "decrease", "reserve"]:
        if product.stock < stock_in.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Quiebre de stock: existencias insuficientes para '{product.name}'. "
                    f"Disponible: {product.stock}, Solicitado: {stock_in.quantity}."
                ),
            )
        product.stock -= stock_in.quantity
    elif action in ["release", "increase", "rollback"]:
        product.stock += stock_in.quantity
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Acción '{stock_in.action}' no válida. Use 'block' o 'release'.",
        )

    db.commit()
    db.refresh(product)
    return product
