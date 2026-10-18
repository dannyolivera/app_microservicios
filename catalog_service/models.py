from sqlalchemy import Column, Integer, String, Text, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

# =============================================================================
# MODELOS ORM PARA EL CATÁLOGO DE PRODUCTOS (FARMACIA)
# =============================================================================

class Category(Base):
    """
    Modelo representativo de las categorías de productos farmacéuticos
    (Ejemplos: Medicamentos, Cuidado Personal, Vitaminas y Suplementos).
    """
    __tablename__ = "categories"

    # Clave primaria autoincremental
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Nombre único de la categoría farmacéutica
    name = Column(String(100), nullable=False, unique=True, index=True)
    
    # Descripción detallada de la categoría
    description = Column(Text, nullable=True)

    # Relación uno a muchos: Una categoría contiene múltiples productos
    products = relationship("Product", back_populates="category", cascade="all, delete-orphan")


class Product(Base):
    """
    Modelo representativo de los productos farmacéuticos y de botica.
    Almacena información de precios, stock disponible y categoría asociada.
    """
    __tablename__ = "products"

    # Clave primaria autoincremental
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Nombre del producto (Ej: 'Paracetamol 500mg - Caja 20 tabletas')
    name = Column(String(150), nullable=False, index=True)
    
    # Descripción médica o del principio activo / presentación
    description = Column(Text, nullable=True)
    
    # Precio unitario en moneda local (PEN) con precisión de 2 decimales
    price = Column(Numeric(10, 2), nullable=False)
    
    # Cantidad de unidades disponibles en inventario
    stock = Column(Integer, nullable=False, default=0)
    
    # Sede o botica física donde se encuentra el inventario (Click & Collect)
    branch = Column(String(150), nullable=True, default="Sede Inkafarma - Miraflores")

    # Clave foránea que referencia a la categoría correspondiente
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False)

    # Relación inversa hacia la categoría
    category = relationship("Category", back_populates="products")
