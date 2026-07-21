import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { signup } from '../../store/authSlice';
import { useNavigate, Link } from 'react-router-dom';
import PatternLock from './PatternLock';

export default function Signup() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('shop');
  const [pattern, setPattern] = useState(null);       // pattern string
  const [password, setPassword] = useState('');        // text password
  const [method, setMethod] = useState('pattern');     // 'pattern' or 'password'
  const [showPatternInput, setShowPatternInput] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let finalPassword;
    if (method === 'pattern') {
      if (!pattern || pattern.length < 4) {
        alert('Please draw a pattern of at least 4 dots');
        return;
      }
      finalPassword = pattern;
    } else {
      if (!password || password.length < 4) {
        alert('Password must be at least 4 characters');
        return;
      }
      finalPassword = password;
    }

    const result = await dispatch(signup({ phone, password: finalPassword, name, role }));
    if (signup.fulfilled.match(result)) navigate('/');
  };

  const handlePatternComplete = (seq) => {
    if (seq) {
      setPattern(seq);
      setShowPatternInput(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <form onSubmit={handleSubmit} className="bg-[#0c0c0e] border border-[#2ecc71]/30 p-8 rounded-2xl w-full max-w-sm">
        <h1 className="text-[#2ecc71] text-2xl font-bold text-center mb-6">Create Account</h1>
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

        {/* Method toggle */}
        {/* <div className="flex mb-4 space-x-2">
          <button type="button" onClick={() => setMethod('pattern')}
            className={`flex-1 py-2 rounded text-sm font-medium ${method === 'pattern' ? 'bg-[#0d4f2b] text-[#2ecc71] border border-[#2ecc71]' : 'bg-[#111] text-[#aaa] border border-[#222]'
              }`}>Pattern Lock</button>
          <button type="button" onClick={() => setMethod('password')}
            className={`flex-1 py-2 rounded text-sm font-medium ${method === 'password' ? 'bg-[#0d4f2b] text-[#2ecc71] border border-[#2ecc71]' : 'bg-[#111] text-[#aaa] border border-[#222]'
              }`}>Password</button>
        </div> */}

        <div className="mb-4">
          <label className="block text-xs text-[#aaa] mb-1">Full Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Your name" required
            className="w-full p-3 bg-[#111] border border-[#222] rounded-lg text-white outline-none focus:border-[#2ecc71]" />
        </div>

        <div className="mb-4">
          <label className="block text-xs text-[#aaa] mb-1">Phone Number</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 9876543210" required
            className="w-full p-3 bg-[#111] border border-[#222] rounded-lg text-white outline-none focus:border-[#2ecc71]" />
        </div>

        <div className="mb-4">
          <label className="block text-xs text-[#aaa] mb-1">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full p-3 bg-[#111] border border-[#222] rounded-lg text-white">
            <option value="shop">Shop</option>
            <option value="dealer">Dealer</option>
          </select>
        </div>

        {/* Pattern input */}
        {method === 'pattern' && (
          <div className="mb-6">
            <label className="block text-xs text-[#aaa] mb-1">Draw Pattern (at least 6 dots)</label>
            {pattern ? (
              <div className="text-center">
                <p className="text-[#2ecc71] text-sm mb-2">Pattern set ✅</p>
                <button type="button" onClick={() => setShowPatternInput(true)}
                  className="text-xs text-[#2ecc71] underline">Change pattern</button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowPatternInput(true)}
                className="w-full py-3 bg-[#111] border border-[#222] text-[#aaa] rounded-lg text-sm">Tap to set pattern</button>
            )}
          </div>
        )}

        {/* Password input */}
        {/* {method === 'password' && (
          <div className="mb-6">
            <label className="block text-xs text-[#aaa] mb-1">Password (min 6 characters)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password" required
              className="w-full p-3 bg-[#111] border border-[#222] rounded-lg text-white outline-none focus:border-[#2ecc71]" />
          </div>
        )} */}

        {/* Pattern modal */}
        {showPatternInput && (
          <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
            <p className="text-[#2ecc71] text-lg mb-4">Draw your pattern</p>
            <PatternLock onPatternComplete={handlePatternComplete} size={280} />
            <button type="button" onClick={() => setShowPatternInput(false)}
              className="mt-6 text-[#aaa] underline">Cancel</button>
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-[#0d4f2b] text-[#2ecc71] border border-[#2ecc71] rounded-lg font-bold hover:bg-[#2ecc71] hover:text-black transition disabled:opacity-50">
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>

        <p className="text-center text-[#555] text-xs mt-4">
          Already have an account? <Link to="/login" className="text-[#2ecc71] hover:underline">Login</Link>
        </p>
      </form>
    </div>
  );
}