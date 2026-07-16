import React from 'react';
import { useSelector } from 'react-redux';
import { FaPrint } from 'react-icons/fa';
import { triggerPrint } from '../utils/print';

export default function Receipt() {
  const orders = useSelector(s => s.orders.list);
  const latest = orders[orders.length - 1];
  if (!latest) return <div className="p-4 text-[#888]">No orders yet.</div>;
  return (
    <div className="p-4" id="receipt-printable">
      <div className="bg-[#111] border border-[#2ecc71] rounded-lg p-4 mb-4">
        <h2 className="text-[#2ecc71] font-bold text-lg mb-2">Receipt</h2>
        <p className="text-[#aaa] text-sm">Order #{latest.id} – {new Date(latest.timestamp).toLocaleString()}</p>
        <div className="mt-2">
          {latest.items?.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm text-[#ddd] mb-1">
              <span>{item.productId} (x{item.quantity})</span>
              <span>₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-[#333] mt-2 pt-2 flex justify-between font-bold">
          <span>Total</span>
          <span className="text-[#2ecc71]">₹{latest.total.toFixed(2)}</span>
        </div>
      </div>
      <button onClick={triggerPrint} className="bg-[#0d2b1a] text-[#2ecc71] border border-[#2ecc71] px-4 py-2 rounded flex items-center gap-2"><FaPrint /> Print Receipt</button>
    </div>
  );
}