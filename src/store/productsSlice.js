import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { db } from '../utils/database';
import { generateProductEmbedding } from '../utils/search';
import api from '../api/axios';
import { syncLocalToBackend } from '../services/syncService';

// Helper to generate a unique barcode if none is provided
const generateUniqueBarcode = (name) => {
  const prefix = name ? name.substring(0, 3).toUpperCase() : 'PRD';
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
};

export const loadProducts = createAsyncThunk('products/load', async () => {
  return await db.products.toArray();
});

export const addProduct = createAsyncThunk('products/add', async (product, { rejectWithValue }) => {
  try {
    const finalBarcode = product.barcode && product.barcode.trim() !== ''
      ? product.barcode.trim()
      : generateUniqueBarcode(product.name);

    const finalProduct = { ...product, barcode: finalBarcode, synced: 0 };

    let embedding = null;
    try {
      embedding = await generateProductEmbedding(finalProduct.name + ' ' + (finalProduct.description || ''));
    } catch (embedErr) {
      console.warn('⚠️ AI embedding unavailable – product added without vector search support.');
    }

    const id = await db.products.add({ ...finalProduct, embedding });

    // Auto‑sync after adding
    syncLocalToBackend().catch(err => console.error('Auto‑sync failed:', err));

    return { ...finalProduct, id, embedding };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const updateProduct = createAsyncThunk('products/update', async (product) => {
  // 1. Update local Dexie
  await db.products.put(product);

  // 2. If online and product has a barcode, sync the stock to the server
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
  } else {
    console.warn('⚠️ Stock update skipped – offline or no barcode');
  }

  return product;
});

export const deleteProductAndVector = createAsyncThunk(
  'products/deletePermanent',
  async (id, { rejectWithValue }) => {
    try {
      if (id === undefined || id === null) {
        throw new Error('Invalid product ID');
      }

      const product = await db.products.get(id);
      const barcode = product?.barcode;

      // Delete from server (POST /inventory/delete)
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

      // Save barcode to local deleted list (safety net)
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
      const product = state.items.find(p => p.id === Number(productId));
      if (product) {
        product.stock = stock;
      }
      const lowThreshold = 5;
      state.lowStockProducts = state.items.filter(p => p.stock !== undefined && p.stock <= lowThreshold);
    },
    updateProductStock(state, action) {
      const { productId, stock } = action.payload;
      const product = state.items.find(p => p.id === productId);
      if (product) {
        product.stock = stock;
      }
      const lowThreshold = 5;
      state.lowStockProducts = state.items.filter(p => p.stock !== undefined && p.stock <= lowThreshold);
    },
    setProducts(state, action) {
      state.items = action.payload;
    }
  },
  extraReducers: builder => {
    builder
      .addCase(loadProducts.pending, (state) => { state.status = 'loading'; })
      .addCase(loadProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(loadProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(addProduct.pending, (state) => { state.status = 'loading'; })
      .addCase(addProduct.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.push(action.payload);
      })
      .addCase(addProduct.rejected, (state, action) => {
        state.status = 'failed';
        console.error('Product save failed:', action.payload);
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        const idx = state.items.findIndex(p => p.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteProductAndVector.fulfilled, (state, action) => {
        state.items = state.items.filter(p => p.id !== action.payload);
        console.log(`✅ Product ${action.payload} removed from list`);
      })
      .addCase(deleteProductAndVector.rejected, (state, action) => {
        alert(`Delete failed: ${action.payload || 'Unknown error'}`);
        console.error('Delete rejected:', action.payload);
      });
  }
});

export const { 
  openProductForm, 
  closeProductForm, 
  setLowStockProducts, 
  updateStockFromSocket,
  updateProductStock,
  setProducts
} = productsSlice.actions;

export default productsSlice.reducer;