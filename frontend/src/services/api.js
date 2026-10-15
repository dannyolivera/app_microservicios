// =============================================================================
// SERVICIO DE INTEGRACIÓN CON MICROSERVICIOS BACKEND
// =============================================================================

export const API_ENDPOINTS = {
  CATALOG: "http://localhost:8001",
  USERS: "http://localhost:8002",
  ORDERS: "http://localhost:8003",
};

// --- MICROSERVICIO 1: CATÁLOGO (PUERTO 8001) ---

export async function getCategories() {
  const response = await fetch(`${API_ENDPOINTS.CATALOG}/categories/`);
  if (!response.ok) {
    throw new Error(`Error ${response.status}: No se pudo obtener las categorías`);
  }
  return response.json();
}

export async function getProducts(skip = 0, limit = 50) {
  const response = await fetch(`${API_ENDPOINTS.CATALOG}/products/?skip=${skip}&limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Error ${response.status}: No se pudo cargar los productos`);
  }
  return response.json();
}

export async function getProductById(id) {
  const response = await fetch(`${API_ENDPOINTS.CATALOG}/products/${id}`);
  if (!response.ok) {
    throw new Error(`Error ${response.status}: Producto no encontrado`);
  }
  return response.json();
}

// --- MICROSERVICIO 2: USUARIOS Y AUTENTICACIÓN (PUERTO 8002) ---

export async function loginUser(email, password) {
  const response = await fetch(`${API_ENDPOINTS.USERS}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Credenciales incorrectas");
  }
  return data;
}

export async function registerUser(userData) {
  const response = await fetch(`${API_ENDPOINTS.USERS}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Error al registrar el usuario");
  }
  return data;
}

// --- MICROSERVICIO 3: PEDIDOS / ÓRDENES (PUERTO 8003) ---

export async function createOrder(orderData) {
  const response = await fetch(`${API_ENDPOINTS.ORDERS}/orders/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Error al procesar la orden");
  }
  return data;
}

export async function getOrderById(orderId) {
  const response = await fetch(`${API_ENDPOINTS.ORDERS}/orders/${orderId}`);
  if (!response.ok) {
    throw new Error(`Error ${response.status}: Orden no encontrada`);
  }
  return response.json();
}

// --- VERIFICACIÓN DE ESTADO DE LOS 3 MICROSERVICIOS ---

export async function checkMicroservicesHealth() {
  const checkService = async (url) => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  };

  const [catalog, users, orders] = await Promise.all([
    checkService(`${API_ENDPOINTS.CATALOG}/`),
    checkService(`${API_ENDPOINTS.USERS}/`),
    checkService(`${API_ENDPOINTS.ORDERS}/`),
  ]);

  return { catalog, users, orders };
}
