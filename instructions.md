# Guía de Instalación y Ejecución Paso a Paso
## Sistema de Microservicios E-Commerce Farmacéutico

Este documento contiene las instrucciones precisas para configurar la base de datos MySQL, aplicar las migraciones con Alembic, levantar los 3 microservicios independientes en FastAPI y ejecutar la aplicación Frontend con React y Tailwind CSS v3.

---

### 📋 Requisitos Previos

- **Python 3.10 o superior** (verificar con `python --version` o `python3 --version`)
- **MySQL Server 8.0+**
- **Node.js 18+** (para el frontend)

---

## Paso 1: Configurar el Entorno Virtual de Python y Dependencias Backend

Abra PowerShell en la carpeta raíz del proyecto (`app_microservicios`):

```powershell
# 1. Crear el entorno virtual con Python 3
python -m venv venv   # O use python3 según corresponda en su sistema

# 2. Activar el entorno virtual en PowerShell
.\venv\Scripts\Activate.ps1

# (Si Windows bloquea scripts de PowerShell por directiva de ejecución, ejecute:
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass)

# 3. Actualizar pip e instalar todas las dependencias
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt
```

---

## Paso 2: Crear las Bases de Datos en MySQL (Database-per-Service)

Asegúrese de que el servicio MySQL esté corriendo (XAMPP, MySQL Workbench, DBeaver o servicio de Windows).

### Opción A: Desde consola PowerShell
```powershell
mysql -u root -p < init_db.sql
```

### Opción B: Copiar y pegar en MySQL Workbench o phpMyAdmin
Abra el archivo `init_db.sql` y ejecute:
```sql
CREATE DATABASE IF NOT EXISTS `db_catalogo_inka` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `db_usuarios_inka` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `db_pedidos_inka` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## Paso 3: Aplicar Migraciones con Alembic

Cada microservicio gestiona su propia base de datos de manera independiente:

```powershell
# 1. Migraciones del Catálogo (db_catalogo_inka)
cd catalog_service
python3 -m alembic upgrade head
cd ..

# 2. Migraciones de Usuarios (db_usuarios_inka)
cd users_service
python3 -m alembic upgrade head
cd ..

# 3. Migraciones de Pedidos (db_pedidos_inka)
cd orders_service
python3 -m alembic upgrade head
cd ..
```

*(Opcional para presentación inmediata)*: Si desea cargar medicamentos reales (Paracetamol, Ibuprofeno, etc.) y un usuario de prueba con stock inicial, ejecute en MySQL el script:
```powershell
mysql -u root -p < seed_data.sql
```

---

## Paso 4: Levantar los 3 Microservicios Backend con Uvicorn

Abra **tres terminales de PowerShell separadas** (todas con `.\venv\Scripts\Activate.ps1` activado):

### 🟢 Terminal 1 - Microservicio de Catálogo
```powershell
cd catalog_service
python3 -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```
- **Swagger UI:** [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)

### 🔵 Terminal 2 - Microservicio de Usuarios y Autenticación
```powershell
cd users_service
python3 -m uvicorn main:app --host 127.0.0.1 --port 8002 --reload
```
- **Swagger UI:** [http://127.0.0.1:8002/docs](http://127.0.0.1:8002/docs)

### 🟠 Terminal 3 - Microservicio de Pedidos / Órdenes
```powershell
cd orders_service
python3 -m uvicorn main:app --host 127.0.0.1 --port 8003 --reload
```
- **Swagger UI:** [http://127.0.0.1:8003/docs](http://127.0.0.1:8003/docs)

---

## Paso 5: Levantar el Frontend (React + Tailwind CSS v3)

Abra una **cuarta terminal de PowerShell** para el cliente web:

```powershell
# 1. Ingresar a la carpeta del frontend
cd frontend

# 2. Instalar dependencias de Node.js (ya preinstaladas, o si clona en otra máquina)
npm install --legacy-peer-deps

# 3. Iniciar el servidor de desarrollo Vite
npm run dev
```

- **Acceso a la Tienda Web:** [http://localhost:5173](http://localhost:5173)

---

## Paso 6: Demostración Académica Completa desde el Frontend

1. **Visualizar Catálogo:**
   - La página principal consulta automáticamente a `http://localhost:8001/products/` y `http://localhost:8001/categories/`.
   - Se muestran los productos farmacéuticos con sus precios en soles (PEN), presentación y etiquetas de stock en tiempo real.
   - Cuenta con filtros por categoría (Medicamentos, Cuidado Personal, Vitaminas) y barra de búsqueda reactiva.

2. **Iniciar Sesión:**
   - Haga clic en el botón **"Iniciar Sesión"** en la barra superior.
   - Puede usar el botón de un solo clic: **"Rellenar datos de prueba para demostración"** para cargar credenciales automáticas, o crear una cuenta nueva en la pestaña **"Registrarse"** (se almacena con hash `bcrypt` en `db_usuarios_inka` puerto `8002`).
   - Al iniciar sesión, se recibe el token JWT y los datos del usuario se muestran en la barra de navegación.

3. **Agregar al Carrito y Procesar Pedido:**
   - Seleccione la cantidad deseada de uno o varios medicamentos y haga clic en **"Agregar"**.
   - Abra el carrito lateral.
   - Haga clic en **"Procesar Orden de Compra"**.
   - **Flujo de Microservicios en Acción:**
     - El frontend envía la solicitud al **Microservicio de Pedidos (`:8003`)**.
     - El Microservicio de Pedidos hace una consulta síncrona mediante **`httpx`** al **Microservicio de Catálogo (`:8001`)** para certificar que cada medicina exista y cuente con stock suficiente.
     - Si hay stock, se asienta la orden en `db_pedidos_inka` con estado `COMPLETED`.
     - El frontend muestra el modal de éxito con el **ID de la Orden**, desglose de medicamentos y confirmación de la validación inter-servicio.
     - El catálogo se refresca automáticamente mostrando los nuevos niveles de inventario.

4. **Validación de Reglas de Negocio y Fallos (Casos Borde):**
   - **Caso Stock Insuficiente:** Si solicita una cantidad superior al stock disponible, el microservicio de órdenes rechaza la transacción con un error `HTTP 400 Bad Request` indicando el producto y la cantidad disponible real.
   - **Caso Servicio Apagado:** Si apaga la terminal del puerto 8001 (Catálogo) e intenta procesar una orden, el microservicio de pedidos captura la caída y retorna un `HTTP 503 Service Unavailable` controlado. La barra de estado superior del frontend marcará el microservicio en rojo automáticamente.
