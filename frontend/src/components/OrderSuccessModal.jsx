import React, { useState } from "react";
import { CheckCircle2, PackageCheck, ArrowRight, Store, Copy, Check, QrCode, Coins, CheckCircle, Clock } from "lucide-react";
import { markOrderCollected } from "../services/api";

export default function OrderSuccessModal({ order, onClose, onOrderUpdated }) {
  const [copied, setCopied] = useState(false);
  const [isSimulatingPickup, setIsSimulatingPickup] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(order?.status || "RESERVED");

  if (!order) return null;

  const pickupCode = order.pickup_code || `INKA-CC-${String(order.id).padStart(5, "0")}`;
  const branchName = order.branch || "Sede Inkafarma - Miraflores (Av. Larco 450)";

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pickupCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateCollect = async () => {
    setIsSimulatingPickup(true);
    try {
      await markOrderCollected(order.id);
      setCurrentStatus("COLLECTED");
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      alert("Error al simular retiro en caja: " + err.message);
    } finally {
      setIsSimulatingPickup(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-fade-in max-h-[92vh] flex flex-col">
        {/* Cabecera exitosa */}
        <div className="p-6 bg-gradient-to-r from-inkafarma-green to-inkafarma-greenDark text-white text-center shrink-0">
          <div className="w-14 h-14 mx-auto mb-2.5 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-8 h-8 text-white stroke-[2.5]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">¡Reserva Confirmada con Éxito!</h2>
          <p className="text-xs text-emerald-100 mt-1 max-w-md mx-auto">
            Tus productos están separados y asegurados. Te esperamos en la botica.
          </p>
        </div>

        {/* Resumen del Pedido y Ticket */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Tarjeta del Código de Recojo (Slide 2, 9 y 12) */}
          <div className="bg-gradient-to-b from-emerald-50/80 to-white border-2 border-dashed border-emerald-500/40 rounded-2xl p-4 text-center space-y-2 relative">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
              <QrCode className="w-3.5 h-3.5" />
              <span>Código de Recojo para Botica</span>
            </div>
            
            <p className="text-xs text-slate-500">Presenta este código en la botica al retirar:</p>
            
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-2xl sm:text-3xl font-black text-slate-900 tracking-wider bg-white px-4 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                {pickupCode}
              </span>
              <button
                onClick={handleCopyCode}
                title="Copiar código de recojo"
                className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50 text-slate-600 hover:text-inkafarma-green transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-inkafarma-green stroke-[3]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {copied && <p className="text-[11px] text-emerald-700 font-semibold animate-pulse">¡Código copiado al portapapeles!</p>}
          </div>

          {/* Sede y Estado de la Reserva */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-inkafarma-green" />
                Botica para Recojo:
              </span>
              <span className="font-bold text-slate-800 text-right max-w-[240px]">
                {branchName}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Estado del Pedido:</span>
              <span className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                currentStatus === 'COLLECTED'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {currentStatus === 'COLLECTED' ? '✓ Entregado y Pagado en Botica' : '✓ Listo para Recojo'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Modalidad:</span>
              <span className="font-bold text-slate-700">
                Retiro en Botica (Paga al recoger)
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Fecha y Hora:</span>
              <span className="text-slate-700">
                {new Date(order.created_at).toLocaleString("es-PE")}
              </span>
            </div>
          </div>

          {/* Lista de medicamentos apartados */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-inkafarma-green" />
              <span>Medicamentos reservados:</span>
            </h4>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
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

          {/* Total a pagar en botica */}
          <div className="flex justify-between items-center pt-2.5 border-t border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-700 block">Total a Pagar en Botica:</span>
              <span className="text-[10px] text-slate-400">Pagas al momento del recojo (Efectivo o Tarjeta)</span>
            </div>
            <span className="text-2xl font-black text-inkafarma-green">
              S/ {Number(order.total_amount).toFixed(2)}
            </span>
          </div>

          {/* Recordatorio de retiro en botica */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <Coins className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
            <div>
              <p className="font-bold">Instrucciones de Retiro:</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Acércate a la zona de <strong>Caja / Entrega de Pedidos</strong> de la botica, indica tu código <strong>{pickupCode}</strong> y realiza tu pago en efectivo o con tarjeta. Tus medicamentos están reservados por 24 horas.
              </p>
            </div>
          </div>

          {/* Simulación para demostración */}
          {currentStatus !== "COLLECTED" && (
            <button
              onClick={handleSimulateCollect}
              disabled={isSimulatingPickup}
              className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5 text-inkafarma-green" />
              <span>{isSimulatingPickup ? "Registrando entrega..." : "Simular Entrega y Pago en Botica"}</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-3.5 px-4 bg-inkafarma-green hover:bg-inkafarma-greenHover text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Finalizar y Volver al Catálogo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
