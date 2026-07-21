import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../store/cartSlice';
import { db } from '../utils/database';
import { searchProducts } from '../utils/search';
import Cart from './Cart';
import Checkout from './Checkout';
import {
  FaSearch,
  FaWeightHanging,
  FaQrcode,
  FaMicrophone,
  FaMicrophoneSlash,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
} from 'react-icons/fa';

export default function SearchBillingInterface() {
  const dispatch = useDispatch();
  const [query, setQuery] = useState('');
  const [qrProducts, setQrProducts] = useState([]);
  const [looseProducts, setLooseProducts] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);

  const [weightModalTarget, setWeightModalTarget] = useState(null);
  const [customWeight, setCustomWeight] = useState('1');

  const [unitModalTarget, setUnitModalTarget] = useState(null);
  const [customUnitQty, setCustomUnitQty] = useState('1');

  const [isCartExpanded, setIsCartExpanded] = useState(false);

  const theme = useSelector(s => s.settings.theme);
  const isLight = theme === 'light';

  // ---------- Continuous voice assistant (unchanged) ----------
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState(null);
  const recognitionRef = useRef(null);
  const listeningRef = useRef(isListening);
  const processedTranscripts = useRef(new Set());
  const speechSupported =
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  useEffect(() => {
    listeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    if (!speechSupported) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const transcript = result[0].transcript.trim().toLowerCase();
          if (processedTranscripts.current.has(transcript)) continue;
          processedTranscripts.current.add(transcript);
          handleVoiceInput(transcript);
        }
      }
    };

    rec.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
      }
    };

    rec.onend = () => {
      if (listeningRef.current) {
        try { rec.start(); } catch (e) { }
      }
    };

    recognitionRef.current = rec;
    return () => rec.abort();
  }, [speechSupported]);

  useEffect(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (isListening) {
      processedTranscripts.current.clear();
      try { rec.start(); } catch (e) { }
    } else {
      try { rec.stop(); } catch (e) { }
    }
  }, [isListening]);

  const handleVoiceInput = async (transcript) => {
    const regex = /^(\d{1,3})\s+(.+)|(.+?)\s+(\d{1,3})$/i;
    const match = transcript.match(regex);
    let quantity = null;
    let productName = null;

    if (match) {
      if (match[1]) {
        quantity = parseInt(match[1], 10);
        productName = match[2].trim();
      } else if (match[4]) {
        quantity = parseInt(match[4], 10);
        productName = match[3].trim();
      }
    }

    if (!quantity || !productName) {
      productName = transcript;
      quantity = 1;
    }

    await addProductByVoice(productName, quantity);
  };

  // ---------- Shared fuzzy matching helpers ----------
  const tokenize = (str) =>
    str.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

  const levenshtein = (a, b) => {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)
        );
      }
    }
    return dp[m][n];
  };

  const charSimilarity = (a, b) => {
    const len = Math.max(a.length, b.length);
    if (len === 0) return 1.0;
    const dist = levenshtein(a, b);
    return 1 - dist / len;
  };

  const computeSimilarity = (searchStr, productName) => {
    const a = searchStr.toLowerCase();
    const b = productName.toLowerCase();
    if (a === b) return 1.0;
    if (b.includes(a) || a.includes(b)) return 0.9;

    const wordsA = tokenize(a);
    const wordsB = tokenize(b);
    const intersection = wordsA.filter(w => wordsB.includes(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    const jaccard = union ? intersection / union : 0;

    const substringMatch = wordsA.some(w =>
      wordsB.some(bw => bw.includes(w) || w.includes(bw))
    );
    const charSim = charSimilarity(a, b);

    return Math.max(jaccard, substringMatch ? 0.7 : 0, charSim);
  };

  const getBestMatch = async (searchTerm, allItems) => {
    let candidates = allItems;
    try {
      const aiResults = await searchProducts(searchTerm, allItems);
      if (aiResults.length > 0 && aiResults.length < allItems.length) {
        candidates = aiResults;
      }
    } catch (e) { }

    let bestScore = 0;
    let bestProduct = null;
    for (const product of candidates) {
      const score = computeSimilarity(searchTerm, product.name);
      if (score > bestScore) {
        bestScore = score;
        bestProduct = product;
      }
    }
    return bestScore >= 0.6 ? bestProduct : null;
  };

  const addProductByVoice = async (name, qty) => {
    const allItems = await db.products.toArray();
    if (allItems.length === 0) {
      showFeedback('error', 'No products in inventory');
      return;
    }
    const product = await getBestMatch(name, allItems);
    if (!product) {
      showFeedback('error', `"${name}" not found`);
      return;
    }
    dispatch(addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: qty,
      unitType: product.unitType || 'unit',
      image: product.image || '',
    }));
    showFeedback('success', `Added ${qty} ${product.unitType === 'kg' ? 'kg' : 'unit(s)'} of ${product.name}`);
  };

  const showFeedback = (type, message) => {
    setVoiceFeedback({ type, message });
    setTimeout(() => setVoiceFeedback(null), 3000);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }
    setIsListening(prev => !prev);
  };

  // ---------- Enhanced manual search with scoring ----------
  useEffect(() => {
    const doSearch = async () => {
      const allItems = await db.products.toArray();
      if (!query.trim()) {
        setLooseProducts(allItems.filter(p => p.unitType === 'kg'));
        setQrProducts(allItems.filter(p => p.unitType !== 'kg'));
        return;
      }

      // Use AI to narrow down if possible
      let candidates = allItems;
      try {
        const aiResults = await searchProducts(query, allItems);
        if (aiResults.length > 0 && aiResults.length < allItems.length) {
          candidates = aiResults;
        }
      } catch (e) {
        // fallback to all items
      }

      // Score and sort by similarity
      const scored = candidates.map(product => ({
        product,
        score: computeSimilarity(query, product.name),
      }));
      scored.sort((a, b) => b.score - a.score);

      // Separate by unit type while preserving sorted order
      const loose = scored
        .filter(s => s.product.unitType === 'kg')
        .map(s => s.product);
      const qr = scored
        .filter(s => s.product.unitType !== 'kg')
        .map(s => s.product);

      setLooseProducts(loose);
      setQrProducts(qr);
    };

    const timer = setTimeout(doSearch, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleProductSelect = (product) => {
    if (product.unitType === 'kg') {
      setCustomWeight('1');
      setWeightModalTarget(product);
    } else {
      setCustomUnitQty('1');
      setUnitModalTarget(product);
    }
  };

  const commitWeightItem = () => {
    if (!weightModalTarget) return;
    const qty = parseFloat(customWeight) || 1;
    dispatch(addToCart({
      productId: weightModalTarget.id,
      name: weightModalTarget.name,
      price: weightModalTarget.price,
      quantity: qty,
      unitType: 'kg',
      image: weightModalTarget.image || '',
    }));
    setWeightModalTarget(null);
  };

  const commitUnitItem = () => {
    if (!unitModalTarget) return;
    const qty = parseInt(customUnitQty, 10) || 1;
    dispatch(addToCart({
      productId: unitModalTarget.id,
      name: unitModalTarget.name,
      price: unitModalTarget.price,
      quantity: qty,
      unitType: 'unit',
      image: unitModalTarget.image || '',
    }));
    setUnitModalTarget(null);
  };

  const ProductButton = ({ product, unitLabel, unitColor }) => (
    <button
      onClick={() => handleProductSelect(product)}
      className={`p-2 border rounded-xl flex items-center gap-2 transition-all active:scale-95 ${isLight
        ? 'bg-white border-gray-200 hover:border-green-400'
        : 'bg-[#0a0a0a] border-[#1c1c1e] hover:border-[#2ecc71]/40'
        }`}
    >
      {product.image ? (
        <img src={product.image} alt={product.name} crossOrigin="anonymous"
          className="w-10 h-10 object-cover rounded border border-[#2ecc71]/30 shrink-0"
          onError={(e) => {
            e.target.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = `w-10 h-10 rounded flex items-center justify-center text-xs shrink-0 font-bold ${isLight ? 'bg-gray-100 text-gray-400' : 'bg-[#222] text-[#555]'
              }`;
            fallback.textContent = product.name.charAt(0).toUpperCase();
            e.target.parentNode.insertBefore(fallback, e.target);
          }}
        />
      ) : (
        <div className={`w-10 h-10 rounded flex items-center justify-center text-xs shrink-0 font-bold ${isLight ? 'bg-gray-100 text-gray-400' : 'bg-[#222] text-[#555]'
          }`}>
          {product.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0 text-left">
        <span className={`text-xs font-bold block truncate ${isLight ? 'text-gray-800' : 'text-white'}`}>
          {product.name}
        </span>
        <span className="text-[#2ecc71] text-xs font-semibold">₹{product.price.toFixed(2)}</span>
      </div>
      <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${unitColor}`}>{unitLabel}</span>
    </button>
  );

  return (
    <div className={`flex flex-col h-full w-full overflow-hidden font-mono select-none ${isLight ? 'bg-gray-50' : 'bg-black'
      }`}>
      {voiceFeedback && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2 rounded-xl text-sm shadow-lg ${voiceFeedback.type === 'success' ? 'bg-green-800 text-green-200' :
          voiceFeedback.type === 'error' ? 'bg-red-800 text-red-200' : 'bg-gray-800 text-gray-200'
          }`}>
          <span className="flex items-center gap-2">
            {voiceFeedback.type === 'success' && <FaCheckCircle />}
            {voiceFeedback.message}
          </span>
        </div>
      )}

      {/* Search section (hidden when cart expanded) */}
      <div className={`${isCartExpanded ? 'hidden' : 'h-[60%]'
        } p-4 flex flex-col overflow-hidden border-b ${isLight ? 'border-gray-200' : 'border-[#141416]'
        }`}>
        <div className="relative mb-3 shrink-0">
          <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${isLight ? 'text-gray-400' : 'text-[#555]'}`}>
            <FaSearch size={14} />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or tap mic (speak e.g., Coffee, 2 Dark Chocolate)"
            className={`w-full pl-10 pr-12 py-3 border rounded-xl outline-none text-sm transition-all ${isLight
              ? 'bg-white border-gray-300 focus:border-green-500 text-gray-800 placeholder-gray-400'
              : 'bg-[#0a0a0a] border-[#222] focus:border-[#2ecc71] text-white placeholder-gray-600'
              }`}
          />
          <button
            onClick={toggleListening}
            disabled={!speechSupported}
            title={speechSupported ? (isListening ? 'Stop continuous listening' : 'Start continuous voice') : 'Speech not supported'}
            className={`absolute inset-y-0 right-0 flex items-center pr-3 text-lg transition-colors ${!speechSupported ? 'text-gray-600 cursor-not-allowed' :
              isListening ? 'text-red-500 animate-pulse' : 'text-[#2ecc71] hover:text-green-400'
              }`}
          >
            {isListening ? <FaMicrophoneSlash /> : <FaMicrophone />}
          </button>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
          {/* Loose products */}
          <div className={`flex flex-col overflow-hidden border p-3 rounded-xl ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-[#111]'}`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${isLight ? 'text-gray-600' : 'text-[#aaa]'}`}>
              <FaWeightHanging className="text-amber-500" /> Loose Assets / Weight Base Products
            </h4>
            <div className="flex-1 overflow-y-auto grid grid-cols-1 gap-2 content-start pr-1 scrollbar-thin">
              {looseProducts.map(p => (
                <ProductButton key={p.id} product={p} unitLabel="KG" unitColor="bg-[#111] text-amber-500" />
              ))}
            </div>
          </div>
          {/* QR products */}
          <div className={`flex flex-col overflow-hidden border p-3 rounded-xl ${isLight ? 'bg-white border-gray-200' : 'bg-[#050505] border-[#111]'}`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${isLight ? 'text-gray-600' : 'text-[#aaa]'}`}>
              <FaQrcode className="text-[#2ecc71]" /> QR Indexed / Scanning Assets
            </h4>
            <div className="flex-1 overflow-y-auto grid grid-cols-1 gap-2 content-start pr-1 scrollbar-thin">
              {qrProducts.map(p => (
                <ProductButton key={p.id} product={p} unitLabel="UNIT" unitColor="bg-[#111] text-[#2ecc71]" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cart section – expandable */}
      <div className={`${isCartExpanded ? 'h-full' : 'h-[40%]'
        } flex flex-col overflow-hidden ${isLight ? 'bg-white' : 'bg-[#050505]'}`}>
        <div
          className="flex items-center justify-between px-3 py-1 border-b border-[#0d4f2b] cursor-pointer"
          onClick={() => setIsCartExpanded(!isCartExpanded)}
        >
          <span className="text-[#2ecc71] font-bold text-sm">Cart</span>
          <span className="text-[#2ecc71]">
            {isCartExpanded ? <FaChevronDown /> : <FaChevronUp />}
          </span>
        </div>
        <Cart onCheckout={() => setShowCheckout(true)} />
      </div>

      {showCheckout && <Checkout onClose={() => setShowCheckout(false)} />}

      {/* Weight modal (kg) */}
      {weightModalTarget && (
        <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
          <div className={`border-amber-500/40 p-5 rounded-2xl w-full max-w-xs text-center ${isLight ? 'bg-white' : 'bg-[#0c0c0e]'}`}>
            {weightModalTarget.image ? (
              <img src={weightModalTarget.image} alt={weightModalTarget.name} crossOrigin="anonymous"
                className="w-16 h-16 object-cover rounded-full mx-auto mb-2 border border-amber-500/30"
                onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center bg-[#222] text-[#555] text-xl font-bold border border-amber-500/30">
                {weightModalTarget.name.charAt(0).toUpperCase()}
              </div>
            )}
            <h3 className={`text-sm font-bold uppercase mb-1 ${isLight ? 'text-gray-800' : 'text-white'}`}>{weightModalTarget.name}</h3>
            <p className={`text-xs mb-4 ${isLight ? 'text-gray-600' : 'text-[#555]'}`}>Base Rate: ₹{weightModalTarget.price}/kg</p>
            <div className={`flex items-center gap-2 mb-4 p-1 rounded-xl border ${isLight ? 'bg-gray-100 border-gray-300' : 'bg-black border-[#222]'}`}>
              <input type="number" step="0.001" value={customWeight} onChange={e => setCustomWeight(e.target.value)}
                className={`w-full bg-transparent text-center font-bold outline-none py-1.5 text-base ${isLight ? 'text-gray-800' : 'text-white'}`}
                autoFocus />
              <span className="text-xs text-amber-500 font-bold pr-3">KG</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button onClick={() => setWeightModalTarget(null)}
                className={`py-2 rounded-lg border ${isLight ? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-[#1c1c1e] text-[#aaa] border-[#222]'}`}>Cancel</button>
              <button onClick={commitWeightItem} className="py-2 bg-amber-600 text-white rounded-lg">Confirm Item</button>
            </div>
          </div>
        </div>
      )}

      {/* Unit modal */}
      {unitModalTarget && (
        <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
          <div className={`border-[#2ecc71]/40 p-5 rounded-2xl w-full max-w-xs text-center ${isLight ? 'bg-white' : 'bg-[#0c0c0e]'}`}>
            {unitModalTarget.image ? (
              <img src={unitModalTarget.image} alt={unitModalTarget.name} crossOrigin="anonymous"
                className="w-16 h-16 object-cover rounded-full mx-auto mb-2 border border-[#2ecc71]/30"
                onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center bg-[#222] text-[#555] text-xl font-bold border border-[#2ecc71]/30">
                {unitModalTarget.name.charAt(0).toUpperCase()}
              </div>
            )}
            <h3 className={`text-sm font-bold uppercase mb-1 ${isLight ? 'text-gray-800' : 'text-white'}`}>{unitModalTarget.name}</h3>
            <p className={`text-xs mb-4 ${isLight ? 'text-gray-600' : 'text-[#555]'}`}>Price per unit: ₹{unitModalTarget.price.toFixed(2)}</p>
            <div className={`flex items-center gap-2 mb-4 p-1 rounded-xl border ${isLight ? 'bg-gray-100 border-gray-300' : 'bg-black border-[#222]'}`}>
              <input type="number" step="1" min="1" value={customUnitQty} onChange={e => setCustomUnitQty(e.target.value)}
                className={`w-full bg-transparent text-center font-bold outline-none py-1.5 text-base ${isLight ? 'text-gray-800' : 'text-white'}`}
                autoFocus />
              <span className="text-xs text-[#2ecc71] font-bold pr-3">UNIT(S)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button onClick={() => setUnitModalTarget(null)}
                className={`py-2 rounded-lg border ${isLight ? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-[#1c1c1e] text-[#aaa] border-[#222]'}`}>Cancel</button>
              <button onClick={commitUnitItem}
                className="py-2 bg-[#0d4f2b] text-[#2ecc71] border border-[#2ecc71] rounded-lg">Add {customUnitQty || '1'} Item(s)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}