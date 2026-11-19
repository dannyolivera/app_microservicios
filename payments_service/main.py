import os
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db, Base, ensure_payments_database
from providers import get_payment_provider

# =============================================================================
# INICIALIZACIÓN DEL MICROSERVICIO DE PAGOS ONLINE (PUERTO 8004)
# =============================================================================

ensure_payments_database()
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="InkaPharmacy - Payments Microservice",
    description="Microservicio de procesamiento de pagos online con patrón Adaptador (Mock local y Culqi Sandbox).",
    version="1.0.0",
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


# =============================================================================
# ENDPOINTS DE SALUD Y CONFIGURACIÓN
# =============================================================================

@app.get("/", tags=["Health"])
def root_status():
    """Verificación rápida de disponibilidad del microservicio de pagos."""
    provider = get_payment_provider()
    return {
        "service": "Payments Service",
        "status": "online",
        "port": 8004,
        "database": "db_pagos_inka",
        "provider": provider.name,
    }


@app.get("/payments/config", tags=["Payments"], summary="Configuración pública de pasarela")
def get_payments_config():
    """Devuelve el adaptador activo y llave pública si se usa Culqi."""
    provider = get_payment_provider()
    return {
        "provider": provider.name,
        "culqi_public_key": os.getenv("CULQI_PUBLIC_KEY", "") if provider.name == "culqi" else "",
        "supported_methods": ["CARD", "YAPE"],
    }


# =============================================================================
# ENDPOINTS DE COBRO Y REEMBOLSO
# =============================================================================

@app.post(
    "/payments/charge",
    response_model=schemas.PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Payments"],
    summary="Procesar cobro online (Tarjeta o Yape)",
)
@app.post(
    "/api/v1/payments/charge",
    response_model=schemas.PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Payments"],
    include_in_schema=False,
)
def charge_payment(payment_in: schemas.PaymentChargeRequest, db: Session = Depends(get_db)):
    """
    Procesa un pago online mediante el adaptador configurado (mock o culqi) y
    registra tanto intentos aprobados como rechazados en db_pagos_inka.
    """
    provider = get_payment_provider()
    result = provider.charge(payment_in)

    payment_record = models.Payment(
        transaction_code=result.transaction_code,
        order_reference=payment_in.order_reference,
        user_id=payment_in.user_id,
        amount=payment_in.amount,
        currency=payment_in.currency.upper(),
        provider=result.provider,
        method_type=(payment_in.method_type or "CARD").upper(),
        card_brand=result.card_brand,
        card_last4=result.card_last4,
        holder_name=result.holder_name,
        status=(
            models.PaymentStatus.APPROVED.value
            if result.approved
            else models.PaymentStatus.DECLINED.value
        ),
        authorization_code=result.authorization_code,
        decline_reason=result.decline_reason,
    )
    db.add(payment_record)
    db.commit()
    db.refresh(payment_record)

    if not result.approved:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=result.decline_reason or "Pago rechazado por la pasarela.",
        )

    return payment_record


@app.get(
    "/payments/user/{user_id}",
    response_model=List[schemas.PaymentResponse],
    tags=["Payments"],
    summary="Historial de pagos de un cliente",
)
def get_payments_by_user(user_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Payment)
        .filter(models.Payment.user_id == user_id)
        .order_by(models.Payment.id.desc())
        .all()
    )


@app.get(
    "/payments/{payment_id}",
    response_model=schemas.PaymentResponse,
    tags=["Payments"],
    summary="Consultar detalle de transacción por ID",
)
def get_payment_by_id(payment_id: int, db: Session = Depends(get_db)):
    payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transacción de pago #{payment_id} no encontrada.",
        )
    return payment


@app.post(
    "/payments/{payment_id}/refund",
    response_model=schemas.PaymentResponse,
    tags=["Payments"],
    summary="Reembolsar un pago aprobado (Cancelación / Saga Rollback)",
)
@app.post(
    "/api/v1/payments/{payment_id}/refund",
    response_model=schemas.PaymentResponse,
    tags=["Payments"],
    include_in_schema=False,
)
def refund_payment(
    payment_id: int,
    refund_in: Optional[schemas.RefundRequest] = None,
    db: Session = Depends(get_db),
):
    payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transacción de pago #{payment_id} no encontrada.",
        )

    if payment.status == models.PaymentStatus.REFUNDED.value:
        return payment

    if payment.status != models.PaymentStatus.APPROVED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Solo se pueden reembolsar pagos aprobados (estado actual: {payment.status}).",
        )

    provider = get_payment_provider()
    reason = (
        refund_in.reason
        if refund_in and refund_in.reason
        else "Cancelación o compensación de orden"
    )
    refunded = provider.refund(payment.transaction_code, payment.amount, reason)
    if not refunded:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo completar el reembolso con el proveedor de pago.",
        )

    payment.status = models.PaymentStatus.REFUNDED.value
    payment.decline_reason = reason
    db.commit()
    db.refresh(payment)
    return payment
