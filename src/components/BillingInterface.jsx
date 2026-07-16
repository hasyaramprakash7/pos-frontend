import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import CalculatorPOS from './CalculatorPOS';
import ScannerPOS from './ScannerPOS';
import Cart from './Cart';
import Checkout from './Checkout';

export default function BillingInterface() {
  const [showCheckout, setShowCheckout] = useState(false);
  const activeView = useSelector(s => s.settings.activeView);

  return (
    <div className="flex flex-col h-full w-full bg-black overflow-hidden select-none">
      <div className="h-[60%] border-b border-[#141416] bg-black overflow-hidden relative">
        {activeView === 'scanner_billing' ? <ScannerPOS mini={false} /> : <CalculatorPOS />}
      </div>
      <div className="h-[40%] flex flex-col overflow-hidden bg-[#050505]">
        <Cart onCheckout={() => setShowCheckout(true)} />
      </div>
      {showCheckout && <Checkout onClose={() => setShowCheckout(false)} />}
    </div>
  );
}