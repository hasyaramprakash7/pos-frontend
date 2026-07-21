import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { db } from '../utils/database';
import { generateProductEmbedding } from '../utils/search';
import api from '../api/axios';
import { syncLocalToBackend } from '../services/syncService';

const generateUniqueBarcode = (name) => {
  const prefix = name ? name.substring(0, 3).toUpperCase() : 'PRD';
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
};

export const loadProducts = createAsyncThunk('products/load', async () => {
  return await db.products.toArray();
});

export const addProduct = createAsyncThunk('products/add', async (product, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const dealer = state.auth.user?.dealer || null;

    const finalBarcode = product.barcode && product.barcode.trim() !== ''
      ? product.barcode.trim()
      : generateUniqueBarcode(product.name);

    const finalProduct = { ...product, barcode: finalBarcode, synced: 0, dealer };

    let embedding = null;
    try {
      embedding = await generateProductEmbedding(finalProduct.name + ' ' + (finalProduct.description || ''));
    } catch (embedErr) {
      console.warn('⚠️ AI embedding unavailable – product added without vector search support.');
    }

    const id = await db.products.add({ ...finalProduct, embedding });
    syncLocalToBackend().catch(err => console.error('Auto‑sync failed:', err));

    return { ...finalProduct, id, embedding };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const updateProduct = createAsyncThunk('products/update', async (product, { getState }) => {
  const state = getState();
  const currentUser = state.auth.user;
  const dealer = currentUser?.dealer;
  const isDealer = currentUser?.role === 'dealer';

  const isOwn = (product.dealer && product.dealer === dealer) || !product.dealer;

  await db.products.put(product);

  if (navigator.onLine && product.barcode && product.stock !== undefined) {
    try {
      await api.post('/inventory/update-by-barcode', {
        barcode: product.barcode,
        stock: product.stock
      });
      console.log(`📤 Stock updated on server for ${product.name} → ${product.stock}`);
    } catch (err) {
      console.error('❌ Server stock update failed:', err);
    }
  }

  if (navigator.onLine && (isDealer || isOwn) && product.name) {
    const serverId = product._serverId || product._id;
    if (serverId && serverId.toString().length === 24) {
      try {
        const updatedFields = {
          name: product.name,
          price: product.price,
          category: product.categoryType,
          unit: product.unitType,
          description: product.description,
          imageUrl: product.image || '',
        };
        await api.put(`/products/${serverId}`, updatedFields);
        console.log(`✅ Metadata synced for ${product.name}`);
      } catch (err) {
        console.error('❌ Metadata sync failed:', err);
      }
    }
  }

  return product;
});

export const deleteProductAndVector = createAsyncThunk(
  'products/deletePermanent',
  async (id, { rejectWithValue }) => {
    try {
      if (id === undefined || id === null) throw new Error('Invalid product ID');
      const product = await db.products.get(id);
      const barcode = product?.barcode;

      if (navigator.onLine && barcode && barcode.trim() !== '') {
        try {
          await api.post('/inventory/delete', { barcode: barcode.trim() });
          console.log(`🗑️ Product with barcode ${barcode} deleted from server`);
        } catch (err) {
          console.error('❌ Server deletion failed:', err);
        }
      } else {
        console.warn('⚠️ Cannot delete from server – no barcode');
      }

      if (barcode && barcode.trim() !== '') {
        await db.deletedProducts.put({ barcode: barcode.trim() });
        console.log(`📝 Barcode ${barcode} added to deleted list`);
      }

      await db.products.delete(id);
      console.log(`🗑️ Product ${id} deleted from local DB`);
      return id;
    } catch (err) {
      console.error('❌ Delete product failed:', err);
      return rejectWithValue(err.message);
    }
  }
);

// Helper function to compute low stock list
const computeLowStock = (items) =>
  items.filter(p => p.stock !== undefined && p.stock <= 5);

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
    isProductFormOpen: false,
    editingProduct: null,
    lowStockProducts: []
  },
  reducers: {
    openProductForm(state, action) {
      state.isProductFormOpen = true;
      state.editingProduct = action.payload || null;
    },
    closeProductForm(state) {
      state.isProductFormOpen = false;
      state.editingProduct = null;
    },
    setLowStockProducts(state, action) {
      state.lowStockProducts = action.payload;
    },
    updateStockFromSocket(state, action) {
      const { productId, stock } = action.payload;
      // ✅ Compare as strings to handle number vs string
      const product = state.items.find(p => String(p.id) === String(productId));
      if (product) product.stock = stock;
      state.lowStockProducts = computeLowStock(state.items);
    },
    updateProductStock(state, action) {
      const { productId, stock } = action.payload;
      // ✅ Critical fix: use string comparison
      const product = state.items.find(p => String(p.id) === String(productId));
      if (product) product.stock = stock;
      state.lowStockProducts = computeLowStock(state.items);
    },
    setProducts(state, action) {
      state.items = action.payload;
      state.lowStockProducts = computeLowStock(state.items);
    }
  },
  extraReducers: builder => {
    builder
      .addCase(loadProducts.pending, (s) => { s.status = 'loading'; })
      .addCase(loadProducts.fulfilled, (s, a) => {
        s.status = 'succeeded';
        s.items = a.payload;
        s.lowStockProducts = computeLowStock(a.payload);
      })
      .addCase(loadProducts.rejected, (s, a) => { s.status = 'failed'; s.error = a.error.message; })
      .addCase(addProduct.pending, (s) => { s.status = 'loading'; })
      .addCase(addProduct.fulfilled, (s, a) => {
        s.status = 'succeeded';
        s.items.push(a.payload);
        s.lowStockProducts = computeLowStock(s.items);
      })
      .addCase(addProduct.rejected, (s, a) => { s.status = 'failed'; console.error(a.payload); })
      .addCase(updateProduct.fulfilled, (s, a) => {
        const idx = s.items.findIndex(p => p.id === a.payload.id);
        if (idx !== -1) s.items[idx] = a.payload;
        s.lowStockProducts = computeLowStock(s.items);
      })
      .addCase(deleteProductAndVector.fulfilled, (s, a) => {
        s.items = s.items.filter(p => p.id !== a.payload);
        s.lowStockProducts = computeLowStock(s.items);
      })
      .addCase(deleteProductAndVector.rejected, (s, a) => {
        alert(`Delete failed: ${a.payload || 'Unknown error'}`);
      });
  }
});

export const {
  openProductForm, closeProductForm, setLowStockProducts,
  updateStockFromSocket, updateProductStock, setProducts
} = productsSlice.actions;

export default productsSlice.reducer;