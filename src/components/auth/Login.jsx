import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sendOtp } from '../../store/authSlice';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('shop');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector(s => s.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await dispatch(sendOtp({ phone, role }));
    navigate('/verify-otp', { state: { phone, role } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <form onSubmit={handleSubmit} className="bg-[#0c0c0e] border border-[#2ecc71]/30 p-8 rounded-2xl w-full max-w-sm">
        <h1 className="text-[#2ecc71] text-2xl font-bold text-center mb-6">POS Login</h1>
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        <div className="mb-4">
          <label className="block text-xs text-[#aaa] mb-1">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 9876543210"
            required
            className="w-full p-3 bg-[#111] border border-[#222] rounded-lg text-white outline-none focus:border-[#2ecc71]"
          />
        </div>
        <div className="mb-6">
          <label className="block text-xs text-[#aaa] mb-1">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-3 bg-[#111] border border-[#222] rounded-lg text-white">
            <option value="shop">Shop</option>
            <option value="dealer">Dealer</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 bg-[#0d4f2b] text-[#2ecc71] border border-[#2ecc71] rounded-lg font-bold hover:bg-[#2ecc71] hover:text-black transition disabled:opacity-50">
          {loading ? 'Sending...' : 'Send OTP'}
        </button>
      </form>
    </div>
  );
}