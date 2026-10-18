import os
from typing import Dict, Any, Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

# =============================================================================
# CLIENTE HTTP PARA COMUNICACIÓN SÍNCRONA INTER-SERVICIO (HTTPX)
# =============================================================================
# URL base para conectar con el microservicio de Catálogo (puerto 8001)
CATALOG_SERVICE_URL = os.getenv("CATALOG_SERVICE_URL", "http://localhost:8001")


class CatalogServiceClient:
    """
    Cliente síncrono basado en HTTPX para consultar la existencia y el stock
    de los productos en el Microservicio de Catálogo (Catalog Service).
    """

    def __init__(self, base_url: str = CATALOG_SERVICE_URL, timeout: float = 5.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def get_product(self, product_id: int) -> Optional[Dict[str, Any]]:
        """
        Consulta al endpoint GET /products/{product_id} del Microservicio de Catálogo.
        """
        url = f"{self.base_url}/products/{product_id}"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url)
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

    def block_stock(self, product_id: int, quantity: int) -> Dict[str, Any]:
        """
        Ejecuta el BLOQUEO ATÓMICO de stock en Catalog Service (Fase 2 de la reserva).
        Invoca PATCH /products/{product_id}/stock con acción 'block'.
        """
        url = f"{self.base_url}/products/{product_id}/stock"
        payload = {"quantity": quantity, "action": "block"}

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.patch(url, json=payload)
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 400:
                    detail = response.json().get("detail", "Stock insuficiente")
                    raise ValueError(detail)
                elif response.status_code == 404:
                    raise ValueError(f"Producto ID {product_id} no existe en catálogo")
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
                f"Timeout al comunicarse con Catalog Service para bloqueo de stock."
            )

    def release_stock(self, product_id: int, quantity: int) -> Optional[Dict[str, Any]]:
        """
        Ejecuta la TRANSACCIÓN DE COMPENSACIÓN / ROLLBACK (Slide 8).
        Libera las existencias bloqueadas si la reserva falló a mitad del proceso.
        """
        url = f"{self.base_url}/products/{product_id}/stock"
        payload = {"quantity": quantity, "action": "release"}

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.patch(url, json=payload)
                if response.status_code == 200:
                    return response.json()
                return None
        except Exception:
            # En compensación registramos y no bloqueamos para permitir recuperación
            return None

