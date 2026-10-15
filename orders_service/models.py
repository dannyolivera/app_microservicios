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
    Estados posibles en el ciclo de vida de un pedido farmacéutico:
    - PENDING: Pedido generado, en espera de pago o despacho.
    - COMPLETED: Pedido confirmado con stock verificado y procesado.
    - CANCELLED: Pedido cancelado por falta de stock o solicitud del cliente.
    """
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


# =============================================================================
# MODELOS ORM DE PEDIDOS Y DETALLES
# =============================================================================

class Order(Base):
    """
    Modelo representativo de la orden o pedido de compra en la farmacia.
    """
    __tablename__ = "orders"

    # Clave primaria autoincremental
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # ID del usuario que realizó la compra (pertenece lógicamente al microservicio de usuarios)
    user_id = Column(Integer, nullable=False, index=True)
    
    # Monto total acumulado del pedido
    total_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    
    # Estado de la orden
    status = Column(Enum(OrderStatus), nullable=False, default=OrderStatus.PENDING)
    
    # Fecha y hora de creación de la orden
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
