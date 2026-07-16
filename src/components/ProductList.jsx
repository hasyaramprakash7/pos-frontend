import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { openProductForm, deleteProductAndVector } from '../store/productsSlice';
import {
  FaEdit, FaTrash, FaQrcode, FaTimes,
  FaCloudUploadAlt, FaCloud
} from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';

export default function ProductList() {
  const dispatch = useDispatch();
  const products = useSelector(s => s.products.items);
  const cartItems = useSelector(s => s.cart.items);
  const [activeQrTarget, setActiveQrTarget] = useState(null);

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const unsyncedCount = products.filter(p => p.synced !== 1).length;

  return (
    <div className="p-4 overflow-y-auto h-full bg-[#F8F9FA]">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-[#0B4627] text-xl font-bold">Inventory ({products.length})</h2>
          <div className="text-sm mt-1 flex items-center gap-3 flex-wrap">
            <span>
              <span className="text-gray-600">Cart:</span>
              <span className="text-[#0B4627] font-bold ml-1">
                {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} · ₹{cartTotal.toFixed(2)}
              </span>
            </span>
            {unsyncedCount > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-mono">
                {unsyncedCount} not synced
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => dispatch(openProductForm(null))}
          className="bg-[#0B4627] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#0a3a20]"
        >
          + Add Product
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map(p => (
          <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:shadow transition">
            <div className="flex gap-3">
              {p.image ? (
                <img
                  src={p.image}
                  alt={p.name}
                  crossOrigin="anonymous"
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200 shrink-0"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentNode.innerHTML = '<div class="w-16 h-16 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center text-xs text-red-500">Broken</div>';
                  }}
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center text-xs text-gray-400">
                  No img
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                  {p.synced === 1 ? (
                    <FaCloudUploadAlt className="text-green-500 shrink-0" size={12} title="Synced" />
                  ) : (
                    <FaCloud className="text-gray-400 shrink-0" size={12} title="Not synced" />
                  )}
                </div>
                <p className="text-xs text-[#0B4627] font-bold mt-0.5">₹{p.price?.toFixed(2)}</p>
                {p.stock !== undefined && (
                  <p className={`text-xs mt-1 ${p.stock <= 5 ? 'text-red-500' : 'text-gray-500'}`}>
                    Stock: {p.stock}
                  </p>
                )}
                {p.barcode && <p className="text-[10px] text-gray-400 mt-1">SKU: {p.barcode}</p>}
                <div className="flex gap-1 mt-1">
                  {p.categoryType && <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-200">{p.categoryType}</span>}
                  {p.unitType && <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">{p.unitType}</span>}
                </div>
              </div>
              <div className="flex gap-1 pt-1 shrink-0">
                <button onClick={() => setActiveQrTarget(p)} className="text-gray-400 hover:text-green-600" title="QR"><FaQrcode size={14} /></button>
                <button onClick={() => dispatch(openProductForm(p))} className="text-gray-400 hover:text-blue-600" title="Edit"><FaEdit size={14} /></button>
                <button onClick={() => dispatch(deleteProductAndVector(p.id))} className="text-gray-400 hover:text-red-600" title="Delete"><FaTrash size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeQrTarget && (
        <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] text-gray-500 uppercase font-bold">System Item Stamp</span>
              <button onClick={() => setActiveQrTarget(null)} className="text-gray-400 hover:text-black"><FaTimes size={14} /></button>
            </div>
            <div className="bg-white p-4 rounded-xl inline-block mb-4 shadow-inner">
              <QRCodeSVG value={JSON.stringify({ type: 'PRODUCT', id: activeQrTarget.id })} size={160} level="H" />
            </div>
            <p className="text-sm font-bold text-gray-800">{activeQrTarget.name}</p>
            <p className="text-xs text-green-600 font-bold">₹{activeQrTarget.price?.toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
}