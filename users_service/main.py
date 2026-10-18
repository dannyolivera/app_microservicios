from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
import schemas
from database import engine, get_db, Base
from typing import Optional
import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from security import hash_password, verify_password, create_access_token, SECRET_KEY, ALGORITHM

security_bearer = HTTPBearer(auto_error=False)

# =============================================================================
# INICIALIZACIÓN DEL MICROSERVICIO DE USUARIOS Y AUTENTICACIÓN (PUERTO 8002)
# =============================================================================

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="InkaPharmacy - Users & Authentication Microservice",
    description="Microservicio para la gestión de usuarios, clientes y seguridad/autenticación stateless con JWT.",
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Habilitar CORS para permitir peticiones desde aplicaciones cliente frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# ENDPOINT DE SALUD
# =============================================================================

@app.get("/", tags=["Health"])
def root_status():
    """
    Ruta raíz para verificación rápida de disponibilidad del microservicio.
    """
    return {
        "service": "Users & Auth Service",
        "status": "online",
        "port": 8002,
        "database": "db_usuarios_inka"
    }


# =============================================================================
# ENDPOINTS DE AUTENTICACIÓN Y REGISTRO
# =============================================================================

@app.post(
    "/auth/register",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Authentication"],
    summary="Registrar un nuevo usuario"
)
@app.post(
    "/api/v1/auth/register",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Authentication"],
    include_in_schema=False
)
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Registra un nuevo usuario en la base de datos de usuarios (db_usuarios_inka).
    - Valida que el email no se encuentre previamente registrado.
    - Aplica un hash unidireccional seguro (bcrypt) a la contraseña antes de persistirla.
    """
    # Validar si el email ya existe
    existing_user = db.query(models.User).filter(
        func.lower(models.User.email) == user_in.email.lower()
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{user_in.email}' is already registered."
        )

    # Hashear contraseña de forma segura
    hashed_pwd = hash_password(user_in.password)

    new_user = models.User(
        full_name=user_in.full_name,
        email=user_in.email.lower(),
        password_hash=hashed_pwd,
        address=user_in.address,
        phone=user_in.phone
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post(
    "/auth/login",
    response_model=schemas.TokenResponse,
    tags=["Authentication"],
    summary="Iniciar sesión y obtener token JWT"
)
@app.post(
    "/api/v1/auth/login",
    response_model=schemas.TokenResponse,
    tags=["Authentication"],
    include_in_schema=False
)
def login_user(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Autentica al usuario validando sus credenciales (email y contraseña).
    - Si las credenciales coinciden, genera un JSON Web Token (JWT) firmado.
    - En caso contrario, retorna un error HTTP 401 Unauthorized.
    """
    user = db.query(models.User).filter(
        func.lower(models.User.email) == credentials.email.lower()
    ).first()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Generar token JWT con el payload del usuario
    token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "full_name": user.full_name
    }
    access_token = create_access_token(data=token_payload)

    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user
    )


@app.get(
    "/auth/me",
    response_model=schemas.UserResponse,
    tags=["Authentication"],
    summary="Claims y perfil del cliente autenticado (Slide 10)"
)
@app.get(
    "/api/v1/auth/me",
    response_model=schemas.UserResponse,
    tags=["Authentication"],
    include_in_schema=False
)
def get_current_user_profile(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
):
    """
    Recupera el perfil del usuario autenticado descifrando las claims
    del Bearer Token JWT recibido en el encabezado Authorization.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere un token Bearer JWT válido.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token JWT inválido o expirado.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )
    return user


# =============================================================================
# ENDPOINTS DE GESTIÓN DE USUARIOS
# =============================================================================

@app.get(
    "/users/{user_id}",
    response_model=schemas.UserResponse,
    tags=["Users"],
    summary="Obtener información de un usuario por ID"
)
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    """
    Obtiene los datos de un usuario por su identificador único.
    Útil para consultas directas y para que el servicio de órdenes valide al cliente.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found."
        )
    return user
