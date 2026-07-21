import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import CalculatorPOS from './CalculatorPOS';
import ScannerPOS from './ScannerPOS';
import Cart from './Cart';
import Checkout from './Checkout';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

export default function BillingInterface() {
  const [showCheckout, setShowCheckout] = useState(false);
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  const activeView = useSelector(s => s.settings.activeView);

  return (
    <div className="flex flex-col h-full w-full bg-black overflow-hidden select-none">
      {/* Top section – hidden when cart is expanded */}
      <div
        className={`${isCartExpanded ? 'hidden' : 'h-[60%]'
          } border-b border-[#141416] bg-black overflow-hidden relative`}
      >
        {activeView === 'scanner_billing' ? <ScannerPOS mini={false} /> : <CalculatorPOS />}
      </div>

      {/* Cart section – expandable */}
      <div
        className={`${isCartExpanded ? 'h-full' : 'h-[40%]'
          } flex flex-col overflow-hidden bg-[#050505]`}
      >
        {/* Cart header (click to expand/collapse) */}
        <div
          onClick={() => setIsCartExpanded(!isCartExpanded)}
          className="flex items-center justify-between px-3 py-1 border-b border-[#0d4f2b] cursor-pointer"
        >
          <span className="text-[#2ecc71] font-bold text-sm">Cart</span>
          <span className="text-[#2ecc71]">
            {isCartExpanded ? <FaChevronDown /> : <FaChevronUp />}
          </span>
        </div>

        <Cart onCheckout={() => setShowCheckout(true)} />
      </div>

      {/* Checkout modal */}
      {showCheckout && <Checkout onClose={() => setShowCheckout(false)} />}
    </div>
  );
}