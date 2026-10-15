# Sistema de Comercio Electrónico Farmacéutico
## Arquitectura de Microservicios con FastAPI, SQLAlchemy, MySQL y React

Este proyecto implementa una plataforma distribuida de comercio electrónico farmacéutico bajo el patrón arquitectónico **Database-per-Service**, donde cada microservicio gestiona su propio esquema de base de datos de forma desacoplada e independiente.

---

## 🎯 Visión General de la Arquitectura

El sistema modela el flujo comercial de una farmacia en línea: gestión de inventario y catálogo de medicamentos, registro y autenticación de usuarios, y procesamiento de órdenes de compra con validación de stock en tiempo real mediante comunicación inter-servicio síncrona.

```mermaid
graph TD
    Client[Cliente Web / Frontend :5173 / Swagger UI]

    subgraph Service1[Microservicio 1: Catálogo - Puerto 8001]
        CatApp[FastAPI Catalog API]
        DBCat[(MySQL: db_catalogo_inka)]
        CatApp --> DBCat
    end

    subgraph Service2[Microservicio 2: Usuarios y Auth - Puerto 8002]
        UserApp[FastAPI Users & Auth API]
        DBUser[(MySQL: db_usuarios_inka)]
        UserApp --> DBUser
    end

    subgraph Service3[Microservicio 3: Pedidos - Puerto 8003]
        OrderApp[FastAPI Orders API]
        DBOrder[(MySQL: db_pedidos_inka)]
        OrderApp --> DBOrder
    end

    Client -->|1. Consulta de Catálogo| CatApp
    Client -->|2. Autenticación y Registro| UserApp
    Client -->|3. Creación de Pedido| OrderApp

    OrderApp -.->|4. HTTPX Síncrono: GET /products/:id<br/>Valida existencia y disponibilidad de stock| CatApp
```

---

## 🧩 Arquitectura de Módulos y Lógica de Negocio

A continuación se detalla la responsabilidad de cada servicio, su modelo de datos y los flujos de comunicación del sistema:

### 1. Microservicio de Catálogo (`catalog_service` - Puerto 8001)
- **Responsabilidad:** Administrar el inventario farmacéutico, las categorías de productos y los precios vigentes.
- **Base de Datos:** `db_catalogo_inka`.
- **Modelos ORM:**
  - `Category`: Identificador, nombre de la categoría (ej. *Analgésicos*, *Cuidado Personal*, *Vitaminas*) y descripción.
  - `Product`: Identificador, nombre comercial y presentación (ej. *Paracetamol 500mg - Caja 20 tabletas*), descripción médica, precio unitario, stock disponible y referencia a la categoría.
- **Endpoints:**
  - `POST /categories/`: Registro de nuevas categorías.
  - `GET /categories/`: Listado completo de categorías.
  - `POST /products/`: Registro de nuevos productos en el catálogo.
  - `GET /products/`: Listado paginado de productos con soporte para filtros.
  - `GET /products/{id}`: Consulta individual por ID de producto (consumido externamente y por el servicio de pedidos).

---

### 2. Microservicio de Usuarios y Autenticación (`users_service` - Puerto 8002)
- **Responsabilidad:** Gestionar las cuentas de clientes, la seguridad de las contraseñas y la emisión de credenciales de sesión.
- **Base de Datos:** `db_usuarios_inka`.
- **Modelo ORM:**
  - `User`: ID, nombre completo, email único, hash de contraseña, dirección de entrega y teléfono.
- **Seguridad:**
  - **Hashing con Bcrypt:** Las contraseñas se almacenan procesadas mediante funciones hash unidireccionales con salt aleatorio.
  - **JSON Web Tokens (JWT):** Autenticación basada en tokens estándar HMAC-SHA256 con tiempo de expiración definido.
- **Endpoints:**
  - `POST /auth/register`: Registro de nuevos usuarios con cifrado automático de credenciales.
  - `POST /auth/login`: Validación de credenciales y retorno de token JWT y datos de usuario.
  - `GET /users/{id}`: Consulta de perfil de usuario.

---

### 3. Microservicio de Pedidos / Órdenes (`orders_service` - Puerto 8003)
- **Responsabilidad:** Recepción y procesamiento de compras, asegurando la consistencia transaccional del stock antes de asentar una orden.
- **Base de Datos:** `db_pedidos_inka`.
- **Modelos ORM:**
  - `Order`: ID, usuario ID, monto total liquidado, estado (`PENDING`, `COMPLETED`, `CANCELLED`) y fecha de creación.
  - `OrderItem`: ID, orden ID, producto ID, cantidad solicitada y precio unitario registrado al momento de la transacción.
- **Comunicación Inter-servicio (HTTPX Síncrono):**
  - Al recibir una solicitud `POST /orders/`, el servicio consulta en tiempo real al Microservicio de Catálogo:
    `GET http://localhost:8001/products/{product_id}`
  - **Validaciones de negocio ejecutadas:**
    1. **Existencia:** Si el producto no existe en el catálogo, retorna `HTTP 404 Not Found`.
    2. **Stock:** Si la cantidad requerida supera el inventario disponible, retorna `HTTP 400 Bad Request` informando las unidades disponibles.
    3. **Cálculo de Importes:** Se computa `cantidad * precio_unitario` por cada ítem y se asienta la orden con estado `COMPLETED`.
    4. **Resiliencia:** Si el servicio de catálogo no responde, se maneja el error con `HTTP 503 Service Unavailable`.
- **Endpoints:**
  - `POST /orders/`: Validación con catálogo y registro de la orden.
  - `GET /orders/{id}`: Consulta de orden y sus ítems asociados.
  - `GET /orders/`: Listado de órdenes registradas.

---

### 4. Cliente Web Frontend (`frontend` - Puerto 5173)
- **Tecnología:** React + Vite + Tailwind CSS v3.
- **Componentes y Capacidades:**
  - Vista de productos con filtrado reactivo por categorías y búsqueda por texto.
  - Indicadores de stock en tiempo real (*"En stock"*, *"Últimas unidades"*, *"Agotado"*).
  - Modal de autenticación para login y registro de clientes con almacenamiento seguro de tokens.
  - Carrito de compras deslizante con integración directa hacia el endpoint de órdenes.
  - Panel superior con monitoreo de disponibilidad para los 3 puertos backend.

---

## 💻 Requisitos del Sistema

- **Python 3.10+** (compatible con 3.11, 3.12 y 3.13)
- **MySQL Server 8.0+** o MariaDB
- **Node.js 18+** y **npm**
- **Git**

Comandos de verificación:
```powershell
python --version   # O python3 según la configuración del sistema
mysql --version
node -v
```

---

## 📂 Estructura del Repositorio

```text
app_microservicios/
│
├── init_db.sql                     # Script para creación de las 3 bases de datos en MySQL
├── seed_data.sql                   # Datos iniciales de prueba (categorías, productos, usuario)
├── requirements.txt                # Dependencias Python del backend
├── README.md                       # Especificación técnica del proyecto
├── instructions.md                 # Guía de instalación y comandos
│
├── catalog_service/                # Servicio de Catálogo (Puerto 8001)
│   ├── .env.example
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── main.py
│   └── alembic/
│
├── users_service/                  # Servicio de Usuarios y Auth (Puerto 8002)
│   ├── .env.example
│   ├── database.py
│   ├── models.py
│   ├── security.py
│   ├── schemas.py
│   ├── main.py
│   └── alembic/
│
├── orders_service/                 # Servicio de Pedidos (Puerto 8003)
│   ├── .env.example
│   ├── database.py
│   ├── models.py
│   ├── client.py                   # Cliente HTTPX para comunicación con Catálogo
│   ├── schemas.py
│   ├── main.py
│   └── alembic/
│
├── frontend/                       # Cliente Web React (Puerto 5173)
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
└── Scripts de Ejecución:
    ├── run_all.bat / run_all.ps1       # Levanta todos los servicios concurrentemente
    ├── run_catalog.bat / .ps1          # Levanta Catálogo (:8001)
    ├── run_users.bat / .ps1            # Levanta Usuarios (:8002)
    ├── run_orders.bat / .ps1           # Levanta Pedidos (:8003)
    └── run_frontend.bat                # Levanta Frontend (:5173)
```

---

## 🚀 Puesta en Marcha

### 1. Configuración de Base de Datos
Ejecutar en MySQL los scripts de preparación:
1. [`init_db.sql`](file:///c:/Users/willd/OneDrive/Desktop/workspace/app_microservicios/init_db.sql): Genera los esquemas `db_catalogo_inka`, `db_usuarios_inka` y `db_pedidos_inka`.
2. [`seed_data.sql`](file:///c:/Users/willd/OneDrive/Desktop/workspace/app_microservicios/seed_data.sql): Carga categorías, medicamentos con stock inicial y un usuario de prueba.

### 2. Entorno Virtual de Python
Desde la raíz del proyecto (`app_microservicios`):
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Variables de Entorno (.env)
Asegurar que los archivos `.env` de cada microservicio contengan las credenciales correctas de MySQL (`root` / `1234` por defecto):
- `catalog_service/.env`
- `users_service/.env`
- `orders_service/.env`

---

## ⚡ Ejecución del Sistema

### Modo Automatizado
Para levantar los tres microservicios y el cliente web en terminales independientes:
```powershell
.\run_all.bat
```

Servicios disponibles:
- **Catálogo API:** [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)
- **Usuarios API:** [http://127.0.0.1:8002/docs](http://127.0.0.1:8002/docs)
- **Pedidos API:** [http://127.0.0.1:8003/docs](http://127.0.0.1:8003/docs)
- **Cliente Web:** [http://localhost:5173](http://localhost:5173)

---

## 🧪 Flujo de Validación Inter-servicio

Para verificar la integración entre componentes:

1. **Acceder a la Interfaz Web:** [http://localhost:5173](http://localhost:5173).
2. **Verificar Estado:** Los indicadores del encabezado deben figurar activos en verde para los tres microservicios.
3. **Autenticación:** Iniciar sesión con un usuario registrado (el servicio `:8002` valida la contraseña contra su hash y retorna el JWT).
4. **Selección de Productos:** Agregar medicamentos del catálogo (`:8001`) al carrito de compra.
5. **Confirmación de Orden:** Procesar la compra desde el carrito.
   - El servicio `:8003` consulta síncronamente a `:8001` mediante HTTPX para validar stock.
   - Confirmada la disponibilidad, se emite el identificador de orden y se actualiza el inventario.
6. **Manejo de Errores:** Al solicitar cantidades superiores al stock disponible, el servicio de pedidos bloquea la transacción y retorna el detalle del error (`HTTP 400`).
