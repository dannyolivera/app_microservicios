import React from "react";
import { ShoppingCart, User, LogOut, Search, ShieldCheck } from "lucide-react";

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
  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-emerald-100">
      {/* Barra superior de Microservicios */}
      <div className="bg-inkafarma-dark text-slate-300 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-inkafarma-yellow">Arquitectura:</span>
            <span>Microservicios Distribuidos (Database-per-Service)</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400">Microservicios:</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${health.catalog ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-rose-500'}`}></span>
              <span className="text-[11px]">Catálogo :8001</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${health.users ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-rose-500'}`}></span>
              <span className="text-[11px]">Usuarios :8002</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${health.orders ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-rose-500'}`}></span>
              <span className="text-[11px]">Pedidos :8003</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra principal de navegación */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo oficial de Inkafarma */}
        <div className="flex items-center gap-3 cursor-pointer">
          <img
            src="/inkafarma-logo.png"
            alt="Inkafarma"
            className="h-10 md:h-12 w-auto object-contain hover:scale-105 transition-transform"
          />
        </div>

        {/* Buscador de medicamentos */}
        <div className="flex-1 max-w-lg hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar medicamentos, principios activos, vitaminas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-inkafarma-green rounded-full outline-none transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Acciones de Usuario y Carrito */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 bg-inkafarma-greenLight border border-emerald-200 py-1.5 px-3 rounded-full">
              <div className="w-7 h-7 rounded-full bg-inkafarma-green text-white flex items-center justify-center text-xs font-bold">
                {user.full_name?.charAt(0) || "U"}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-inkafarma-dark leading-tight truncate max-w-[130px]">
                  {user.full_name}
                </p>
                <p className="text-[10px] text-emerald-700 leading-tight">
                  Cliente ID: {user.id}
                </p>
              </div>
              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="p-1 text-slate-400 hover:text-inkafarma-red rounded-full hover:bg-emerald-100 transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-inkafarma-green px-4 py-2 rounded-full text-xs font-bold border border-slate-200 hover:border-emerald-200 transition-all"
            >
              <User className="w-4 h-4 text-inkafarma-green" />
              <span>Iniciar Sesión</span>
            </button>
          )}

          {/* Botón Carrito con identidad Inkafarma */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-2 bg-inkafarma-green hover:bg-inkafarma-greenHover text-white px-5 py-2.5 rounded-full font-bold text-xs shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all active:scale-95"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Mi Carrito</span>
            {cartCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-inkafarma-yellow text-inkafarma-dark text-[11px] font-black flex items-center justify-center shadow-xs">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
