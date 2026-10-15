import React, { useState } from "react";
import { X, Lock, Mail, User, MapPin, Phone, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { loginUser, registerUser } from "../services/api";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Datos del formulario
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
        // Registro en Microservicio de Usuarios (8002)
        await registerUser({
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
        });

        // Login automático tras registrarse
        const authResult = await loginUser(formData.email, formData.password);
        onAuthSuccess(authResult.user, authResult.access_token);
        onClose();
      } else {
        // Inicio de sesión en Microservicio de Usuarios (8002)
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
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-fade-in">
        {/* Cabecera del modal */}
        <div className="p-6 bg-gradient-to-r from-inka-blue to-inka-lightBlue text-white relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-inka-yellow font-black text-xl">Inka</span>
            <span className="font-black text-xl">Pharmacy ID</span>
          </div>
          <p className="text-xs text-blue-100">
            {isRegister
              ? "Crea tu cuenta de cliente para gestionar pedidos y recetas"
              : "Ingresa tus credenciales para continuar tu compra"}
          </p>
        </div>

        {/* Pestañas Login / Registro */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => { setIsRegister(false); setErrorMessage(""); }}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${
              !isRegister
                ? "text-inka-blue border-b-2 border-inka-blue bg-white"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => { setIsRegister(true); setErrorMessage(""); }}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${
              isRegister
                ? "text-inka-blue border-b-2 border-inka-blue bg-white"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Botón de ayuda para evaluación académica rápida */}
          <button
            type="button"
            onClick={handleFillDemo}
            className="w-full py-1.5 px-3 bg-yellow-50 hover:bg-yellow-100 border border-inka-yellow text-slate-800 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
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
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="Ej. Carlos Gomez"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-inka-blue"
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
                placeholder="ejemplo@farmacia.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-inka-blue"
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
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-inka-blue"
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
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="address"
                    placeholder="Av. Larco 1234, Lima"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-inka-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teléfono / Celular (Opcional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="phone"
                    placeholder="+51 912345678"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-inka-blue"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-inka-blue hover:bg-inka-lightBlue text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
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
