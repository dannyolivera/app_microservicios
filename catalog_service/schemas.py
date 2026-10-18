from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict

# =============================================================================
# ESQUEMAS PYDANTIC (VALIDACIÓN Y SERIALIZACIÓN - CATÁLOGO)
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


# --- Esquemas de Producto ---

class ProductBase(BaseModel):
    """Esquema base con atributos compartidos de un producto farmacéutico."""
    name: str = Field(..., min_length=2, max_length=150, description="Nombre comercial y presentación del producto")
    description: Optional[str] = Field(None, description="Detalles o principio activo del producto")
    price: Decimal = Field(..., gt=0, decimal_places=2, description="Precio unitario en soles (PEN)")
    stock: int = Field(..., ge=0, description="Cantidad disponible en stock")
    category_id: int = Field(..., gt=0, description="Identificador de la categoría a la que pertenece")
    branch: Optional[str] = Field("Sede Inkafarma - Miraflores", description="Sede o botica física asociada")


class ProductCreate(ProductBase):
    """Esquema para registrar un nuevo producto en el catálogo."""
    pass


class ProductResponse(ProductBase):
    """Esquema devuelto al consultar un producto (incluye ID)."""
    id: int = Field(..., description="Identificador único del producto")

    model_config = ConfigDict(from_attributes=True)


class StockUpdateRequest(BaseModel):
    """
    Esquema para actualización / bloqueo atómico de inventario (Click & Collect).
    Soporta operaciones de bloqueo ('block' / 'decrease') o reversión ('release' / 'increase').
    """
    quantity: int = Field(..., gt=0, description="Cantidad de unidades a modificar")
    action: str = Field(
        "block",
        description="Acción a realizar: 'block' (bloqueo/reserva) o 'release' (liberación/rollback)"
    )


class ProductPaginatedResponse(BaseModel):
    """Esquema estructurado para respuestas paginadas de productos."""
    total: int = Field(..., description="Total de productos registrados")
    skip: int = Field(..., description="Desplazamiento aplicado")
    limit: int = Field(..., description="Límite de registros devueltos")
    items: List[ProductResponse] = Field(..., description="Lista de productos recuperados")
