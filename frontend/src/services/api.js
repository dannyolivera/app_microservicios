// =============================================================================
// SERVICIO DE INTEGRACIÓN CON MICROSERVICIOS BACKEND
// =============================================================================

export const API_ENDPOINTS = {
  CATALOG: "http://localhost:8001",
  USERS: "http://localhost:8002",
  ORDERS: "http://localhost:8003",
  PAYMENTS: "http://localhost:8004",
};

// --- MICROSERVICIO 1: CATÁLOGO (PUERTO 8001) ---

export async function getBranches() {
  const response = await fetch(`${API_ENDPOINTS.CATALOG}/branches/`);
  if (!response.ok) {
    throw new Error(`Error ${response.status}: No se pudo obtener las boticas`);
  }
  return response.json();
}

export async function getCategories() {
  const response = await fetch(`${API_ENDPOINTS.CATALOG}/categories/`);
  if (!response.ok) {
    throw new Error(`Error ${response.status}: No se pudo obtener las categorías`);
  }
  return response.json();
}

export async function getProducts(skip = 0, limit = 50, branchId = null) {
  const branchParam = branchId ? `&branch_id=${branchId}` : "";
  const response = await fetch(
    `${API_ENDPOINTS.CATALOG}/products/?skip=${skip}&limit=${limit}${branchParam}`
  );
  if (!response.ok) {
    throw new Error(`Error ${response.status}: No se pudo cargar los productos`);
  }
  return response.json();
}

export async function getProductById(id, branchId = null) {
  const branchParam = branchId ? `?branch_id=${branchId}` : "";
  const response = await fetch(`${API_ENDPOINTS.CATALOG}/products/${id}${branchParam}`);
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
  const token = localStorage.getItem("inka_token");
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_ENDPOINTS.ORDERS}/orders/`, {
    method: "POST",
    headers,
    body: JSON.stringify(orderData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Error al procesar la reserva");
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

export async function getUserOrders(userId) {
  const response = await fetch(`${API_ENDPOINTS.ORDERS}/orders/user/${userId}`);
  if (!response.ok) {
    return [];
  }
  return response.json();
}

export async function markOrderCollected(orderId) {
  const response = await fetch(`${API_ENDPOINTS.ORDERS}/orders/${orderId}/collect`, {
    method: "PATCH",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "No se pudo registrar la entrega en botica");
  }
  return data;
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

  const [catalog, users, orders, payments] = await Promise.all([
    checkService(`${API_ENDPOINTS.CATALOG}/`),
    checkService(`${API_ENDPOINTS.USERS}/`),
    checkService(`${API_ENDPOINTS.ORDERS}/`),
    checkService(`${API_ENDPOINTS.PAYMENTS}/`),
  ]);

  return { catalog, users, orders, payments };
}
