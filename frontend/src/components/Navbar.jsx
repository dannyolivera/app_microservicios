import React from "react";
import { ShoppingCart, User, LogOut, Search, Pill, ShieldCheck } from "lucide-react";

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
    <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-slate-200">
      {/* Barra superior de Microservicios */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-inka-yellow">Arquitectura:</span>
            <span>Microservicios Database-per-Service</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400">Estado de Servicios:</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${health.catalog ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
              <span className="text-[11px]">Catálogo :8001</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${health.users ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
              <span className="text-[11px]">Usuarios :8002</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${health.orders ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
              <span className="text-[11px]">Pedidos :8003</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra principal de navegación */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo de Farmacia */}
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-inka-blue to-inka-lightBlue flex items-center justify-center text-inka-yellow shadow-md">
            <Pill className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-black tracking-tight text-inka-blue">Inka</span>
              <span className="text-2xl font-black tracking-tight text-inka-red">Pharmacy</span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block -mt-1">
              Botica & Salud Online
            </span>
          </div>
        </div>

        {/* Buscador de medicamentos */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar medicamentos (ej. Paracetamol, Ibuprofeno)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-inka-blue rounded-full outline-none transition-all"
            />
          </div>
        </div>

        {/* Acciones de Usuario y Carrito */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-full">
              <div className="w-7 h-7 rounded-full bg-inka-blue text-inka-yellow flex items-center justify-center text-xs font-bold">
                {user.full_name?.charAt(0) || "U"}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                  {user.full_name}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[120px]">
                  ID: {user.id}
                </p>
              </div>
              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="p-1 text-slate-400 hover:text-rose-600 rounded-full hover:bg-slate-200 transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-full text-xs font-semibold transition-colors"
            >
              <User className="w-4 h-4 text-inka-blue" />
              <span>Iniciar Sesión</span>
            </button>
          )}

          {/* Botón Carrito */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-2 bg-inka-yellow hover:bg-inka-yellowHover text-inka-blue px-4 py-2 rounded-full font-bold text-xs shadow-sm transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Carrito</span>
            {cartCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-inka-red text-white text-[11px] font-black flex items-center justify-center shadow-sm">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
