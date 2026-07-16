import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { removeFromCart, updateQuantity } from '../store/cartSlice';
import { FaTrash, FaMinus, FaPlus } from 'react-icons/fa';

export default function Cart({ onCheckout }) {
  const dispatch = useDispatch();
  const items = useSelector(s => s.cart.items);
  const products = useSelector(s => s.products.items);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Local state for editing – synchronized with Redux
  const [localQuantities, setLocalQuantities] = useState({});

  // Whenever items change (scan, manual add), update local values
  useEffect(() => {
    const synced = {};
    items.forEach(item => {
      // Keep existing local value only if it's not in sync
      synced[item.productId] = item.quantity.toString();
    });
    setLocalQuantities(prev => ({ ...prev, ...synced }));
  }, [items]);

  const getProductImage = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.image || null;
  };

  const handleInputChange = (productId, value) => {
    // Just update local state
    setLocalQuantities(prev => ({ ...prev, [productId]: value }));
  };

  const commitQuantity = (productId, rawValue) => {
    const qty = parseFloat(rawValue);
    if (isNaN(qty) || qty <= 0) {
      // Reset to current Redux value
      const item = items.find(i => i.productId === productId);
      const reset = item ? item.quantity : 1;
      setLocalQuantities(prev => ({ ...prev, [productId]: reset.toString() }));
      dispatch(updateQuantity({ productId, quantity: reset }));
    } else {
      dispatch(updateQuantity({ productId, quantity: qty }));
      // Local value already correct after dispatch, but we can update just in case
      setLocalQuantities(prev => ({ ...prev, [productId]: qty.toString() }));
    }
  };

  const handleBlur = (productId) => {
    const raw = localQuantities[productId];
    if (raw !== undefined) commitQuantity(productId, raw);
  };

  const handleKeyDown = (e, productId) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  // +/- buttons
  const handleDecrement = (item) => {
    const step = item.unitType === 'kg' ? 0.1 : 1;
    const newQty = Math.max(0, item.quantity - step);
    if (newQty <= 0) {
      dispatch(removeFromCart(item.productId));
    } else {
      dispatch(updateQuantity({ productId: item.productId, quantity: newQty }));
    }
  };

  const handleIncrement = (item) => {
    const step = item.unitType === 'kg' ? 0.1 : 1;
    const newQty = item.quantity + step;
    dispatch(updateQuantity({ productId: item.productId, quantity: newQty }));
  };

  return (
    <>
      <div className="flex-1 p-3 overflow-auto">
        <h3 className="text-[#2ecc71] font-bold mb-2">Cart</h3>
        {items.length === 0 && <p className="text-[#888] text-sm">No items</p>}
        {items.map(item => {
          const imgUrl = getProductImage(item.productId);
          const displayQty = localQuantities[item.productId] ?? item.quantity.toString();

          return (
            <div key={item.productId} className="flex justify-between items-center mb-2 bg-[#111] p-2 rounded gap-2">
              {imgUrl ? (
                <img
                  src={imgUrl}
                  alt={item.name}
                  crossOrigin="anonymous"
                  className="w-10 h-10 object-cover rounded border border-[#2ecc71]/30 shrink-0"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentNode.insertAdjacentHTML(
                      'afterbegin',
                      '<div class="w-10 h-10 bg-[#222] rounded border border-[#333] shrink-0 flex items-center justify-center text-[10px] text-[#555]">N/A</div>'
                    );
                  }}
                />
              ) : (
                <div className="w-10 h-10 bg-[#222] rounded border border-[#333] shrink-0 flex items-center justify-center text-[10px] text-[#555]">
                  N/A
                </div>
              )}

              <div className="flex-1 text-sm min-w-0">
                <p className="text-[#ddd] truncate">
                  {item.name}
                  {item.unitType === 'kg' && (
                    <span className="text-amber-400 text-xs ml-1">({item.quantity.toFixed(3)} kg)</span>
                  )}
                </p>

                <div className="flex items-center gap-1 mt-1">
                  <button onClick={() => handleDecrement(item)} className="text-[#2ecc71] p-0.5">
                    <FaMinus size={10} />
                  </button>

                  <input
                    type="number"
                    step={item.unitType === 'kg' ? 0.001 : 1}
                    min={0}
                    value={displayQty}
                    onChange={(e) => handleInputChange(item.productId, e.target.value)}
                    onBlur={() => handleBlur(item.productId)}
                    onKeyDown={(e) => handleKeyDown(e, item.productId)}
                    className="w-14 bg-[#1c1c1e] border border-[#333] text-white text-center text-xs py-0.5 rounded outline-none focus:border-[#2ecc71]"
                  />

                  <button onClick={() => handleIncrement(item)} className="text-[#2ecc71] p-0.5">
                    <FaPlus size={10} />
                  </button>
                </div>
              </div>

              <div className="text-right ml-2 shrink-0">
                <p className="text-[#2ecc71] text-sm">₹{(item.price * item.quantity).toFixed(2)}</p>
                <button onClick={() => dispatch(removeFromCart(item.productId))} className="text-[#e74c3c] mt-1">
                  <FaTrash size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {items.length > 0 && (
        <div className="p-3 border-t border-[#0d4f2b]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[#aaa]">Total:</span>
            <span className="text-[#2ecc71] font-bold text-lg">₹{total.toFixed(2)}</span>
          </div>
          <button onClick={onCheckout} className="w-full py-2 bg-[#0d4f2b] text-[#2ecc71] border border-[#2ecc71] rounded font-bold">Checkout</button>
        </div>
      )}
    </>
  );
}