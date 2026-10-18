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
    Ciclo de vida transaccional Click & Collect (Slides 2, 7, 8, 9, 12):
    - RESERVED: Reserva digital confirmada con bloqueo atómico de existencias.
    - COLLECTED: Retirado y liquidado presencialmente en botica física (caja).
    - CANCELLED: Reserva cancelada / compensada con reposición de inventario.
    - PENDING: Reserva en proceso.
    - COMPLETED: Completado (compatibilidad histórica).
    """
    RESERVED = "RESERVED"
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
    branch = Column(String(150), nullable=True, default="Sede Inkafarma - Miraflores (Av. Larco 450)")

    # Modalidad de liquidación (Cero pasarelas virtuales: pago en efectivo o POS en tienda)
    payment_method = Column(String(50), nullable=True, default="PAGO_EN_CAJA_PRESENCIAL")

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
