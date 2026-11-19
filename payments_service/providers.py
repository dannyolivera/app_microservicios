import os
import re
import secrets
import string
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
import httpx
from dotenv import load_dotenv
from pathlib import Path

ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)


def _random_code(prefix: str, length: int = 8) -> str:
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(secrets.choice(chars) for _ in range(length))
    return f"{prefix}-{suffix}"


def _detect_card_brand(digits: str) -> str:
    if digits.startswith("4"):
        return "VISA"
    if digits.startswith(("5", "2")):
        return "MASTERCARD"
    if digits.startswith("3"):
        return "AMEX"
    return "TARJETA"


def _normalize_exp_year(exp_year: Optional[int]) -> Optional[int]:
    if exp_year is None:
        return None
    return 2000 + exp_year if exp_year < 100 else exp_year


@dataclass
class PaymentResult:
    approved: bool
    provider: str
    transaction_code: str
    authorization_code: Optional[str] = None
    card_brand: Optional[str] = None
    card_last4: Optional[str] = None
    holder_name: Optional[str] = None
    decline_reason: Optional[str] = None


class BasePaymentProvider:
    name = "base"

    def charge(self, request_data) -> PaymentResult:
        raise NotImplementedError

    def refund(self, transaction_code: str, amount: Decimal, reason: str) -> bool:
        raise NotImplementedError


class MockPaymentProvider(BasePaymentProvider):
    """
    Adaptador local determinista para pruebas y demostraciones sin credenciales externas.
    Tarjetas con terminación especial permiten probar rechazos y rollback compensatorio:
      - ...0002 -> Fondos insuficientes
      - ...0069 -> Rechazada por el banco emisor
      - ...9995 -> Tarjeta vencida o bloqueada
    Yape con código 000000 -> Código inválido/expirado.
    """
    name = "mock"

    def charge(self, request_data) -> PaymentResult:
        method = (request_data.method_type or "CARD").upper()
        tx_code = _random_code("PAY-INKA", 8)

        if method == "YAPE":
            return self._process_yape(request_data, tx_code)

        return self._process_card(request_data, tx_code)

    def _process_card(self, request_data, tx_code: str) -> PaymentResult:
        digits = re.sub(r"\D", "", request_data.card_number or "")
        cvv = re.sub(r"\D", "", request_data.cvv or "")
        holder = (request_data.card_holder or "").strip() or "Cliente Inkafarma"
        last4 = digits[-4:] if len(digits) >= 4 else None
        brand = _detect_card_brand(digits) if digits else "TARJETA"

        if len(digits) < 13 or len(digits) > 19:
            return PaymentResult(
                approved=False,
                provider=self.name,
                transaction_code=tx_code,
                card_brand=brand,
                card_last4=last4,
                holder_name=holder,
                decline_reason="Número de tarjeta inválido (debe tener entre 13 y 19 dígitos).",
            )

        if len(cvv) not in (3, 4):
            return PaymentResult(
                approved=False,
                provider=self.name,
                transaction_code=tx_code,
                card_brand=brand,
                card_last4=last4,
                holder_name=holder,
                decline_reason="Código CVV inválido (debe tener 3 o 4 dígitos).",
            )

        norm_year = _normalize_exp_year(request_data.exp_year)
        if not request_data.exp_month or not norm_year:
            return PaymentResult(
                approved=False,
                provider=self.name,
                transaction_code=tx_code,
                card_brand=brand,
                card_last4=last4,
                holder_name=holder,
                decline_reason="Fecha de vencimiento de tarjeta incompleta.",
            )

        now = datetime.now(timezone.utc)
        if (norm_year, request_data.exp_month) < (now.year, now.month):
            return PaymentResult(
                approved=False,
                provider=self.name,
                transaction_code=tx_code,
                card_brand=brand,
                card_last4=last4,
                holder_name=holder,
                decline_reason="La tarjeta ingresada se encuentra vencida.",
            )

        # Rechazos deterministas por últimos 4 dígitos para pruebas de rollback
        decline_map = {
            "0002": "Fondos insuficientes en la tarjeta.",
            "0069": "Operación rechazada por el banco emisor.",
            "9995": "Tarjeta vencida o bloqueada.",
        }
        if last4 in decline_map:
            return PaymentResult(
                approved=False,
                provider=self.name,
                transaction_code=tx_code,
                card_brand=brand,
                card_last4=last4,
                holder_name=holder,
                decline_reason=decline_map[last4],
            )

        return PaymentResult(
            approved=True,
            provider=self.name,
            transaction_code=tx_code,
            authorization_code=_random_code("AUTH", 6),
            card_brand=brand,
            card_last4=last4,
            holder_name=holder,
        )

    def _process_yape(self, request_data, tx_code: str) -> PaymentResult:
        phone = re.sub(r"\D", "", request_data.yape_phone or "")
        code = re.sub(r"\D", "", request_data.yape_code or "")
        last4 = phone[-4:] if len(phone) >= 4 else None

        if len(phone) != 9 or not phone.startswith("9"):
            return PaymentResult(
                approved=False,
                provider=self.name,
                transaction_code=tx_code,
                card_brand="YAPE",
                card_last4=last4,
                holder_name="Pago con Yape",
                decline_reason="Ingresa un número de celular Yape válido de 9 dígitos.",
            )

        if len(code) != 6:
            return PaymentResult(
                approved=False,
                provider=self.name,
                transaction_code=tx_code,
                card_brand="YAPE",
                card_last4=last4,
                holder_name="Pago con Yape",
                decline_reason="El código de aprobación Yape debe tener 6 dígitos.",
            )

        if code == "000000":
            return PaymentResult(
                approved=False,
                provider=self.name,
                transaction_code=tx_code,
                card_brand="YAPE",
                card_last4=last4,
                holder_name="Pago con Yape",
                decline_reason="Código de aprobación Yape inválido o expirado.",
            )

        return PaymentResult(
            approved=True,
            provider=self.name,
            transaction_code=tx_code,
            authorization_code=_random_code("YAPE", 6),
            card_brand="YAPE",
            card_last4=last4,
            holder_name="Pago con Yape",
        )

    def refund(self, transaction_code: str, amount: Decimal, reason: str) -> bool:
        return True


class CulqiPaymentProvider(BasePaymentProvider):
    """
    Adaptador real para Culqi API v2 (Sandbox o Producción según las llaves en .env).
    """
    name = "culqi"

    def __init__(self):
        self.secret_key = os.getenv("CULQI_SECRET_KEY", "").strip()
        self.api_url = os.getenv("CULQI_API_URL", "https://api.culqi.com/v2").rstrip("/")

    def charge(self, request_data) -> PaymentResult:
        fallback_tx = _random_code("CULQI-ERR", 6)

        if not self.secret_key:
            return PaymentResult(
                approved=False,
                provider=self.name,
                transaction_code=fallback_tx,
                decline_reason="CULQI_SECRET_KEY no está configurada en payments_service/.env.",
            )

        if not request_data.culqi_token:
            return PaymentResult(
                approved=False,
                provider=self.name,
                transaction_code=fallback_tx,
                decline_reason="Falta culqi_token generado por Culqi Checkout en el frontend.",
            )

        amount_cents = int((Decimal(request_data.amount) * 100).quantize(Decimal("1")))
        payload = {
            "amount": amount_cents,
            "currency_code": (request_data.currency or "PEN").upper(),
            "email": request_data.email or "cliente@inkafarma.pe",
            "source_id": request_data.culqi_token,
        }
        headers = {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(f"{self.api_url}/charges", json=payload, headers=headers)
                data = response.json()

                if response.status_code in (200, 201):
                    source = data.get("source") or {}
                    iin = source.get("iin") or {}
                    card_num = str(source.get("card_number") or "")
                    return PaymentResult(
                        approved=True,
                        provider=self.name,
                        transaction_code=str(data.get("id") or fallback_tx),
                        authorization_code=str(data.get("reference_code") or data.get("authorization_code") or ""),
                        card_brand=iin.get("card_brand") or source.get("type") or "CULQI",
                        card_last4=card_num[-4:] if len(card_num) >= 4 else None,
                        holder_name=request_data.card_holder or request_data.email,
                    )

                reason = data.get("user_message") or data.get("merchant_message") or "Pago rechazado por Culqi."
                return PaymentResult(
                    approved=False,
                    provider=self.name,
                    transaction_code=fallback_tx,
                    decline_reason=reason,
                )
        except httpx.TimeoutException:
            return PaymentResult(
                approved=False,
                provider=self.name,
                transaction_code=fallback_tx,
                decline_reason="Tiempo de espera agotado al conectar con Culqi.",
            )
        except Exception as err:
            return PaymentResult(
                approved=False,
                provider=self.name,
                transaction_code=fallback_tx,
                decline_reason=f"Error de comunicación con Culqi: {err}",
            )

    def refund(self, transaction_code: str, amount: Decimal, reason: str) -> bool:
        if not self.secret_key or not transaction_code:
            return False

        amount_cents = int((Decimal(amount) * 100).quantize(Decimal("1")))
        payload = {
            "charge_id": transaction_code,
            "amount": amount_cents,
            "reason": "solicitud_comprador",
        }
        headers = {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(f"{self.api_url}/refunds", json=payload, headers=headers)
                return response.status_code in (200, 201)
        except Exception:
            return False


def get_payment_provider() -> BasePaymentProvider:
    provider_name = os.getenv("PAYMENT_PROVIDER", "mock").strip().lower()
    if provider_name == "culqi":
        return CulqiPaymentProvider()
    return MockPaymentProvider()
