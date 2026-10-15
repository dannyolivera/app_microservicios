import React from "react";
import { ShoppingBag, User, LogOut, Search, Phone, MapPin, Clock, X } from "lucide-react";

export default function Navbar({
  cartCount,
  onOpenCart,
  user,
  onOpenAuth,
  onLogout,
  searchTerm,
  setSearchTerm,
  health
}) {
  const isOnline = health.catalog && health.users && health.orders;

  return (
    <header className="sticky top-0 z-40 bg-white shadow-xs border-b border-slate-100">
      {/* Barra superior de servicio al cliente */}
      <div className="bg-[#00873F] text-white text-[11px] py-1.5 px-4 hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 font-medium">
              <Phone className="w-3 h-3 text-inkafarma-yellow" />
              Central de pedidos: (01) 314-2020
            </span>
            <span className="flex items-center gap-1.5 text-emerald-100">
              <Clock className="w-3 h-3 text-inkafarma-yellow" />
              Atención 24 horas • Envíos a todo el país
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-100">
              <MapPin className="w-3 h-3 text-inkafarma-yellow" />
              Ubica tu botica más cercana
            </span>
            <div className="flex items-center gap-1.5 pl-3 border-l border-emerald-600/60 text-[10px]">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-300 animate-pulse' : 'bg-amber-300'}`}></span>
              <span>{isOnline ? 'Servicio disponible' : 'Revisando disponibilidad'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra principal de navegación */}
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-3.5 flex items-center justify-between gap-3 md:gap-6">
        {/* Logo oficial */}
        <div className="flex items-center shrink-0 cursor-pointer">
          <img
            src="/inkafarma-logo.png"
            alt="Inkafarma"
            className="h-9 sm:h-11 w-auto object-contain"
          />
        </div>

        {/* Buscador de medicamentos (Desktop) */}
        <div className="flex-1 max-w-xl hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="¿Qué medicamento o producto buscas hoy? (ej. Paracetamol, Ibuprofeno)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-inkafarma-green focus:ring-2 focus:ring-emerald-500/10 rounded-full outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Acciones: Usuario y Carrito */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 py-1.5 px-3 rounded-full">
              <div className="w-7 h-7 rounded-full bg-inkafarma-green text-white flex items-center justify-center text-xs font-bold">
                {user.full_name?.charAt(0).toUpperCase() || "C"}
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                  {user.full_name.split(" ")[0]}
                </p>
                <p className="text-[10px] text-emerald-700 font-medium">Mi Cuenta</p>
              </div>
              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="p-1 text-slate-400 hover:text-inkafarma-red rounded-full transition-colors ml-0.5"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 text-slate-700 hover:text-inkafarma-green px-3 sm:px-4 py-2 rounded-full text-xs font-bold transition-colors hover:bg-slate-50"
            >
              <User className="w-4 h-4 text-inkafarma-green" />
              <span className="hidden sm:inline">Hola, inicia sesión</span>
            </button>
          )}

          {/* Botón Carrito */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-2 bg-inkafarma-green hover:bg-inkafarma-greenHover text-white px-4 sm:px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Carrito</span>
            {cartCount > 0 ? (
              <span className="w-5 h-5 rounded-full bg-inkafarma-yellow text-slate-900 text-[11px] font-black flex items-center justify-center shadow-xs">
                {cartCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Buscador en versión Móvil */}
      <div className="px-4 pb-3 md:hidden">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar medicamentos o productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-inkafarma-green rounded-full outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
