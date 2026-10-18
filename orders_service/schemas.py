from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict
from models import OrderStatus

# =============================================================================
# ESQUEMAS PYDANTIC (VALIDACIÓN Y SERIALIZACIÓN - PEDIDOS Y ÓRDENES)
# =============================================================================

# --- Esquemas de Ítems del Pedido ---

class OrderItemBase(BaseModel):
    """Atributos base de un ítem de orden."""
    product_id: int = Field(..., gt=0, description="ID del producto en el microservicio de catálogo")
    quantity: int = Field(..., gt=0, description="Cantidad de unidades a comprar")


class OrderItemCreate(OrderItemBase):
    """Esquema de entrada al solicitar la compra de un producto."""
    pass


class OrderItemResponse(OrderItemBase):
    """Esquema de salida de un ítem con su precio unitario registrado."""
    id: int = Field(..., description="Identificador único del ítem")
    order_id: int = Field(..., description="ID de la orden a la que pertenece")
    unit_price: Decimal = Field(..., description="Precio unitario fijado en la compra")

    model_config = ConfigDict(from_attributes=True)


# --- Esquemas de la Orden Principal ---

class OrderCreate(BaseModel):
    """
    Esquema para crear una nueva reserva Click & Collect.
    Requiere el ID del usuario, lista de medicamentos y sede física seleccionada.
    """
    user_id: int = Field(..., gt=0, description="ID del usuario cliente (Microservicio de Usuarios)")
    items: List[OrderItemCreate] = Field(..., min_length=1, description="Lista de productos a incluir en la orden")
    branch: Optional[str] = Field("Sede Inkafarma - Miraflores (Av. Larco 450)", description="Sede botica física para el recojo")


class OrderResponse(BaseModel):
    """
    Esquema detallado del ticket de reserva Click & Collect.
    Incluye el código único de recojo y la sede de atención.
    """
    id: int = Field(..., description="Identificador único de la orden")
    pickup_code: Optional[str] = Field(None, description="Código alfanumérico único para retirar en botica (Slide 2 y 12)")
    user_id: int = Field(..., description="ID del usuario que realizó el pedido")
    total_amount: Decimal = Field(..., description="Monto total a pagar en caja física")
    branch: Optional[str] = Field(None, description="Sede de retiro asignada")
    payment_method: Optional[str] = Field(None, description="Modalidad de pago presencial")
    status: str = Field(..., description="Estado de la orden (RESERVED, COLLECTED, CANCELLED)")
    created_at: datetime = Field(..., description="Fecha y hora de registro")
    items: List[OrderItemResponse] = Field(default_factory=list, description="Lista de ítems asociados al pedido")

    model_config = ConfigDict(from_attributes=True)
