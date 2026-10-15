import React from "react";
import { CheckCircle2, PackageCheck, ArrowRight, Truck, Clock } from "lucide-react";

export default function OrderSuccessModal({ order, onClose }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-fade-in">
        {/* Cabecera exitosa */}
        <div className="p-6 bg-gradient-to-r from-inkafarma-green to-inkafarma-greenDark text-white text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-10 h-10 text-white stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">¡Gracias por tu compra!</h2>
          <p className="text-xs text-emerald-100 mt-1">
            Tu pedido ha sido recibido y está siendo preparado por nuestra botica
          </p>
        </div>

        {/* Resumen del Pedido */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Número de Pedido:</span>
              <span className="font-mono font-bold text-slate-800 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                #{order.id}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Estado del Despacho:</span>
              <span className="font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Confirmado
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Fecha y Hora:</span>
              <span className="text-slate-700">
                {new Date(order.created_at).toLocaleString("es-PE")}
              </span>
            </div>
          </div>

          {/* Lista de medicamentos de la orden */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-inkafarma-green" />
              <span>Detalle de productos:</span>
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {order.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center text-xs p-2.5 bg-slate-50/80 rounded-xl border border-slate-100"
                >
                  <span className="text-slate-800 font-medium truncate max-w-[240px]">
                    Producto #{item.product_id} × {item.quantity} un.
                  </span>
                  <span className="font-bold text-slate-900">
                    S/ {(Number(item.unit_price) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total pagado */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-sm font-black">
            <span className="text-slate-800">Total Pagado:</span>
            <span className="text-xl text-inkafarma-green">S/ {Number(order.total_amount).toFixed(2)}</span>
          </div>

          {/* Información de entrega */}
          <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white text-inkafarma-green shadow-xs shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold">Tiempo estimado de entrega: 30 a 45 min</p>
              <p className="text-[11px] text-emerald-700">Un repartidor llevará tu pedido cumpliendo todos los protocolos.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 px-4 bg-inkafarma-green hover:bg-inkafarma-greenHover text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Seguir Comprando</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
