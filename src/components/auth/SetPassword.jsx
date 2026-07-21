import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPassword } from '../../store/authSlice';
import { useNavigate } from 'react-router-dom';
import PatternLock from './PatternLock';

export default function SetPassword() {
  const [pattern, setPattern] = useState(null);
  const [showPattern, setShowPattern] = useState(true); // open immediately
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);

  const handlePatternComplete = async (seq) => {
    if (seq) {
      setPattern(seq);
      setShowPattern(false);
      const result = await dispatch(setPassword(seq)); // seq is the password
      if (setPassword.fulfilled.match(result)) {
        navigate('/');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="bg-[#0c0c0e] border border-[#2ecc71]/30 p-8 rounded-2xl w-full max-w-sm text-center">
        <h1 className="text-[#2ecc71] text-2xl font-bold mb-2">Set Phone Lock</h1>
        <p className="text-xs text-[#555] mb-4">Draw a pattern you'll remember</p>
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

        {showPattern && (
          <PatternLock onPatternComplete={handlePatternComplete} size={280} />
        )}

        {!showPattern && (
          <p className="text-[#2ecc71]">Pattern saved. Loading...</p>
        )}
      </div>
    </div>
  );
}