from sqlalchemy import Column, Integer, String, Text
from database import Base

# =============================================================================
# MODELO ORM PARA USUARIOS Y CLIENTES FARMACÉUTICOS
# =============================================================================

class User(Base):
    """
    Modelo representativo de los clientes y usuarios registrados en la farmacia.
    Almacena datos personales de contacto, dirección de entrega y hash de contraseña.
    """
    __tablename__ = "users"

    # Clave primaria autoincremental
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Nombre y apellidos completos del cliente
    full_name = Column(String(150), nullable=False)
    
    # Correo electrónico único para autenticación e identificación
    email = Column(String(150), nullable=False, unique=True, index=True)
    
    # Contraseña hasheada (utilizando algoritmo seguro bcrypt)
    password_hash = Column(String(255), nullable=False)
    
    # Dirección de entrega o despacho a domicilio
    address = Column(Text, nullable=True)
    
    # Número de teléfono o celular de contacto
    phone = Column(String(30), nullable=True)
