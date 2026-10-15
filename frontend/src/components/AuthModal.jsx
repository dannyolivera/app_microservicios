import React, { useState } from "react";
import { X, Lock, Mail, User, MapPin, Phone, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { loginUser, registerUser } from "../services/api";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    address: "",
    phone: "",
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage("");
  };

  const handleFillDemo = () => {
    setFormData({
      email: "carlos.gomez@gmail.com",
      password: "miPasswordSeguro123",
      full_name: "Carlos Gomez",
      address: "Av. Larco 1234, Miraflores, Lima",
      phone: "+51 912345678",
    });
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      if (isRegister) {
        await registerUser({
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
        });

        const authResult = await loginUser(formData.email, formData.password);
        onAuthSuccess(authResult.user, authResult.access_token);
        onClose();
      } else {
        const authResult = await loginUser(formData.email, formData.password);
        onAuthSuccess(authResult.user, authResult.access_token);
        onClose();
      }
    } catch (err) {
      setErrorMessage(err.message || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-fade-in">
        {/* Cabecera Limpia */}
        <div className="p-6 bg-gradient-to-r from-inkafarma-green to-inkafarma-greenDark text-white relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <img
            src="/inkafarma-logo.png"
            alt="Inkafarma"
            className="h-8 w-auto brightness-0 invert mb-2"
          />
          <h3 className="text-lg font-black tracking-tight">
            {isRegister ? "Crea tu cuenta de cliente" : "Te damos la bienvenida"}
          </h3>
          <p className="text-xs text-emerald-100 mt-0.5">
            {isRegister
              ? "Ingresa tus datos para registrar tus pedidos y recetas"
              : "Inicia sesión para continuar con tu compra farmacéutica"}
          </p>
        </div>

        {/* Pestañas Login / Registro */}
        <div className="flex border-b border-slate-100 bg-slate-50/80">
          <button
            onClick={() => { setIsRegister(false); setErrorMessage(""); }}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${
              !isRegister
                ? "text-inkafarma-green border-b-2 border-inkafarma-green bg-white"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => { setIsRegister(true); setErrorMessage(""); }}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${
              isRegister
                ? "text-inkafarma-green border-b-2 border-inkafarma-green bg-white"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            Registrarme
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-inkafarma-red flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-inkafarma-red mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre y Apellidos completos
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="Ej. Juan Pérez García"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-inkafarma-green"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                name="email"
                required
                placeholder="tu.correo@ejemplo.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-inkafarma-green"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-inkafarma-green"
              />
            </div>
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dirección de Entrega
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="address"
                    placeholder="Av. Javier Prado 1234, Lima"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-inkafarma-green"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teléfono / Celular
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="phone"
                    placeholder="998 765 432"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-inkafarma-green"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-inkafarma-green hover:bg-inkafarma-greenHover text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 mt-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-inkafarma-yellow" />
                <span>Ingresando...</span>
              </>
            ) : isRegister ? (
              <span>Registrar mi cuenta</span>
            ) : (
              <span>Iniciar Sesión</span>
            )}
          </button>

          {/* Relleno rápido como ayuda sutil */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-[11px] text-slate-400 hover:text-emerald-700 font-medium inline-flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-inkafarma-yellow" />
              <span>Usar cuenta de prueba para demostración</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
