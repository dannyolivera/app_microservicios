import React, { useState } from "react";
import { Plus, Minus, ShoppingCart, Check, Pill, Sun, ShieldPlus } from "lucide-react";

function CategoryIcon({ categoryName = "", className = "" }) {
  const normalized = categoryName.toLowerCase();
  if (normalized.includes("cuidado") || normalized.includes("dermo")) {
    return <Sun className={className} />;
  }
  if (normalized.includes("vitamina") || normalized.includes("suplemento")) {
    return <ShieldPlus className={className} />;
  }
  return <Pill className={className} />;
}

export default function ProductCard({ product, categoryName, onAddToCart }) {
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const price = Number(product.price).toFixed(2);
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const effectiveQuantity = isOutOfStock ? 1 : Math.min(quantity, product.stock);

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart(product, effectiveQuantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1200);
  };

  const handleIncrement = () => {
    if (effectiveQuantity < product.stock) {
      setQuantity(effectiveQuantity + 1);
    }
  };

  const handleDecrement = () => {
    if (effectiveQuantity > 1) {
      setQuantity(effectiveQuantity - 1);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-[#008446]/45 hover:shadow-lg transition-all duration-200 p-4 flex flex-col justify-between group">
      <div>
        {/* Área visual del producto estilo farmacia */}
        <div className="w-full h-36 bg-[#F6F8F7] rounded-xl mb-3 flex items-center justify-center relative border border-slate-100 group-hover:bg-[#F1F8F4] transition-colors">
          {/* Badge de stock en esquina superior izquierda */}
          {isOutOfStock ? (
            <span className="absolute top-2.5 left-2.5 bg-[#E30613] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-md tracking-wide">
              AGOTADO
            </span>
          ) : isLowStock ? (
            <span className="absolute top-2.5 left-2.5 bg-amber-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-md tracking-wide">
              ÚLTIMAS {product.stock} UN.
            </span>
          ) : (
            <span className="absolute top-2.5 left-2.5 bg-[#008446] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-md tracking-wide">
              EN STOCK ({product.stock})
            </span>
          )}

          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-[#008446] group-hover:scale-105 transition-transform duration-300">
            <CategoryIcon categoryName={categoryName} className="w-7 h-7 stroke-[1.8]" />
          </div>
        </div>

        {/* Categoría */}
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">
          {categoryName || "Producto farmacéutico"}
        </p>

        {/* Nombre del Producto */}
        <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-[#008446] transition-colors">
          {product.name}
        </h3>

        {/* Descripción */}
        <p className="text-xs text-slate-500 line-clamp-2 mt-1 min-h-[2rem] leading-relaxed">
          {product.description || "Producto certificado disponible para retiro en botica."}
        </p>

        {/* Estado real de disponibilidad */}
        <p
          className={`text-[11px] font-semibold mt-2 ${
            isOutOfStock ? "text-[#E30613]" : "text-[#008446]"
          }`}
        >
          {isOutOfStock ? "Sin unidades disponibles" : "Disponible para retiro en botica"}
        </p>
      </div>

      {/* Bloque de precio y acción */}
      <div className="pt-3 mt-3 border-t border-slate-100 space-y-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xl font-black text-[#007A43] tracking-tight">
            S/ {price}
          </span>
          <span className="text-[10px] font-medium text-slate-400">
            Online o en caja
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Stepper compacto */}
          <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={effectiveQuantity <= 1 || isOutOfStock}
              className="p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Disminuir cantidad"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-7 text-center text-xs font-bold text-slate-800 select-none">
              {effectiveQuantity}
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={effectiveQuantity >= product.stock || isOutOfStock}
              className="p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Aumentar cantidad"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Botón Agregar */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={isOutOfStock}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              isOutOfStock
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : isAdded
                ? "bg-[#005E32] text-white"
                : "bg-[#007A43] hover:bg-[#006437] text-white active:scale-95"
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Agregado</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{isOutOfStock ? "Agotado" : "Agregar"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
