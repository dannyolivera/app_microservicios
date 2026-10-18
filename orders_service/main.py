import secrets
import string
from typing import List
from decimal import Decimal
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db, Base, ensure_orders_schema
from client import CatalogServiceClient

# =============================================================================
# INICIALIZACIÓN DEL MICROSERVICIO DE PEDIDOS / ÓRDENES (PUERTO 8003)
# =============================================================================

# Crear tablas si no existen y asegurar compatibilidad de esquema
Base.metadata.create_all(bind=engine)
ensure_orders_schema()

app = FastAPI(
    title="InkaPharmacy - Orders & Reservations Microservice (Click & Collect)",
    description="Microservicio orquestador para reservas digitales Click & Collect con bloqueo atómico inter-servicio y ticket para retiro en botica.",
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

# Instancia del cliente HTTP para comunicación inter-servicio con el catálogo
catalog_client = CatalogServiceClient()


def generate_pickup_code() -> str:
    """Genera un código alfanumérico único para retiro en botica (ej. INKA-CC-9X4A2)."""
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(secrets.choice(chars) for _ in range(5))
    return f"INKA-CC-{suffix}"


# =============================================================================
# ENDPOINT DE SALUD
# =============================================================================

@app.get("/", tags=["Health"])
def root_status():
    """
    Ruta raíz para verificación rápida de disponibilidad del microservicio.
    """
    return {
        "service": "Orders & Click-and-Collect Service",
        "status": "online",
        "port": 8003,
        "database": "db_pedidos_inka"
    }


# =============================================================================
# ENDPOINTS DE ÓRDENES Y RESERVAS (CLICK & COLLECT)
# =============================================================================

@app.post(
    "/orders/",
    response_model=schemas.OrderResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Click & Collect Orders"],
    summary="Orquestación y creación de la orden C&C (con bloqueo atómico de stock)"
)
@app.post(
    "/api/v1/orders",
    response_model=schemas.OrderResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Click & Collect Orders"],
    include_in_schema=False
)
def create_order(order_in: schemas.OrderCreate, db: Session = Depends(get_db)):
    """
    Orquesta la emisión de una reserva Click & Collect (Slides 7, 8 y 9):
    1. Fase 1: Consulta datos y valida existencias en Catalog Service (:8001).
    2. Fase 2: Ejecuta bloqueo atómico de stock mediante PATCH /products/{id}/stock.
       Si algún producto falla por falta de existencias o timeout, ejecuta
       TRANSACCIÓN DE COMPENSACIÓN (Rollback) liberando el stock bloqueado previamente.
    3. Fase 3: Emite la orden transaccional con Código Único de Recojo (ej. INKA-CC-XXXX)
       y estado RESERVED para posterior liquidación presencial en botica.
    """
    validated_items_data = []
    blocked_items_tracker = []
    total_amount = Decimal("0.00")

    # 1. Validación de precios y existencia con Catálogo
    for item in order_in.items:
        try:
            product_data = catalog_client.get_product(item.product_id)
        except RuntimeError as err:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(err)
            )

        if not product_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"El producto con ID {item.product_id} no existe en el catálogo."
            )

        unit_price = Decimal(str(product_data.get("price", "0.00")))
        subtotal = unit_price * item.quantity
        total_amount += subtotal

        validated_items_data.append({
            "product_id": item.product_id,
            "quantity": item.quantity,
            "unit_price": unit_price,
            "name": product_data.get("name", f"Producto #{item.product_id}")
        })

    # 2. Bloqueo Atómico de Stock con mecanismo de Compensación (Rollback)
    for item_data in validated_items_data:
        try:
            catalog_client.block_stock(item_data["product_id"], item_data["quantity"])
            blocked_items_tracker.append((item_data["product_id"], item_data["quantity"]))
        except (ValueError, RuntimeError) as err:
            # ROLLBACK / COMPENSACIÓN: Revertir todo el stock bloqueado en items previos
            for prev_pid, prev_qty in blocked_items_tracker:
                catalog_client.release_stock(prev_pid, prev_qty)

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transacción abortada: {str(err)}. Se realizó rollback compensatorio de inventario."
            )

    # 3. Persistencia de la orden en db_pedidos_inka
    pickup_code = generate_pickup_code()
    branch_name = order_in.branch or "Sede Inkafarma - Miraflores (Av. Larco 450)"

    new_order = models.Order(
        pickup_code=pickup_code,
        user_id=order_in.user_id,
        total_amount=total_amount,
        branch=branch_name,
        payment_method="PAGO_EN_CAJA_PRESENCIAL",
        status=models.OrderStatus.RESERVED.value
    )
    db.add(new_order)
    db.flush()

    for item_data in validated_items_data:
        order_item = models.OrderItem(
            order_id=new_order.id,
            product_id=item_data["product_id"],
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"]
        )
        db.add(order_item)

    db.commit()
    db.refresh(new_order)
    return new_order


@app.get(
    "/orders/{order_id}",
    response_model=schemas.OrderResponse,
    tags=["Click & Collect Orders"],
    summary="Estado transaccional del ticket de recojo por ID"
)
@app.get(
    "/api/v1/orders/{order_id}",
    response_model=schemas.OrderResponse,
    tags=["Click & Collect Orders"],
    include_in_schema=False
)
def get_order_by_id(order_id: int, db: Session = Depends(get_db)):
    """
    Obtiene los detalles de un ticket de recojo por su ID.
    Utilizado por el personal de caja en botica para validar el código antes del cobro.
    """
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orden o reserva con ID {order_id} no encontrada."
        )
    return order


@app.get(
    "/orders/user/{user_id}",
    response_model=List[schemas.OrderResponse],
    tags=["Click & Collect Orders"],
    summary="Historial de reservas realizadas por cliente (Slide 10)"
)
@app.get(
    "/api/v1/orders/user/{user_id}",
    response_model=List[schemas.OrderResponse],
    tags=["Click & Collect Orders"],
    include_in_schema=False
)
def get_orders_by_user(user_id: int, db: Session = Depends(get_db)):
    """
    Obtiene el historial de órdenes y reservas Click & Collect realizadas por un cliente.
    """
    orders = (
        db.query(models.Order)
        .filter(models.Order.user_id == user_id)
        .order_by(models.Order.id.desc())
        .all()
    )
    return orders


@app.get(
    "/orders/",
    response_model=List[schemas.OrderResponse],
    tags=["Click & Collect Orders"],
    summary="Listar todas las órdenes registradas"
)
def list_orders(db: Session = Depends(get_db)):
    """
    Obtiene la lista completa de órdenes registradas en el sistema.
    """
    orders = db.query(models.Order).order_by(models.Order.id.desc()).all()
    return orders


@app.patch(
    "/orders/{order_id}/collect",
    response_model=schemas.OrderResponse,
    tags=["Botica / Punto de Venta"],
    summary="Cobro presencial en caja y entrega en botica (Slide 9 BPMN)"
)
def mark_order_collected(order_id: int, db: Session = Depends(get_db)):
    """
    Simula la acción en mostrador físico:
    El cliente presenta el código de recojo, paga en caja (efectivo o POS)
    y el farmacéutico despacha los medicamentos, marcando la orden como COLLECTED.
    """
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orden con ID {order_id} no encontrada."
        )

    if order.status == models.OrderStatus.COLLECTED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La orden ya ha sido entregada y liquidada previamente."
        )

    order.status = models.OrderStatus.COLLECTED.value
    db.commit()
    db.refresh(order)
    return order


@app.patch(
    "/orders/{order_id}/cancel",
    response_model=schemas.OrderResponse,
    tags=["Botica / Punto de Venta"],
    summary="Cancelar reserva y reponer existencias (Rollback compensatorio)"
)
def cancel_order(order_id: int, db: Session = Depends(get_db)):
    """
    Cancela una reserva y devuelve de forma automática el stock al Catálogo.
    """
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orden con ID {order_id} no encontrada."
        )

    if order.status == models.OrderStatus.CANCELLED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La orden ya se encuentra cancelada."
        )

    # Liberar stock en Catalog Service si estaba reservado
    if order.status in [models.OrderStatus.RESERVED.value, models.OrderStatus.PENDING.value]:
        for item in order.items:
            catalog_client.release_stock(item.product_id, item.quantity)

    order.status = models.OrderStatus.CANCELLED.value
    db.commit()
    db.refresh(order)
    return order

