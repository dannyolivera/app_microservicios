import React from "react";
import {
  ShoppingCart,
  User,
  LogOut,
  Search,
  MapPin,
  X,
  Store,
  Ticket,
  Phone,
} from "lucide-react";

export default function Navbar({
  cartCount,
  cartTotal = 0,
  onOpenCart,
  user,
  onOpenAuth,
  onLogout,
  searchTerm,
  setSearchTerm,
  health,
  selectedBranchId = 1,
  selectedBranch,
  onChangeBranch,
  branches = [],
  categories = [],
  selectedCategoryId = null,
  onSelectCategory,
  onOpenReservations,
}) {
  const isOnline =
    health.catalog && health.users && health.orders && health.payments !== false;

  const handleResetHome = () => {
    setSearchTerm("");
    if (onSelectCategory) onSelectCategory(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const el = document.getElementById("catalogo");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className="sticky top-0 z-40 shadow-sm">
      {/* 1. Barra superior utilitaria verde oscuro */}
      <div className="bg-[#006837] text-white text-[11px] py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-bold tracking-wide">
              <Store className="w-3.5 h-3.5 text-inkafarma-yellow shrink-0" />
              <span>Retiro en Botica GRATIS</span>
            </span>

            {branches.length > 0 && onChangeBranch ? (
              <div className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/20 rounded-full px-2.5 py-0.5 transition-colors">
                <MapPin className="w-3 h-3 text-inkafarma-yellow shrink-0" />
                <select
                  aria-label="Botica de recojo"
                  value={selectedBranchId}
                  onChange={(e) => onChangeBranch(Number(e.target.value))}
                  className="bg-transparent text-white text-[11px] font-semibold outline-none cursor-pointer max-w-[200px] sm:max-w-none truncate"
                >
                  {branches.map((branch) => (
                    <option
                      key={branch.id}
                      value={branch.id}
                      className="text-slate-900 bg-white"
                    >
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 bg-white/15 rounded-full px-2.5 py-0.5 font-semibold">
                <MapPin className="w-3 h-3 text-inkafarma-yellow shrink-0" />
                <span className="truncate max-w-[220px]">{selectedBranch}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {!isOnline && (
              <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse"></span>
                <span>Reconectando...</span>
              </div>
            )}
            <span className="hidden sm:inline-flex items-center gap-1.5 text-emerald-100 font-medium">
              <Phone className="w-3 h-3 text-inkafarma-yellow shrink-0" />
              <span>Central telefónica: <strong className="text-white">(01) 314-2020</strong></span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Barra principal verde Inkafarma */}
      <div className="bg-[#008446] text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 md:gap-6">
          {/* Logo oficial en blanco */}
          <button
            type="button"
            onClick={handleResetHome}
            className="flex items-center gap-2.5 shrink-0 focus:outline-none group"
            title="Volver al inicio del catálogo"
          >
            <img
              src="/inkafarma-logo-white.svg"
              alt="Inkafarma"
              className="h-7 sm:h-8 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </button>

          {/* Buscador central blanco estilo Stitch (Desktop) */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl hidden md:block">
            <div className="bg-white rounded-full p-1 pl-4 flex items-center shadow-sm ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-inkafarma-yellow transition-all">
              <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
              <input
                type="text"
                placeholder="¿Qué medicamento o producto buscas? (ej. Paracetamol, Ibuprofeno)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 bg-transparent outline-none py-1.5"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Limpiar búsqueda"
                  className="text-slate-400 hover:text-slate-600 p-1 mr-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="bg-[#006837] hover:bg-[#00552D] text-white text-xs font-extrabold tracking-wide px-5 py-2 rounded-full transition-colors shrink-0"
              >
                BUSCAR
              </button>
            </div>
          </form>

          {/* Acciones derecha: Mis Reservas, Cuenta, Carrito amarillo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {onOpenReservations && (
              <button
                type="button"
                onClick={onOpenReservations}
                title="Ver mis reservas y códigos de recojo"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-white/95 hover:text-white hover:bg-white/15 transition-colors"
              >
                <Ticket className="w-4 h-4 text-inkafarma-yellow" />
                <span>Mis Reservas</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-2 bg-white/15 border border-white/15 py-1 pl-1.5 pr-2.5 rounded-full">
                <div className="w-7 h-7 rounded-full bg-inkafarma-yellow text-slate-900 flex items-center justify-center text-xs font-black">
                  {user.full_name?.charAt(0).toUpperCase() || "C"}
                </div>
                <div className="text-left hidden lg:block leading-tight">
                  <p className="text-xs font-bold text-white truncate max-w-[110px]">
                    {user.full_name.split(" ")[0]}
                  </p>
                  <p className="text-[10px] text-emerald-100">Mi Cuenta</p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Cerrar sesión"
                  className="p-1 text-emerald-100 hover:text-white hover:bg-white/15 rounded-full transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center gap-2 text-white hover:bg-white/15 px-3 py-2 rounded-full text-xs font-bold transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden sm:inline text-left leading-tight">
                  <span className="block text-[10px] font-medium text-emerald-100">Hola,</span>
                  <span>Inicia sesión</span>
                </span>
              </button>
            )}

            {/* Pill amarillo del carrito */}
            <button
              type="button"
              onClick={onOpenCart}
              className="relative flex items-center gap-2.5 bg-[#FFD200] hover:bg-[#F0C400] text-slate-900 px-3.5 sm:px-4 py-2 rounded-full font-extrabold text-xs sm:text-sm shadow-sm active:scale-95 transition-all"
            >
              <span className="relative flex items-center">
                <ShoppingCart className="w-4 h-4 stroke-[2.4]" />
                {cartCount > 0 && (
                  <span className=" -top-2 -right-2 absolute min-w-[17px] h-[17px] px-1 rounded-full bg-[#E30613] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                    {cartCount}
                  </span>
                )}
              </span>
              <span className="font-black tracking-tight">
                S/ {Number(cartTotal).toFixed(2)}
              </span>
            </button>
          </div>
        </div>

        {/* Buscador móvil */}
        <form onSubmit={handleSearchSubmit} className="px-4 pb-3 md:hidden">
          <div className="bg-white rounded-full p-1 pl-3.5 flex items-center shadow-sm">
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              placeholder="Buscar medicamentos o productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 text-xs text-slate-800 placeholder:text-slate-400 bg-transparent outline-none py-1"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-slate-400 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 3. Sub-barra blanca dinámica de categorías reales */}
      {onSelectCategory && (
        <nav
          aria-label="Categorías del catálogo"
          className="bg-white border-b border-slate-200/90"
        >
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 sm:gap-5 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => onSelectCategory(null)}
              className={`py-2.5 px-2 text-xs whitespace-nowrap border-b-2 transition-colors ${
                selectedCategoryId === null
                  ? "border-[#008446] text-[#008446] font-bold"
                  : "border-transparent text-slate-600 hover:text-[#008446] font-medium"
              }`}
            >
              Todos los productos
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory(category.id)}
                className={`py-2.5 px-2 text-xs whitespace-nowrap border-b-2 transition-colors ${
                  selectedCategoryId === category.id
                    ? "border-[#008446] text-[#008446] font-bold"
                    : "border-transparent text-slate-600 hover:text-[#008446] font-medium"
                }`}
              >
                {category.name}
              </button>
            ))}

            {onOpenReservations && (
              <button
                type="button"
                onClick={onOpenReservations}
                className="sm:hidden ml-auto py-2.5 px-2 text-xs whitespace-nowrap font-bold text-[#008446] flex items-center gap-1"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Mis Reservas</span>
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
