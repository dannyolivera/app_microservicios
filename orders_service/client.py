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
        Consulta de manera síncrona al endpoint GET /products/{product_id}
        del Microservicio de Catálogo.

        Retorna:
            - Dict con los datos del producto si existe (id, name, price, stock).
            - None si el producto no existe (HTTP 404).

        Lanza:
            - RuntimeError si el servicio de catálogo no se encuentra disponible.
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
