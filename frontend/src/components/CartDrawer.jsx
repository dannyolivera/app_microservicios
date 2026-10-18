import React from "react";
import { X, Trash2, Plus, Minus, ShoppingBag, ShieldCheck, ArrowRight, Loader2, AlertCircle, Store, Coins, CheckCircle } from "lucide-react";

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
  checkoutError,
  selectedBranch = "Inkafarma Miraflores (Av. Larco 450)",
  onChangeBranch,
  branches = [
    "Inkafarma Miraflores (Av. Larco 450)",
    "Inkafarma San Isidro (Av. Javier Prado 1200)",
    "Inkafarma Lima Centro (Jr. de la Unión 600)"
  ]
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

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Cabecera del Carrito */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-inkafarma-green text-white flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-base leading-tight">Mi Pedido para Botica</h2>
                <p className="text-[11px] text-emerald-700 font-semibold">
                  {items.reduce((acc, i) => acc + i.quantity, 0)} {items.reduce((acc, i) => acc + i.quantity, 0) === 1 ? 'producto' : 'productos'} para recojo en botica
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lista de Productos en el Carrito */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {checkoutError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-inkafarma-red mt-0.5" />
                <div>
                  <p className="font-bold">No se pudo procesar la reserva:</p>
                  <p className="mt-0.5">{checkoutError}</p>
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-50 flex items-center justify-center text-inkafarma-green">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-700 text-sm">Tu carrito está vacío</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Elige tus medicamentos del catálogo para reservarlos y recogerlos en tu botica preferida.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl hover:border-slate-300 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{item.name}</h4>
                    <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                      S/ {Number(item.price).toFixed(2)}
                    </p>
                  </div>

                  {/* Selector de cantidad */}
                  <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
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
                      className="text-[11px] text-inkafarma-red hover:text-red-700 flex items-center gap-0.5 ml-auto mt-0.5"
                    >
                      <Trash2 className="w-3 h-3" /> Quitar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pie del Carrito y Botón de Reserva Click & Collect */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 space-y-3">
              {/* Selección de Botica para Retiro */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-slate-700 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-inkafarma-green" />
                    Botica de Recojo:
                  </span>
                </div>
                {onChangeBranch ? (
                  <select
                    value={selectedBranch}
                    onChange={(e) => onChangeBranch(e.target.value)}
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-inkafarma-green outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs font-semibold text-slate-800">{selectedBranch}</p>
                )}
                <p className="text-[10px] text-slate-400">
                  Horario de atención: Hoy de 8:00 AM a 10:00 PM
                </p>
              </div>

              {/* Información del Cliente */}
              {user ? (
                <div className="px-3 py-2 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs flex justify-between items-center">
                  <span className="text-slate-600">Cliente titular:</span>
                  <span className="text-slate-900 font-bold">{user.full_name}</span>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs flex items-center justify-between gap-2">
                  <span className="text-amber-800 text-[11px]">Inicia sesión para completar tu reserva</span>
                  <button
                    onClick={onOpenAuth}
                    className="font-bold text-inkafarma-green hover:underline shrink-0 text-xs"
                  >
                    Ingresar
                  </button>
                </div>
              )}

              {/* Beneficio: Pago Seguro en Botica */}
              <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                  <Coins className="w-3.5 h-3.5 text-inkafarma-green" />
                  <span>Sin pagos por internet • Paga directo en botica</span>
                </div>
                <p className="text-emerald-700 leading-tight">
                  No necesitas ingresar tarjetas bancarias online. Guardamos tus productos ahora y pagas al retirar en caja (efectivo o tarjeta).
                </p>
              </div>

              {/* Resumen de Totales */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal productos:</span>
                  <span>S/ {totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Costo de retiro:</span>
                  <span className="text-emerald-700 font-bold">¡Gratis (S/ 0.00)!</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>Total a pagar en botica:</span>
                  <span className="text-inkafarma-green">S/ {totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Botón de Confirmar Reserva */}
              <button
                onClick={user ? onCheckout : onOpenAuth}
                disabled={isProcessing}
                className="w-full py-3.5 px-4 bg-inkafarma-green hover:bg-inkafarma-greenHover active:scale-[0.99] text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-inkafarma-yellow" />
                    <span>Confirmando tu reserva...</span>
                  </>
                ) : user ? (
                  <>
                    <span>Confirmar Reserva (Pagar en Botica)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Inicia Sesión para Reservar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 text-center pt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-inkafarma-green" />
                <span>Tus medicamentos te esperan listos en botica</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
