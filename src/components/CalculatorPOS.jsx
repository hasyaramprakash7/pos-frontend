import React, { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, clearCart } from '../store/cartSlice';
import { db } from '../utils/database';

const KeypadButton = ({ label, onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`text-base sm:text-lg md:text-xl font-light rounded-full flex items-center justify-center select-none active:scale-95 transition-transform min-h-[38px] md:min-h-[42px] h-full w-full ${className}`}
  >
    {label}
  </button>
);

export default function CalculatorPOS() {
  const dispatch = useDispatch();
  const products = useSelector(s => s.products.items || []);
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState(null);

  const currentValue = useMemo(() => {
    if (!expression) return 0;
    try {
      const sanitized = expression.replace(/[^0-9.+\-*/]/g, '');
      if (!sanitized) return 0;
      const evaluated = new Function(`"use strict"; return (${sanitized})`)();
      return typeof evaluated === 'number' && isFinite(evaluated) ? evaluated : 0;
    } catch { return 0; }
  }, [expression]);

  const matchValue = result !== null ? result : currentValue;

  const matchingProducts = useMemo(() => {
    if (!matchValue) return [];
    return products.filter(p => Math.abs(p.price - matchValue) < 0.01);
  }, [products, matchValue]);

  const handleKeyPress = (value) => {
    setExpression(prev => prev + value);
    setResult(null);
  };

  const handleBackspace = () => {
    setExpression(prev => prev.slice(0, -1));
    setResult(null);
  };

  const handleAllClear = () => {
    dispatch(clearCart());
    setExpression('');
    setResult(null);
  };

  const handleEquals = () => {
    if (!expression) return;
    try {
      const sanitized = expression.replace(/[^0-9.+\-*/]/g, '');
      if (!sanitized) { setExpression(''); setResult(null); return; }
      const evaluated = new Function(`"use strict"; return (${sanitized})`)();
      if (typeof evaluated === 'number' && isFinite(evaluated)) {
        setExpression(evaluated.toString());
        setResult(evaluated);
      }
    } catch { setExpression('Error'); setResult(null); }
  };

  const addProductToCart = (product) => {
    dispatch(addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      unitType: product.unitType || 'unit',
      image: product.image || ''
    }));
    setExpression('');
    setResult(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-black overflow-y-auto overflow-x-hidden p-2 justify-between">
      <div className="min-h-[46px] mb-1 px-1 shrink-0">
        {matchingProducts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#0a0a0a] rounded-lg border border-[#2ecc71]/30 max-h-20 overflow-y-auto">
            {matchingProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addProductToCart(product)}
                className="flex items-center gap-2 bg-[#0d2b1a] hover:bg-[#2ecc71] text-[#2ecc71] hover:text-black text-xs font-medium px-2.5 py-1 rounded-md transition active:scale-95 shrink-0"
              >
                <span className="truncate max-w-[110px] font-mono">{product.name}</span>
                <span className="bg-black/30 px-1 rounded text-[10px]">₹{product.price}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-[20%] min-h-[40px] flex items-end justify-end px-4 pb-1 border-b border-[#111] mb-2 shrink-0 overflow-hidden">
        <span className="text-2xl sm:text-3xl font-light text-white tracking-tight font-mono truncate max-w-full">
          {expression.replace(/\*/g, '×').replace(/\//g, '÷') || '0'}
        </span>
      </div>

      <div className="flex-1 grid grid-cols-4 gap-1.5 p-1 items-center max-w-xs sm:max-w-sm md:max-w-md mx-auto w-full">
        <KeypadButton label="AC" onClick={handleAllClear} className="bg-[#2c2c2e] text-[#ff453a]" />
        <KeypadButton label="⌫" onClick={handleBackspace} className="bg-[#2c2c2e] text-white" />
        <KeypadButton label="%" onClick={() => handleKeyPress('%')} className="bg-[#2c2c2e] text-white" />
        <KeypadButton label="÷" onClick={() => handleKeyPress('/')} className="bg-[#ff9f0a] text-white" />

        <KeypadButton label="7" onClick={() => handleKeyPress('7')} className="bg-[#1c1c1e] text-white" />
        <KeypadButton label="8" onClick={() => handleKeyPress('8')} className="bg-[#1c1c1e] text-white" />
        <KeypadButton label="9" onClick={() => handleKeyPress('9')} className="bg-[#1c1c1e] text-white" />
        <KeypadButton label="×" onClick={() => handleKeyPress('*')} className="bg-[#ff9f0a] text-white" />

        <KeypadButton label="4" onClick={() => handleKeyPress('4')} className="bg-[#1c1c1e] text-white" />
        <KeypadButton label="5" onClick={() => handleKeyPress('5')} className="bg-[#1c1c1e] text-white" />
        <KeypadButton label="6" onClick={() => handleKeyPress('6')} className="bg-[#1c1c1e] text-white" />
        <KeypadButton label="−" onClick={() => handleKeyPress('-')} className="bg-[#ff9f0a] text-white" />

        <KeypadButton label="1" onClick={() => handleKeyPress('1')} className="bg-[#1c1c1e] text-white" />
        <KeypadButton label="2" onClick={() => handleKeyPress('2')} className="bg-[#1c1c1e] text-white" />
        <KeypadButton label="3" onClick={() => handleKeyPress('3')} className="bg-[#1c1c1e] text-white" />
        <KeypadButton label="+" onClick={() => handleKeyPress('+')} className="bg-[#ff9f0a] text-white" />

        <KeypadButton label="0" onClick={() => handleKeyPress('0')} className="bg-[#1c1c1e] text-white col-span-2 text-left pl-6 rounded-full" />
        <KeypadButton label="." onClick={() => handleKeyPress('.')} className="bg-[#1c1c1e] text-white" />
        <KeypadButton label="=" onClick={handleEquals} className="bg-[#2ecc71] text-black font-semibold" />
      </div>
    </div>
  );
}