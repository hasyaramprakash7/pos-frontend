import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { placeOrder } from '../store/ordersSlice';
import { clearCart } from '../store/cartSlice';
import { saveSettings } from '../store/settingsSlice';
import QRCodeDisplay from './QRCodeDisplay';
import { triggerPrint } from '../utils/print';
import { FaTimes, FaCheckCircle, FaPrint, FaShoppingBag, FaWhatsapp } from 'react-icons/fa';

export default function Checkout({ onClose }) {
  const dispatch = useDispatch();
  const cartItems = useSelector(s => s.cart.items);
  const settings = useSelector(s => s.settings);
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const [orderProcessed, setOrderProcessed] = useState(false);
  const [lastAssignedOrderId, setLastAssignedOrderId] = useState(null);
  const [targetPhone, setTargetPhone] = useState(settings.whatsappPhone || '');

  const handlePhoneChange = (newPhone) => {
    setTargetPhone(newPhone);
    dispatch(saveSettings({ whatsappPhone: newPhone }));
  };

  const handlePlaceOrder = async () => {
    const timestamp = Date.now();
    const generatedId = `INV-${timestamp.toString().slice(-6)}`;
    const orderData = { id: generatedId, items: cartItems, total, timestamp };
    console.log('🚀 [Checkout] Dispatching order with items:', orderData.items.length);
    console.log('🚀 [Checkout] Order items:', orderData.items.map(i => i.name));
    await dispatch(placeOrder(orderData));

    setLastAssignedOrderId(generatedId);
    setOrderProcessed(true);
  };

  const dispatchWhatsAppExport = () => {
    if (!targetPhone) return alert('Enter target WhatsApp destination number');
    dispatch(saveSettings({ whatsappPhone: targetPhone }));
    const invoiceStr = `*📊 ${settings.shopName || 'STORE RECEIPT'}*\n` +
      `*Invoice ID:* ${lastAssignedOrderId}\n` +
      `*Date/Time:* ${new Date().toLocaleString()}\n` +
      `-----------------------------------------\n` +
      cartItems.map(i => `- ${i.name} (x${i.quantity}${i.unitType === 'kg' ? 'kg' : ''}) → ₹${(i.price * i.quantity).toFixed(2)}`).join('\n') +
      `\n-----------------------------------------\n` +
      `*Net Bill Amount Payable: ₹${total.toFixed(2)}*\n\n` +
      `_Logged safely via local standalone terminal database._`;
    const cleanNum = targetPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(invoiceStr)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-[#0c0c0e] border border-[#222] p-4 sm:p-6 rounded-none sm:rounded-2xl w-full max-w-md relative shadow-2xl font-mono h-full sm:h-auto overflow-y-auto">
        {!orderProcessed ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[#2ecc71] text-lg font-bold tracking-wide">Invoice Review</h2>
              <button onClick={onClose} className="text-[#555] hover:text-white"><FaTimes /></button>
            </div>
            <div className="max-h-48 overflow-y-auto mb-4 border border-[#111] bg-black/40 p-3 rounded-xl space-y-2">
              {cartItems.map(item => (
                <div key={item.productId} className="flex justify-between text-xs">
                  <span className="text-[#aaa] truncate max-w-[70%]">{item.name} <span className="text-[#444]">x{item.quantity}{item.unitType === 'kg' ? 'kg' : ''}</span></span>
                  <span className="text-[#2ecc71]">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[#1a1a1a] pt-3 flex justify-between font-bold text-sm mb-5">
              <span className="text-[#888]">Payable Net Total</span>
              <span className="text-[#2ecc71] text-base">₹{total.toFixed(2)}</span>
            </div>
            {settings.upiId ? (
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl mb-5 mx-auto">
                <QRCodeDisplay upiId={settings.upiId} amount={total} shopName={settings.shopName} />
                <p className="text-[10px] text-black font-bold uppercase tracking-wider mt-2">Scan with GPay / PhonePe / Paytm</p>
              </div>
            ) : (
              <div className="p-3 mb-5 border border-[#ff453a]/30 bg-[#ff453a]/5 rounded-lg text-center">
                <p className="text-xs text-[#ff453a]">⚠️ Payment QR Hidden: Configure UPI Id in settings view.</p>
              </div>
            )}
            <button onClick={handlePlaceOrder} className="w-full py-3 bg-[#0d4f2b] text-[#2ecc71] border border-[#2ecc71]/40 rounded-xl font-bold text-sm hover:bg-[#2ecc71] hover:text-black transition-all duration-150 shadow-lg">
              Verify Payment & Finalize Order
            </button>
          </>
        ) : (
          <div className="text-center py-2">
            <div className="flex justify-center mb-2 text-[#2ecc71]"><FaCheckCircle size={40} /></div>
            <h3 className="text-white font-bold text-base mb-0.5">Transaction Success</h3>
            <p className="text-[11px] text-[#555] mb-3">Invoice {lastAssignedOrderId} logged to store</p>
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-xl mb-4 flex flex-col gap-2">
              <span className="text-[10px] text-[#aaa] uppercase tracking-wider block text-left">WhatsApp Summary Exporter</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetPhone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="Enter phone with country code (91...)"
                  className="flex-1 bg-[#111] text-xs text-white border border-[#222] p-2 rounded-lg outline-none focus:border-[#2ecc71]"
                />
                <button onClick={dispatchWhatsAppExport} className="bg-[#0e3a21] border border-[#2ecc71]/40 text-[#2ecc71] hover:bg-[#2ecc71] hover:text-black p-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-bold px-3"><FaWhatsapp /> Push Text</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button onClick={triggerPrint} className="py-2 bg-[#1c1c1e] hover:bg-[#2c2c2e] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-[#333]"><FaPrint /> Print Spool</button>
              <button onClick={() => { dispatch(clearCart()); onClose(); }} className="py-2 bg-[#2ecc71] text-black rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90"><FaShoppingBag /> Next Sale</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}