import enum
from datetime import datetime
from sqlalchemy import Column, Integer, Numeric, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base

# =============================================================================
# ENUMERACIÓN DE ESTADOS DE PEDIDO
# =============================================================================

class OrderStatus(str, enum.Enum):
    """
    Ciclo de vida transaccional de reservas y pedidos:
    - RESERVED: Reserva digital confirmada con bloqueo de stock (pago presencial en botica).
    - PAID: Pedido pagado online con bloqueo de stock confirmado, listo para recojo en botica.
    - COLLECTED: Retirado y liquidado/entregado en botica física.
    - CANCELLED: Reserva o pedido cancelado con reposición de inventario (y reembolso si fue pago online).
    - PENDING: Reserva en proceso.
    - COMPLETED: Completado (compatibilidad histórica).
    """
    RESERVED = "RESERVED"
    PAID = "PAID"
    COLLECTED = "COLLECTED"
    CANCELLED = "CANCELLED"
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"


# =============================================================================
# MODELOS ORM DE PEDIDOS Y DETALLES
# =============================================================================

class Order(Base):
    """
    Modelo representativo de la orden o reserva Click & Collect.
    Incluye código único alfanumérico para recojo y sede física de retiro.
    """
    __tablename__ = "orders"

    # Clave primaria autoincremental
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Código único alfanumérico de recojo en botica física (Slide 2 y 12)
    pickup_code = Column(String(50), nullable=True, unique=True, index=True)

    # ID del usuario que realizó la compra (Microservicio de Usuarios)
    user_id = Column(Integer, nullable=False, index=True)
    
    # Monto total a liquidar en caja al retirar en farmacia
    total_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    
    # Sede de la botica física asignada para el recojo presencial
    branch_id = Column(Integer, nullable=False, default=1, index=True)
    branch = Column(String(150), nullable=True, default="Inkafarma Miraflores (Av. Larco 450)")

    # Modalidad de liquidación (PAGO_EN_CAJA_PRESENCIAL o PAGO_ONLINE)
    payment_method = Column(String(50), nullable=True, default="PAGO_EN_CAJA_PRESENCIAL")

    # Trazabilidad de pago online (cuando se procesa vía payments_service :8004)
    payment_id = Column(Integer, nullable=True, index=True)
    payment_reference = Column(String(60), nullable=True, index=True)
    payment_status = Column(String(30), nullable=False, default="PENDING_IN_STORE")

    # Estado de la orden (almacenado como String para máxima compatibilidad DDL)
    status = Column(String(50), nullable=False, default=OrderStatus.RESERVED.value)
    
    # Fecha y hora de creación de la reserva
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relación uno a muchos con los ítems de la orden
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    """
    Modelo de detalle de cada producto incluido dentro del pedido farmacéutico.
    """
    __tablename__ = "order_items"

    # Clave primaria autoincremental
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Clave foránea que referencia a la orden principal
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    
    # ID del producto (pertenece lógicamente al microservicio de catálogo)
    product_id = Column(Integer, nullable=False, index=True)
    
    # Cantidad de unidades solicitadas del producto
    quantity = Column(Integer, nullable=False, default=1)
    
    # Precio unitario al momento exacto de la compra
    unit_price = Column(Numeric(10, 2), nullable=False)

    # Relación inversa hacia la orden
    order = relationship("Order", back_populates="items")
