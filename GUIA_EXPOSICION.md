# Guía Rápida de Exposición — Plataforma Web Inkafarma

Documento de apoyo para explicar el funcionamiento general del sistema y conducir la demostración en vivo sin entrar en detalles técnicos excesivos.

---

## 1. Idea central en 30 segundos (para abrir la exposición)

> *"Nuestro proyecto simula la tienda web real de Inkafarma para comprar o reservar medicamentos y recogerlos en una botica específica. El problema típico en retail es que un cliente paga online antes de saber si hay stock real en su tienda cercana. Para evitar eso, dividimos el sistema en servicios independientes donde cada botica maneja su propio inventario, primero se aparta el producto en la sede elegida y recién después se confirma el pedido o se cobra en línea."*

---

## 2. Panorama general del sistema

La solución tiene **1 tienda web** y **4 servicios independientes en Python (FastAPI)**. Cada servicio es dueño exclusivo de **su propia base de datos en MySQL**: ninguno entra a las tablas de otro, sino que se comunican por peticiones web (HTTP/REST).

| Módulo | Puerto / Base MySQL | Cómo explicarlo en una frase |
| :--- | :--- | :--- |
| **Tienda Web (`frontend`)** | `:5173` *(React)* | Lo que ve el cliente: elige su botica, busca productos, inicia sesión, arma su carrito y paga en caja o en línea. |
| **Catálogo y Sedes (`catalog_service`)** | `:8001` / `db_catalogo_inka` | Administra las sedes, categorías, productos y el **stock propio de cada botica**; aparta o devuelve unidades. |
| **Usuarios (`users_service`)** | `:8002` / `db_usuarios_inka` | Registra clientes con contraseña cifrada (`bcrypt`) y entrega un pase de sesión (**token JWT**) al iniciar sesión. |
| **Pedidos (`orders_service`)** | `:8003` / `db_pedidos_inka` | **Es el coordinador:** revisa precios/stock en la botica, aparta los productos, pide el cobro si es online y guarda el pedido con código `INKA-CC-XXXXX`. |
| **Pagos (`payments_service`)** | `:8004` / `db_pagos_inka` | Procesa pagos con **Tarjeta o Yape** y reembolsos, sin guardar nunca el número completo de la tarjeta ni el CVV. |

---

## 3. Funciones clave que conviene mencionar (qué hacen y cómo explicarlas)

No hace falta leer código línea por línea; basta mencionar estas **6 piezas puntuales**:

### 1) Catálogo y stock distinto según la botica
- **Dónde está:** `list_products` y `_query_branch_products` en [catalog_service/main.py](catalog_service/main.py).
- **Qué hace:** Al consultar los productos enviando la botica elegida (`branch_id`), filtra solo los productos habilitados en esa sede y muestra su stock real desde la tabla `branch_inventory`.
- **Cómo decirlo:** *"Cada sede —Miraflores, San Isidro o Lima Centro— tiene su propio inventario y surtido. Por ejemplo, Colágeno solo está en Miraflores y Alcohol en San Isidro y Lima Centro. Si el cliente cambia de botica en la web, el carrito se limpia con un aviso para no mezclar inventarios."*

### 2) Apartado de stock y protección si dos personas compran lo último
- **Dónde está:** `update_product_stock` en [catalog_service/main.py](catalog_service/main.py).
- **Qué hace:** Recibe la acción `block` (apartar) o `release` (devolver) para un producto en una botica específica. Antes de restar unidades, bloquea temporalmente esa fila en MySQL (`with_for_update()`) hasta terminar la operación.
- **Cómo decirlo:** *"Si quedan pocas unidades de un medicamento y dos clientes intentan llevarse la última al mismo tiempo en la misma botica, la base de datos atiende primero a uno y al segundo le avisa que ya no hay stock suficiente, evitando ventas negativas."*

### 3) Registro seguro e inicio de sesión con token JWT
- **Dónde está:** `register_user`, `login_user` y `get_current_user_profile` en [users_service/main.py](users_service/main.py).
- **Qué hace:** Al registrarse valida que el correo no exista y cifra la contraseña con `bcrypt`. Al iniciar sesión genera un **token JWT** firmado (`sub`, `email`, `full_name`) y en `GET /auth/me` lo valida para devolver el perfil del cliente.
- **Cómo decirlo:** *"Las contraseñas nunca se guardan en texto plano. Cuando el cliente inicia sesión, el servicio de Usuarios le entrega un token JWT que el navegador guarda para identificar su sesión y consultar su perfil."*

### 4) Coordinación del pedido y devolución automática si algo falla
- **Dónde está:** `create_order` y `_release_blocked_items` en [orders_service/main.py](orders_service/main.py).
- **Qué hace:** Ejecuta la compra en **4 pasos en orden**:
  1. Valida producto y precio vigente en esa sede (`:8001`).
  2. Aparta las unidades en esa botica (`:8001`). Si un producto del carrito no alcanza, devuelve lo ya apartado de los anteriores.
  3. Si el cliente eligió pago online, envía el cobro a Pagos (`:8004`). **Si la tarjeta es rechazada o Pagos no responde, devuelve automáticamente las unidades apartadas a la botica.**
  4. Guarda el pedido en `db_pedidos_inka` en estado `RESERVED` (pago en caja) o `PAID` (pago online). Si ocurriera un error justo al guardar después de haber cobrado, devuelve el stock y también solicita el reembolso del dinero.
- **Cómo decirlo:** *"Pedidos primero asegura el stock en la botica y recién después intenta cobrar. Si la tarjeta es rechazada por falta de fondos, el sistema automáticamente vuelve a sumar esas cajas al inventario de esa botica para que nadie pierda stock ni dinero."*

### 5) Cobro online con Tarjeta o Yape adaptable a pasarela real
- **Dónde está:** `charge_payment` en [payments_service/main.py](payments_service/main.py) y `get_payment_provider` en [payments_service/providers.py](payments_service/providers.py).
- **Qué hace:** Registra cada intento en `db_pagos_inka` como `APPROVED` o `DECLINED` guardando solo marca, nombre del titular y los últimos 4 dígitos. Mediante `PAYMENT_PROVIDER` cambia entre el simulador local (`mock`) o el adaptador para Culqi (`culqi`) sin tocar el resto del sistema.
- **Cómo decirlo:** *"Separamos el servicio de pagos usando un adaptador: en local trabajamos con un simulador propio (`mock`) que nos permite probar tarjetas aprobadas, sin fondos y Yape sin depender de internet o credenciales reales, pero ya dejamos conectado el adaptador de Culqi Sandbox por si se configura una llave en el `.env`."*

### 6) Entrega en mostrador y cancelación con reembolso
- **Dónde está:** `mark_order_collected` y `cancel_order` en [orders_service/main.py](orders_service/main.py), junto con `refund_payment` en [payments_service/main.py](payments_service/main.py).
- **Qué hace:** `mark_order_collected` pasa un pedido a estado `COLLECTED` cuando se recoge en botica (si era pago en caja, marca el pago presencial completado). `cancel_order` bloquea cancelar órdenes ya entregadas, devuelve el stock a la misma botica (`order.branch_id`), y si había sido pagado online solicita el reembolso (`REFUNDED`) en `:8004`.
- **Cómo decirlo:** *"Cuando el cliente va a la botica, el pedido pasa a entregado (`COLLECTED`). Y si un pedido se cancela antes de entregarlo, automáticamente repone las unidades en la misma sede donde se compró y reembolsa el pago si fue online."*

---

## 4. Guion corto para la demo en vivo (5 minutos)

1. **Mostrar independencia por botica:** Entrar a `http://localhost:5173`. En **Miraflores**, fijarse en el stock de *Paracetamol* (`50` un.) o *Amoxicilina* (`20` un.). Cambiar a **San Isidro** y mostrar que el stock y los productos cambian (*Amoxicilina* no aparece; sí aparece *Alcohol Medicinal*). Volver a **Miraflores**.
2. **Iniciar sesión:** Entrar en *"Ingresar"* -> pestaña **"Registrarme"** -> usar **"Usar cuenta de prueba para demostración"** (o registrar un correo rápido).
3. **Caso 1 — Reserva para pagar en botica (`RESERVED`):** Agregar 2 unidades al carrito -> elegir **"Pagar en botica al recoger"** -> confirmar. Mostrar el código `INKA-CC-XXXXX` y señalar que el stock bajó en Miraflores al instante.
4. **Caso 2 — Pago online rechazado que protege el stock (`402`):** Agregar otro producto -> elegir **"Pagar online y recoger en botica"** -> ingresar tarjeta terminada en **`0002`** (ej. `4000 0000 0000 0002`). Mostrar el mensaje de fondos insuficientes y recalcar que el stock de la tienda **no bajó**.
5. **Caso 3 — Pago online aprobado (`PAID`):** Cambiar al número `4242 4242 4242 4242` (o elegir **Yape** con celular `999888777` y código `123456`) -> confirmar. Mostrar el ticket **`PAID`** con su código de operación `PAY-INKA-...`.
6. **Entrega en botica (`COLLECTED`) e historial:** En el ticket hacer clic para confirmar la entrega en botica y abrir **"Mis Reservas"** para enseñar el historial con estados.
7. **Extra rápido (si piden ver APIs/reembolso):** Abrir `http://localhost:8003/docs` y mostrar que cada servicio tiene su documentación interactiva; opcionalmente cancelar una orden `PAID` con `PATCH /orders/{id}/cancel` y enseñar que el stock regresó a Miraflores.

---

## 5. Preguntas frecuentes del jurado o docente (respuestas rápidas)

- **¿Por qué 4 servicios y 4 bases de datos en vez de una sola base?**
  Para que cada dominio (*Catálogo*, *Usuarios*, *Pedidos*, *Pagos*) sea independiente: si falla o se actualiza el servicio de Pagos, Catálogo y Usuarios siguen funcionando, y los errores quedan aislados por módulo.
- **¿Qué pasa si se cae la base de datos o el servicio de Pagos en plena compra?**
  Si Pedidos ya había apartado unidades en Catálogo y Pagos falla o rechaza la tarjeta, Pedidos devuelve automáticamente esas unidades al inventario de la botica. Y si fallara el guardado final después de cobrar, también solicita el reembolso en Pagos.
- **¿Dónde aplican seguridad JWT?**
  Hoy `users_service` (`:8002`) cifra contraseñas con `bcrypt`, emite el **token JWT** al hacer login (`POST /auth/login`) y lo valida al consultar el perfil (`GET /auth/me`). El frontend lo guarda y lo envía en cada petición, pero siendo transparentes, falta agregar la validación del JWT dentro de `orders_service` (`:8003`) y `payments_service` (`:8004`) para una siguiente mejora.
- **¿Es una pasarela real o simulada?**
  Funciona con un simulador local determinista (`mock`) para demostrar escenarios de éxito, fondos insuficientes y Yape sin credenciales de pago reales, y ya cuenta con un adaptador preparado para Culqi Sandbox (`culqi`) configurable desde `.env`.
- **¿Qué quedaría pendiente para una versión futura de producción?**
  Validar el JWT también en Pedidos y Pagos, vencimiento automático de reservas por tiempo límite (`expires_at`), botón de cancelar desde la web (hoy está por API), notificaciones por correo/WhatsApp y clave anti-duplicados en red lenta (`Idempotency-Key`).

---

## 6. Chuleta rápida para tener abierta mañana

- **Iniciar todo en un paso:** `.\run_all.ps1` (en la raíz del proyecto, con MySQL encendido).
- **Web cliente:** `http://localhost:5173`
- **Documentación técnica automática (Swagger):**
  - Catálogo: `http://localhost:8001/docs`
  - Usuarios: `http://localhost:8002/docs`
  - Pedidos: `http://localhost:8003/docs`
  - Pagos: `http://localhost:8004/docs`
- **Datos de prueba en pago online (`mock`):**
  - **Tarjeta aprobada (`PAID`):** `4242 4242 4242 4242` | Vence `12/2028` | CVV `123`
  - **Tarjeta sin fondos (devuelve stock):** `4000 0000 0000 0002` | Vence `12/2028` | CVV `123`
  - **Yape aprobado / rechazado:** Celular `999888777` | Código `123456` (aprueba) / `000000` (rechaza y devuelve stock)
