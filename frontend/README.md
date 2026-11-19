# Frontend Web — Inkafarma (Retiro en Botica y Pago Híbrido)

Cliente web SPA desarrollado con **React 19**, **Vite 8**, **Tailwind CSS v3** y **Lucide Icons**, conectado a los 4 microservicios FastAPI del proyecto (`:8001`–`:8004`).

---

## Características Principales

- **Catálogo e Inventario por Botica:** Consulta `GET /branches/` y `GET /products/?branch_id=` en `:8001` para mostrar únicamente los productos habilitados y el stock real de la sede seleccionada (*Miraflores*, *San Isidro* o *Lima Centro*). Al cambiar de sede con ítems en el carrito, reinicia el carrito con un aviso visual para evitar inconsistencias de surtido.
- **Filtrado y Búsqueda Reactiva:** Barra de búsqueda superior y categorías dinámicas obtenidas desde `:8001/categories/`.
- **Autenticación JWT:** Modal de inicio de sesión y registro conectado a `:8002` (`/auth/login` y `/auth/register`) con botón de autocompletado para demostraciones.
- **Checkout Dual en Carrito Deslizante:**
  - **Pagar en botica al recoger (`PAGO_EN_CAJA_PRESENCIAL`):** Emite orden `RESERVED` con código `INKA-CC-XXXXX`.
  - **Pagar online y recoger en botica (`PAGO_ONLINE`):** Formulario de **Tarjeta** o **Yape** que se procesa vía `:8003` + `:8004` emitiendo orden `PAID` con número de operación `PAY-INKA-...`.
- **Ticket e Historial:** Modal de confirmación con código copiable, simulación de entrega en mostrador (`PATCH /orders/{id}/collect`) e historial en *"Mis Reservas"* (`GET /orders/user/{user_id}`).

---

## Estructura de `frontend/`

```text
frontend/
├── public/
│   ├── inkafarma-logo.svg          # Logo SVG oficial para fondos claros (footer)
│   └── inkafarma-logo-white.svg    # Variante con letras blancas para barra verde y modal
├── src/
│   ├── components/
│   │   ├── Navbar.jsx              # Barra de 3 niveles: sede/teléfono, buscador/carrito y categorías
│   │   ├── ProductCard.jsx         # Tarjeta con badge de stock vivo y selector de cantidad acotado
│   │   ├── CartDrawer.jsx          # Carrito lateral con selector de sede y pago presencial/online
│   │   ├── AuthModal.jsx           # Login / Registro de clientes
│   │   └── OrderSuccessModal.jsx   # Ticket de retiro (RESERVED / PAID / COLLECTED)
│   ├── services/
│   │   └── api.js                  # Cliente fetch hacia :8001, :8002, :8003 y :8004
│   ├── App.jsx                     # Estado global de tienda, sedes, carrito y reservas
│   └── index.css                   # Estilos globales + Tailwind CSS
├── tailwind.config.js
└── vite.config.js
```

---

## Comandos

```powershell
# Instalar dependencias
npm install --legacy-peer-deps

# Iniciar servidor de desarrollo (http://localhost:5173)
npm run dev

# Verificar linter (oxlint)
npm run lint

# Compilar build de producción
npm run build
```
