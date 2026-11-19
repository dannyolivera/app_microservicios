# Guía de Instalación y Ejecución Paso a Paso
## Sistema de Microservicios Farmacéutico Inkafarma

Este documento contiene las instrucciones precisas para configurar las bases de datos MySQL, preparar el entorno Python, levantar los 4 microservicios independientes en FastAPI y ejecutar el Frontend con React y Tailwind CSS v3.

---

### 📋 Requisitos Previos

- **Python 3.10 o superior** (verificar con `python --version`)
- **MySQL Server 8.0+**
- **Node.js 18+** (para el frontend)

---

## Paso 1: Configurar el Entorno Virtual de Python y Dependencias Backend

Abra PowerShell en la carpeta raíz del proyecto (`app_microservicios`):

```powershell
# 1. Crear el entorno virtual con Python 3
python -m venv venv

# 2. Activar el entorno virtual en PowerShell
.\venv\Scripts\Activate.ps1

# (Si Windows bloquea scripts de PowerShell por directiva de ejecución, ejecute:
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass)

# 3. Actualizar pip e instalar todas las dependencias
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

## Paso 2: Crear las 4 Bases de Datos en MySQL (Database-per-Service)

Asegúrese de que el servicio MySQL esté corriendo (MySQL Server, MySQL Workbench, XAMPP o DBeaver).

### Opción A: Desde consola PowerShell
```powershell
mysql -u root -p < init_db.sql
```

### Opción B: Copiar y pegar en MySQL Workbench
Abra el archivo `init_db.sql` y ejecute:
```sql
CREATE DATABASE IF NOT EXISTS `db_catalogo_inka` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `db_usuarios_inka` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `db_pedidos_inka` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `db_pagos_inka` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## Paso 3: Configurar `.env` y Cargar Datos Semilla

1. **Variables de entorno (`.env`):**
   Copie el archivo `.env.example` como `.env` dentro de cada uno de los 4 servicios (`catalog_service`, `users_service`, `orders_service`, `payments_service`) y coloque su contraseña de MySQL en **ambas líneas**: `DB_PASSWORD` y `DATABASE_URL` (si solo edita `DB_PASSWORD` y deja `root:@localhost` en `DATABASE_URL`, SQLAlchemy seguirá fallando al conectar).
   - En `orders_service/.env` asegure `CATALOG_SERVICE_URL=http://localhost:8001` y `PAYMENTS_SERVICE_URL=http://localhost:8004`.
   - En `payments_service/.env` deje `PAYMENT_PROVIDER=mock` para pruebas locales (o `culqi` con `CULQI_PUBLIC_KEY` y `CULQI_SECRET_KEY` para Culqi Sandbox).

2. **Datos semilla (Recomendado):**
   Ejecute `seed_data.sql` en MySQL para cargar categorías, las 3 boticas, 8 productos y el inventario independiente por sede:
   ```powershell
   mysql -u root -p < seed_data.sql
   ```

3. **Tablas y migraciones:**
   Al arrancar cada servicio con `uvicorn`, SQLAlchemy crea y actualiza automáticamente las tablas necesarias (`Base.metadata.create_all` y `ensure_*_schema`). Si desea ejecutar Alembic manualmente (luego de instalar `requirements.txt`), entre a la carpeta del servicio y use **`alembic upgrade head`** *(sin `python -m`, para no colisionar con la carpeta local `alembic/`)*.

---

## Paso 4: Levantar los 4 Microservicios + Frontend

### Opción A: Lanzamiento automático (Recomendado)
Desde la raíz `app_microservicios` (levanta los 4 microservicios + frontend; también existen scripts individuales `run_catalog.*`, `run_users.*`, `run_orders.*`, `run_payments.*` y `run_frontend.bat`):
```powershell
.\run_all.ps1
```
*(O en CMD: `.\run_all.bat`)*

### Opción B: Manual en terminales separadas (todas con `.\venv\Scripts\Activate.ps1`)

- **Terminal 1 — Catálogo y Sedes (`:8001`):**
  ```powershell
  cd catalog_service
  ..\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
  ```
  Swagger UI: [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)

- **Terminal 2 — Usuarios y Auth (`:8002`):**
  ```powershell
  cd users_service
  ..\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8002 --reload
  ```
  Swagger UI: [http://127.0.0.1:8002/docs](http://127.0.0.1:8002/docs)

- **Terminal 3 — Coordinador de Pedidos (`:8003`):**
  ```powershell
  cd orders_service
  ..\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8003 --reload
  ```
  Swagger UI: [http://127.0.0.1:8003/docs](http://127.0.0.1:8003/docs)

- **Terminal 4 — Pagos Online (`:8004`):**
  ```powershell
  cd payments_service
  ..\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8004 --reload
  ```
  Swagger UI: [http://127.0.0.1:8004/docs](http://127.0.0.1:8004/docs)

---

## Paso 5: Preparar y Levantar el Frontend (React + Tailwind CSS v3)

```powershell
cd frontend
npm install --legacy-peer-deps
npm run dev
```
Acceso web: [http://localhost:5173](http://localhost:5173)

---

## Paso 6: Demostración Funcional Completa

1. **Cambiar de Botica:** Seleccione *Miraflores*, *San Isidro* o *Lima Centro* en el selector superior. Verá que los productos disponibles y sus cantidades cambian de forma independiente en cada sede.
2. **Registrarse / Iniciar Sesión:** Use la pestaña **"Registrarme"** (o el botón *"Usar cuenta de prueba para demostración"* en la pestaña **"Registrarme"** la primera vez) para crear su usuario con hash `bcrypt` y recibir su JWT.
3. **Pagar en Botica al Recoger (`RESERVED`):**
   - Agregue productos al carrito y elija *"Pagar en botica al recoger"*.
   - `:8003` valida disponibilidad en la sede elegida, bloquea stock en `:8001` y emite el código `INKA-CC-XXXXX` en estado `RESERVED`.
4. **Pagar Online y Recoger en Botica (`PAID`):**
   - Elija *"Pagar online y recoger en botica"* y pruebe con tarjeta `4242 4242 4242 4242` (`12/2028`, CVV `123`) o Yape (`999888777`, código `123456`).
   - `:8003` bloquea primero el stock en `:8001`, luego cobra en `:8004` y registra la orden en estado **`PAID`** con número de operación `PAY-INKA-...`.
5. **Probar devolución automática de stock si el pago es rechazado:**
   - Intente pagar online con una tarjeta terminada en **`0002`** (ej. `4000 0000 0000 0002`), **`0069`** / **`9995`**, o Yape código **`000000`**.
   - El sistema rechazará con `HTTP 402` y devolverá automáticamente el stock bloqueado en la sede.

### Tabla rápida de inventario inicial por botica

| Producto | Miraflores (`1`) | San Isidro (`2`) | Lima Centro (`3`) |
| :--- | :---: | :---: | :---: |
| Paracetamol 500mg | `50` | `18` | `85` |
| Ibuprofeno 400mg | `30` | `4` | `0` *(Agotado)* |
| Amoxicilina 500mg | `20` | *No disponible* | `3` |
| Protector Solar FPS 50+ | `15` | `28` | *No disponible* |
| Vitamina C + Zinc | `40` | `22` | `16` |
| Alcohol Medicinal 70° | *No disponible* | `35` | `25` |
| Loratadina 10mg | *No disponible* | `14` | `19` |
| Colágeno Hidrolizado | `12` | *No disponible* | *No disponible* |
