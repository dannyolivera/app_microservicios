# Plataforma Omnicanal Inkafarma — Retiro en Botica y Pago Híbrido
## Arquitectura Orientada a Microservicios con FastAPI, MySQL y React

---

## Descripción General del Proyecto

Esta plataforma implementa una solución de **Comercio Omnicanal Farmacéutico** que soporta tanto la **reserva con pago presencial en caja** como el **pago online (Tarjeta o Yape) con retiro directo en botica**, resolviendo tres problemáticas centrales del e-commerce farmacéutico:
1. **Inventario y surtido independiente por botica:** Cada sede (`branches`) gestiona su propio catálogo habilitado y existencias reales en `branch_inventory`, evitando mostrar un stock global engañoso.
2. **Quiebres de stock y sobreventas concurrentes:** El sistema garantiza la disponibilidad de medicamentos por sede mediante **bloqueo atómico transaccional a nivel de fila (`SELECT ... FOR UPDATE`)** y emite un código alfanumérico único de retiro (`pickup_code`: `INKA-CC-XXXXX`).
3. **Devolución automática de stock y dinero si falla un paso de la compra:** Cuando el cliente elige pago online, el servicio de pedidos **primero aparta el stock en la botica elegida** y recién después intenta cobrar en pagos (`:8004`). Si la tarjeta o Yape es rechazado (`HTTP 402`) o pagos falla (`HTTP 503`), **devuelve automáticamente las unidades apartadas a la botica** (y si fallara el guardado en BD después de cobrar, también reembolsa el dinero).

La solución adopta el patrón arquitectónico **Database-per-Service**, donde cada uno de los **4 microservicios** opera de forma autónoma con su propio esquema relacional en MySQL, comunicándose síncronamente vía HTTP/REST (`httpx`).

---

## Diagrama de Arquitectura del Sistema

```mermaid
flowchart TD
    Client["Cliente Web SPA React + Vite (:5173)"]

    subgraph Service1["Microservicio 1: Catálogo y Sedes (:8001)"]
        CatApp["FastAPI catalog_service"]
        DBCat[("MySQL: db_catalogo_inka")]
        CatApp --> DBCat
    end

    subgraph Service2["Microservicio 2: Usuarios y Auth (:8002)"]
        UserApp["FastAPI users_service (Bcrypt + JWT)"]
        DBUser[("MySQL: db_usuarios_inka")]
        UserApp --> DBUser
    end

    subgraph Service3["Microservicio 3: Coordinador de Pedidos (:8003)"]
        OrderApp["FastAPI orders_service (Coordinador de Pedidos)"]
        DBOrder[("MySQL: db_pedidos_inka")]
        OrderApp --> DBOrder
    end

    subgraph Service4["Microservicio 4: Pagos Online (:8004)"]
        PayApp["FastAPI payments_service (Mock / Culqi Adapter)"]
        DBPay[("MySQL: db_pagos_inka")]
        PayApp --> DBPay
    end

    Client -->|"GET /branches/, GET /products/?branch_id="| CatApp
    Client -->|"POST /auth/register, POST /auth/login"| UserApp
    Client -->|"POST /orders/ (Presencial u Online)"| OrderApp

    OrderApp -.->|"1. GET /products/:id?branch_id= (Validar sede y precio)"| CatApp
    OrderApp -.->|"2. PATCH /products/:id/stock (Bloqueo por sede)"| CatApp
    OrderApp -.->|"3. POST /payments/charge (Si PAGO_ONLINE)"| PayApp
    OrderApp -.->|"Devolución automática: release_stock si falla"| CatApp
    OrderApp -.->|"Reembolso si falla BD o se cancela orden PAID"| PayApp
```

---

## Especificación de Microservicios y Componentes

### 1. Microservicio de Catálogo e Inventario por Sede (`catalog_service`)
- **Puerto:** `8001`
- **Base de Datos:** `db_catalogo_inka` (`categories`, `branches`, `products`, `branch_inventory`)
- **Mecanismo de Concurrencia:** Bloqueo transaccional a nivel de fila (`with_for_update()`) sobre `branch_inventory` para la pareja `(branch_id, product_id)` y sincronización del consolidado en `products.stock`.
- **Rutas y Endpoints:**
  | Método | Ruta | Descripción |
  | :--- | :--- | :--- |
  | `GET` | `/` | Health check del servicio (`status: online`) |
  | `GET` | `/branches/` *(o `/api/v1/branches`)* | Listado de boticas activas con conteo de productos disponibles |
  | `POST` | `/branches/` | Registro de nuevas boticas/sedes |
  | `GET` | `/branches/{branch_id}/products` | Surtido y stock específico de una botica |
  | `PUT` | `/branches/{branch_id}/inventory/{product_id}` | Asignar o actualizar stock y disponibilidad por sede |
  | `GET` | `/categories/` · `POST /categories/` | Listado y creación de categorías farmacéuticas |
  | `GET` | `/products/` *(o `/api/v1/products`)* | Catálogo paginado con filtros (`skip`, `limit`, `category_id`, `branch_id`) |
  | `GET` | `/products/{id}` *(o `/api/v1/products/{id}`)* | Ficha y existencias (si recibe `branch_id`, valida disponibilidad en esa sede) |
  | `POST` | `/products/` | Registro de productos en el catálogo maestro |
  | `PATCH` | `/products/{id}/stock` *(o `/api/v1/products/{id}/stock`)* | Bloqueo (`block`) o liberación (`release`) atómica por `branch_id` |

---

### 2. Microservicio de Usuarios y Autenticación (`users_service`)
- **Puerto:** `8002`
- **Base de Datos:** `db_usuarios_inka` (`users`)
- **Seguridad:** Encriptación unidireccional con **Bcrypt** (12 rounds) y emisión de tokens **JWT (HS256)** con expiración configurable.
- **Rutas y Endpoints:**
  | Método | Ruta | Descripción |
  | :--- | :--- | :--- |
  | `GET` | `/` | Health check del servicio (`status: online`) |
  | `POST` | `/auth/register` *(o `/api/v1/auth/register`)* | Registro seguro de clientes |
  | `POST` | `/auth/login` *(o `/api/v1/auth/login`)* | Autenticación y generación de JWT Bearer Token |
  | `GET` | `/auth/me` *(o `/api/v1/auth/me`)* | Perfil del cliente descifrado desde el token Bearer |
  | `GET` | `/users/{id}` | Consulta de datos de cliente por ID |

---

### 3. Microservicio Coordinador de Pedidos (`orders_service`)
- **Puerto:** `8003`
- **Base de Datos:** `db_pedidos_inka` (`orders`, `order_items`)
- **Clientes HTTPX:** `CatalogServiceClient` (`:8001`) y `PaymentsServiceClient` (`:8004`).
- **Flujo de Compra Seguro (con devolución automática ante fallos):**
  1. **Fase 1 (Validación por sede):** Consulta disponibilidad y precios vigentes en `catalog_service` filtrando por `branch_id`.
  2. **Fase 2 (Bloqueo Atómico por sede):** Ejecuta `PATCH /products/{id}/stock` con `action="block"` y `branch_id`. Si falla un ítem, libera los anteriores.
  3. **Fase 3 (Cobro Online opcional):** Si `payment_method == "PAGO_ONLINE"`, invoca `POST /payments/charge` en `:8004`. Ante rechazo (`402`) o caída (`503`), **devuelve automáticamente todo el stock apartado en `:8001`**.
  4. **Fase 4 (Emisión de Ticket):** Persiste la orden con código único `INKA-CC-XXXXX` en estado `RESERVED` (si es pago en caja) o `PAID` (si es pago online); si fallara el guardado en BD después de cobrar, devuelve el stock a la botica y reembolsa el cobro.
- **Rutas y Endpoints:**
  | Método | Ruta | Descripción |
  | :--- | :--- | :--- |
  | `GET` | `/` | Health check del servicio (`status: online`) |
  | `POST` | `/orders/` *(o `/api/v1/orders`)* | Crea reserva presencial o compra online con devolución automática ante fallos |
  | `GET` | `/orders/{id}` *(o `/api/v1/orders/{id}`)* | Detalle de orden y ticket de recojo |
  | `GET` | `/orders/user/{user_id}` *(o `/api/v1/orders/user/{user_id}`)* | Historial de reservas y compras por cliente |
  | `GET` | `/orders/` | Listado global de órdenes registradas |
  | `PATCH` | `/orders/{id}/collect` | Confirmación de entrega en botica (`COLLECTED`) |
  | `PATCH` | `/orders/{id}/cancel` | Cancelación con reposición de stock en la sede original y reembolso si fue pagado online |

---

### 4. Microservicio de Pagos Online (`payments_service`)
- **Puerto:** `8004`
- **Base de Datos:** `db_pagos_inka` (`payments`, creada automáticamente al iniciar si no existe)
- **Patrón Adaptador (`PAYMENT_PROVIDER`):**
  - `mock` *(por defecto)*: Procesamiento local determinista para tarjetas (`VISA`, `MASTERCARD`, `AMEX`) y `YAPE` sin requerir credenciales externas. Nunca almacena PAN completo ni CVV.
  - `culqi`: Conector real hacia Culqi API v2 (`https://api.culqi.com/v2/charges` y `/refunds`) activable configurando `PAYMENT_PROVIDER=culqi`, `CULQI_PUBLIC_KEY` y `CULQI_SECRET_KEY` en `.env`.
- **Rutas y Endpoints:**
  | Método | Ruta | Descripción |
  | :--- | :--- | :--- |
  | `GET` | `/` | Health check del servicio y proveedor activo |
  | `GET` | `/payments/config` | Configuración pública del adaptador (`provider`, métodos soportados) |
  | `POST` | `/payments/charge` *(o `/api/v1/payments/charge`)* | Ejecuta el cobro online y persiste intentos `APPROVED` o `DECLINED` |
  | `GET` | `/payments/{payment_id}` | Consulta detalle de una transacción por ID |
  | `GET` | `/payments/user/{user_id}` | Historial de pagos del cliente |
  | `POST` | `/payments/{payment_id}/refund` *(o `/api/v1/payments/{payment_id}/refund`)* | Extorno/reembolso (`REFUNDED`) |

---

### 5. Cliente Web Frontend (`frontend`)
- **Puerto:** `5173` (Vite Dev Server)
- **Tecnologías:** React 19, Vite 8, Tailwind CSS v3, Lucide Icons.
- **Funcionalidades:**
  - **Identidad Corporativa Inkafarma:** Logos vectoriales oficiales (`inkafarma-logo.svg` e `inkafarma-logo-white.svg`), diseño limpio de tienda farmacéutica sin textos técnicos ni referencias internas expuestas al usuario final.
  - **Selector de Botica con Surtido y Stock Independiente:** Al cambiar entre *Miraflores*, *San Isidro* o *Lima Centro* (`GET /branches/`), recarga el catálogo real y existencias de esa sede y limpia el carrito con aviso si contenía productos de otra botica.
  - **Buscador y Categorías Dinámicas:** Filtrado instantáneo por categoría (`GET /categories/`) y barra de búsqueda.
  - **Indicadores de Stock en Vivo:** Etiquetas dinámicas (*"EN STOCK (N)"*, *"ÚLTIMAS X UN."*, *"AGOTADO"*).
  - **Autenticación con JWT:** Registro y login en modal con botón de relleno de demostración.
  - **Checkout Dual en Carrito Deslizante:** Elección entre *"Pagar en botica al recoger"* (efectivo/POS en tienda) o *"Pagar online y recoger en botica"* (formulario de Tarjeta o Yape).
  - **Ticket de Retiro e Historial:** Código copiable `INKA-CC-XXXXX`, número de operación de pago (cuando es online), historial en *"Mis Reservas"* y confirmación de entrega en botica.

---

## Requisitos del Sistema

- **Python:** 3.10 o superior (compatible con 3.11, 3.12 y 3.13)
- **Node.js:** 18 o superior con **npm**
- **MySQL Server:** 8.0+ o MariaDB (XAMPP, MySQL Workbench o servicio nativo)
- **Git**

---

## Estructura del Repositorio

```text
app_microservicios/
├── init_db.sql                     # Script DDL para creación de las 4 bases de datos MySQL
├── seed_data.sql                   # Carga inicial: categorías, 3 sedes, 8 productos e inventario por sede
├── requirements.txt                # Dependencias Python unificadas del backend
├── README.md                       # Especificación técnica y guía de arquitectura
├── instructions.md                 # Guía paso a paso de comandos de instalación
├── INFORME_COMPARATIVO.md          # Análisis comparativo sistema real vs. borrador Word (Informe 3)
│
├── catalog_service/                # Microservicio 1: Catálogo y Sedes (Puerto 8001)
│   ├── .env.example                # Variables de entorno de catálogo
│   ├── database.py                 # Conexión SQLAlchemy, DDL idempotente y siembra por sede
│   ├── models.py                   # Modelos ORM Category, Branch, Product y BranchInventory
│   ├── schemas.py                  # Schemas Pydantic de catálogo, sedes y stock por sede
│   ├── main.py                     # Endpoints FastAPI y row-locking en branch_inventory
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
├── orders_service/                 # Microservicio 3: Coordinador de Pedidos (Puerto 8003)
│   ├── .env.example                # Variables de entorno y URLs de Catálogo y Pagos
│   ├── database.py                 # Conexión SQLAlchemy a db_pedidos_inka y DDL compatible
│   ├── client.py                   # Clientes HTTPX hacia :8001 (Catálogo) y :8004 (Pagos)
│   ├── models.py                   # Modelos ORM Order (con branch_id y payment_*) y OrderItem
│   ├── schemas.py                  # Schemas Pydantic para pago presencial u online
│   ├── main.py                     # Bloqueo por sede, cobro y devolución automática si falla algo
│   └── alembic/                    # Historial de migraciones Alembic
│
├── payments_service/               # Microservicio 4: Pagos Online (Puerto 8004)
│   ├── .env.example                # Variables de entorno y adaptador mock / culqi
│   ├── database.py                 # Conexión SQLAlchemy a db_pagos_inka (auto-creación de BD)
│   ├── models.py                   # Modelo ORM Payment (APPROVED, DECLINED, REFUNDED)
│   ├── providers.py                # Adaptadores MockPaymentProvider y CulqiPaymentProvider
│   ├── schemas.py                  # Schemas Pydantic para cobro (CARD/YAPE) y reembolso
│   └── main.py                     # Endpoints FastAPI de cobro, consulta y reembolso
│
├── frontend/                       # Cliente Web React (Puerto 5173)
│   ├── public/                     # Logos SVG oficiales de Inkafarma
│   ├── src/
│   │   ├── components/             # Navbar, AuthModal, CartDrawer, ProductCard, OrderSuccessModal
│   │   ├── services/api.js         # Cliente fetch hacia los 4 microservicios
│   │   ├── App.jsx                 # Estado global, cambio de sede, filtros, carrito e historial
│   │   └── index.css               # Estilos globales y Tailwind CSS
│   ├── package.json
│   └── vite.config.js
│
└── Scripts de Lanzamiento Rápido:
    ├── run_all.bat / run_all.ps1    # Levanta los 4 microservicios y el frontend concurrentemente
    ├── run_catalog.bat / .ps1       # Levanta Catálogo (:8001)
    ├── run_users.bat / .ps1         # Levanta Usuarios (:8002)
    ├── run_orders.bat / .ps1        # Levanta Pedidos (:8003)
    ├── run_payments.bat / .ps1      # Levanta Pagos (:8004)
    └── run_frontend.bat             # Levanta Frontend (:5173)
```

---

## Instalación y Configuración Paso a Paso

### Paso 1: Configurar la Base de Datos MySQL
Asegúrese de que el servidor MySQL se encuentre en ejecución.

1. **Crear las 4 bases de datos:**
   ```powershell
   mysql -u root -p < init_db.sql
   ```
   *(Crea `db_catalogo_inka`, `db_usuarios_inka`, `db_pedidos_inka` y `db_pagos_inka`).*

2. **Cargar datos de prueba iniciales (Recomendado):**
   ```powershell
   mysql -u root -p < seed_data.sql
   ```
   *(Inserta categorías, 3 boticas, 8 productos e inventario diferenciado por sede. Nota: al arrancar `catalog_service`, si `branch_inventory` está vacío, también siembra automáticamente las sedes e inventario inicial).*

---

### Paso 2: Entorno Virtual de Python y Dependencias
Desde la raíz del repositorio (`app_microservicios`):

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
# Si PowerShell restringe scripts: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
pip install --upgrade pip
pip install -r requirements.txt
```

---

### Paso 3: Variables de Entorno (`.env`)
Copie `.env.example` como `.env` en cada servicio y configure sus credenciales locales de MySQL:

- **`catalog_service/.env`**: `DB_NAME=db_catalogo_inka` (`DATABASE_URL=mysql+pymysql://root:tu_password@localhost:3306/db_catalogo_inka`)
- **`users_service/.env`**: `DB_NAME=db_usuarios_inka`, `JWT_SECRET_KEY=inkafarma_super_secret_academic_key_2026`, `ACCESS_TOKEN_EXPIRE_MINUTES=60`
- **`orders_service/.env`**: `DB_NAME=db_pedidos_inka`, `CATALOG_SERVICE_URL=http://localhost:8001`, `PAYMENTS_SERVICE_URL=http://localhost:8004`
- **`payments_service/.env`**: `DB_NAME=db_pagos_inka`, `PAYMENT_PROVIDER=mock` *(o `culqi` con `CULQI_PUBLIC_KEY` y `CULQI_SECRET_KEY`)*

---

### Paso 4: Preparar el Frontend
```powershell
cd frontend
npm install --legacy-peer-deps
cd ..
```

---

## Ejecución del Sistema

### Opción A: Lanzamiento Automático (Recomendado)
```powershell
.\run_all.ps1
# o en CMD / PowerShell: .\run_all.bat
```

### Opción B: Ejecución Manual Terminal por Terminal

| Servicio | Comando | URL y Swagger UI |
| :--- | :--- | :--- |
| **Catálogo (:8001)** | `cd catalog_service`<br>`..\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload` | [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs) |
| **Usuarios (:8002)** | `cd users_service`<br>`..\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8002 --reload` | [http://127.0.0.1:8002/docs](http://127.0.0.1:8002/docs) |
| **Pedidos (:8003)** | `cd orders_service`<br>`..\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8003 --reload` | [http://127.0.0.1:8003/docs](http://127.0.0.1:8003/docs) |
| **Pagos (:8004)** | `cd payments_service`<br>`..\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8004 --reload` | [http://127.0.0.1:8004/docs](http://127.0.0.1:8004/docs) |
| **Frontend Web** | `cd frontend`<br>`npm run dev` | [http://localhost:5173](http://localhost:5173) |

---

## Casos de Prueba y Demostración Académica

### Escenario 1: Inventario y Surtido Independiente por Botica
1. En [http://localhost:5173](http://localhost:5173), observe los productos de **Inkafarma Miraflores** (Paracetamol: 50, Ibuprofeno: 30, Amoxicilina: 20, Colágeno: 12; sin Alcohol ni Loratadina).
2. Cambie el selector de botica a **Inkafarma San Isidro**: Paracetamol baja a 18, Ibuprofeno muestra *"ÚLTIMAS 4 UN."*, aparece *Alcohol Medicinal* (35) y *Loratadina* (14), y desaparecen *Amoxicilina* y *Colágeno*.
3. Cambie a **Inkafarma Lima Centro**: Ibuprofeno figura **AGOTADO** (`0`) y Amoxicilina tiene `3` unidades.
4. Confirme una reserva en San Isidro y verifique que el stock de Miraflores permanece intacto.

### Escenario 2: Reserva Presencial vs. Pago Online Aprobado (`PAID`)
1. **Pago presencial:** Elija *"Pagar en botica al recoger"* -> crea orden `RESERVED`, código `INKA-CC-XXXXX` y descuenta stock en la sede elegida.
2. **Pago online aprobado:** Elija *"Pagar online y recoger en botica"*, ingrese tarjeta `4242 4242 4242 4242` (mes `12`, año `2028`, CVV `123`) o Yape (`999888777`, código `123456`) -> bloquea stock en `:8001`, cobra en `:8004` y emite orden **`PAID`** con `N.° de operación PAY-INKA-...`.

### Escenario 3: Devolución automática de stock si el pago es rechazado (`HTTP 402`)
1. Agregue un producto al carrito y seleccione *"Pagar online y recoger en botica"*.
2. Ingrese una tarjeta terminada en **`0002`** (ej. `4000 0000 0000 0002`, fondos insuficientes) o **`0069`** (rechazo bancario) o Yape código **`000000`**.
3. **Resultado:** `:8003` aparta temporalmente el stock en `:8001`, intenta cobrar en `:8004`, recibe rechazo `HTTP 402` y **devuelve automáticamente el stock a la botica seleccionada**; no se crea la orden y el inventario vuelve a su cantidad original.

### Escenario 4: Cancelación con Reposición por Sede y Reembolso
- Invocar `PATCH /orders/{id}/cancel` en `:8003/docs` devuelve las unidades a la `branch_id` exacta donde se compró y, si la orden fue `PAID`, ejecuta `POST /payments/{payment_id}/refund` en `:8004` marcando `payment_status = REFUNDED`.

---

## Distribución Inicial de Surtido y Stock por Sede

| Producto | Miraflores (ID `1`) | San Isidro (ID `2`) | Lima Centro (ID `3`) |
| :--- | :---: | :---: | :---: |
| Paracetamol 500mg (`#1`) | `50` | `18` | `85` |
| Ibuprofeno 400mg (`#2`) | `30` | `4` *(últimas un.)* | `0` *(agotado)* |
| Amoxicilina 500mg (`#3`) | `20` | *No disponible* | `3` *(últimas un.)* |
| Protector Solar FPS 50+ (`#4`) | `15` | `28` | *No disponible* |
| Vitamina C + Zinc (`#5`) | `40` | `22` | `16` |
| Alcohol Medicinal 70° (`#6`) | *No disponible* | `35` | `25` |
| Loratadina 10mg (`#7`) | *No disponible* | `14` | `19` |
| Colágeno Hidrolizado (`#8`) | `12` | *No disponible* | *No disponible* |

---

## Datos de Prueba para Pagos Online y Credenciales

### Medios de Prueba en `payments_service` (`PAYMENT_PROVIDER=mock`)

| Escenario | Medio | Dato de entrada | Resultado |
| :--- | :--- | :--- | :--- |
| **Aprobación estándar** | Tarjeta | `4242 4242 4242 4242`, mes `12`, año `2028`, CVV `123` | `201 Created`, orden **`PAID`**, código `PAY-INKA-...`. |
| **Fondos insuficientes** | Tarjeta | Terminada en `0002` (ej. `4000 0000 0000 0002`) | `HTTP 402` + **rollback automático de stock**. |
| **Rechazo bancario / bloqueada** | Tarjeta | Terminada en `0069` o `9995` | `HTTP 402` + **rollback automático de stock**. |
| **Yape aprobado** | Yape | Celular `999888777` + código distinto de `000000` (ej. `123456`) | `201 Created`, orden **`PAID`**. |
| **Yape inválido** | Yape | Celular `999888777` + código `000000` | `HTTP 402` + **rollback automático de stock**. |

- **Paso a Culqi Sandbox:** en `payments_service/.env` cambie `PAYMENT_PROVIDER=culqi` y configure `CULQI_PUBLIC_KEY=pk_test_...` y `CULQI_SECRET_KEY=sk_test_...`.

### Usuarios de Demostración
- **Registro rápido desde UI:** En el modal de acceso, abra la pestaña **"Registrarme"** y use **"Usar cuenta de prueba para demostración"** (`carlos.gomez@gmail.com` / `miPasswordSeguro123`) o registre cualquier cuenta nueva.
- **Nota sobre `seed_data.sql`:** El usuario `juan.perez@universidad.edu.pe` en `seed_data.sql` tiene un hash bcrypt referencial; para iniciar sesión cree una cuenta desde **"Registrarme"**.

---

## Ejemplos Rápidos de Prueba por Consola (`curl`)

```bash
# 1. Listar boticas activas con conteo de productos (:8001)
curl -X GET http://127.0.0.1:8001/branches/

# 2. Consultar catálogo y stock específico de San Isidro (branch_id=2)
curl -X GET "http://127.0.0.1:8001/products/?branch_id=2"

# 3. Iniciar sesión y obtener JWT (:8002)
curl -X POST http://127.0.0.1:8002/auth/login -H "Content-Type: application/json" -d '{"email":"carlos.gomez@gmail.com","password":"miPasswordSeguro123"}'

# 4. Consultar órdenes de un usuario (:8003)
curl -X GET http://127.0.0.1:8003/orders/user/1

# 5. Ver configuración activa de pasarela (:8004)
curl -X GET http://127.0.0.1:8004/payments/config
```

---

## Solución de Problemas Comunes

> [!WARNING]
> **Error `Access denied for user 'root'@'localhost'`:**
> Verifique que en los archivos `.env` de los 4 servicios haya actualizado **tanto `DB_PASSWORD` como `DATABASE_URL`** con su contraseña de MySQL.

> [!TIP]
> **Error `No module named alembic.__main__`:**
> Instale primero `pip install -r requirements.txt` con el `venv` activo y, dentro de la carpeta del servicio, ejecute **`alembic upgrade head`** (sin `python -m`, para no colisionar con la carpeta local `alembic/`). De todas formas, cada servicio crea/actualiza sus tablas automáticamente al arrancar con `uvicorn`.

> [!NOTE]
> **Conflicto de puertos:**
> Asegúrese de tener libres los puertos `8001`, `8002`, `8003`, `8004` y `5173` antes de ejecutar `.\run_all.ps1`.
