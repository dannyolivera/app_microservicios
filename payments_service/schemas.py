from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict

# =============================================================================
# ESQUEMAS PYDANTIC (VALIDACIÓN Y SERIALIZACIÓN - PAGOS ONLINE)
# =============================================================================

class PaymentChargeRequest(BaseModel):
    """Solicitud de cobro online (tarjeta o Yape, o token de Culqi)."""
    user_id: int = Field(..., gt=0, description="ID del cliente en users_service")
    amount: Decimal = Field(..., gt=0, decimal_places=2, description="Monto a cobrar en PEN")
    currency: str = Field("PEN", min_length=3, max_length=10, description="Moneda de la transacción")
    email: Optional[str] = Field(None, max_length=150, description="Correo del cliente")
    order_reference: Optional[str] = Field(None, max_length=60, description="Código o referencia de la orden")
    method_type: str = Field("CARD", description="Método online: CARD o YAPE")

    # Datos de tarjeta (usados por el adaptador local mock; nunca se persiste PAN ni CVV)
    card_number: Optional[str] = None
    card_holder: Optional[str] = None
    exp_month: Optional[int] = Field(None, ge=1, le=12)
    exp_year: Optional[int] = Field(None, ge=0, le=9999)
    cvv: Optional[str] = None

    # Datos de Yape (usados por el adaptador local mock)
    yape_phone: Optional[str] = None
    yape_code: Optional[str] = None

    # Token de pasarela externa (usado cuando PAYMENT_PROVIDER=culqi)
    culqi_token: Optional[str] = None


class PaymentResponse(BaseModel):
    """Respuesta pública del registro de pago (sin datos sensibles de tarjeta)."""
    id: int
    transaction_code: str
    order_reference: Optional[str] = None
    user_id: int
    amount: Decimal
    currency: str
    provider: str
    method_type: str
    card_brand: Optional[str] = None
    card_last4: Optional[str] = None
    holder_name: Optional[str] = None
    status: str
    authorization_code: Optional[str] = None
    decline_reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RefundRequest(BaseModel):
    """Solicitud de extorno/reembolso por cancelación o compensación."""
    reason: Optional[str] = Field(
        "Cancelación o compensación de orden",
        max_length=200,
        description="Motivo del reembolso",
    )
