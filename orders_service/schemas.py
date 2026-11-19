from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict

# =============================================================================
# ESQUEMAS PYDANTIC (VALIDACIÓN Y SERIALIZACIÓN - PEDIDOS Y ÓRDENES)
# =============================================================================

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


class OnlinePaymentDetails(BaseModel):
    """Datos enviados al microservicio de pagos cuando payment_method=PAGO_ONLINE."""
    method_type: str = Field("CARD", description="CARD o YAPE")
    email: Optional[str] = Field(None, max_length=150)
    card_number: Optional[str] = None
    card_holder: Optional[str] = None
    exp_month: Optional[int] = Field(None, ge=1, le=12)
    exp_year: Optional[int] = Field(None, ge=0, le=9999)
    cvv: Optional[str] = None
    yape_phone: Optional[str] = None
    yape_code: Optional[str] = None
    culqi_token: Optional[str] = None


class OrderCreate(BaseModel):
    """
    Esquema para crear una reserva o pedido para retiro en botica.
    Soporta pago presencial en caja o pago online mediante payments_service.
    """
    user_id: int = Field(..., gt=0, description="ID del usuario cliente (Microservicio de Usuarios)")
    items: List[OrderItemCreate] = Field(..., min_length=1, description="Lista de productos a incluir en la orden")
    branch_id: int = Field(1, gt=0, description="ID de la botica cuyo inventario se descontará")
    branch: Optional[str] = Field(
        "Inkafarma Miraflores (Av. Larco 450)",
        description="Nombre de la sede botica física para el recojo",
    )
    payment_method: str = Field(
        "PAGO_EN_CAJA_PRESENCIAL",
        description="Modalidad: PAGO_EN_CAJA_PRESENCIAL o PAGO_ONLINE",
    )
    payment_details: Optional[OnlinePaymentDetails] = Field(
        None,
        description="Detalle del medio de pago cuando payment_method=PAGO_ONLINE",
    )


class OrderResponse(BaseModel):
    """
    Esquema detallado del ticket de retiro en botica.
    """
    id: int = Field(..., description="Identificador único de la orden")
    pickup_code: Optional[str] = Field(None, description="Código alfanumérico único para retirar en botica")
    user_id: int = Field(..., description="ID del usuario que realizó el pedido")
    total_amount: Decimal = Field(..., description="Monto total del pedido")
    branch_id: Optional[int] = Field(None, description="ID de sede de retiro")
    branch: Optional[str] = Field(None, description="Sede de retiro asignada")
    payment_method: Optional[str] = Field(None, description="Modalidad de pago elegida")
    payment_id: Optional[int] = Field(None, description="ID de transacción en payments_service")
    payment_reference: Optional[str] = Field(None, description="Código de operación de la pasarela")
    payment_status: Optional[str] = Field(None, description="Estado de pago: PENDING_IN_STORE, PAID_ONLINE, PAID_IN_STORE, REFUNDED")
    status: str = Field(..., description="Estado de la orden (RESERVED, PAID, COLLECTED, CANCELLED)")
    created_at: datetime = Field(..., description="Fecha y hora de registro")
    items: List[OrderItemResponse] = Field(default_factory=list, description="Lista de ítems asociados al pedido")

    model_config = ConfigDict(from_attributes=True)
