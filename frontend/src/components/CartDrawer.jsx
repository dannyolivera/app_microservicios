import React from "react";
import { X, Trash2, Plus, Minus, ShoppingBag, ShieldCheck, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  user,
  onOpenAuth,
  onCheckout,
  isProcessing,
  checkoutError
}) {
  if (!isOpen) return null;

  const totalAmount = items.reduce(
    (acc, item) => acc + Number(item.price) * item.quantity,
    0
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Fondo oscuro traslúcido */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      ></div>

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Cabecera del Carrito */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-inka-blue" />
              <h2 className="font-bold text-slate-800 text-lg">Tu Carrito Farmacéutico</h2>
              <span className="text-xs bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                {items.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lista de Productos en el Carrito */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {checkoutError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <p className="font-bold">Error al procesar orden:</p>
                  <p>{checkoutError}</p>
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-700 text-sm">Tu carrito está vacío</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Agrega medicamentos o productos del catálogo para procesar tu orden.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{item.name}</h4>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      S/ {Number(item.price).toFixed(2)} c/u
                    </p>
                  </div>

                  {/* Selector de cantidad */}
                  <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="p-1 text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-slate-700">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      className="p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Subtotal del ítem */}
                  <div className="text-right min-w-[70px]">
                    <p className="text-xs font-extrabold text-slate-900">
                      S/ {(Number(item.price) * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-[11px] text-rose-500 hover:text-rose-700 flex items-center gap-0.5 ml-auto mt-0.5"
                    >
                      <Trash2 className="w-3 h-3" /> Quitar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pie del Carrito y Botón de Checkout */}
          {items.length > 0 && (
            <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3">
              {/* Información del Cliente */}
              {user ? (
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>Cliente autenticado:</span>
                    <span className="text-inka-blue font-bold">{user.full_name}</span>
                  </div>
                  <div className="text-slate-500 truncate">
                    Dirección: {user.address || "Dirección de farmacia estándar"}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs flex items-center justify-between gap-2">
                  <span className="text-amber-800">Inicia sesión para poder procesar la compra</span>
                  <button
                    onClick={onOpenAuth}
                    className="font-bold text-inka-blue underline shrink-0"
                  >
                    Iniciar Sesión
                  </button>
                </div>
              )}

              {/* Resumen de Totales */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal productos:</span>
                  <span>S/ {totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Envío a domicilio:</span>
                  <span className="text-emerald-600 font-bold">¡GRATIS!</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total a Pagar:</span>
                  <span className="text-inka-blue">S/ {totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Botón de Procesar Orden (Microservicio de Pedidos :8003) */}
              <button
                onClick={user ? onCheckout : onOpenAuth}
                disabled={isProcessing}
                className="w-full py-3 px-4 bg-inka-blue hover:bg-inka-lightBlue active:scale-[0.99] text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-inka-yellow" />
                    <span>Validando stock con Catálogo (:8001)...</span>
                  </>
                ) : user ? (
                  <>
                    <span>Procesar Orden de Compra</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Iniciar Sesión para Comprar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Consulta síncrona en tiempo real con Microservicio de Pedidos (:8003)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
