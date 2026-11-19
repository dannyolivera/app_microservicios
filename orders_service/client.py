import os
from typing import Dict, Any, Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

# =============================================================================
# CLIENTES HTTP PARA COMUNICACIÓN SÍNCRONA INTER-SERVICIO (HTTPX)
# =============================================================================
CATALOG_SERVICE_URL = os.getenv("CATALOG_SERVICE_URL", "http://localhost:8001")
PAYMENTS_SERVICE_URL = os.getenv("PAYMENTS_SERVICE_URL", "http://localhost:8004")


class PaymentDeclinedError(Exception):
    """Excepción lanzada cuando la pasarela rechaza el pago online."""


class CatalogServiceClient:
    """
    Cliente síncrono basado en HTTPX para consultar la existencia y el stock
    de los productos en el Microservicio de Catálogo (Catalog Service).
    """

    def __init__(self, base_url: str = CATALOG_SERVICE_URL, timeout: float = 5.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def get_product(self, product_id: int, branch_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Consulta al endpoint GET /products/{product_id} del Microservicio de Catálogo."""
        url = f"{self.base_url}/products/{product_id}"
        params = {"branch_id": branch_id} if branch_id is not None else None
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url, params=params)
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 404:
                    return None
                else:
                    raise RuntimeError(
                        f"Unexpected response from Catalog Service: {response.status_code} - {response.text}"
                    )
        except httpx.ConnectError:
            raise RuntimeError(
                f"Catalog Service is unreachable at {self.base_url}. Ensure the service is running on port 8001."
            )
        except httpx.TimeoutException:
            raise RuntimeError(
                f"Timeout while trying to connect to Catalog Service at {self.base_url}."
            )

    def block_stock(self, product_id: int, quantity: int, branch_id: Optional[int] = None) -> Dict[str, Any]:
        """Ejecuta el BLOQUEO ATÓMICO de stock por sede en Catalog Service."""
        url = f"{self.base_url}/products/{product_id}/stock"
        payload: Dict[str, Any] = {"quantity": quantity, "action": "block"}
        if branch_id is not None:
            payload["branch_id"] = branch_id

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.patch(url, json=payload)
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 400:
                    detail = response.json().get("detail", "Stock insuficiente")
                    raise ValueError(detail)
                elif response.status_code == 404:
                    try:
                        detail = response.json().get("detail", f"Producto ID {product_id} no disponible en la botica")
                    except Exception:
                        detail = f"Producto ID {product_id} no disponible en la botica"
                    raise ValueError(detail)
                else:
                    raise RuntimeError(
                        f"Fallo al bloquear stock en Catálogo: {response.status_code} - {response.text}"
                    )
        except httpx.ConnectError:
            raise RuntimeError(
                f"No se pudo conectar con Catalog Service en {self.base_url} para bloquear inventario."
            )
        except httpx.TimeoutException:
            raise RuntimeError(
                "Timeout al comunicarse con Catalog Service para bloqueo de stock."
            )

    def release_stock(self, product_id: int, quantity: int, branch_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Ejecuta la compensación liberando existencias previamente bloqueadas en la sede."""
        url = f"{self.base_url}/products/{product_id}/stock"
        payload: Dict[str, Any] = {"quantity": quantity, "action": "release"}
        if branch_id is not None:
            payload["branch_id"] = branch_id

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.patch(url, json=payload)
                if response.status_code == 200:
                    return response.json()
                return None
        except Exception:
            return None


class PaymentsServiceClient:
    """
    Cliente síncrono basado en HTTPX para invocar cobros y reembolsos en
    el Microservicio de Pagos Online (Payments Service :8004).
    """

    def __init__(self, base_url: str = PAYMENTS_SERVICE_URL, timeout: float = 8.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def charge(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base_url}/payments/charge"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, json=payload)
                if response.status_code in (200, 201):
                    return response.json()
                if response.status_code in (400, 402, 422):
                    try:
                        detail = response.json().get("detail", "Pago rechazado por la pasarela.")
                    except Exception:
                        detail = "Pago rechazado por la pasarela."
                    raise PaymentDeclinedError(str(detail))
                raise RuntimeError(
                    f"Respuesta inesperada de Payments Service ({response.status_code})."
                )
        except httpx.ConnectError:
            raise RuntimeError(
                f"No se pudo conectar con el servicio de pagos en {self.base_url}."
            )
        except httpx.TimeoutException:
            raise RuntimeError(
                "Tiempo de espera agotado al procesar el pago online."
            )

    def refund(self, payment_id: int, reason: str = "Compensación de orden") -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/payments/{payment_id}/refund"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, json={"reason": reason})
                if response.status_code == 200:
                    return response.json()
                return None
        except Exception:
            return None
