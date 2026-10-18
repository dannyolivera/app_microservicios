import React, { useState } from "react";
import { Plus, Minus, ShoppingCart, Check, Pill, ShieldCheck, Heart } from "lucide-react";

export default function ProductCard({ product, categoryName, onAddToCart }) {
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const price = Number(product.price).toFixed(2);
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
    <div className="bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-300 hover:shadow-lg transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between group relative">
      {/* Botón de favorito sutil */}
      <button
        onClick={() => setIsFavorite(!isFavorite)}
        className="absolute top-3.5 right-3.5 z-10 p-1.5 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
        title="Guardar en favoritos"
      >
        <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
      </button>

      <div>
        {/* Ilustración / Presentación visual del medicamento */}
        <div className="w-full h-36 sm:h-40 bg-gradient-to-b from-slate-50 to-slate-100/60 rounded-xl mb-3.5 flex items-center justify-center relative overflow-hidden group-hover:from-emerald-50/40 group-hover:to-slate-50 transition-colors">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-xs border border-slate-100 flex items-center justify-center text-inkafarma-green group-hover:scale-110 transition-transform duration-300">
            <Pill className="w-8 h-8 stroke-[1.8]" />
          </div>

          {/* Badge de disponibilidad en botica */}
          {isOutOfStock ? (
            <span className="absolute bottom-2.5 left-2.5 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
              Agotado en Botica
            </span>
          ) : isLowStock ? (
            <span className="absolute bottom-2.5 left-2.5 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
              Últimas {product.stock} un. en botica
            </span>
          ) : (
            <span className="absolute bottom-2.5 left-2.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> Stock en Botica ({product.stock})
            </span>
          )}
        </div>

        {/* Categoría */}
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 truncate">
          {categoryName || "Medicamento de Farmacia"}
        </p>

        {/* Nombre del Producto */}
        <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-inkafarma-green transition-colors">
          {product.name}
        </h3>

        {/* Descripción / Principio activo */}
        <p className="text-xs text-slate-500 line-clamp-2 mt-1 mb-3 leading-relaxed">
          {product.description || "Fórmula farmacéutica garantizada para alivio y bienestar."}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-100 mt-auto">
        {/* Precio */}
        <div className="mb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-slate-500">S/</span>
            <span className="text-2xl font-black text-slate-900 tracking-tight">{price}</span>
          </div>
          <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
            <ShieldCheck className="w-3 h-3 text-inkafarma-green" />
            Pagas en botica al retirar (Efectivo o Tarjeta)
          </p>
        </div>

        {/* Selector de cantidad y Botón de Compra */}
        <div className="flex items-center gap-2">
          {/* Contador numérico */}
          <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
            <button
              onClick={handleDecrement}
              disabled={quantity <= 1 || isOutOfStock}
              className="p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Disminuir"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-7 text-center text-xs font-bold text-slate-800 select-none">
              {quantity}
            </span>
            <button
              onClick={handleIncrement}
              disabled={quantity >= product.stock || isOutOfStock}
              className="p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Aumentar"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Botón Agregar a la Reserva */}
          <button
            onClick={handleAdd}
            disabled={isOutOfStock}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
              isOutOfStock
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : isAdded
                ? "bg-inkafarma-greenDark text-white"
                : "bg-inkafarma-green hover:bg-inkafarma-greenHover text-white active:scale-95 shadow-emerald-600/20"
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" /> ¡Agregado!
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" /> {isOutOfStock ? "Agotado" : "Agregar"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
