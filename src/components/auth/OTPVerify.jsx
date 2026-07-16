import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { verifyOtp } from '../../store/authSlice';
import { useNavigate, useLocation } from 'react-router-dom';

export default function OTPVerify() {
  const [otp, setOtp] = useState('');
  const [location, setLocation] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { phone, role } = state || {};
  const { loading, error } = useSelector(s => s.auth);

  const captureLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          alert('Location captured successfully');
        },
        (err) => {
          alert('Location permission denied');
          console.error(err);
        }
      );
    } else {
      alert('Geolocation not supported');
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    await dispatch(verifyOtp({ phone, otp, latitude: location?.lat, longitude: location?.lng }));
    if (!error) navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <form onSubmit={handleVerify} className="bg-[#0c0c0e] border border-[#2ecc71]/30 p-8 rounded-2xl w-full max-w-sm">
        <h1 className="text-[#2ecc71] text-2xl font-bold text-center mb-2">Enter OTP</h1>
        <p className="text-xs text-[#555] text-center mb-4">Sent to {phone}</p>
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        <input
          type="text"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="6-digit OTP"
          required
          className="w-full p-3 bg-[#111] border border-[#222] rounded-lg text-white outline-none focus:border-[#2ecc71] mb-4 text-center text-2xl tracking-widest"
        />
        <button
          type="button"
          onClick={captureLocation}
          className="w-full py-2 bg-[#111] border border-[#333] text-[#aaa] rounded-lg mb-3 text-sm"
        >
          {location ? 'Location Captured ✅' : 'Get Current Location'}
        </button>
        <button type="submit" disabled={loading} className="w-full py-3 bg-[#0d4f2b] text-[#2ecc71] border border-[#2ecc71] rounded-lg font-bold hover:bg-[#2ecc71] hover:text-black transition disabled:opacity-50">
          {loading ? 'Verifying...' : 'Verify & Login'}
        </button>
      </form>
    </div>
  );
}