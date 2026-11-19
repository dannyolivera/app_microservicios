import enum
from datetime import datetime
from sqlalchemy import Column, Integer, Numeric, String, DateTime
from database import Base

# =============================================================================
# ENUMERACIÓN DE ESTADOS DE PAGO
# =============================================================================

class PaymentStatus(str, enum.Enum):
    APPROVED = "APPROVED"
    DECLINED = "DECLINED"
    REFUNDED = "REFUNDED"


# =============================================================================
# MODELO ORM DE TRANSACCIONES DE PAGO (DB_PAGOS_INKA)
# =============================================================================

class Payment(Base):
    """
    Registro transaccional de pagos online (nunca persiste PAN completo ni CVV).
    """
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    transaction_code = Column(String(60), nullable=False, unique=True, index=True)
    order_reference = Column(String(60), nullable=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="PEN")
    provider = Column(String(30), nullable=False, default="mock")
    method_type = Column(String(30), nullable=False, default="CARD")
    card_brand = Column(String(30), nullable=True)
    card_last4 = Column(String(4), nullable=True)
    holder_name = Column(String(150), nullable=True)
    status = Column(String(30), nullable=False, default=PaymentStatus.APPROVED.value)
    authorization_code = Column(String(50), nullable=True)
    decline_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
