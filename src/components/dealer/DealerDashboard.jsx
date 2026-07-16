import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useSelector } from 'react-redux';
import { FaStore, FaExclamationTriangle } from 'react-icons/fa';

export default function DealerDashboard() {
  const [data, setData] = useState({ shops: [], alerts: [], inventory: [] });
  const user = useSelector(s => s.auth.user);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/dealer/dashboard');
        setData(res.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      }
    };
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto bg-[#0a0a0a] text-white font-mono">
      <h2 className="text-[#2ecc71] text-xl md:text-2xl font-bold mb-2">Dealer Dashboard</h2>
      <p className="text-xs text-[#555] mb-6">
        Plan: {user?.plan} | Shops: {data.shops.length}
      </p>

      {/* Shops & their products */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {data.shops.map(shop => (
          <div key={shop._id} className="bg-[#111] border border-[#222] rounded-xl p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3 border-b border-[#1a1a1a] pb-2">
              <FaStore className="text-[#2ecc71]" />
              <span className="font-bold text-sm text-[#ccc] truncate">
                {shop.name || shop.phone}
              </span>
              <span className="text-[10px] text-[#555] ml-auto">
                {shop.location?.coordinates?.join(', ') || 'No location'}
              </span>
            </div>

            {shop.products.length === 0 ? (
              <p className="text-xs text-[#555] italic">No products stocked</p>
            ) : (
              <div className="space-y-3 flex-1">
                {shop.products.map(item => (
                  <div key={item.productId} className="flex items-center gap-3 bg-[#0a0a0a] p-2 rounded-lg border border-[#1a1a1a]">
                    {/* Product Image */}
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        crossOrigin="anonymous"
                        className="w-10 h-10 object-cover rounded border border-[#333] shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentNode.insertAdjacentHTML(
                            'afterbegin',
                            '<div class="w-10 h-10 bg-[#222] rounded border border-[#333] flex items-center justify-center text-xs text-[#555]">N/A</div>'
                          );
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-[#222] rounded border border-[#333] flex items-center justify-center text-xs text-[#555] shrink-0">
                        N/A
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#ccc] truncate">{item.name}</p>
                      <p className="text-[10px] text-[#2ecc71]">₹{item.price?.toFixed(2)}</p>
                    </div>
                    <div className={`text-xs font-bold ${item.stock <= 5 ? 'text-[#e74c3c]' : 'text-[#2ecc71]'}`}>
                      {item.stock}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Low-Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#0a0a0a] border border-[#111] rounded-xl p-4">
          <h3 className="text-[#e74c3c] text-lg font-bold mb-3 flex items-center gap-2">
            <FaExclamationTriangle className="text-[#e74c3c]" />
            Low-Stock Alerts
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.alerts.map(alert => (
              <div key={alert._id} className="bg-[#1a0a0a] border border-[#e74c3c]/20 p-2 rounded text-xs">
                <p className="text-[#e74c3c] font-bold">{alert.product?.name}</p>
                <p className="text-[#999]">Shop: {alert.shop?.phone} | Stock: {alert.currentStock}</p>
              </div>
            ))}
            {data.alerts.length === 0 && <p className="text-[#555] text-xs">No alerts</p>}
          </div>
        </div>
      </div>

      {/* Global Inventory Table (optional) */}
      <div className="bg-[#0a0a0a] border border-[#111] rounded-xl p-4">
        <h3 className="text-[#2ecc71] text-lg font-bold mb-3">All Inventory Levels</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[#666] border-b border-[#111]">
                <th className="pb-2">Product</th>
                <th className="pb-2">Shop</th>
                <th className="pb-2">Stock</th>
              </tr>
            </thead>
            <tbody>
              {data.inventory.map((inv, idx) => (
                <tr key={idx} className="border-b border-[#111]">
                  <td className="py-1 text-[#ccc]">{inv.product?.name}</td>
                  <td className="text-[#888]">{inv.shop}</td>
                  <td className={`font-bold ${inv.stock <= 5 ? 'text-[#e74c3c]' : 'text-[#2ecc71]'}`}>{inv.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}