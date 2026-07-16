import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { addToCart } from '../store/cartSlice';
import { db } from '../utils/database';
import { parseScanWithLLM } from '../utils/search';
import jsQR from 'jsqr';
import { FaCamera, FaLightbulb } from 'react-icons/fa';

export default function ScannerPOS({ mini = false, onScanSuccess = null }) {
  const dispatch = useDispatch();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanStatus, setScanStatus] = useState('');
  const [cameraStarted, setCameraStarted] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const activeScanning = useRef(true);
  const streamRef = useRef(null);
  const lastScanTime = useRef(0);
  const processingRef = useRef(false);   // prevent overlapping async calls

  const stopExistingStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    stopExistingStream();
    const constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 }
      },
      audio: false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setCameraStarted(true);
    } catch (err) {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = fallbackStream;
        setCameraStarted(true);
      } catch (fallbackErr) {
        setScanStatus('Camera permission denied');
      }
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;
    try {
      const newState = !torchOn;
      await videoTrack.applyConstraints({ advanced: [{ torch: newState }] });
      setTorchOn(newState);
    } catch (err) {
      alert('Torch not available');
    }
  };

  useEffect(() => {
    if (cameraStarted && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.onloadedmetadata = () => {
        video.play().then(() => {
          setScanStatus('Camera active');
          startScanningLoop();
        }).catch(() => setScanStatus('Tap to start'));
      };
    }
  }, [cameraStarted]);

  const startScanningLoop = () => {
    if (window.BarcodeDetector) {
      const detector = new window.BarcodeDetector({
        formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'upc_a']
      });
      const intervalId = setInterval(async () => {
        if (!activeScanning.current || !videoRef.current || processingRef.current) return;
        if (videoRef.current.readyState >= 2) {
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              processingRef.current = true;  // block new detections
              await handleCodeDetected(barcodes[0].rawValue);
              processingRef.current = false;
            }
          } catch (err) {}
        }
      }, 150);
      return () => clearInterval(intervalId);
    } else {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });
      const intervalId = setInterval(() => {
        if (!activeScanning.current || !videoRef.current || !canvas || !ctx || processingRef.current) return;
        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code) {
            processingRef.current = true;
            handleCodeDetected(code.data);
            processingRef.current = false;
          }
        }
      }, 200);
      return () => clearInterval(intervalId);
    }
  };

  useEffect(() => {
    return () => stopExistingStream();
  }, []);

  const handleCodeDetected = async (code) => {
    const now = Date.now();
    // 2‑second cooldown – same barcode won't be processed twice within 2s
    if (now - lastScanTime.current < 2000) return;
    lastScanTime.current = now;

    if (onScanSuccess) {
      setScanStatus('Token captured...');
      await onScanSuccess(code);
      return;
    }

    setScanStatus('Analyzing...');
    try {
      const internalToken = JSON.parse(code);
      if (internalToken?.type === 'PRODUCT' && internalToken.id) {
        const match = await db.products.get(Number(internalToken.id) || internalToken.id);
        if (match) {
          dispatch(addToCart({
            productId: match.id,
            name: match.name,
            price: match.price,
            quantity: 1,
            unitType: match.unitType || 'unit',
            image: match.image || ''
          }));
          setScanStatus(`Added: ${match.name}`);
          return;
        }
      }
    } catch (e) {}

    const matched = await db.products.where('barcode').equals(code).first();
    if (matched) {
      dispatch(addToCart({
        productId: matched.id,
        name: matched.name,
        price: matched.price,
        quantity: 1,
        unitType: matched.unitType || 'unit',
        image: matched.image || ''
      }));
      setScanStatus(`Scanned: ${matched.name}`);
    } else {
      setScanStatus('AI parsing...');
      try {
        const aiParsed = await parseScanWithLLM(code);
        const id = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        dispatch(addToCart({
          productId: id,
          name: aiParsed.name,
          price: aiParsed.price,
          quantity: 1,
          unitType: 'unit'
        }));
        setScanStatus(`AI: ${aiParsed.name}`);
      } catch {
        setScanStatus('Unknown code');
      }
    }
  };

  if (mini) {
    return (
      <div className="w-full h-[150px] relative bg-[#09090b] rounded-lg border border-[#1a1a1f] overflow-hidden flex items-center px-3">
        {!cameraStarted ? (
          <button onClick={startCamera} className="text-xs text-[#2ecc71] border border-[#2ecc71]/30 px-3 py-1 rounded bg-[#0d2b1a]">
            కెమెరా ప్రారంభించండి
          </button>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay playsInline muted
              style={{ display: 'block', width: '96px', height: '120px' }}
              className="object-cover rounded opacity-90 border border-[#222] bg-black"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex-1 pl-3 font-mono">
              {scanStatus ? (
                <span className="text-[11px] text-[#2ecc71] animate-pulse block truncate">{scanStatus}</span>
              ) : (
                <div className="flex items-center gap-1.5 text-[#555]">
                  <FaCamera size={10} className="text-[#2ecc71]/50" />
                  <span className="text-[10px] uppercase tracking-wider">Mini Lens Active</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black relative flex flex-col items-center justify-center">
      {!cameraStarted ? (
        <button
          onClick={startCamera}
          className="bg-[#0d2b1a] text-[#2ecc71] border border-[#2ecc71]/40 px-6 py-3 rounded-xl font-bold text-sm"
        >
          📷 కెమెరా ప్రారంభించండి
        </button>
      ) : (
        <div className="w-full h-full relative">
          <video
            ref={videoRef}
            autoPlay playsInline muted
            className="absolute inset-0 w-full h-full object-cover opacity-90 bg-black"
          />
          <canvas ref={canvasRef} className="hidden" />

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-24 border border-dashed border-[#2ecc71]/40 rounded relative">
              <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-[#2ecc71]" />
              <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-[#2ecc71]" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-[#2ecc71]" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-[#2ecc71]" />
            </div>
          </div>

          <button
            onClick={toggleTorch}
            className={`absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center ${
              torchOn ? 'bg-yellow-400 text-black' : 'bg-black/60 text-white'
            }`}
            title="Toggle Flashlight"
          >
            <FaLightbulb size={18} />
          </button>

          {scanStatus && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 border border-[#2ecc71] px-4 py-1.5 rounded-full text-xs text-[#2ecc71] font-mono max-w-[90%] truncate z-10">
              {scanStatus}
            </div>
          )}
        </div>
      )}
    </div>
  );
}