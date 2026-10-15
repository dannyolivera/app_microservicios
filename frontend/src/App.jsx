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
  checkMicroservicesHealth,
} from "./services/api";
import {
  Sparkles,
  Truck,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  HeartPulse,
} from "lucide-react";

export default function App() {
  // Estado de Datos del Catálogo
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
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

  // Estado de Proceso de Pedidos
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [lastOrder, setLastOrder] = useState(null);

  // Estado de Conectividad con Microservicios
  const [health, setHealth] = useState({ catalog: false, users: false, orders: false });

  // Guardar carrito en localStorage
  useEffect(() => {
    try {
      localStorage.setItem("inka_cart", JSON.stringify(cart));
    } catch (e) {
      console.error("Error guardando carrito", e);
    }
  }, [cart]);

  // Cargar categorías, productos y estado de microservicios
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
        "No se pudo conectar con el Microservicio de Catálogo (:8001). Asegúrate de levantarlo con: python -m uvicorn main:app --port 8001 --reload"
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
    }, 20000);

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

  // Procesar Checkout (Microservicio de Pedidos :8003)
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
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
      };

      const createdOrder = await createOrder(payload);

      setCart([]);
      setIsCartOpen(false);
      setLastOrder(createdOrder);

      loadData();
    } catch (err) {
      setCheckoutError(err.message || "Error al procesar la orden");
    } finally {
      setIsProcessingOrder(false);
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Barra de Navegación Principal */}
      <Navbar
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        health={health}
      />

      {/* Hero Banner Estilo Inkafarma */}
      <div className="bg-gradient-to-r from-inkafarma-green via-emerald-600 to-inkafarma-dark text-white py-10 px-4 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs border border-white/30 text-white text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-inkafarma-yellow" />
              <span>Plataforma de Comercio Farmacéutico Distribuida</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Medicamentos y Salud al Mejor Precio de Farmacia
            </h1>
            <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed">
              Catálogo conectado al microservicio <code className="bg-emerald-900/60 px-1.5 py-0.5 rounded text-inkafarma-yellow font-mono text-xs">:8001</code>,
              autenticación con bcrypt y JWT en <code className="bg-emerald-900/60 px-1.5 py-0.5 rounded text-inkafarma-yellow font-mono text-xs">:8002</code>,
              y procesamiento síncrono con HTTPX en <code className="bg-emerald-900/60 px-1.5 py-0.5 rounded text-inkafarma-yellow font-mono text-xs">:8003</code>.
            </p>
          </div>

          {/* Tarjetas de Beneficios */}
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-inkafarma-yellow text-inkafarma-dark">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold">Envío Exprés</p>
                <p className="text-[11px] text-emerald-100">Despacho en 45 min</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white text-inkafarma-green">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold">Stock Verificado</p>
                <p className="text-[11px] text-emerald-100">Validación HTTPX</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Banner de Advertencia si algún microservicio está inactivo */}
        {(!health.catalog || !health.orders || !health.users) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold">Estado de los Microservicios:</p>
                <p className="text-slate-600">
                  {!health.catalog && "• Catálogo (:8001) desconectado. "}
                  {!health.users && "• Usuarios (:8002) desconectado. "}
                  {!health.orders && "• Pedidos (:8003) desconectado."}
                </p>
              </div>
            </div>
            <button
              onClick={loadData}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reintentar Conexión
            </button>
          </div>
        )}

        {/* Barra de Filtros de Categorías */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-xs ${
              selectedCategoryId === null
                ? "bg-inkafarma-green text-white shadow-md shadow-emerald-500/25"
                : "bg-white text-slate-700 hover:bg-emerald-50 hover:text-inkafarma-green border border-slate-200"
            }`}
          >
            Todos los Medicamentos ({products.length})
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategoryId(category.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-xs ${
                selectedCategoryId === category.id
                  ? "bg-inkafarma-green text-white shadow-md shadow-emerald-500/25"
                  : "bg-white text-slate-700 hover:bg-emerald-50 hover:text-inkafarma-green border border-slate-200"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Grilla de Productos */}
        {isLoading ? (
          <div className="text-center py-20">
            <HeartPulse className="w-10 h-10 animate-bounce text-inkafarma-green mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Cargando catálogo farmacéutico...</p>
            <p className="text-xs text-slate-400">Consultando http://localhost:8001/products/</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">No se encontraron productos</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {loadError
                ? loadError
                : "No hay productos disponibles en esta categoría o no coinciden con la búsqueda. Puedes agregar productos desde Swagger o ejecutar seed_data.sql."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
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

      {/* Pie de Página */}
      <footer className="bg-inkafarma-dark text-slate-400 text-xs py-8 border-t border-emerald-950 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/inkafarma-logo.png"
              alt="Inkafarma"
              className="h-8 w-auto brightness-0 invert"
            />
            <span className="text-slate-400">— Arquitectura de Microservicios Distribuidos</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-400 text-[11px]">
            <span>FastAPI • SQLAlchemy • MySQL • Alembic • React • Tailwind CSS</span>
          </div>
        </div>
      </footer>

      {/* Modales y Paneles Deslizantes */}
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
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <OrderSuccessModal
        order={lastOrder}
        onClose={() => setLastOrder(null)}
      />
    </div>
  );
}
