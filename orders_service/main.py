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
from client import CatalogServiceClient, PaymentsServiceClient, PaymentDeclinedError

# =============================================================================
# INICIALIZACIÓN DEL MICROSERVICIO DE PEDIDOS / ÓRDENES (PUERTO 8003)
# =============================================================================

Base.metadata.create_all(bind=engine)
ensure_orders_schema()

app = FastAPI(
    title="InkaPharmacy - Orders & Reservations Microservice",
    description="Microservicio orquestador de pedidos con bloqueo atómico de stock, pago presencial o pago online con compensación Saga.",
    version="1.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

catalog_client = CatalogServiceClient()
payments_client = PaymentsServiceClient()


def generate_pickup_code() -> str:
    """Genera un código alfanumérico único para retiro en botica (ej. INKA-CC-9X4A2)."""
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(secrets.choice(chars) for _ in range(5))
    return f"INKA-CC-{suffix}"


def _release_blocked_items(blocked_items_tracker: List[tuple], branch_id: int = 1) -> None:
    """Ejecuta rollback compensatorio devolviendo todas las unidades bloqueadas en la sede."""
    for prev_pid, prev_qty in blocked_items_tracker:
        catalog_client.release_stock(prev_pid, prev_qty, branch_id=branch_id)


# =============================================================================
# ENDPOINT DE SALUD
# =============================================================================

@app.get("/", tags=["Health"])
def root_status():
    """Ruta raíz para verificación rápida de disponibilidad del microservicio."""
    return {
        "service": "Orders & Click-and-Collect Service",
        "status": "online",
        "port": 8003,
        "database": "db_pedidos_inka",
    }


# =============================================================================
# ENDPOINTS DE ÓRDENES Y RESERVAS
# =============================================================================

@app.post(
    "/orders/",
    response_model=schemas.OrderResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Orders"],
    summary="Orquestación de pedido (Pago en botica o Pago online con compensación Saga)",
)
@app.post(
    "/api/v1/orders",
    response_model=schemas.OrderResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Orders"],
    include_in_schema=False,
)
def create_order(order_in: schemas.OrderCreate, db: Session = Depends(get_db)):
    """
    Orquesta el registro de una reserva o compra para retiro en botica:
    1. Fase 1: Valida existencia y precios vigentes en Catalog Service (:8001).
    2. Fase 2: Bloquea atómicamente el stock en :8001 (con rollback si algún ítem falla).
    3. Fase 3: Si payment_method == PAGO_ONLINE, procesa el cobro en Payments Service (:8004).
       Si el pago es rechazado o el servicio no responde, libera automáticamente el stock bloqueado.
    4. Fase 4: Persiste la orden con pickup_code en estado RESERVED o PAID.
    """
    payment_method = (order_in.payment_method or "PAGO_EN_CAJA_PRESENCIAL").upper()
    if payment_method not in ("PAGO_EN_CAJA_PRESENCIAL", "PAGO_ONLINE"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Modalidad de pago no válida. Use PAGO_EN_CAJA_PRESENCIAL o PAGO_ONLINE.",
        )

    if payment_method == "PAGO_ONLINE" and not order_in.payment_details:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requieren los datos del medio de pago para completar el pago online.",
        )

    branch_id = order_in.branch_id or 1
    canonical_branch_name = None
    validated_items_data = []
    blocked_items_tracker = []
    total_amount = Decimal("0.00")

    # 1. Validación de precios y disponibilidad por sede con Catálogo
    for item in order_in.items:
        try:
            product_data = catalog_client.get_product(item.product_id, branch_id=branch_id)
        except RuntimeError as err:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(err),
            )

        if not product_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"El producto con ID {item.product_id} no está disponible en la botica seleccionada.",
            )

        if not canonical_branch_name and product_data.get("branch"):
            canonical_branch_name = product_data.get("branch")

        unit_price = Decimal(str(product_data.get("price", "0.00")))
        subtotal = unit_price * item.quantity
        total_amount += subtotal

        validated_items_data.append({
            "product_id": item.product_id,
            "quantity": item.quantity,
            "unit_price": unit_price,
            "name": product_data.get("name", f"Producto #{item.product_id}"),
        })

    # 2. Bloqueo Atómico de Stock en la sede elegida con Compensación si algún ítem falla
    for item_data in validated_items_data:
        try:
            catalog_client.block_stock(
                item_data["product_id"],
                item_data["quantity"],
                branch_id=branch_id,
            )
            blocked_items_tracker.append((item_data["product_id"], item_data["quantity"]))
        except (ValueError, RuntimeError) as err:
            _release_blocked_items(blocked_items_tracker, branch_id=branch_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transacción abortada: {str(err)}. Se realizó rollback compensatorio de inventario.",
            )

    # 3. Cobro Online opcional vía Payments Service (:8004)
    pickup_code = generate_pickup_code()
    branch_name = canonical_branch_name or order_in.branch or "Inkafarma Miraflores (Av. Larco 450)"

    order_status = models.OrderStatus.RESERVED.value
    payment_id = None
    payment_reference = None
    payment_status = "PENDING_IN_STORE"

    if payment_method == "PAGO_ONLINE":
        details = order_in.payment_details
        charge_payload = {
            "user_id": order_in.user_id,
            "amount": str(total_amount.quantize(Decimal("0.01"))),
            "currency": "PEN",
            "email": details.email,
            "order_reference": pickup_code,
            "method_type": details.method_type,
            "card_number": details.card_number,
            "card_holder": details.card_holder,
            "exp_month": details.exp_month,
            "exp_year": details.exp_year,
            "cvv": details.cvv,
            "yape_phone": details.yape_phone,
            "yape_code": details.yape_code,
            "culqi_token": details.culqi_token,
        }
        try:
            payment_result = payments_client.charge(charge_payload)
            payment_id = payment_result.get("id")
            payment_reference = payment_result.get("transaction_code")
            payment_status = "PAID_ONLINE"
            order_status = models.OrderStatus.PAID.value
        except PaymentDeclinedError as err:
            _release_blocked_items(blocked_items_tracker, branch_id=branch_id)
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Pago rechazado: {str(err)} No se realizó ningún cobro y el stock fue liberado.",
            )
        except RuntimeError as err:
            _release_blocked_items(blocked_items_tracker, branch_id=branch_id)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Pasarela de pagos no disponible: {str(err)} El stock bloqueado fue liberado.",
            )

    # 4. Persistencia de la orden en db_pedidos_inka con compensación si falla DB
    try:
        new_order = models.Order(
            pickup_code=pickup_code,
            user_id=order_in.user_id,
            total_amount=total_amount,
            branch_id=branch_id,
            branch=branch_name,
            payment_method=payment_method,
            payment_id=payment_id,
            payment_reference=payment_reference,
            payment_status=payment_status,
            status=order_status,
        )
        db.add(new_order)
        db.flush()

        for item_data in validated_items_data:
            order_item = models.OrderItem(
                order_id=new_order.id,
                product_id=item_data["product_id"],
                quantity=item_data["quantity"],
                unit_price=item_data["unit_price"],
            )
            db.add(order_item)

        db.commit()
        db.refresh(new_order)
        return new_order
    except Exception as err:
        db.rollback()
        _release_blocked_items(blocked_items_tracker, branch_id=branch_id)
        if payment_id:
            payments_client.refund(
                payment_id,
                "Compensación automática por error al registrar la orden.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar la orden: {str(err)}. Se revirtió inventario y pago.",
        )


@app.get(
    "/orders/{order_id}",
    response_model=schemas.OrderResponse,
    tags=["Orders"],
    summary="Estado transaccional del ticket de recojo por ID",
)
@app.get(
    "/api/v1/orders/{order_id}",
    response_model=schemas.OrderResponse,
    tags=["Orders"],
    include_in_schema=False,
)
def get_order_by_id(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orden o reserva con ID {order_id} no encontrada.",
        )
    return order


@app.get(
    "/orders/user/{user_id}",
    response_model=List[schemas.OrderResponse],
    tags=["Orders"],
    summary="Historial de reservas y compras por cliente",
)
@app.get(
    "/api/v1/orders/user/{user_id}",
    response_model=List[schemas.OrderResponse],
    tags=["Orders"],
    include_in_schema=False,
)
def get_orders_by_user(user_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Order)
        .filter(models.Order.user_id == user_id)
        .order_by(models.Order.id.desc())
        .all()
    )


@app.get(
    "/orders/",
    response_model=List[schemas.OrderResponse],
    tags=["Orders"],
    summary="Listar todas las órdenes registradas",
)
def list_orders(db: Session = Depends(get_db)):
    return db.query(models.Order).order_by(models.Order.id.desc()).all()


@app.patch(
    "/orders/{order_id}/collect",
    response_model=schemas.OrderResponse,
    tags=["Botica / Punto de Venta"],
    summary="Confirmar entrega en botica (y cobro presencial si corresponde)",
)
def mark_order_collected(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orden con ID {order_id} no encontrada.",
        )

    if order.status == models.OrderStatus.COLLECTED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La orden ya ha sido entregada previamente.",
        )

    if order.status == models.OrderStatus.CANCELLED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede entregar una orden que fue cancelada.",
        )

    order.status = models.OrderStatus.COLLECTED.value
    if order.payment_status == "PENDING_IN_STORE":
        order.payment_status = "PAID_IN_STORE"

    db.commit()
    db.refresh(order)
    return order


@app.patch(
    "/orders/{order_id}/cancel",
    response_model=schemas.OrderResponse,
    tags=["Botica / Punto de Venta"],
    summary="Cancelar pedido, reponer existencias y reembolsar pago online si aplica",
)
def cancel_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Orden con ID {order_id} no encontrada.",
        )

    if order.status == models.OrderStatus.CANCELLED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La orden ya se encuentra cancelada.",
        )

    if order.status == models.OrderStatus.COLLECTED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede cancelar una orden que ya fue entregada en botica.",
        )

    if order.status in [
        models.OrderStatus.RESERVED.value,
        models.OrderStatus.PAID.value,
        models.OrderStatus.PENDING.value,
    ]:
        for item in order.items:
            catalog_client.release_stock(
                item.product_id,
                item.quantity,
                branch_id=order.branch_id,
            )

    if order.payment_id and order.payment_status == "PAID_ONLINE":
        payments_client.refund(
            order.payment_id,
            f"Cancelación de pedido {order.pickup_code or order.id}",
        )
        order.payment_status = "REFUNDED"
    else:
        order.payment_status = "CANCELLED"

    order.status = models.OrderStatus.CANCELLED.value
    db.commit()
    db.refresh(order)
    return order
