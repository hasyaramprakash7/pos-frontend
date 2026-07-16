import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import BillingInterface from './components/BillingInterface';
import SearchBillingInterface from './components/SearchBillingInterface';
import ProductList from './components/ProductList';
import ProductForm from './components/ProductForm';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/auth/Login';
import OTPVerify from './components/auth/OTPVerify';
import DealerDashboard from './components/dealer/DealerDashboard';
import { loadProducts } from './store/productsSlice';
import { loadSettings, saveSettings } from './store/settingsSlice';
import { loadOrders, getOrdersByDateRange } from './store/ordersSlice';
import {
  connectSocket,
  pullProductsFromBackend,
  syncLocalToBackend,
} from './services/syncService';
import { assignDealer } from './store/authSlice';
import {
  FaSave,
  FaStore,
  FaCreditCard,
  FaExclamationTriangle,
  FaPhone,
  FaLink,
} from 'react-icons/fa';

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useSelector(s => s.auth);
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role))
    return <Navigate to="/" replace />;
  return children;
}

function MainApp() {
  const dispatch = useDispatch();
  const { activeView, upiId, shopName, whatsappPhone, theme } = useSelector(
    s => s.settings
  );
  const { isProductFormOpen, lowStockProducts } = useSelector(s => s.products);
  const orders = useSelector(s => s.orders.list || []);
  const user = useSelector(s => s.auth.user);
  const token = useSelector(s => s.auth.token);

  // 👇 Added to access all product data (for image lookup)
  const products = useSelector(s => s.products.items);

  const [localShopName, setLocalShopName] = useState('');
  const [localUpiId, setLocalUpiId] = useState('');
  const [localWhatsappPhone, setLocalWhatsappPhone] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [exportDate, setExportDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Dealer assignment (only used as fallback for legacy shops)
  const [dealerPhoneInput, setDealerPhoneInput] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [showDealerAssign, setShowDealerAssign] = useState(false);

  // Initial data load + sync/pull for shop users with a dealer
  useEffect(() => {
    dispatch(loadSettings());
    dispatch(loadProducts());
    dispatch(loadOrders());
    if (token) {
      connectSocket(token);
      if (user?.role === 'shop' && user?.dealer) {
        pullProductsFromBackend().then(() => {
          syncLocalToBackend();
        });
      }
      if (user?.role === 'shop' && !user?.dealer) {
        setShowDealerAssign(true);
      } else {
        setShowDealerAssign(false);
      }
    }
  }, [dispatch, token, user?.dealer, user?.role]);

  useEffect(() => {
    if (shopName) setLocalShopName(shopName);
    if (upiId) setLocalUpiId(upiId);
    if (whatsappPhone) setLocalWhatsappPhone(whatsappPhone);
  }, [shopName, upiId, whatsappPhone]);

  useEffect(() => {
    document.documentElement.classList.remove('light-theme', 'dark-theme');
    document.documentElement.classList.add(`${theme}-theme`);
  }, [theme]);

  const handleUpdateSettings = e => {
    e.preventDefault();
    dispatch(
      saveSettings({
        shopName: localShopName,
        upiId: localUpiId,
        whatsappPhone: localWhatsappPhone,
      })
    );
    setSaveStatus('Configuration saved completely to local storage!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // ---- Enhanced daily orders export with product images ----
  const handleExportDateOrders = async () => {
    try {
      const filteredOrders = await getOrdersByDateRange(exportDate, exportDate);
      const total = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      let report = `*📊 ${shopName || 'STORE'} – SALES REPORT: ${exportDate}*\n\n`;
      if (filteredOrders.length === 0) {
        report += 'No orders for this date.\n';
      } else {
        filteredOrders.forEach(order => {
          report += `🔹 Invoice: ${order.id}  |  ${new Date(order.timestamp).toLocaleString()}\n`;
          report += `──────────────────────────\n`;
          if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
              const lineTotal = ((item.price || 0) * (item.quantity || 1)).toFixed(2);
              report += `${item.name} x${item.quantity}  =  ₹${lineTotal}\n`;

              // Look up the product image from the current inventory
              const product = products.find(p => p.id === item.productId);
              if (product?.image) {
                report += `  🖼️ ${product.image}\n`;
              }
            });
          }
          report += `──────────────────────────\n`;
          report += `*Order Total: ₹${order.total.toFixed(2)}*\n\n`;
        });
      }
      report += `*💰 Total Day Sales: ₹${total.toFixed(2)}*`;

      const phone = whatsappPhone || '';
      if (!phone) {
        alert('Please save a WhatsApp number first in Settings or Checkout.');
        return;
      }
      window.open(
        `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(report)}`,
        '_blank'
      );
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export. Check console.');
    }
  };

  const handleAssignDealer = async () => {
    if (!dealerPhoneInput.trim()) {
      alert('Please enter a dealer phone number.');
      return;
    }
    setAssignLoading(true);
    try {
      await dispatch(assignDealer(dealerPhoneInput.trim())).unwrap();
      alert('Dealer assigned successfully!');
      setDealerPhoneInput('');
      setShowDealerAssign(false);
    } catch (err) {
      alert('Assignment failed: ' + (err.message || err));
    } finally {
      setAssignLoading(false);
    }
  };

  const renderView = () => {
    switch (activeView) {
      case 'billing':
      case 'scanner_billing':
        return <BillingInterface />;
      case 'search_billing':
        return <SearchBillingInterface />;
      case 'products':
        return <ProductList />;
      case 'orders':
        return (
          <div className="p-4 md:p-6 font-mono h-full flex flex-col overflow-hidden w-full box-border">
            <h2 className="text-[#2ecc71] text-xl font-bold tracking-wide uppercase mb-1">
              Historical Orders
            </h2>
            <p className="text-xs text-[#555] mb-4">
              Saved inside local persistent client clusters ({orders.length} items logged)
            </p>
            <div className="flex flex-wrap items-end gap-2 mb-4">
              <div>
                <label className="text-[10px] text-[#666] uppercase block mb-1">Select Date</label>
                <input
                  type="date"
                  value={exportDate}
                  onChange={e => setExportDate(e.target.value)}
                  className="bg-[#111] border border-[#222] text-white p-2 rounded text-xs"
                />
              </div>
              <button
                onClick={handleExportDateOrders}
                className="bg-[#0d2b1a] hover:bg-[#2ecc71] text-[#2ecc71] hover:text-black border border-[#2ecc71]/40 px-4 py-2 rounded text-xs font-bold transition-all"
              >
                Export Day to WhatsApp
              </button>
            </div>
            {orders.length === 0 ? (
              <div className="border border-[#111] rounded-xl p-6 bg-[#0a0a0a] text-xs text-[#555] text-center">
                Execute orders at the billing register panel to populate database history.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-6 scrollbar-thin">
                {[...orders].reverse().map(order => (
                  <div key={order.id} className="border border-[#141416] rounded-xl p-4 bg-[#0a0a0a] transition-all hover:border-[#2ecc71]/20">
                    <div className="flex justify-between items-start border-b border-[#141416] pb-2 mb-2.5 text-xs">
                      <div>
                        <span className="text-[#2ecc71] font-bold tracking-wider">{order.id}</span>
                        <span className="text-[#333] mx-2">|</span>
                        <span className="text-[#666]">{new Date(order.timestamp).toLocaleString()}</span>
                      </div>
                      <span className="text-[#2ecc71] font-bold text-sm">₹{order.total?.toFixed(2)}</span>
                    </div>
                    <div className="space-y-1.5">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] text-[#aaa] leading-tight">
                          <span className="truncate max-w-[75%]">
                            {item.name} <span className="text-[#444] font-bold ml-1">x{item.quantity}</span>
                          </span>
                          <span className="text-[#888]">₹{((item.price || 0) * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'settings':
        return (
          <div className="p-6 max-w-lg overflow-y-auto h-full">
            <h2 className="text-[#2ecc71] text-xl font-bold mb-2 tracking-wide uppercase font-mono">
              Terminal Settings
            </h2>
            <p className="text-xs text-[#555] mb-6 font-mono">
              Configure processing loops and hardware destinations
            </p>

            <form onSubmit={handleUpdateSettings} className="space-y-4 bg-[#0a0a0a] border border-[#111] p-6 rounded-xl mb-6">
              <div>
                <label className="text-xs text-[#aaa] uppercase tracking-wider font-mono block mb-2 flex items-center gap-2">
                  <FaStore className="text-[#2ecc71]" /> Merchant Shop Name
                </label>
                <input
                  type="text"
                  value={localShopName}
                  onChange={e => setLocalShopName(e.target.value)}
                  placeholder="e.g. Premium Counter POS"
                  required
                  className="w-full p-2.5 bg-[#141414] border border-[#222] focus:border-[#2ecc71] rounded-lg text-white outline-none font-mono text-sm transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-[#aaa] uppercase tracking-wider font-mono block mb-2 flex items-center gap-2">
                  <FaCreditCard className="text-[#2ecc71]" /> Direct UPI Address VPA (Required for Payments)
                </label>
                <input
                  type="text"
                  value={localUpiId}
                  onChange={e => setLocalUpiId(e.target.value)}
                  placeholder="merchantname@okaxis"
                  required
                  className="w-full p-2.5 bg-[#141414] border border-[#222] focus:border-[#2ecc71] rounded-lg text-white outline-none font-mono text-sm transition-all"
                />
                <p className="text-[10px] text-[#555] mt-1 font-mono">Interoperable instant banking clearing gateway vector</p>
              </div>
              <div>
                <label className="text-xs text-[#aaa] uppercase tracking-wider font-mono block mb-2 flex items-center gap-2">
                  <FaPhone className="text-[#2ecc71]" /> WhatsApp Phone Number (for reports)
                </label>
                <input
                  type="text"
                  value={localWhatsappPhone}
                  onChange={e => setLocalWhatsappPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full p-2.5 bg-[#141414] border border-[#222] focus:border-[#2ecc71] rounded-lg text-white outline-none font-mono text-sm transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-[#0d2b1a] hover:bg-[#2ecc71] text-[#2ecc71] hover:text-black border border-[#2ecc71]/40 rounded-lg font-mono text-sm font-bold flex items-center justify-center gap-2 transition-all"
              >
                <FaSave /> Commit Changes to Device Store
              </button>
            </form>

            {/* Dealer status – shows only if dealer is set */}
            {user?.role === 'shop' && user?.dealer && (
              <div className="bg-[#0a0a0a] border border-[#111] p-6 rounded-xl mb-6">
                <p className="text-xs text-[#2ecc71] font-mono">
                  ✅ Your shop is already linked to a distributor. Products will sync automatically.
                </p>
              </div>
            )}

            {/* Manual dealer assignment – shows only if shop has no dealer (fallback for legacy shops) */}
            {showDealerAssign && (
              <div className="bg-[#0a0a0a] border border-[#111] p-6 rounded-xl">
                <h3 className="text-[#2ecc71] text-lg font-bold mb-2 tracking-wide uppercase font-mono flex items-center gap-2">
                  <FaLink /> Dealer Assignment
                </h3>
                <p className="text-xs text-[#555] mb-4 font-mono">
                  Link your shop to a dealer to sync products
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Dealer Phone Number"
                    value={dealerPhoneInput}
                    onChange={e => setDealerPhoneInput(e.target.value)}
                    className="flex-1 p-2.5 bg-[#141414] border border-[#222] focus:border-[#2ecc71] rounded-lg text-white outline-none font-mono text-sm"
                  />
                  <button
                    onClick={handleAssignDealer}
                    disabled={assignLoading}
                    className="bg-[#0d2b1a] hover:bg-[#2ecc71] text-[#2ecc71] hover:text-black border border-[#2ecc71]/40 px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {assignLoading ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              </div>
            )}

            {saveStatus && (
              <div className="mt-4 p-3 bg-[#0d2b1a] border border-[#2ecc71] text-[#2ecc71] text-xs font-mono rounded-lg">
                {saveStatus}
              </div>
            )}
          </div>
        );
      case 'dealer_dashboard':
        return (
          <ProtectedRoute allowedRoles={['dealer']}>
            <DealerDashboard />
          </ProtectedRoute>
        );
      default:
        return <BillingInterface />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen bg-[#050505] text-[#d0d0d0] font-sans overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-hidden relative h-full">
          {lowStockProducts && lowStockProducts.length > 0 && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a] border border-amber-500/60 text-amber-400 px-4 py-2 rounded-xl text-xs font-mono flex items-center gap-2 shadow-lg max-w-[90%] truncate">
              <FaExclamationTriangle className="shrink-0" />
              <span>
                Low stock:{' '}
                {lowStockProducts
                  .map(p => `${p.name} (${p.stock} left)`)
                  .join(', ')}
              </span>
            </div>
          )}
          {renderView()}
          {isProductFormOpen && <ProductForm />}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/verify-otp" element={<OTPVerify />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainApp />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}