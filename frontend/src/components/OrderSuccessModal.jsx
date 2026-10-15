import React from "react";
import { CheckCircle2, PackageCheck, ArrowRight, ShieldCheck } from "lucide-react";

export default function OrderSuccessModal({ order, onClose }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-fade-in">
        {/* Cabecera exitosa */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-white stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-black">¡Pedido Registrado con Éxito!</h2>
          <p className="text-xs text-emerald-100 mt-1">
            Procesado por el Microservicio de Pedidos (Puerto 8003)
          </p>
        </div>

        {/* Resumen del Pedido */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Código de Orden:</span>
              <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                #{order.id}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Estado en Base de Datos:</span>
              <span className="font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                {order.status}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Cliente ID:</span>
              <span className="font-bold text-slate-800">Usuario #{order.user_id}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Fecha de Emisión:</span>
              <span className="text-slate-700">
                {new Date(order.created_at).toLocaleString("es-PE")}
              </span>
            </div>
          </div>

          {/* Lista de ítems registrados en db_pedidos_inka */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-inka-blue" />
              <span>Productos incluidos en la orden:</span>
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {order.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <span className="text-slate-800 font-medium">
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
            <span className="text-slate-800">Total Liquidado:</span>
            <span className="text-lg text-inka-blue">S/ {Number(order.total_amount).toFixed(2)}</span>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <span>
              <strong>Validación Inter-servicio Completada:</strong> El microservicio de pedidos
              consultó al microservicio de catálogo vía HTTPX para garantizar que el stock existiera
              antes de asentar esta transacción.
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-inka-blue hover:bg-inka-lightBlue text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <span>Seguir Comprando</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
