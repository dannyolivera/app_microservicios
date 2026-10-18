# Plataforma Omnicanal Click & Collect (Inkafarma)
## Arquitectura Orientada a Microservicios con FastAPI, MySQL y React

---

## Descripción General del Proyecto

Esta plataforma implementa una solución de **Comercio Omnicanal Farmacéutico bajo el modelo Click & Collect**, orientada a resolver dos de las principales problemáticas del e-commerce tradicional:
1. **Fricción y rechazo en pasarelas bancarias virtuales:** El cliente realiza la reserva digital y efectúa el pago presencial en la caja de la botica (Efectivo o POS) al momento de retirar su pedido.
2. **Quiebres de stock y sobreventas concurrentes:** El sistema asegura la disponibilidad de medicamentos mediante **bloqueo atómico transaccional a nivel de fila (`SELECT ... FOR UPDATE`)** y emite un código alfanumérico único de retiro (`pickup_code`) para ser liquidado en mostrador.

La solución adopta el patrón arquitectónico **Database-per-Service**, donde cada microservicio opera de forma autónoma con su propio esquema relacional en MySQL, comunicándose síncronamente mediante peticiones HTTP/REST estructuradas.

---

## Diagrama de Arquitectura del Sistema

```mermaid
graph TD
    Client["Cliente Web SPA React (Vite :5173)"]

    subgraph Service1["Microservicio 1: Catálogo e Inventario (:8001)"]
        CatApp["FastAPI Catalog Service"]
        DBCat[("MySQL: db_catalogo_inka")]
        CatApp --> DBCat
    end

    subgraph Service2["Microservicio 2: Usuarios y Autenticación (:8002)"]
        UserApp["FastAPI Users & Auth Service (JWT)"]
        DBUser[("MySQL: db_usuarios_inka")]
        UserApp --> DBUser
    end

    subgraph Service3["Microservicio 3: Pedidos y Orquestador Click & Collect (:8003)"]
        OrderApp["FastAPI Orders Orchestrator"]
        DBOrder[("MySQL: db_pedidos_inka")]
        OrderApp --> DBOrder
    end

    %% Flujos de interacción del cliente
    Client -->|"1. GET /products (Catálogo y Stock por Sede)"| CatApp
    Client -->|"2. POST /auth/login (JWT Bearer Token)"| UserApp
    Client -->|"3. POST /orders (Emisión de Reserva Click & Collect)"| OrderApp

    %% Comunicación inter-servicio síncrona
    OrderApp -.->|"4a. Fase 1: GET /products/:id (Validar existencia y precio)"| CatApp
    OrderApp -.->|"4b. Fase 2: PATCH /products/:id/stock (Bloqueo atómico with_for_update)"| CatApp
    OrderApp -.->|"4c. Compensación: PATCH /products/:id/stock (Rollback si falla un ítem)"| CatApp
```

---

## Especificación de Microservicios y Componentes

### 1. Microservicio de Catálogo e Inventario (`catalog_service`)
- **Puerto:** `8001`
- **Base de Datos:** `db_catalogo_inka`
- **Mecanismo de Concurrencia:** Bloqueo transaccional de fila (`with_for_update()`) para asegurar operaciones atómicas de bloqueo (`block`) y reposición (`release`) de stock.
- **Rutas y Endpoints:**
  | Método | Ruta | Descripción |
  | :--- | :--- | :--- |
  | `GET` | `/` | Health check del servicio (`status: online`) |
  | `GET` | `/categories/` | Listado de categorías farmacéuticas |
  | `POST` | `/categories/` | Creación de nuevas categorías |
  | `GET` | `/products/` *(o `/api/v1/products`)* | Catálogo paginado con filtros (`skip`, `limit`, `category_id`) |
  | `GET` | `/products/{id}` *(o `/api/v1/products/{id}`)* | Ficha técnica y existencias (consumido por Órdenes) |
  | `POST` | `/products/` | Registro de nuevos medicamentos y productos |
  | `PATCH` | `/products/{id}/stock` *(o `/api/v1/products/{id}/stock`)* | **Bloqueo atómico / Reversión de stock** (`action: block \| release`) |

---

### 2. Microservicio de Usuarios y Autenticación (`users_service`)
- **Puerto:** `8002`
- **Base de Datos:** `db_usuarios_inka`
- **Seguridad:** Encriptación unidireccional con **Bcrypt** (con salt aleatorio) y emisión de tokens **JWT (HS256)** con expiración configurable.
- **Rutas y Endpoints:**
  | Método | Ruta | Descripción |
  | :--- | :--- | :--- |
  | `GET` | `/` | Health check del servicio (`status: online`) |
  | `POST` | `/auth/register` *(o `/api/v1/auth/register`)* | Registro seguro de nuevos clientes farmacéuticos |
  | `POST` | `/auth/login` *(o `/api/v1/auth/login`)* | Autenticación y generación de JWT Bearer Token |
  | `GET` | `/auth/me` *(o `/api/v1/auth/me`)* | Perfil del cliente actual descifrado desde el token Bearer |
  | `GET` | `/users/{id}` | Consulta de datos de cliente por ID |

---

### 3. Microservicio de Pedidos y Orquestador Click & Collect (`orders_service`)
- **Puerto:** `8003`
- **Base de Datos:** `db_pedidos_inka`
- **Cliente HTTPX:** `CatalogServiceClient` para comunicación HTTP síncrona con el puerto `8001`.
- **Patrón Saga Ligero (Compensación Transaccional):**
  1. **Fase 1 (Validación):** Consulta existencia y precios vigentes en `catalog_service`.
  2. **Fase 2 (Bloqueo Atómico):** Ejecuta `PATCH /products/{id}/stock` con `action="block"`.
  3. **Compensación (Rollback):** Si un producto falla por falta de existencias o timeout, el servicio invoca automáticamente `action="release"` para devolver el inventario de los productos reservados previamente.
  4. **Fase 3 (Emisión de Ticket):** Asienta la orden con código alfanumérico único (ej. `INKA-CC-7F3A9`) y estado `RESERVED`.
- **Rutas y Endpoints:**
  | Método | Ruta | Descripción |
  | :--- | :--- | :--- |
  | `GET` | `/` | Health check del servicio (`status: online`) |
  | `POST` | `/orders/` *(o `/api/v1/orders`)* | Orquestación y emisión de reserva con bloqueo de stock |
  | `GET` | `/orders/{id}` *(o `/api/v1/orders/{id}`)* | Detalle de orden y ticket de recojo |
  | `GET` | `/orders/user/{user_id}` *(o `/api/v1/orders/user/{user_id}`)* | Historial de reservas emitidas por cliente |
  | `GET` | `/orders/` | Listado global de órdenes registradas |
  | `PATCH` | `/orders/{id}/collect` | Liquidación en caja de botica (cambio a estado `COLLECTED`) |
  | `PATCH` | `/orders/{id}/cancel` | Cancelación de pedido con reposición automática en inventario |

---

### 4. Cliente Web Frontend (`frontend`)
- **Puerto:** `5173` (Vite Dev Server)
- **Tecnologías:** React 18, Vite, Tailwind CSS v3, Lucide Icons.
- **Funcionalidades:**
  - **Monitor de Microservicios:** Indicador en tiempo real del estado de salud de los 3 puertos (`:8001`, `:8002`, `:8003`).
  - **Selector de Sede de Botica:** Permite seleccionar la botica de recojo (Miraflores, San Isidro, Lima Centro).
  - **Catálogo Reactivo:** Filtrado instantáneo por categorías y barra de búsqueda interactiva.
  - **Indicadores de Stock en Vivo:** Etiquetas dinámicas (*"En stock"*, *"Últimas unidades"*, *"Agotado"*).
  - **Modal de Autenticación Rápida:** Login y registro con botón de un solo clic para cargar credenciales de demostración.
  - **Carrito Deslizante y Checkout:** Envío consolidado hacia el microservicio de órdenes.
  - **Modal de Ticket Click & Collect:** Visualización de código de recojo alfanumérico, resumen de medicamentos y botón para simular el retiro presencial en botica.

---

## Requisitos del Sistema

- **Python:** 3.10 o superior (compatible con 3.11, 3.12 y 3.13)
- **Node.js:** 18 o superior con **npm**
- **MySQL Server:** 8.0+ o MariaDB (XAMPP, MySQL Workbench o servicio nativo)
- **Git**

Verificación de versiones en consola:
```powershell
python --version   # o python3 --version
mysql --version
node -v
npm -v
```

---

## Estructura del Repositorio

```text
app_microservicios/
├── init_db.sql                     # Script DDL para creación de las 3 bases de datos MySQL
├── seed_data.sql                   # Carga de datos iniciales (categorías, medicinas, usuarios)
├── requirements.txt                # Dependencias Python unificadas del backend
├── README.md                       # Especificación técnica y guía de arquitectura
├── instructions.md                 # Guía paso a paso de comandos de instalación
│
├── catalog_service/                # Microservicio 1: Catálogo e Inventario (Puerto 8001)
│   ├── .env.example                # Variables de entorno de catálogo
│   ├── database.py                 # Conexión SQLAlchemy y DDL automático de tablas
│   ├── models.py                   # Modelos ORM Category y Product
│   ├── schemas.py                  # Schemas de validación Pydantic
│   ├── main.py                     # Endpoints FastAPI y bloqueo atómico con row-lock
│   └── alembic/                    # Historial de migraciones Alembic
│
├── users_service/                  # Microservicio 2: Usuarios y Autenticación (Puerto 8002)
│   ├── .env.example                # Variables de entorno y clave secreta JWT
│   ├── database.py                 # Conexión SQLAlchemy a db_usuarios_inka
│   ├── models.py                   # Modelo ORM User
│   ├── security.py                 # Algoritmos Bcrypt y generación de JWT
│   ├── schemas.py                  # Schemas Pydantic para registro, login y tokens
│   ├── main.py                     # Endpoints FastAPI de registro y autenticación
│   └── alembic/                    # Historial de migraciones Alembic
│
├── orders_service/                 # Microservicio 3: Pedidos y Click & Collect (Puerto 8003)
│   ├── .env.example                # Variables de entorno y URL de Catálogo
│   ├── database.py                 # Conexión SQLAlchemy a db_pedidos_inka
│   ├── client.py                   # Cliente HTTPX para llamadas inter-servicio
│   ├── models.py                   # Modelos ORM Order y OrderItem
│   ├── schemas.py                  # Schemas Pydantic para emisión de reservas
│   ├── main.py                     # Orquestación con compensación transaccional
│   └── alembic/                    # Historial de migraciones Alembic
│
├── frontend/                       # Cliente Web React (Puerto 5173)
│   ├── src/
│   │   ├── components/             # Navbar, AuthModal, CartDrawer, ProductCard, OrderSuccessModal
│   │   ├── services/api.js         # Cliente fetch centralizado hacia los 3 microservicios
│   │   ├── App.jsx                 # Estado global, filtros, carrito y sincronización
│   │   └── index.css               # Estilos globales y Tailwind CSS
│   ├── package.json
│   └── vite.config.js
│
└── Scripts de Lanzamiento Rápido:
    ├── run_all.bat / run_all.ps1    # Levanta los 3 microservicios y el frontend concurrentemente
    ├── run_catalog.bat / .ps1       # Levanta Catálogo (:8001)
    ├── run_users.bat / .ps1         # Levanta Usuarios (:8002)
    ├── run_orders.bat / .ps1        # Levanta Pedidos (:8003)
    └── run_frontend.bat             # Levanta Frontend (:5173)
```

---

## Instalación y Configuración Paso a Paso

### Paso 1: Configurar la Base de Datos MySQL
Asegúrese de que el servidor MySQL se encuentre en ejecución.

1. **Crear las bases de datos:**
   ```powershell
   mysql -u root -p < init_db.sql
   ```
   *(Crea `db_catalogo_inka`, `db_usuarios_inka` y `db_pedidos_inka`).*

2. **Cargar datos de prueba iniciales (Recomendado):**
   ```powershell
   mysql -u root -p < seed_data.sql
   ```
   *(Inserta categorías farmacéuticas, productos con stock y el usuario demo).*

---

### Paso 2: Entorno Virtual de Python y Dependencias
Desde la raíz del repositorio (`app_microservicios`):

```powershell
# 1. Crear el entorno virtual
python -m venv venv

# 2. Activar el entorno virtual en PowerShell
.\venv\Scripts\Activate.ps1

# Nota: Si PowerShell restringe la ejecución de scripts, ejecute previamente:
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 3. Instalar librerías
pip install --upgrade pip
pip install -r requirements.txt
```

---

### Paso 3: Variables de Entorno (`.env`)
Cada microservicio cuenta con un archivo `.env.example`. Copie y configure según sus credenciales locales de MySQL:

- **`catalog_service/.env`**:
  ```env
  DB_USER=root
  DB_PASSWORD=tu_password
  DB_HOST=localhost
  DB_PORT=3306
  DB_NAME=db_catalogo_inka
  DATABASE_URL=mysql+pymysql://root:tu_password@localhost:3306/db_catalogo_inka
  ```

- **`users_service/.env`**:
  ```env
  DB_USER=root
  DB_PASSWORD=tu_password
  DB_HOST=localhost
  DB_PORT=3306
  DB_NAME=db_usuarios_inka
  DATABASE_URL=mysql+pymysql://root:tu_password@localhost:3306/db_usuarios_inka
  JWT_SECRET_KEY=inkafarma_super_secret_academic_key_2026
  ACCESS_TOKEN_EXPIRE_MINUTES=60
  ```

- **`orders_service/.env`**:
  ```env
  DB_USER=root
  DB_PASSWORD=tu_password
  DB_HOST=localhost
  DB_PORT=3306
  DB_NAME=db_pedidos_inka
  DATABASE_URL=mysql+pymysql://root:tu_password@localhost:3306/db_pedidos_inka
  CATALOG_SERVICE_URL=http://localhost:8001
  ```

---

### Paso 4: Preparar el Frontend
Desde la raíz del proyecto:
```powershell
cd frontend
npm install --legacy-peer-deps
cd ..
```

---

## Ejecución del Sistema

### Opción A: Lanzamiento Automático (Recomendado)
Ejecute el script de automatización para abrir las 4 terminales simultáneamente:

```powershell
.\run_all.bat
```
*(O en PowerShell: `.\run_all.ps1`)*

### Opción B: Ejecución Manual Terminal por Terminal

| Servicio | Comando | URL y Swagger UI |
| :--- | :--- | :--- |
| **Catálogo (:8001)** | `cd catalog_service`<br>`python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload` | [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs) |
| **Usuarios (:8002)** | `cd users_service`<br>`python -m uvicorn main:app --host 127.0.0.1 --port 8002 --reload` | [http://127.0.0.1:8002/docs](http://127.0.0.1:8002/docs) |
| **Pedidos (:8003)** | `cd orders_service`<br>`python -m uvicorn main:app --host 127.0.0.1 --port 8003 --reload` | [http://127.0.0.1:8003/docs](http://127.0.0.1:8003/docs) |
| **Frontend Web** | `cd frontend`<br>`npm run dev` | [http://localhost:5173](http://localhost:5173) |

---

## Credenciales de Prueba para Demostración

El sistema incluye opciones automáticas para agilizar la validación funcional:

- **Autocompletado en Frontend:** En el modal de login, hacer clic en el botón **"Rellenar datos de prueba para demostración"**:
  - **Email:** `carlos.gomez@gmail.com`
  - **Contraseña:** `miPasswordSeguro123`
- **Usuario registrado en Seed SQL:**
  - **Email:** `juan.perez@universidad.edu.pe`
  - **Contraseña plana:** `farmacia123`
- **Registro libre:** Puede registrar cualquier nuevo usuario directamente desde la pestaña **"Registrarse"** del modal.

---

## Casos de Prueba y Demostración Académica

### Escenario 1: Flujo Exitoso Click & Collect (Happy Path)
1. Ingrese a [http://localhost:5173](http://localhost:5173) y verifique que los 3 indicadores de servicios en el encabezado figuren activos (`ONLINE`).
2. Abra el modal de login e inicie sesión con el usuario de prueba.
3. Seleccione una botica de retiro (ej. *Inkafarma Miraflores*).
4. Agregue medicamentos al carrito (ej. 2 unidades de *Paracetamol 500mg*).
5. Abra el carrito lateral y presione **"Procesar Orden de Compra"**.
6. **Resultado:**
   - `:8003` consulta a `:8001` y ejecuta el bloqueo atómico.
   - Se crea la orden con código `INKA-CC-XXXXX`.
   - Se abre el modal con el ticket de recojo y el stock en el catálogo se reduce inmediatamente.
7. Haga clic en **"Simular Entrega en Mostrador"** para cambiar el estado de `RESERVED` a `COLLECTED`.

### Escenario 2: Prevención de Quiebre de Stock (Stockout Rejection)
1. Localice un producto con stock limitado (ej. *Amoxicilina* con stock de 20 unidades).
2. Modifique la cantidad en el carrito a un valor superior a las existencias disponibles (ej. 25 unidades).
3. Intente procesar la orden.
4. **Resultado:** El microservicio de pedidos (`:8003`) rechaza la transacción con error `HTTP 400 Bad Request` indicando que el stock disponible es insuficiente.

### Escenario 3: Tolerancia a Fallos y Compensación (Rollback Transaccional)
1. Si un carrito contiene múltiples productos (ej. Producto A con stock y Producto B que agota su stock concurrentemente):
2. El orquestador bloquea el Producto A.
3. Al fallar el bloqueo del Producto B, el bloque de compensación invoca `action="release"` para restaurar las existencias del Producto A.
4. La base de datos mantiene consistencia total sin ítems huérfanos ni stock congelado indebidamente.

### Escenario 4: Resiliencia ante Caída de Microservicios
1. Apague la terminal de `catalog_service` (puerto `8001`).
2. En el frontend, el monitor superior actualizará el estado de Catálogo a inactivo (`OFFLINE`).
3. Al intentar procesar una orden, `orders_service` captura la indisponibilidad y retorna un `HTTP 503 Service Unavailable` controlado, informando al usuario de forma transparente.

---

## Ejemplos Rápidos de Prueba por Consola (`curl`)

### 1. Consultar estado del microservicio de Catálogo:
```bash
curl -X GET http://127.0.0.1:8001/
```

### 2. Consultar productos disponibles:
```bash
curl -X GET "http://127.0.0.1:8001/products/?limit=5"
```

### 3. Autenticación y obtención de JWT:
```bash
curl -X POST http://127.0.0.1:8002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"juan.perez@universidad.edu.pe","password":"farmacia123"}'
```

### 4. Consultar pedidos de un usuario:
```bash
curl -X GET http://127.0.0.1:8003/orders/user/1
```

---

## Preguntas Frecuentes y Solución de Problemas

> [!TIP]
> **Error al ejecutar scripts en PowerShell (`Activate.ps1` no se puede cargar por directiva de ejecución):**
> Abra PowerShell como Administrador o en la sesión actual ejecute:
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> ```

> [!WARNING]
> **Error de conexión a MySQL (`Access denied for user 'root'@'localhost'`):**
> Verifique que la contraseña configurada en los archivos `.env` de cada microservicio coincida exactamente con la contraseña de su instalación de MySQL Server.

> [!NOTE]
> **Conflicto de Puertos en Windows (`Address already in use`):**
> Asegúrese de que los puertos `8001`, `8002`, `8003` y `5173` estén libres antes de iniciar los scripts de lanzamiento.
