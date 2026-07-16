import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';   // <-- added useSelector
import { addToCart } from '../store/cartSlice';
import { db } from '../utils/database';
import Cart from './Cart';
import Checkout from './Checkout';
import { FaSearch, FaWeightHanging, FaQrcode } from 'react-icons/fa';

export default function SearchBillingInterface() {
  const dispatch = useDispatch();
  const [query, setQuery] = useState('');
  const [qrProducts, setQrProducts] = useState([]);
  const [looseProducts, setLooseProducts] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [weightModalTarget, setWeightModalTarget] = useState(null);
  const [customWeight, setCustomWeight] = useState('1');

  // --- Theme support ---
  const theme = useSelector(s => s.settings.theme);
  const isLight = theme === 'light';

  useEffect(() => {
    const splitInventoryData = async () => {
      const items = await db.products.toArray();
      const searchStr = query.trim().toLowerCase();
      const filtered = searchStr ? items.filter(p => p.name.toLowerCase().includes(searchStr)) : items;
      setQrProducts(filtered.filter(p => p.barcode || p.categoryType === 'QR'));
      setLooseProducts(filtered.filter(p => !p.barcode && p.categoryType !== 'QR'));
    };
    const delayDebounceId = setTimeout(splitInventoryData, 60);
    return () => clearTimeout(delayDebounceId);
  }, [query]);

  const handleProductSelect = (product) => {
    if (product.unitType === 'kg') {
      setCustomWeight('1');
      setWeightModalTarget(product);
    } else {
      dispatch(addToCart({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        unitType: 'unit'
      }));
    }
  };

  const commitWeightItem = () => {
    if (!weightModalTarget) return;
    const qty = parseFloat(customWeight) || 1;
    dispatch(addToCart({
      productId: weightModalTarget.id,
      name: weightModalTarget.name,
      price: weightModalTarget.price,
      quantity: qty,
      unitType: 'kg'
    }));
    setWeightModalTarget(null);
  };

  // Product button that adapts to theme
  const ProductButton = ({ product, unitLabel, unitColor }) => (
    <button
      onClick={() => handleProductSelect(product)}
      className={`p-2 border rounded-xl flex items-center gap-2 transition-all active:scale-95 ${
        isLight
          ? 'bg-white border-gray-200 hover:border-green-400'
          : 'bg-[#0a0a0a] border-[#1c1c1e] hover:border-[#2ecc71]/40'
      }`}
    >
      {/* Image / fallback with initial */}
      {product.image ? (
        <img
          src={product.image}
          alt={product.name}
          crossOrigin="anonymous"
          className="w-10 h-10 object-cover rounded border border-[#2ecc71]/30 shrink-0"
          onError={(e) => {
            e.target.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = `w-10 h-10 rounded flex items-center justify-center text-xs shrink-0 font-bold ${
              isLight ? 'bg-gray-100 text-gray-400' : 'bg-[#222] text-[#555]'
            }`;
            fallback.textContent = product.name.charAt(0).toUpperCase();
            e.target.parentNode.insertBefore(fallback, e.target);
          }}
        />
      ) : (
        <div className={`w-10 h-10 rounded flex items-center justify-center text-xs shrink-0 font-bold ${
          isLight ? 'bg-gray-100 text-gray-400' : 'bg-[#222] text-[#555]'
        }`}>
          {product.name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Name & Price */}
      <div className="flex-1 min-w-0 text-left">
        <span className={`text-xs font-bold block truncate ${
          isLight ? 'text-gray-800' : 'text-white'
        }`}>
          {product.name}
        </span>
        <span className="text-[#2ecc71] text-xs font-semibold">
          ₹{product.price.toFixed(2)}
        </span>
      </div>

      {/* Unit badge */}
      <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${unitColor}`}>
        {unitLabel}
      </span>
    </button>
  );

  return (
    <div className={`flex flex-col h-full w-full overflow-hidden font-mono select-none ${
      isLight ? 'bg-gray-50' : 'bg-black'
    }`}>
      <div className={`h-[60%] p-4 flex flex-col overflow-hidden border-b ${
        isLight ? 'border-gray-200' : 'border-[#141416]'
      }`}>
        <div className="relative mb-3 shrink-0">
          <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
            isLight ? 'text-gray-400' : 'text-[#555]'
          }`}>
            <FaSearch size={14} />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items instantly... (e.g., Onions, Apples)"
            className={`w-full pl-10 pr-4 py-3 border rounded-xl outline-none text-sm transition-all ${
              isLight
                ? 'bg-white border-gray-300 focus:border-green-500 text-gray-800 placeholder-gray-400'
                : 'bg-[#0a0a0a] border-[#222] focus:border-[#2ecc71] text-white placeholder-gray-600'
            }`}
          />
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
          {/* Loose products (KG) */}
          <div className={`flex flex-col overflow-hidden border p-3 rounded-xl ${
            isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-[#111]'
          }`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${
              isLight ? 'text-gray-600' : 'text-[#aaa]'
            }`}>
              <FaWeightHanging className="text-amber-500" /> Loose Assets / Weight Base Products
            </h4>
            <div className="flex-1 overflow-y-auto grid grid-cols-1 gap-2 content-start pr-1 scrollbar-thin">
              {looseProducts.map(p => (
                <ProductButton key={p.id} product={p} unitLabel="KG" unitColor="bg-[#111] text-amber-500" />
              ))}
            </div>
          </div>

          {/* QR products (UNIT) */}
          <div className={`flex flex-col overflow-hidden border p-3 rounded-xl ${
            isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-[#111]'
          }`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${
              isLight ? 'text-gray-600' : 'text-[#aaa]'
            }`}>
              <FaQrcode className="text-[#2ecc71]" /> QR Indexed / Scanning Assets
            </h4>
            <div className="flex-1 overflow-y-auto grid grid-cols-1 gap-2 content-start pr-1 scrollbar-thin">
              {qrProducts.map(p => (
                <ProductButton key={p.id} product={p} unitLabel="UNIT" unitColor="bg-[#111] text-[#2ecc71]" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className={`h-[40%] flex flex-col overflow-hidden ${
        isLight ? 'bg-white' : 'bg-[#050505]'
      }`}>
        <Cart onCheckout={() => setShowCheckout(true)} />
      </div>
      {showCheckout && <Checkout onClose={() => setShowCheckout(false)} />}
      {weightModalTarget && (
        <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
          <div className={`border-amber-500/40 p-5 rounded-2xl w-full max-w-xs text-center ${
            isLight ? 'bg-white' : 'bg-[#0c0c0e]'
          }`}>
            <h3 className={`text-sm font-bold uppercase mb-1 ${
              isLight ? 'text-gray-800' : 'text-white'
            }`}>
              {weightModalTarget.name}
            </h3>
            <p className={`text-xs mb-4 ${isLight ? 'text-gray-600' : 'text-[#555]'}`}>
              Base Rate: ₹{weightModalTarget.price}/kg
            </p>
            <div className={`flex items-center gap-2 mb-4 p-1 rounded-xl border ${
              isLight ? 'bg-gray-100 border-gray-300' : 'bg-black border-[#222]'
            }`}>
              <input
                type="number"
                step="0.001"
                value={customWeight}
                onChange={e => setCustomWeight(e.target.value)}
                className={`w-full bg-transparent text-center font-bold outline-none py-1.5 text-base ${
                  isLight ? 'text-gray-800' : 'text-white'
                }`}
                autoFocus
              />
              <span className="text-xs text-amber-500 font-bold pr-3">KG</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                onClick={() => setWeightModalTarget(null)}
                className={`py-2 rounded-lg border ${
                  isLight
                    ? 'bg-gray-100 text-gray-600 border-gray-300'
                    : 'bg-[#1c1c1e] text-[#aaa] border-[#222]'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={commitWeightItem}
                className="py-2 bg-amber-600 text-white rounded-lg"
              >
                Confirm Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}