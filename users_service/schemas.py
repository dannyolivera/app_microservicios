from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# =============================================================================
# ESQUEMAS PYDANTIC (VALIDACIÓN Y SERIALIZACIÓN - USUARIOS Y AUTENTICACIÓN)
# =============================================================================

class UserBase(BaseModel):
    """Esquema base de datos del usuario farmacéutico."""
    full_name: str = Field(..., min_length=3, max_length=150, description="Nombres y apellidos completos")
    email: EmailStr = Field(..., description="Correo electrónico válido")
    address: Optional[str] = Field(None, description="Dirección de envío domiciliario")
    phone: Optional[str] = Field(None, max_length=30, description="Teléfono de contacto")


class UserCreate(UserBase):
    """Esquema para el registro de un nuevo usuario con contraseña."""
    password: str = Field(..., min_length=6, max_length=100, description="Contraseña de al menos 6 caracteres")


class UserResponse(UserBase):
    """Esquema de respuesta seguro (no expone password_hash)."""
    id: int = Field(..., description="Identificador único del usuario")

    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    """Esquema para recepción de credenciales de inicio de sesión."""
    email: EmailStr = Field(..., description="Correo electrónico registrado")
    password: str = Field(..., description="Contraseña en texto plano para validación")


class TokenResponse(BaseModel):
    """Esquema devuelto al autenticar exitosamente a un usuario."""
    access_token: str = Field(..., description="Token JWT firmado")
    token_type: str = Field("bearer", description="Tipo de autorización de token")
    user: UserResponse = Field(..., description="Datos del usuario autenticado")
