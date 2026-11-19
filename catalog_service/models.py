from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from database import Base

# =============================================================================
# MODELOS ORM PARA CATÁLOGO E INVENTARIO POR SEDE (FARMACIA)
# =============================================================================

class Category(Base):
    """
    Modelo representativo de las categorías de productos farmacéuticos.
    """
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)

    products = relationship("Product", back_populates="category", cascade="all, delete-orphan")


class Branch(Base):
    """
    Modelo representativo de cada botica física (sede) con inventario propio.
    """
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(30), nullable=False, unique=True, index=True)
    name = Column(String(150), nullable=False, unique=True, index=True)
    address = Column(String(200), nullable=True)
    district = Column(String(100), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    inventory_items = relationship(
        "BranchInventory",
        back_populates="branch",
        cascade="all, delete-orphan",
    )


class Product(Base):
    """
    Modelo representativo del catálogo maestro de productos farmacéuticos.
    El campo `stock` mantiene el consolidado global; la disponibilidad real
    por botica reside en `branch_inventory`.
    """
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    branch = Column(String(150), nullable=True, default="Sede Inkafarma - Miraflores")
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False)

    category = relationship("Category", back_populates="products")
    inventory_items = relationship(
        "BranchInventory",
        back_populates="product",
        cascade="all, delete-orphan",
    )


class BranchInventory(Base):
    """
    Inventario y disponibilidad independiente de un producto en una botica específica.
    """
    __tablename__ = "branch_inventory"
    __table_args__ = (
        UniqueConstraint("branch_id", "product_id", name="uq_branch_product"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    branch_id = Column(
        Integer,
        ForeignKey("branches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    stock = Column(Integer, nullable=False, default=0)
    is_available = Column(Boolean, nullable=False, default=True)

    branch = relationship("Branch", back_populates="inventory_items")
    product = relationship("Product", back_populates="inventory_items")
