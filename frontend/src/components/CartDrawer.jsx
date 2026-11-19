import React, { useState } from "react";
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertCircle,
  Store,
  Coins,
  CreditCard,
  Smartphone,
  Lock,
} from "lucide-react";

function formatCardInput(value) {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart: _onClearCart,
  user,
  onOpenAuth,
  onCheckout,
  isProcessing,
  checkoutError,
  selectedBranchId = 1,
  selectedBranch = "Inkafarma Miraflores (Av. Larco 450)",
  onChangeBranch,
  branches = [],
}) {
  const [paymentMethod, setPaymentMethod] = useState("PAGO_EN_CAJA_PRESENCIAL");
  const [onlineMethod, setOnlineMethod] = useState("CARD");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [yapePhone, setYapePhone] = useState("");
  const [yapeCode, setYapeCode] = useState("");
  const [formError, setFormError] = useState("");

  if (!isOpen) return null;

  const totalAmount = items.reduce(
    (acc, item) => acc + Number(item.price) * item.quantity,
    0
  );
  const totalItemsCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const isOnlinePayment = paymentMethod === "PAGO_ONLINE";

  const handleSelectPaymentMethod = (method) => {
    setPaymentMethod(method);
    setFormError("");
  };

  const handleConfirmCheckout = () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    setFormError("");

    if (!isOnlinePayment) {
      onCheckout("PAGO_EN_CAJA_PRESENCIAL", null);
      return;
    }

    if (onlineMethod === "CARD") {
      const digits = cardNumber.replace(/\D/g, "");
      const parsedMonth = parseInt(expMonth, 10);
      const parsedYear = parseInt(expYear, 10);

      if (digits.length < 13 || digits.length > 19) {
        setFormError("Ingresa un número de tarjeta válido (13 a 19 dígitos).");
        return;
      }
      if (!cardHolder.trim() || cardHolder.trim().length < 3) {
        setFormError("Ingresa el nombre del titular de la tarjeta.");
        return;
      }
      if (!parsedMonth || parsedMonth < 1 || parsedMonth > 12) {
        setFormError("Ingresa un mes de vencimiento válido (01 a 12).");
        return;
      }
      if (Number.isNaN(parsedYear) || expYear.trim().length < 2) {
        setFormError("Ingresa un año de vencimiento válido (ej. 28 o 2028).");
        return;
      }
      if (cvv.trim().length < 3 || cvv.trim().length > 4) {
        setFormError("Ingresa un código CVV válido de 3 o 4 dígitos.");
        return;
      }

      onCheckout("PAGO_ONLINE", {
        method_type: "CARD",
        card_number: digits,
        card_holder: cardHolder.trim(),
        exp_month: parsedMonth,
        exp_year: parsedYear,
        cvv: cvv.trim(),
      });
      return;
    }

    const phoneDigits = yapePhone.replace(/\D/g, "");
    const codeDigits = yapeCode.replace(/\D/g, "");
    if (phoneDigits.length !== 9 || !phoneDigits.startsWith("9")) {
      setFormError("Ingresa un número celular Yape válido de 9 dígitos.");
      return;
    }
    if (codeDigits.length !== 6) {
      setFormError("Ingresa el código de aprobación Yape de 6 dígitos.");
      return;
    }

    onCheckout("PAGO_ONLINE", {
      method_type: "YAPE",
      yape_phone: phoneDigits,
      yape_code: codeDigits,
    });
  };

  const displayError = formError || checkoutError;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Fondo oscuro traslúcido */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      ></div>

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full">
          {/* Cabecera del Carrito */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-[#F6F8F7] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#008446] text-white flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-base leading-tight">
                  Mi Pedido para Botica
                </h2>
                <p className="text-[11px] text-[#008446] font-semibold">
                  {totalItemsCount}{" "}
                  {totalItemsCount === 1 ? "producto" : "productos"} para recojo en botica
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cuerpo desplazable: Productos + Sede + Modalidad de Pago */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {displayError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-inkafarma-red mt-0.5" />
                <div>
                  <p className="font-bold">No se pudo completar el pedido:</p>
                  <p className="mt-0.5">{displayError}</p>
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-50 flex items-center justify-center text-[#008446]">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-700 text-sm">
                  Tu carrito está vacío
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Elige tus medicamentos del catálogo para reservarlos o pagarlos en línea y recogerlos en tu botica preferida.
                </p>
              </div>
            ) : (
              <>
                {/* Lista de productos */}
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl hover:border-slate-300 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate">
                          {item.name}
                        </h4>
                        <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                          S/ {Number(item.price).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="p-1 text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-slate-700">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <p className="text-xs font-extrabold text-slate-900">
                          S/ {(Number(item.price) * item.quantity).toFixed(2)}
                        </p>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          className="text-[11px] text-inkafarma-red hover:text-red-700 flex items-center gap-0.5 ml-auto mt-0.5"
                        >
                          <Trash2 className="w-3 h-3" /> Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selección de Botica para Retiro */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-700 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-[#008446]" />
                      Botica de Recojo:
                    </span>
                  </div>
                  {onChangeBranch && branches.length > 0 ? (
                    <select
                      value={selectedBranchId}
                      onChange={(e) => onChangeBranch(Number(e.target.value))}
                      className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#008446] outline-none"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs font-semibold text-slate-800">
                      {selectedBranch}
                    </p>
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
                    <span className="text-amber-800 text-[11px]">
                      Inicia sesión para completar tu pedido
                    </span>
                    <button
                      type="button"
                      onClick={onOpenAuth}
                      className="font-bold text-[#008446] hover:underline shrink-0 text-xs"
                    >
                      Ingresar
                    </button>
                  </div>
                )}

                {/* Selector de Modalidad de Pago */}
                <div className="space-y-2">
                  <p className="text-xs font-extrabold text-slate-800">
                    Elige cómo deseas pagar:
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectPaymentMethod("PAGO_EN_CAJA_PRESENCIAL")}
                      className={`text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                        !isOnlinePayment
                          ? "bg-[#F3FAF6] border-[#008446] ring-1 ring-[#008446]/25"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          !isOnlinePayment
                            ? "bg-[#008446] text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Coins className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-extrabold text-slate-900">
                          Pagar en botica al recoger
                        </p>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                          Reserva ahora y paga en caja (efectivo o tarjeta) al retirar.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectPaymentMethod("PAGO_ONLINE")}
                      className={`text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                        isOnlinePayment
                          ? "bg-[#F3FAF6] border-[#008446] ring-1 ring-[#008446]/25"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isOnlinePayment
                            ? "bg-[#008446] text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-extrabold text-slate-900">
                          Pagar online y recoger en botica
                        </p>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                          Paga con tarjeta o Yape ahora y retira directo sin cola en caja.
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Formulario de Pago Online */}
                  {isOnlinePayment && (
                    <div className="p-3.5 bg-[#F6F8F7] border border-slate-200 rounded-xl space-y-3 animate-fade-in">
                      <div className="grid grid-cols-2 gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setOnlineMethod("CARD");
                            setFormError("");
                          }}
                          className={`py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                            onlineMethod === "CARD"
                              ? "bg-[#008446] text-white"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Tarjeta</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOnlineMethod("YAPE");
                            setFormError("");
                          }}
                          className={`py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                            onlineMethod === "YAPE"
                              ? "bg-[#742284] text-white"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Yape</span>
                        </button>
                      </div>

                      {onlineMethod === "CARD" ? (
                        <div className="space-y-2.5 text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Número de tarjeta
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="4242 4242 4242 4242"
                              value={cardNumber}
                              onChange={(e) => {
                                setCardNumber(formatCardInput(e.target.value));
                                setFormError("");
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-[#008446] rounded-lg outline-none font-mono text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Titular de la tarjeta
                            </label>
                            <input
                              type="text"
                              placeholder="Nombre como figura en la tarjeta"
                              value={cardHolder}
                              onChange={(e) => {
                                setCardHolder(e.target.value);
                                setFormError("");
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-[#008446] rounded-lg outline-none text-xs"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Mes (MM)
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={2}
                                placeholder="12"
                                value={expMonth}
                                onChange={(e) => {
                                  setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2));
                                  setFormError("");
                                }}
                                className="w-full px-2.5 py-2 bg-white border border-slate-200 focus:border-[#008446] rounded-lg outline-none text-center font-mono text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Año (AA)
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="2028"
                                value={expYear}
                                onChange={(e) => {
                                  setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4));
                                  setFormError("");
                                }}
                                className="w-full px-2.5 py-2 bg-white border border-slate-200 focus:border-[#008446] rounded-lg outline-none text-center font-mono text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                CVV
                              </label>
                              <input
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="123"
                                value={cvv}
                                onChange={(e) => {
                                  setCvv(e.target.value.replace(/\D/g, "").slice(0, 4));
                                  setFormError("");
                                }}
                                className="w-full px-2.5 py-2 bg-white border border-slate-200 focus:border-[#008446] rounded-lg outline-none text-center font-mono text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5 text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Celular afiliado a Yape
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={9}
                              placeholder="999888777"
                              value={yapePhone}
                              onChange={(e) => {
                                setYapePhone(e.target.value.replace(/\D/g, "").slice(0, 9));
                                setFormError("");
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-[#742284] rounded-lg outline-none font-mono text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Código de aprobación Yape (6 dígitos)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="123456"
                              value={yapeCode}
                              onChange={(e) => {
                                setYapeCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                                setFormError("");
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-[#742284] rounded-lg outline-none font-mono text-xs tracking-widest"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
                        <Lock className="w-3 h-3 text-[#008446] shrink-0" />
                        <span>Pago cifrado y verificación inmediata antes de confirmar.</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Pie fijo con Totales y Botón de Confirmar */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-[#F6F8F7] space-y-3 shrink-0">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal productos:</span>
                  <span>S/ {totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Costo de retiro:</span>
                  <span className="text-emerald-700 font-bold">¡Gratis (S/ 0.00)!</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>
                    {isOnlinePayment ? "Total a pagar online:" : "Total a pagar en botica:"}
                  </span>
                  <span className="text-[#007A43]">S/ {totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmCheckout}
                disabled={isProcessing}
                className="w-full py-3.5 px-4 bg-[#007A43] hover:bg-[#006437] active:scale-[0.99] text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-inkafarma-yellow" />
                    <span>
                      {isOnlinePayment ? "Procesando pago..." : "Confirmando tu reserva..."}
                    </span>
                  </>
                ) : !user ? (
                  <>
                    <span>Inicia Sesión para Continuar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : isOnlinePayment ? (
                  <>
                    <span>Pagar S/ {totalAmount.toFixed(2)} y Retirar en Botica</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Confirmar Reserva (Pagar en Botica)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-[#008446]" />
                <span>Stock verificado antes de procesar tu pedido</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
