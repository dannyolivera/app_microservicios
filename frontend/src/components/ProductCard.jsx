import React, { useState } from "react";
import { Plus, Minus, ShoppingBag, Check, AlertTriangle } from "lucide-react";

export default function ProductCard({ product, categoryName, onAddToCart }) {
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const priceFormatted = Number(product.price).toFixed(2);
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart(product, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1200);
  };

  const handleIncrement = () => {
    if (quantity < product.stock) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200 p-5 flex flex-col justify-between group">
      <div>
        {/* Cabecera de la tarjeta: Categoría y Estado de Stock */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-semibold text-inka-blue bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
            {categoryName || `Cat #${product.category_id}`}
          </span>

          {isOutOfStock ? (
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Agotado
            </span>
          ) : isLowStock ? (
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
              Últimas {product.stock} un.
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Stock: {product.stock} un.
            </span>
          )}
        </div>

        {/* Nombre del Producto */}
        <h3 className="font-bold text-slate-800 text-base leading-snug group-hover:text-inka-blue transition-colors mb-1">
          {product.name}
        </h3>

        {/* Descripción del principio activo */}
        <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
          {product.description || "Producto farmacéutico verificado para el cuidado y salud personal."}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-100">
        {/* Precio */}
        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-xs font-bold text-slate-500">S/</span>
          <span className="text-2xl font-black text-slate-900">{priceFormatted}</span>
          <span className="text-[10px] text-slate-400 font-medium ml-1">por unidad</span>
        </div>

        {/* Controles de Compra */}
        <div className="flex items-center gap-2">
          {/* Selector de cantidad */}
          <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
            <button
              onClick={handleDecrement}
              disabled={quantity <= 1 || isOutOfStock}
              className="p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-xs font-bold text-slate-800">
              {quantity}
            </span>
            <button
              onClick={handleIncrement}
              disabled={quantity >= product.stock || isOutOfStock}
              className="p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Botón Añadir al Carrito */}
          <button
            onClick={handleAdd}
            disabled={isOutOfStock}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
              isOutOfStock
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : isAdded
                ? "bg-emerald-600 text-white"
                : "bg-inka-blue hover:bg-inka-lightBlue text-white active:scale-95"
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-3.5 h-3.5" /> Agregado
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" /> {isOutOfStock ? "Sin Stock" : "Agregar"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
