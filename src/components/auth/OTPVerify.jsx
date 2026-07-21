import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { verifyOtp } from '../../store/authSlice';
import { useNavigate, useLocation } from 'react-router-dom';

export default function OTPVerify() {
  const [otp, setOtp] = useState('');
  const [location, setLocation] = useState(null);
  const [autoReadStatus, setAutoReadStatus] = useState('');
  const inputRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { phone, role } = state || {};
  const { loading, error } = useSelector((s) => s.auth);

  useEffect(() => {
    if (!window.OTPCredential) {
      setAutoReadStatus('Waiting for SMS...');
      return;
    }
    const ac = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ['sms'] }, signal: ac.signal })
      .then((otpCred) => {
        if (otpCred && otpCred.code) {
          setOtp(otpCred.code);
          setAutoReadStatus('✅ OTP auto‑filled');
          setTimeout(() => {
            dispatch(verifyOtp({ phone, otp: otpCred.code, latitude: location?.lat, longitude: location?.lng }))
              .then((res) => {
                if (res.payload?.user?.hasPassword) navigate('/');
                else navigate('/set-password');
              });
          }, 500);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.log('WebOTP error:', err);
        setAutoReadStatus('Waiting for SMS...');
      });
    return () => ac.abort();
  }, [phone, location, dispatch, navigate]);

  useEffect(() => {
    if (inputRef.current && !otp) inputRef.current.focus();
  }, [otp]);

  const captureLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => alert('Location permission denied')
      );
    } else alert('Geolocation not supported');
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) return;
    const result = await dispatch(verifyOtp({ phone, otp, latitude: location?.lat, longitude: location?.lng }));
    if (verifyOtp.fulfilled.match(result)) {
      if (result.payload.user.hasPassword) navigate('/');
      else navigate('/set-password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <form onSubmit={handleVerify} className="bg-[#0c0c0e] border border-[#2ecc71]/30 p-8 rounded-2xl w-full max-w-sm">
        <h1 className="text-[#2ecc71] text-2xl font-bold text-center mb-2">Enter OTP</h1>
        <p className="text-xs text-[#555] text-center mb-4">Sent to {phone}</p>
        {autoReadStatus && (
          <p className={`text-xs text-center mb-2 ${autoReadStatus.includes('✅') ? 'text-[#2ecc71]' : 'text-[#555]'}`}>
            {autoReadStatus}
          </p>
        )}
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        <input ref={inputRef} type="text" maxLength={6} value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit OTP" required autoComplete="one-time-code" inputMode="numeric"
          className="w-full p-3 bg-[#111] border border-[#222] rounded-lg text-white outline-none focus:border-[#2ecc71] mb-4 text-center text-2xl tracking-widest" />
        <button type="button" onClick={captureLocation}
          className="w-full py-2 bg-[#111] border border-[#333] text-[#aaa] rounded-lg mb-3 text-sm">
          {location ? 'Location Captured ✅' : 'Get Current Location'}
        </button>
        <button type="submit" disabled={loading || otp.length !== 6}
          className="w-full py-3 bg-[#0d4f2b] text-[#2ecc71] border border-[#2ecc71] rounded-lg font-bold hover:bg-[#2ecc71] hover:text-black transition disabled:opacity-50">
          {loading ? 'Verifying...' : 'Verify & Login'}
        </button>
      </form>
    </div>
  );
}