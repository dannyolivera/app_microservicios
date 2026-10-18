import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import ProductCard from "./components/ProductCard";
import CartDrawer from "./components/CartDrawer";
import AuthModal from "./components/AuthModal";
import OrderSuccessModal from "./components/OrderSuccessModal";
import {
  getCategories,
  getProducts,
  createOrder,
  getUserOrders,
  checkMicroservicesHealth,
} from "./services/api";
import {
  Truck,
  ShieldCheck,
  Percent,
  Clock,
  RefreshCw,
  ShoppingBag,
  HeartPulse,
  CreditCard,
  FileText,
  Store,
  Ticket,
  Coins,
  CheckCircle2,
  X
} from "lucide-react";

const BRANCHES = [
  "Inkafarma Miraflores (Av. Larco 450)",
  "Inkafarma San Isidro (Av. Javier Prado 1200)",
  "Inkafarma Lima Centro (Jr. de la Unión 600)"
];

export default function App() {
  // Estado de Datos del Catálogo y Sedes
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState(BRANCHES[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Estado del Carrito de Compras
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("inka_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Estado de Autenticación de Usuario
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("inka_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Estado de Proceso de Pedidos y Modal de Reservas
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [lastOrder, setLastOrder] = useState(null);
  const [isReservationsOpen, setIsReservationsOpen] = useState(false);
  const [userReservations, setUserReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(false);

  // Estado de Conectividad con Microservicios
  const [health, setHealth] = useState({ catalog: true, users: true, orders: true });

  // Guardar carrito en localStorage
  useEffect(() => {
    try {
      localStorage.setItem("inka_cart", JSON.stringify(cart));
    } catch (e) {
      console.error("Error guardando carrito", e);
    }
  }, [cart]);

  // Cargar catálogo y estado de servicios
  const loadData = async () => {
    setIsLoading(true);
    setLoadError("");

    const healthStatus = await checkMicroservicesHealth();
    setHealth(healthStatus);

    try {
      const [catsData, prodsData] = await Promise.all([
        getCategories().catch(() => []),
        getProducts(0, 100).catch(() => ({ items: [] })),
      ]);

      setCategories(catsData);
      setProducts(prodsData.items || []);
    } catch (err) {
      setLoadError(
        "No se pudo cargar el catálogo de productos. Por favor verifica tu conexión o intenta nuevamente."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const interval = setInterval(async () => {
      const h = await checkMicroservicesHealth();
      setHealth(h);
    }, 25000);

    return () => clearInterval(interval);
  }, []);

  // Manejo de Autenticación
  const handleAuthSuccess = (userData, token) => {
    setUser(userData);
    localStorage.setItem("inka_user", JSON.stringify(userData));
    localStorage.setItem("inka_token", token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("inka_user");
    localStorage.removeItem("inka_token");
  };

  // Manejo de Carrito
  const handleAddToCart = (product, quantityToAdd = 1) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + quantityToAdd, product.stock) }
            : item
        );
      } else {
        return [
          ...prevCart,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            stock: product.stock,
            quantity: quantityToAdd,
          },
        ];
      }
    });
  };

  const handleUpdateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleRemoveFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Procesar Checkout Click & Collect (consumo orquestado de orders_service)
  const handleCheckout = async () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    if (cart.length === 0) return;

    setIsProcessingOrder(true);
    setCheckoutError("");

    try {
      const payload = {
        user_id: user.id,
        branch: selectedBranch,
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
      };

      const createdOrder = await createOrder(payload);

      setCart([]);
      setIsCartOpen(false);
      setLastOrder(createdOrder);

      // Refrescar inventario en vivo tras el descuento atómico de stock
      loadData();
    } catch (err) {
      setCheckoutError(err.message || "No se pudo procesar la reserva. Inténtalo nuevamente.");
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const handleOpenReservations = async () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setIsReservationsOpen(true);
    setLoadingReservations(true);
    try {
      const orders = await getUserOrders(user.id);
      setUserReservations(orders);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReservations(false);
    }
  };

  // Filtrado de productos por categoría y texto de búsqueda
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategoryId === null || product.category_id === selectedCategoryId;
    const matchesSearch =
      searchTerm === "" ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description &&
        product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Barra de Navegación */}
      <Navbar
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        health={health}
        selectedBranch={selectedBranch}
        onOpenReservations={handleOpenReservations}
      />

      {/* Banner Principal Retiro en Botica Estilo Inkafarma */}
      <div className="bg-gradient-to-r from-[#00A650] via-[#008E44] to-[#006F35] text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Textos y Promoción para el Cliente */}
          <div className="space-y-3.5 text-center lg:text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-inkafarma-yellow text-xs font-bold border border-white/20">
              <Store className="w-3.5 h-3.5" />
              <span>Reserva Online y Recoge en Botica • Pago Seguro al Retirar</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight sm:leading-none">
              Reserva tus Medicamentos y Retira en Botica
            </h1>
            
            <p className="text-sm sm:text-base text-emerald-50 leading-relaxed font-normal max-w-xl">
              Asegura tus productos de farmacia al instante y sin pagar nada por adelantado. Te guardamos tu pedido y pagas cómodamente en caja (efectivo o tarjeta) al momento de recogerlo.
            </p>

            {/* Badges de beneficios para el cliente */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2 text-xs font-semibold text-emerald-100">
              <span className="flex items-center gap-1.5 bg-black/15 px-3 py-1.5 rounded-lg border border-white/10">
                <ShieldCheck className="w-4 h-4 text-inkafarma-yellow" />
                Stock 100% Asegurado
              </span>
              <span className="flex items-center gap-1.5 bg-black/15 px-3 py-1.5 rounded-lg border border-white/10">
                <Coins className="w-4 h-4 text-inkafarma-yellow" />
                Pagas en Tienda (Efectivo o Tarjeta)
              </span>
              <span className="flex items-center gap-1.5 bg-black/15 px-3 py-1.5 rounded-lg border border-white/10">
                <Clock className="w-4 h-4 text-inkafarma-yellow" />
                Recojo Rápido sin Colas
              </span>
            </div>
          </div>

          {/* Tarjeta de Sede de Retiro */}
          <div className="w-full sm:w-auto shrink-0">
            <div className="bg-white text-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl shadow-emerald-950/20 max-w-sm mx-auto border border-emerald-100 space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-inkafarma-green shrink-0">
                  <Store className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">Botica de Recojo</h4>
                  <p className="text-xs text-emerald-700 font-semibold">Tus productos listos para ti</p>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Elige tu botica más cercana:
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-inkafarma-green focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer"
                >
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Ticket className="w-3.5 h-3.5 text-inkafarma-green" />
                  <span>Código de Recojo Inmediato</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-tight">
                  Al confirmar, recibirás tu código de pedido para recogerlo fácil y rápido en la botica seleccionada.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Alerta sutil si hay problemas de conexión */}
        {(!health.catalog || !health.orders) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
              <span>Conectando con la botica. Si los productos tardan en cargar, por favor pulsa en reintentar.</span>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Sección de Categorías con diseño de píldoras naturales */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Categorías de Farmacia
            </h2>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Mostrando {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-xs ${
                selectedCategoryId === null
                  ? "bg-inkafarma-green text-white shadow-md shadow-emerald-600/20"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Todos los productos ({products.length})
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-xs ${
                  selectedCategoryId === category.id
                    ? "bg-inkafarma-green text-white shadow-md shadow-emerald-600/20"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grilla de Productos */}
        {isLoading ? (
          <div className="text-center py-20">
            <HeartPulse className="w-10 h-10 animate-bounce text-inkafarma-green mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Cargando productos de farmacia...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">No se encontraron productos</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {loadError
                ? loadError
                : "No encontramos productos que coincidan con tu búsqueda. Intenta con otra categoría o término."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => {
              const category = categories.find((c) => c.id === product.category_id);
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  categoryName={category ? category.name : undefined}
                  onAddToCart={handleAddToCart}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Pie de Página Institucional Auténtico */}
      <footer className="bg-slate-900 text-slate-400 text-xs mt-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Columna 1: Marca */}
            <div className="space-y-3">
              <img
                src="/inkafarma-logo.png"
                alt="Inkafarma"
                className="h-10 w-auto brightness-0 invert"
              />
              <p className="text-xs text-slate-400 leading-relaxed">
                Tu botica de confianza con la mayor cobertura a nivel nacional. Medicamentos certificados y atención profesional.
              </p>
            </div>

            {/* Columna 2: Servicio al cliente */}
            <div className="space-y-2">
              <h4 className="font-bold text-white text-sm">Servicio al Cliente</h4>
              <ul className="space-y-1.5 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Preguntas Frecuentes</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Términos y Condiciones</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Políticas de Privacidad</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Políticas de Devolución</a></li>
              </ul>
            </div>

            {/* Columna 3: Nosotros */}
            <div className="space-y-2">
              <h4 className="font-bold text-white text-sm">Nosotros</h4>
              <ul className="space-y-1.5 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Sobre Inkafarma</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Nuestras Boticas</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Trabaja con Nosotros</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Responsabilidad Social</a></li>
              </ul>
            </div>

            {/* Columna 4: Seguridad y Medios de Pago */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm">Compra 100% Segura</h4>
              <p className="text-xs text-slate-400">
                Aceptamos todas las tarjetas de crédito, débito y pagos contra entrega.
              </p>
              <div className="flex items-center gap-2 text-white">
                <CreditCard className="w-5 h-5 text-inkafarma-yellow" />
                <FileText className="w-5 h-5 text-emerald-400" />
                <span className="text-[11px] font-semibold text-slate-300">Libro de Reclamaciones</span>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} Inkafarma. Todos los derechos reservados.</p>
            <p>Salud y bienestar para todas las familias del Perú.</p>
          </div>
        </div>
      </footer>

      {/* Modales y Paneles Click & Collect */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onCheckout={handleCheckout}
        isProcessing={isProcessingOrder}
        checkoutError={checkoutError}
        selectedBranch={selectedBranch}
        onChangeBranch={setSelectedBranch}
        branches={BRANCHES}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <OrderSuccessModal
        order={lastOrder}
        onClose={() => setLastOrder(null)}
        onOrderUpdated={loadData}
      />

      {/* Modal de Historial de Reservas (Slide 10: GET /user/{id}) */}
      {isReservationsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-fade-in max-h-[85vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-inkafarma-green text-white flex items-center justify-center">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Mis Reservas y Pedidos</h3>
                  <p className="text-[10px] text-slate-400">Códigos para retiro en botica</p>
                </div>
              </div>
              <button
                onClick={() => setIsReservationsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1">
              {loadingReservations ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-inkafarma-green" />
                  Cargando tus reservas...
                </div>
              ) : userReservations.length === 0 ? (
                <div className="text-center py-10">
                  <Ticket className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-bold">No tienes pedidos reservados</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tus reservas con código de recojo aparecerán aquí para presentarlas en la botica.
                  </p>
                </div>
              ) : (
                userReservations.map((res) => (
                  <div
                    key={res.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {res.pickup_code || `INKA-CC-${res.id}`}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          res.status === "COLLECTED"
                            ? "bg-purple-100 text-purple-800"
                            : res.status === "CANCELLED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {res.status === "COLLECTED"
                          ? "✓ Entregado en Botica"
                          : res.status === "CANCELLED"
                          ? "Cancelado"
                          : "✓ Listo para Recojo"}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-inkafarma-green shrink-0" />
                      <span className="truncate">{res.branch || "Sede Miraflores"}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-slate-700">
                      <span className="text-[10px] text-slate-400">
                        {new Date(res.created_at).toLocaleDateString("es-PE")}
                      </span>
                      <span className="font-extrabold text-inkafarma-green">
                        S/ {Number(res.total_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
              <button
                onClick={() => setIsReservationsOpen(false)}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
