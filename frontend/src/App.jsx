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
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
  HeartPulse,
  Store,
  Ticket,
  Coins,
  ArrowRight,
  ChevronRight,
  X,
  PackageCheck,
  Plus,
  Phone,
} from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();

const BRANCHES = [
  "Inkafarma Miraflores (Av. Larco 450)",
  "Inkafarma San Isidro (Av. Javier Prado 1200)",
  "Inkafarma Lima Centro (Jr. de la Unión 600)",
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
    } catch {
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
      }
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

  const scrollToCatalog = () => {
    const el = document.getElementById("catalogo");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSelectCategory = (categoryId) => {
    setSelectedCategoryId(categoryId);
    scrollToCatalog();
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

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

  const activeCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8F7]">
      {/* Barra de Navegación de 3 niveles estilo Stitch */}
      <Navbar
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        health={health}
        selectedBranch={selectedBranch}
        onChangeBranch={setSelectedBranch}
        branches={BRANCHES}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        onOpenReservations={handleOpenReservations}
      />

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full space-y-7">
        {/* 1. Franja compacta de modalidad y botica seleccionada */}
        <section
          aria-label="Modalidad y sede de retiro"
          className="bg-white border border-slate-200/90 rounded-2xl px-4 py-3 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#008446] text-white text-xs font-bold shadow-xs">
              <Store className="w-3.5 h-3.5 text-inkafarma-yellow" />
              <span>Retiro en Botica GRATIS</span>
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Reserva en línea y paga al recoger en mostrador
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 shrink-0">Botica:</span>
              <select
                aria-label="Cambiar botica de recojo"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="font-bold text-slate-900 bg-[#F6F8F7] hover:bg-emerald-50/70 border border-slate-200 focus:border-[#008446] rounded-xl px-3 py-1.5 text-xs outline-none transition-colors cursor-pointer"
              >
                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 shrink-0">
              <Coins className="w-3.5 h-3.5 text-[#008446]" />
              <span>Pago en caja (Efectivo o POS)</span>
            </span>
          </div>
        </section>

        {/* 2. Hero asimétrico de 2 columnas estilo Stitch */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Banner principal izquierdo */}
          <div className="lg:col-span-8 rounded-3xl bg-gradient-to-br from-[#007A43] via-[#008446] to-[#005E32] text-white p-6 sm:p-9 relative overflow-hidden shadow-md flex flex-col justify-between min-h-[260px]">
            {/* Patrón decorativo sutil de cruz farmacéutica */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -bottom-10 w-64 h-64 rounded-full bg-white/10 flex items-center justify-center"
            >
              <Plus className="w-40 h-40 text-white/15 stroke-[3]" />
            </div>

            <div className="relative z-10 max-w-xl space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFD200] text-slate-900 text-[11px] font-black tracking-wide uppercase">
                <Store className="w-3.5 h-3.5" />
                <span>Retiro en Botica • Pago en Tienda</span>
              </span>

              <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                Reserva tus Medicamentos y Recoge en Botica
              </h1>

              <p className="text-xs sm:text-sm text-emerald-50/95 leading-relaxed max-w-lg">
                Aparta tus productos farmacéuticos en segundos con stock confirmado al instante. Obtén tu código único <strong className="text-white">INKA-CC</strong> y paga directamente en caja al recoger.
              </p>
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-3 pt-6">
              <button
                type="button"
                onClick={scrollToCatalog}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FFD200] hover:bg-[#F0C400] text-slate-900 text-xs sm:text-sm font-black shadow-sm transition-all active:scale-95"
              >
                <span>Explorar catálogo</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <span className="text-[11px] text-emerald-100 font-medium">
                Sede activa: <strong className="text-white">{selectedBranch.split(" (")[0]}</strong>
              </span>
            </div>
          </div>

          {/* 2 Tarjetas informativas apiladas a la derecha */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <button
              type="button"
              onClick={scrollToCatalog}
              className="flex-1 text-left bg-white hover:bg-[#F3FAF6] border border-slate-200/90 hover:border-[#008446]/40 rounded-2xl p-5 shadow-xs transition-all flex items-center justify-between gap-4 group"
            >
              <div className="space-y-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-100 text-[#006837] text-[10px] font-black uppercase tracking-wider">
                  Stock en tiempo real
                </span>
                <h2 className="text-base font-extrabold text-slate-900 group-hover:text-[#008446] transition-colors">
                  Reserva con Stock Asegurado
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Separamos tus medicamentos al instante y generamos tu código de retiro para mostrador.
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#E7F6EE] text-[#008446] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </button>

            <button
              type="button"
              onClick={handleOpenReservations}
              className="flex-1 text-left bg-[#FFFBEB] hover:bg-amber-50 border border-amber-200/90 hover:border-amber-300 rounded-2xl p-5 shadow-xs transition-all flex items-center justify-between gap-4 group"
            >
              <div className="space-y-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FFD200] text-slate-900 text-[10px] font-black uppercase tracking-wider">
                  Sin pagos online
                </span>
                <h2 className="text-base font-extrabold text-slate-900 group-hover:text-[#006837] transition-colors">
                  Mis Reservas y Códigos
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Revisa tus códigos INKA-CC y el estado de tus pedidos para recojo en botica.
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white border border-amber-200 text-[#008446] flex items-center justify-center shrink-0 shadow-2xs">
                <Ticket className="w-6 h-6" />
              </div>
            </button>
          </div>
        </section>

        {/* Alerta sutil si hay problemas de conexión */}
        {(!health.catalog || !health.orders) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
              <span>
                Estamos teniendo problemas para conectarnos con la tienda. Si los productos tardan en cargar, pulsa en reintentar.
              </span>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shrink-0 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* 3. Sección de Categorías Disponibles (100% dinámicas desde catalog_service) */}
        <section aria-label="Categorías disponibles" className="space-y-3.5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Categorías Disponibles
              </h2>
              <p className="text-xs text-slate-500">
                Filtra rápidamente los productos registrados en el catálogo
              </p>
            </div>

            {selectedCategoryId !== null && (
              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#008446] hover:text-[#005E32] transition-colors shrink-0"
              >
                <span>Ver todas</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => handleSelectCategory(null)}
              className={`text-left p-4 rounded-2xl border transition-all ${
                selectedCategoryId === null
                  ? "bg-[#F3FAF6] border-[#008446] shadow-xs"
                  : "bg-white border-slate-200/90 hover:border-[#008446]/40"
              }`}
            >
              <p
                className={`text-xs sm:text-sm font-extrabold truncate ${
                  selectedCategoryId === null ? "text-[#008446]" : "text-slate-900"
                }`}
              >
                Todos los productos
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {products.length} {products.length === 1 ? "producto" : "productos"} en catálogo
              </p>
            </button>

            {categories.map((category) => {
              const count = products.filter((p) => p.category_id === category.id).length;
              const isSelected = selectedCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleSelectCategory(category.id)}
                  className={`text-left p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? "bg-[#F3FAF6] border-[#008446] shadow-xs"
                      : "bg-white border-slate-200/90 hover:border-[#008446]/40"
                  }`}
                >
                  <p
                    className={`text-xs sm:text-sm font-extrabold truncate ${
                      isSelected ? "text-[#008446]" : "text-slate-900"
                    }`}
                  >
                    {category.name}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {count} {count === 1 ? "producto" : "productos"} disponibles
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. Catálogo de Productos */}
        <section id="catalogo" className="space-y-4 scroll-mt-36">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {activeCategory ? activeCategory.name : "Catálogo disponible en botica"}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#006837] text-[10px] font-extrabold uppercase tracking-wide">
                  Retiro en Botica
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Stock listo para reserva en <strong className="text-slate-700">{selectedBranch}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              {(selectedCategoryId !== null || searchTerm !== "") && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setSearchTerm("");
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-[11px]"
                >
                  <X className="w-3 h-3" />
                  <span>Limpiar filtros</span>
                </button>
              )}
              <span className="font-semibold">
                {filteredProducts.length} {filteredProducts.length === 1 ? "resultado" : "resultados"}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/80">
              <HeartPulse className="w-10 h-10 animate-bounce text-[#008446] mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">
                Cargando productos de farmacia...
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-base">
                No se encontraron productos
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {loadError
                  ? loadError
                  : "No encontramos productos que coincidan con tu búsqueda. Intenta con otra categoría o término."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
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
        </section>

        {/* 5. Tira inferior de 3 pilares de retiro en botica */}
        <section
          aria-label="Beneficios de retiro en botica"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2"
        >
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex items-start gap-3.5 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-[#E7F6EE] text-[#008446] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Stock Asegurado en Tiempo Real
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Al confirmar tu reserva, separamos tus productos al instante para garantizar su disponibilidad al llegar a la botica.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex items-start gap-3.5 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-[#E7F6EE] text-[#008446] flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Retiro en Botica sin Costo
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Elige entre Miraflores, San Isidro o Lima Centro y presenta tu código alfanumérico INKA-CC en mostrador.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex items-start gap-3.5 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-[#E7F6EE] text-[#008446] flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Pago Presencial en Caja
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Sin tarjetas ni pasarelas por internet: liquida el monto exacto en efectivo o POS al retirar tus medicamentos.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Pie de Página Corporativo Claro estilo Stitch */}
      <footer className="bg-white text-slate-600 text-xs mt-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Columna 1: Marca */}
            <div className="space-y-3">
              <img
                src="/inkafarma-logo.svg"
                alt="Inkafarma"
                className="h-7 w-auto object-contain"
              />
              <p className="text-xs text-slate-500 leading-relaxed">
                Tu botica de confianza con la mayor cobertura en el Perú. Reserva tus medicamentos en línea y recógelos en tu botica más cercana.
              </p>
            </div>

            {/* Columna 2: Retiro en Botica */}
            <div className="space-y-2.5">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Retiro en Botica
              </h4>
              <ul className="space-y-1.5 text-slate-500">
                <li className="flex items-center gap-1.5">
                  <PackageCheck className="w-3.5 h-3.5 text-[#008446] shrink-0" />
                  <span>Consulta disponibilidad en tiempo real</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-[#008446] shrink-0" />
                  <span>Recibe tu código de retiro al instante</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-[#008446] shrink-0" />
                  <span>Paga en caja al recoger tu pedido</span>
                </li>
              </ul>
            </div>

            {/* Columna 3: Boticas Habilitadas */}
            <div className="space-y-2.5">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Boticas Habilitadas
              </h4>
              <ul className="space-y-1.5">
                {BRANCHES.map((branch) => (
                  <li key={branch}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBranch(branch);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`text-left transition-colors ${
                        selectedBranch === branch
                          ? "text-[#008446] font-bold"
                          : "text-slate-500 hover:text-[#008446]"
                      }`}
                    >
                      {branch}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Columna 4: Atención y Pago en Botica */}
            <div className="space-y-2.5">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Atención y Pago en Botica
              </h4>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-4 h-4 text-[#008446] shrink-0" />
                  <span>
                    Central telefónica: <strong className="text-slate-900">(01) 314-2020</strong>
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F6F8F7] border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#008446]" />
                    <span>Pago Presencial Seguro</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Paga directamente en caja de la botica al retirar tu pedido en efectivo o con tarjeta (POS).
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <p>© {CURRENT_YEAR} Inkafarma — Boticas del Perú S.A.C. Todos los derechos reservados.</p>
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

      {/* Modal de Historial de Reservas (GET /orders/user/{id}) */}
      {isReservationsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fade-in max-h-[85vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-[#F6F8F7]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#008446] text-white flex items-center justify-center">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Mis Reservas y Pedidos
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Códigos vigentes para retiro presencial en botica
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReservationsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1">
              {loadingReservations ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-[#008446]" />
                  Cargando tus reservas...
                </div>
              ) : userReservations.length === 0 ? (
                <div className="text-center py-10">
                  <Ticket className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-bold">
                    No tienes pedidos reservados
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tus reservas con código de recojo aparecerán aquí para presentarlas en la botica.
                  </p>
                </div>
              ) : (
                userReservations.map((res) => (
                  <div
                    key={res.id}
                    className="p-3.5 bg-[#F6F8F7] border border-slate-200 rounded-2xl space-y-2 text-xs hover:border-[#008446]/45 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                        {res.pickup_code || `INKA-CC-${res.id}`}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          res.status === "COLLECTED"
                            ? "bg-purple-100 text-purple-800"
                            : res.status === "CANCELLED"
                            ? "bg-rose-100 text-[#E30613]"
                            : "bg-emerald-100 text-[#006837]"
                        }`}
                      >
                        {res.status === "COLLECTED"
                          ? "Entregado en Botica"
                          : res.status === "CANCELLED"
                          ? "Cancelado"
                          : "Listo para Recojo"}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-[#008446] shrink-0" />
                      <span className="truncate">{res.branch || "Sede Miraflores"}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/80 text-slate-700">
                      <span className="text-[10px] text-slate-400">
                        {new Date(res.created_at).toLocaleDateString("es-PE")}
                      </span>
                      <span className="font-black text-[#007A43]">
                        S/ {Number(res.total_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3.5 border-t border-slate-100 bg-[#F6F8F7] text-center">
              <button
                type="button"
                onClick={() => setIsReservationsOpen(false)}
                className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors"
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
