import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveView, toggleTheme } from '../store/settingsSlice';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/authSlice';
import { setProducts } from '../store/productsSlice';
import { clearCart } from '../store/cartSlice';
import { db } from '../utils/database';
import {
  FaShoppingCart, FaBarcode, FaSearch, FaBox, FaHistory,
  FaCog, FaChartBar, FaSignOutAlt, FaSun, FaMoon
} from 'react-icons/fa';

const navItems = [
  { id: 'billing', icon: <FaShoppingCart />, label: 'Calculator' },
  { id: 'scanner_billing', icon: <FaBarcode />, label: 'Scanner' },
  { id: 'search_billing', icon: <FaSearch />, label: 'Search Grid' },
  { id: 'products', icon: <FaBox />, label: 'Inventory' },
  { id: 'orders', icon: <FaHistory />, label: 'Orders' },
  { id: 'settings', icon: <FaCog />, label: 'Settings' }
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const activeView = useSelector(s => s.settings.activeView);
  const theme = useSelector(s => s.settings.theme);
  const user = useSelector(s => s.auth.user);
  const navigate = useNavigate();

  const isLight = theme === 'light';

  const handleLogout = async () => {
    await db.products.clear();
    await db.orders.clear();
    await db.orderItems.clear();
    await db.deletedProducts.clear();

    dispatch(setProducts([]));
    dispatch(clearCart());
    dispatch(logout());

    navigate('/login');
  };

  return (
    <div
      className={`w-14 flex flex-col items-center pt-4 gap-2 z-20 h-full shrink-0 border-r ${
        isLight ? 'bg-white border-gray-200' : 'bg-[#0a0a0a] border-[#0d4f2b]'
      }`}
    >
      {navItems.map(item => (
        <button
          key={item.id}
          onClick={() => dispatch(setActiveView(item.id))}
          className={`w-10 h-10 flex items-center justify-center rounded-md border text-lg transition-all duration-150 ${
            activeView === item.id
              ? isLight
                ? 'bg-green-50 border-green-500 text-green-600'
                : 'bg-[#0d2b1a] border-[#2ecc71] text-[#2ecc71]'
              : isLight
                ? 'border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-300'
                : 'border-[#111] text-[#aaa] hover:text-[#2ecc71] hover:border-[#2ecc71]/30'
          }`}
          title={item.label}
        >
          {item.icon}
        </button>
      ))}

      {user?.role === 'dealer' && (
        <button
          onClick={() => dispatch(setActiveView('dealer_dashboard'))}
          className={`w-10 h-10 flex items-center justify-center rounded-md border text-lg transition-all duration-150 ${
            activeView === 'dealer_dashboard'
              ? isLight
                ? 'bg-green-50 border-green-500 text-green-600'
                : 'bg-[#0d2b1a] border-[#2ecc71] text-[#2ecc71]'
              : isLight
                ? 'border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-300'
                : 'border-[#111] text-[#aaa] hover:text-[#2ecc71] hover:border-[#2ecc71]/30'
          }`}
          title="Dealer Dashboard"
        >
          <FaChartBar />
        </button>
      )}

      <div className="flex-1"></div>

      {/* Theme Toggle Button */}
      <button
        onClick={() => dispatch(toggleTheme())}
        className={`w-10 h-10 flex items-center justify-center rounded-md border transition-all ${
          isLight
            ? 'border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-300'
            : 'border-[#111] text-[#aaa] hover:text-[#2ecc71] hover:border-[#2ecc71]/30'
        }`}
        title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
      >
        {isLight ? <FaMoon /> : <FaSun />}
      </button>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className={`w-10 h-10 flex items-center justify-center rounded-md border mb-4 transition-all ${
          isLight
            ? 'border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-300'
            : 'border-[#111] text-[#aaa] hover:text-red-400 hover:border-red-400/30'
        }`}
        title="Logout"
      >
        <FaSignOutAlt />
      </button>
    </div>
  );
}