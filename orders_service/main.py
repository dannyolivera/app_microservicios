from typing import List
from decimal import Decimal
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db, Base
from client import CatalogServiceClient

# =============================================================================
# INICIALIZACIÓN DEL MICROSERVICIO DE PEDIDOS / ÓRDENES (PUERTO 8003)
# =============================================================================

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="InkaPharmacy - Orders Microservice",
    description="Microservicio para la gestión de órdenes de compra con comunicación síncrona hacia el Catálogo.",
    version="1.0.0",
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

# Instancia del cliente HTTP para comunicación con el catálogo
catalog_client = CatalogServiceClient()


# =============================================================================
# ENDPOINT DE SALUD
# =============================================================================

@app.get("/", tags=["Health"])
def root_status():
    """
    Ruta raíz para verificación rápida de disponibilidad del microservicio.
    """
    return {
        "service": "Orders Service",
        "status": "online",
        "port": 8003,
        "database": "db_pedidos_inka"
    }


# =============================================================================
# ENDPOINTS DE ÓRDENES Y PEDIDOS
# =============================================================================

@app.post(
    "/orders/",
    response_model=schemas.OrderResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Orders"],
    summary="Crear una nueva orden (con validación síncrona en Catálogo)"
)
def create_order(order_in: schemas.OrderCreate, db: Session = Depends(get_db)):
    """
    Crea una nueva orden de compra validando previamente la existencia de cada producto
    y la disponibilidad de stock en el Microservicio de Catálogo (Puerto 8001).

    Flujo de comunicación inter-servicio:
    1. Por cada ítem solicitado en la orden, se realiza una petición HTTP GET a:
       http://localhost:8001/products/{product_id}
    2. Si el producto no existe -> HTTP 404 (Producto no encontrado).
    3. Si el stock disponible es menor a la cantidad solicitada -> HTTP 400 (Stock insuficiente).
    4. Si todos los ítems son válidos, se calcula el monto total con los precios vigentes
       y se almacena la orden en la base de datos 'db_pedidos_inka'.
    """
    validated_items_data = []
    total_amount = Decimal("0.00")

    # 1. Validación inter-servicio con el Microservicio de Catálogo
    for item in order_in.items:
        try:
            product_data = catalog_client.get_product(item.product_id)
        except RuntimeError as err:
            # Error de conectividad o indisponibilidad del servicio de catálogo
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(err)
            )

        # Validar si el producto existe en el catálogo
        if not product_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {item.product_id} does not exist in the catalog."
            )

        # Validar disponibilidad de stock
        available_stock = product_data.get("stock", 0)
        product_name = product_data.get("name", f"Product #{item.product_id}")

        if available_stock < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock for product '{product_name}' (ID {item.product_id}). "
                    f"Available stock: {available_stock}, Requested quantity: {item.quantity}."
                )
            )

        unit_price = Decimal(str(product_data.get("price", "0.00")))
        subtotal = unit_price * item.quantity
        total_amount += subtotal

        validated_items_data.append({
            "product_id": item.product_id,
            "quantity": item.quantity,
            "unit_price": unit_price
        })

    # 2. Persistencia de la orden en la base de datos independiente (db_pedidos_inka)
    new_order = models.Order(
        user_id=order_in.user_id,
        total_amount=total_amount,
        status=models.OrderStatus.COMPLETED
    )
    db.add(new_order)
    db.flush()  # Obtener el ID asignado a la nueva orden antes de insertar ítems

    # 3. Creación de los ítems asociados a la orden
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
    tags=["Orders"],
    summary="Consultar el estado y detalles de una orden por ID"
)
def get_order_by_id(order_id: int, db: Session = Depends(get_db)):
    """
    Obtiene los detalles de un pedido específico a partir de su ID,
    incluyendo su estado actual y la lista de productos adquiridos.
    """
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} was not found."
        )
    return order


@app.get(
    "/orders/",
    response_model=List[schemas.OrderResponse],
    tags=["Orders"],
    summary="Listar todas las órdenes registradas"
)
def list_orders(db: Session = Depends(get_db)):
    """
    Obtiene la lista de todas las órdenes registradas en el sistema.
    """
    orders = db.query(models.Order).order_by(models.Order.id.desc()).all()
    return orders
