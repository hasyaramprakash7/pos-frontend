import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addProduct, updateProduct, closeProductForm } from '../store/productsSlice';
import ScannerPOS from './ScannerPOS';
import axios from '../api/axios';
import { db } from '../utils/database';
import {
  FaTimes, FaQrcode, FaImage, FaUpload, FaTrash
} from 'react-icons/fa';

export default function ProductForm() {
  const dispatch = useDispatch();
  const editingProduct = useSelector(s => s.products.editingProduct);
  const status = useSelector(s => s.products.status);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [categoryType, setCategoryType] = useState('REGULAR');
  const [unitType, setUnitType] = useState('unit');
  const [stock, setStock] = useState('');
  const [image, setImage] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const barcodeTimer = useRef(null);

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name || '');
      setPrice(editingProduct.price?.toString() || '');
      setBarcode(editingProduct.barcode || '');
      setDescription(editingProduct.description || '');
      setCategoryType(editingProduct.categoryType || 'REGULAR');
      setUnitType(editingProduct.unitType || 'unit');
      setStock(editingProduct.stock !== undefined ? editingProduct.stock.toString() : '');
      setImage(editingProduct.image || '');
    } else {
      setName(''); setPrice(''); setBarcode(''); setDescription('');
      setCategoryType('REGULAR'); setUnitType('unit');
      setStock(''); setImage('');
    }
  }, [editingProduct]);

  // AUTO‑FILL FROM BARCODE (local Dexie → backend)
  useEffect(() => {
    if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
    if (!barcode || barcode.trim() === '' || editingProduct) return;

    barcodeTimer.current = setTimeout(async () => {
      try {
        let found = null;

        // 1. Try local Dexie first (fast)
        found = await db.products.where('barcode').equals(barcode.trim()).first();

        // 2. If not found locally and online, ask the backend
        if (!found && navigator.onLine) {
          try {
            const { data } = await axios.get(`/products/by-barcode/${encodeURIComponent(barcode.trim())}`);
            found = data;
          } catch (err) {
            // Product not found on server – that's fine, do nothing
          }
        }

        if (found) {
          setName(found.name || '');
          setPrice(found.price?.toString() || '');
          setDescription(found.description || '');
          setCategoryType(found.categoryType || found.category || 'REGULAR');
          setUnitType(found.unitType || found.unit || 'unit');
          setImage(found.image || found.imageUrl || '');
        }
      } catch (err) {
        console.error('Auto‑fill lookup error:', err);
      }
    }, 500);

    return () => clearTimeout(barcodeTimer.current);
  }, [barcode, editingProduct]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await axios.post('/upload/image-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setImage(res.data.url);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Image upload failed. Check your backend connection.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Simply capture the scanned code – no AI processing
  const handleInventoryScan = (codeData) => {
    setBarcode(codeData);
    setIsScannerOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'loading' || uploading) return;

    const finalBarcode = barcode.trim() === '' ? null : barcode;

    const product = {
      name,
      price: parseFloat(price),
      barcode: finalBarcode,
      description,
      categoryType,
      unitType,
      stock: stock === '' ? undefined : parseFloat(stock),
      image: image || '',
    };

    if (editingProduct) {
      await dispatch(updateProduct({ ...editingProduct, ...product }));
    } else {
      await dispatch(addProduct(product));
    }
    dispatch(closeProductForm());
  };

  const isSubmitting = status === 'loading';

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-[#0c0c0e] border border-[#2ecc71]/40 p-6 rounded-2xl w-full max-w-md font-mono relative shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-5 border-b border-[#141416] pb-3">
          <h2 className="text-[#2ecc71] text-base font-bold tracking-wider uppercase">
            {editingProduct ? 'Modify Asset' : 'Register New Asset'}
          </h2>
          <button type="button" onClick={() => dispatch(closeProductForm())} className="text-[#555] hover:text-white"><FaTimes size={16} /></button>
        </div>

        {isScannerOpen ? (
          <div className="mb-4 border border-dashed border-[#2ecc71]/40 rounded-xl overflow-hidden h-44 relative bg-black">
            <ScannerPOS mini={false} onScanSuccess={handleInventoryScan} />
            <button type="button" onClick={() => setIsScannerOpen(false)} className="absolute top-2 right-2 z-20 bg-black/80 text-xs text-white px-2 py-1 rounded border border-[#222]">Kill Stream</button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            disabled={isSubmitting}
            className={`w-full mb-4 py-3 bg-[#111] hover:bg-[#16161a] border border-[#222] hover:border-[#2ecc71]/40 text-[#aaa] hover:text-[#2ecc71] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <FaQrcode /> Scan & Generate Direct Embeddings
          </button>
        )}

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="text-[#555] uppercase tracking-wider block mb-1.5">Asset Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full p-2.5 bg-[#111] border border-[#222] focus:border-[#2ecc71] rounded-lg text-white outline-none" />
          </div>
          <div>
            <label className="text-[#555] uppercase tracking-wider block mb-1.5">Base Value (₹)</label>
            <input value={price} onChange={e => setPrice(e.target.value)} type="number" step="0.01" required
              className="w-full p-2.5 bg-[#111] border border-[#222] focus:border-[#2ecc71] rounded-lg text-white outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-[#555] uppercase tracking-wider block mb-1.5">Category</label>
              <select value={categoryType} onChange={e => setCategoryType(e.target.value)}
                className="w-full p-2.5 bg-[#111] border border-[#222] focus:border-[#2ecc71] rounded-lg text-white outline-none text-xs font-mono">
                <option value="REGULAR">Regular / Loose</option>
                <option value="QR">QR Package</option>
              </select>
            </div>
            <div>
              <label className="text-[#555] uppercase tracking-wider block mb-1.5">Unit Metrics</label>
              <select value={unitType} onChange={e => setUnitType(e.target.value)}
                className="w-full p-2.5 bg-[#111] border border-[#222] focus:border-[#2ecc71] rounded-lg text-white outline-none text-xs font-mono">
                <option value="unit">Per Unit</option>
                <option value="kg">By Weight (kg)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[#555] uppercase tracking-wider block mb-1.5">Initial Stock Qty</label>
            <input value={stock} onChange={e => setStock(e.target.value)} type="number" step="any"
              className="w-full p-2.5 bg-[#111] border border-[#222] focus:border-[#2ecc71] rounded-lg text-white outline-none" />
          </div>
          <div>
            <label className="text-[#555] uppercase tracking-wider block mb-1.5">Barcode / Token</label>
            <input value={barcode} onChange={e => setBarcode(e.target.value)}
              className="w-full p-2.5 bg-[#111] border border-[#222] focus:border-[#2ecc71] rounded-lg text-white outline-none text-[11px]" />
          </div>

          {/* IMAGE UPLOAD */}
          <div>
            <label className="text-[#555] uppercase tracking-wider block mb-1.5 flex items-center gap-2">
              <FaImage className="text-[#2ecc71]" /> Product Image
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
                id="imageUpload"
              />
              <label htmlFor="imageUpload" className={`flex items-center gap-1 bg-[#111] border border-[#222] hover:border-[#2ecc71]/40 text-[#aaa] hover:text-[#2ecc71] px-3 py-2 rounded-lg cursor-pointer text-xs font-bold transition ${uploading ? 'opacity-50 cursor-wait' : ''}`}>
                <FaUpload size={12} /> {uploading ? 'Uploading...' : 'Choose File'}
              </label>
              {image && (
                <button type="button" onClick={handleRemoveImage} className="text-[#e74c3c] hover:text-red-400 text-xs flex items-center gap-1">
                  <FaTrash size={12} /> Remove
                </button>
              )}
            </div>
            {image && (
              <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border border-[#2ecc71]/30">
                <img
                  src={image}
                  alt={name || 'Product image'}
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentNode.innerHTML = '<div class="w-20 h-20 bg-[#222] rounded-lg flex items-center justify-center text-xs text-red-500">Broken</div>';
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-[#555] uppercase tracking-wider block mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full p-2.5 bg-[#111] border border-[#222] focus:border-[#2ecc71] rounded-lg text-white outline-none resize-none" />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || uploading}
          className={`w-full mt-5 py-3 bg-[#0d2b1a] hover:bg-[#2ecc71] text-[#2ecc71] hover:text-black border border-[#2ecc71]/40 rounded-xl font-bold text-xs uppercase transition-all duration-150 ${(isSubmitting || uploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSubmitting ? 'Processing...' : 'Commit Entry to Local Cluster'}
        </button>
      </form>
    </div>
  );
}