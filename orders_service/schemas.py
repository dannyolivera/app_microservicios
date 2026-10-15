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
    Esquema para crear un nuevo pedido.
    Requiere el ID del usuario y una lista de ítems a comprar.
    """
    user_id: int = Field(..., gt=0, description="ID del usuario cliente (Microservicio de Usuarios)")
    items: List[OrderItemCreate] = Field(..., min_length=1, description="Lista de productos a incluir en la orden")


class OrderResponse(BaseModel):
    """
    Esquema detallado de la orden con su estado, fecha, monto total e ítems incluidos.
    """
    id: int = Field(..., description="Identificador único de la orden")
    user_id: int = Field(..., description="ID del usuario que realizó el pedido")
    total_amount: Decimal = Field(..., description="Monto total del pedido")
    status: OrderStatus = Field(..., description="Estado actual de la orden (PENDING, COMPLETED, CANCELLED)")
    created_at: datetime = Field(..., description="Fecha y hora de registro")
    items: List[OrderItemResponse] = Field(default_factory=list, description="Lista de ítems asociados al pedido")

    model_config = ConfigDict(from_attributes=True)
