import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { removeFromCart, updateQuantity, updateItemPrice } from '../store/cartSlice';
import { FaTrash, FaMinus, FaPlus } from 'react-icons/fa';

export default function Cart({ onCheckout }) {
  const dispatch = useDispatch();
  const items = useSelector(s => s.cart.items);
  const products = useSelector(s => s.products.items);

  const [localQuantities, setLocalQuantities] = useState({});
  const [localPrices, setLocalPrices] = useState({});

  useEffect(() => {
    const qtySynced = {};
    const priceSynced = {};
    items.forEach(item => {
      const displayQty = item.quantity;
      qtySynced[item.productId] = displayQty.toString();
      priceSynced[item.productId] = item.price.toFixed(2);
    });
    setLocalQuantities(prev => ({ ...prev, ...qtySynced }));
    setLocalPrices(prev => ({ ...prev, ...priceSynced }));
  }, [items]);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const getProductImage = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.image || null;
  };

  const handleQuantityInputChange = (productId, value) => {
    setLocalQuantities(prev => ({ ...prev, [productId]: value }));
  };

  const commitQuantity = (productId, rawValue) => {
    const item = items.find(i => i.productId === productId);
    if (!item) return;
    const displayValue = parseFloat(rawValue);
    if (isNaN(displayValue) || displayValue <= 0) {
      setLocalQuantities(prev => ({ ...prev, [productId]: item.quantity.toString() }));
      return;
    }
    dispatch(updateQuantity({ productId, quantity: item.unitType === 'unit' ? Math.floor(displayValue) : displayValue }));
  };

  const handleQuantityBlur = (productId) => {
    const raw = localQuantities[productId];
    if (raw !== undefined) commitQuantity(productId, raw);
  };

  const handleQuantityKeyDown = (e, productId) => {
    if (e.key === 'Enter') e.target.blur();
  };

  const handleDecrement = (item) => {
    const step = item.unitType === 'kg' ? 0.1 : 1;
    const newQty = Math.max(0, item.quantity - step);
    if (newQty <= 0) dispatch(removeFromCart(item.productId));
    else dispatch(updateQuantity({ productId: item.productId, quantity: newQty }));
  };

  const handleIncrement = (item) => {
    const step = item.unitType === 'kg' ? 0.1 : 1;
    dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity + step }));
  };

  const handlePriceInputChange = (productId, value) => {
    setLocalPrices(prev => ({ ...prev, [productId]: value }));
  };

  const commitPrice = (productId, rawValue) => {
    const newPrice = parseFloat(rawValue);
    if (!isNaN(newPrice) && newPrice > 0) {
      dispatch(updateItemPrice({ productId, price: newPrice }));
    } else {
      const item = items.find(i => i.productId === productId);
      if (item) setLocalPrices(prev => ({ ...prev, [productId]: item.price.toFixed(2) }));
    }
  };

  const handlePriceBlur = (productId) => {
    const raw = localPrices[productId];
    if (raw !== undefined) commitPrice(productId, raw);
  };

  const handlePriceKeyDown = (e, productId) => {
    if (e.key === 'Enter') e.target.blur();
  };

  // Render items in reverse order (newest first)
  const displayedItems = [...items].reverse();

  return (
    <>
      <div className="flex-1 p-3 overflow-auto">
        <h3 className="text-[#2ecc71] font-bold mb-2">Cart</h3>
        {displayedItems.length === 0 && <p className="text-[#888] text-sm">No items</p>}
        {displayedItems.map(item => {
          const imgUrl = getProductImage(item.productId);
          const displayQty = localQuantities[item.productId] ?? item.quantity.toString();
          const displayPrice = localPrices[item.productId] ?? item.price.toFixed(2);
          const unitLabel = item.unitType === 'kg' ? 'kg' : '';

          return (
            <div key={item.productId} className="flex justify-between items-center mb-2 bg-[#111] p-2 rounded gap-2">
              {imgUrl ? (
                <img src={imgUrl} alt={item.name} crossOrigin="anonymous"
                  className="w-10 h-10 object-cover rounded border border-[#2ecc71]/30 shrink-0"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentNode.insertAdjacentHTML('afterbegin',
                      '<div class="w-10 h-10 bg-[#222] rounded border border-[#333] shrink-0 flex items-center justify-center text-[10px] text-[#555]">N/A</div>');
                  }} />
              ) : (
                <div className="w-10 h-10 bg-[#222] rounded border border-[#333] shrink-0 flex items-center justify-center text-[10px] text-[#555]">N/A</div>
              )}
              <div className="flex-1 text-sm min-w-0">
                <p className="text-[#ddd] truncate">{item.name}</p>
                <div className="flex items-center gap-1 mt-1">
                  <button onClick={() => handleDecrement(item)} className="text-[#2ecc71] p-0.5"><FaMinus size={10} /></button>
                  <input
                    type="number"
                    step={item.unitType === 'kg' ? '0.1' : '1'}
                    min="0"
                    value={displayQty}
                    onChange={(e) => handleQuantityInputChange(item.productId, e.target.value)}
                    onBlur={() => handleQuantityBlur(item.productId)}
                    onKeyDown={(e) => handleQuantityKeyDown(e, item.productId)}
                    className="w-16 bg-[#1c1c1e] border border-[#333] text-white text-center text-xs py-0.5 rounded outline-none focus:border-[#2ecc71]"
                  />
                  <button onClick={() => handleIncrement(item)} className="text-[#2ecc71] p-0.5"><FaPlus size={10} /></button>
                  {unitLabel && <span className="text-amber-400 text-xs ml-1">{unitLabel}</span>}
                </div>
              </div>
              <div className="text-right ml-2 shrink-0">
                <div className="flex items-center gap-1">
                  <span className="text-[#aaa] text-xs">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={displayPrice}
                    onChange={(e) => handlePriceInputChange(item.productId, e.target.value)}
                    onBlur={() => handlePriceBlur(item.productId)}
                    onKeyDown={(e) => handlePriceKeyDown(e, item.productId)}
                    className="w-16 bg-[#1c1c1e] border border-[#333] text-white text-center text-xs py-0.5 rounded outline-none focus:border-[#2ecc71]"
                  />
                </div>
                <p className="text-[#2ecc71] text-sm mt-1">₹{(item.price * item.quantity).toFixed(2)}</p>
                <button onClick={() => dispatch(removeFromCart(item.productId))} className="text-[#e74c3c] mt-1"><FaTrash size={12} /></button>
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
          <button onClick={onCheckout} className="w-full py-2 bg-[#0d4f2b] text-[#2ecc71] border border-[#2ecc71] rounded font-bold">
            Checkout
          </button>
        </div>
      )}
    </>
  );
}