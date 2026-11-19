from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict

# =============================================================================
# ESQUEMAS PYDANTIC (VALIDACIÓN Y SERIALIZACIÓN - CATÁLOGO Y SEDES)
# =============================================================================

# --- Esquemas de Categoría ---

class CategoryBase(BaseModel):
    """Esquema base con atributos compartidos de categoría."""
    name: str = Field(..., min_length=2, max_length=100, description="Nombre de la categoría farmacéutica")
    description: Optional[str] = Field(None, description="Descripción opcional de la categoría")


class CategoryCreate(CategoryBase):
    """Esquema requerido para la creación de una nueva categoría."""
    pass


class CategoryResponse(CategoryBase):
    """Esquema de respuesta devuelto al cliente con el ID generado."""
    id: int = Field(..., description="Identificador único de la categoría")

    model_config = ConfigDict(from_attributes=True)


# --- Esquemas de Botica / Sede ---

class BranchBase(BaseModel):
    """Esquema base de una sede física de Inkafarma."""
    code: str = Field(..., min_length=2, max_length=30, description="Código interno de sede (ej. INKA-MIR)")
    name: str = Field(..., min_length=3, max_length=150, description="Nombre visible de la botica")
    address: Optional[str] = Field(None, max_length=200, description="Dirección física")
    district: Optional[str] = Field(None, max_length=100, description="Distrito")
    is_active: bool = Field(True, description="Indica si la botica está habilitada")


class BranchCreate(BranchBase):
    """Esquema para registrar una nueva botica."""
    pass


class BranchResponse(BranchBase):
    """Esquema de salida de una botica con conteo de productos disponibles."""
    id: int = Field(..., description="Identificador único de la botica")
    available_products_count: int = Field(0, description="Cantidad de productos habilitados en esta sede")

    model_config = ConfigDict(from_attributes=True)


class BranchInventoryUpsert(BaseModel):
    """Esquema para asignar o actualizar inventario y disponibilidad de un producto en una sede."""
    stock: int = Field(..., ge=0, description="Unidades físicas disponibles en la sede")
    is_available: bool = Field(True, description="Define si el producto forma parte del surtido de la sede")


class BranchInventoryResponse(BaseModel):
    """Esquema de respuesta de inventario por sede."""
    branch_id: int
    branch_name: str
    product_id: int
    stock: int
    is_available: bool


# --- Esquemas de Producto ---

class ProductBase(BaseModel):
    """Esquema base con atributos compartidos de un producto farmacéutico."""
    name: str = Field(..., min_length=2, max_length=150, description="Nombre comercial y presentación del producto")
    description: Optional[str] = Field(None, description="Detalles o principio activo del producto")
    price: Decimal = Field(..., gt=0, decimal_places=2, description="Precio unitario en soles (PEN)")
    stock: int = Field(..., ge=0, description="Cantidad disponible en stock (de la sede o consolidado)")
    category_id: int = Field(..., gt=0, description="Identificador de la categoría a la que pertenece")
    branch: Optional[str] = Field("Sede Inkafarma - Miraflores", description="Sede o botica física asociada")


class ProductCreate(ProductBase):
    """Esquema para registrar un nuevo producto en el catálogo."""
    pass


class ProductResponse(ProductBase):
    """Esquema devuelto al consultar un producto (incluye ID y sede consultada)."""
    id: int = Field(..., description="Identificador único del producto")
    branch_id: Optional[int] = Field(None, description="ID de la sede cuando se consulta por botica")
    is_available: bool = Field(True, description="Indica si el producto está habilitado en la sede")

    model_config = ConfigDict(from_attributes=True)


class StockUpdateRequest(BaseModel):
    """
    Esquema para actualización / bloqueo atómico de inventario por sede.
    Soporta operaciones de bloqueo ('block' / 'decrease') o reversión ('release' / 'increase').
    """
    quantity: int = Field(..., gt=0, description="Cantidad de unidades a modificar")
    action: str = Field(
        "block",
        description="Acción a realizar: 'block' (bloqueo/reserva) o 'release' (liberación/rollback)",
    )
    branch_id: Optional[int] = Field(
        None,
        gt=0,
        description="ID de la botica cuyo inventario independiente se descontará o repondrá",
    )


class ProductPaginatedResponse(BaseModel):
    """Esquema estructurado para respuestas paginadas de productos."""
    total: int = Field(..., description="Total de productos registrados")
    skip: int = Field(..., description="Desplazamiento aplicado")
    limit: int = Field(..., description="Límite de registros devueltos")
    items: List[ProductResponse] = Field(..., description="Lista de productos recuperados")
