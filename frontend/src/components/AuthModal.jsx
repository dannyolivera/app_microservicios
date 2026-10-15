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
      setErrorMessage(err.message || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-emerald-100 overflow-hidden animate-fade-in">
        {/* Cabecera con degradado Inkafarma */}
        <div className="p-6 bg-gradient-to-r from-inkafarma-green to-inkafarma-greenDark text-white relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <img
              src="/inkafarma-logo.png"
              alt="Inkafarma"
              className="h-8 w-auto brightness-0 invert"
            />
          </div>
          <p className="text-xs text-emerald-100">
            {isRegister
              ? "Crea tu cuenta de cliente para gestionar pedidos y recetas médicas"
              : "Ingresa tus credenciales para continuar tu compra farmacéutica"}
          </p>
        </div>

        {/* Pestañas Login / Registro */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => { setIsRegister(false); setErrorMessage(""); }}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${
              !isRegister
                ? "text-inkafarma-green border-b-2 border-inkafarma-green bg-white"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => { setIsRegister(true); setErrorMessage(""); }}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${
              isRegister
                ? "text-inkafarma-green border-b-2 border-inkafarma-green bg-white"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-inkafarma-red flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-inkafarma-red mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Botón de datos de prueba */}
          <button
            type="button"
            onClick={handleFillDemo}
            className="w-full py-2 px-3 bg-yellow-50 hover:bg-yellow-100 border border-inkafarma-yellow text-slate-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Rellenar datos de prueba para demostración</span>
          </button>

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre y Apellidos completos
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="Ej. Carlos Gomez"
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
              <Mail className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                name="email"
                required
                placeholder="ejemplo@farmacia.com"
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
              <Lock className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
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
                  Dirección de Envío (Opcional)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="address"
                    placeholder="Av. Larco 1234, Lima"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-inkafarma-green"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teléfono / Celular (Opcional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="phone"
                    placeholder="+51 912345678"
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
            className="w-full py-3 px-4 bg-inkafarma-green hover:bg-inkafarma-greenHover text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-inkafarma-yellow" />
                <span>Conectando con Microservicio de Usuarios (:8002)...</span>
              </>
            ) : isRegister ? (
              <span>Registrar Cuenta</span>
            ) : (
              <span>Entrar a mi Cuenta</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
