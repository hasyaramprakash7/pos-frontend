import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateProduct } from '../store/productsSlice';
import { FaExclamationTriangle } from 'react-icons/fa';

export default function LowStockAlerts() {
    const dispatch = useDispatch();
    const lowStockProducts = useSelector(s => s.products.lowStockProducts);
    const theme = useSelector(s => s.settings.theme);
    const isLight = theme === 'light';

    // Local state to hold edited stock values (keyed by product id)
    const [editValues, setEditValues] = useState({});

    const handleInputChange = (productId, value) => {
        setEditValues(prev => ({ ...prev, [productId]: value }));
    };

    const handleRestock = (product) => {
        const rawValue = editValues[product.id];
        if (rawValue === undefined || rawValue === '') return;

        const newStock = parseFloat(rawValue);
        if (isNaN(newStock) || newStock < 0) return;

        // Dispatch the update – the slice will recompute lowStock automatically
        dispatch(updateProduct({ ...product, stock: newStock }));

        // Clear the local edit for this product so the input resets to the new stock
        setEditValues(prev => {
            const next = { ...prev };
            delete next[product.id];
            return next;
        });
    };

    return (
        <div className={`h-full overflow-y-auto p-4 md:p-6 font-mono ${isLight ? 'bg-gray-50 text-gray-800' : 'bg-[#0a0a0a] text-white'
            }`}>
            <h2 className="text-xl md:text-2xl font-bold mb-2 flex items-center gap-2 text-[#e74c3c]">
                <FaExclamationTriangle /> Low Stock Alerts
            </h2>
            <p className={`text-xs mb-6 ${isLight ? 'text-gray-500' : 'text-[#555]'}`}>
                Products with stock ≤ 5 units (or 5 kg). Restock them directly here.
            </p>

            {lowStockProducts.length === 0 ? (
                <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-[#888]'}`}>
                    ✅ All products are well‑stocked.
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {lowStockProducts.map(product => {
                        // Show current typed value or the actual stock
                        const inputValue = editValues[product.id] ?? product.stock.toString();
                        return (
                            <div
                                key={product.id}
                                className={`border rounded-xl p-4 flex items-center gap-3 ${isLight
                                        ? 'bg-white border-red-200'
                                        : 'bg-[#111] border-[#e74c3c]/30'
                                    }`}
                            >
                                {/* Product info on the left */}
                                <div className="flex-1 min-w-0 text-sm">
                                    <p className="font-bold truncate">{product.name}</p>
                                    <p className="text-[#2ecc71]">₹{product.price?.toFixed(2)}</p>

                                    {/* Restock row */}
                                    <div className="flex items-center gap-1 mt-2">
                                        <span className="text-xs text-[#aaa]">Stock:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step={product.unitType === 'kg' ? '0.1' : '1'}
                                            value={inputValue}
                                            onChange={(e) => handleInputChange(product.id, e.target.value)}
                                            className={`w-14 bg-transparent border-b text-center text-xs font-bold outline-none ${product.stock <= 0 ? 'text-[#e74c3c] border-[#e74c3c]' : 'text-amber-500 border-amber-500'
                                                }`}
                                        />
                                        <span className="text-xs text-[#666]">
                                            {product.unitType === 'kg' ? 'kg' : 'units'}
                                        </span>
                                        <button
                                            onClick={() => handleRestock(product)}
                                            className="ml-1 text-xs bg-[#2ecc71] hover:bg-green-400 text-black px-2 py-0.5 rounded font-bold transition"
                                        >
                                            OK
                                        </button>
                                    </div>

                                    {product.stock <= 0 && (
                                        <span className="inline-block mt-1 text-xs bg-red-600 text-white px-2 py-0.5 rounded">
                                            OUT OF STOCK
                                        </span>
                                    )}
                                </div>

                                {/* Image on the right */}
                                {product.image ? (
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        crossOrigin="anonymous"
                                        className="w-12 h-12 object-cover rounded border border-gray-200 shrink-0"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-red-500 shrink-0">
                                        N/A
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}