import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { db } from '../utils/database';
import { updateProductStock, setLowStockProducts } from './productsSlice';
import api from '../api/axios';

export const loadOrders = createAsyncThunk('orders/load', async () => {
  const orders = await db.orders.toArray();
  for (let order of orders) {
    order.items = await db.orderItems.where('orderId').equals(order.id).toArray();
  }
  return orders;
});

export const placeOrder = createAsyncThunk(
  'orders/place',
  async (order, { dispatch }) => {
    console.log('📦 [placeOrder] Received order with items:', order.items.length);
    console.log('📦 [placeOrder] Items:', order.items.map(i => `${i.name} (ID: ${i.productId})`));

    // 1. Save order header + all items in one transaction (all-or-nothing)
    await db.transaction('rw', db.orders, db.orderItems, async () => {
      await db.orders.add({
        id: order.id,
        timestamp: order.timestamp,
        total: order.total
      });

      for (const item of order.items) {
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) {
          console.warn(`⚠️ [placeOrder] Invalid quantity for ${item.name} – skipping item`);
          continue;
        }
        await db.orderItems.add({
          orderId: order.id,
          productId: Number(item.productId) || String(item.productId),
          name: item.name,
          quantity: qty,
          price: Number(item.price) || 0
        });
      }
    });

    // 2. Update stock for each product (independent, no transaction needed)
    for (const item of order.items) {
      try {
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) continue;

        // Look up product – try numeric then string
        let product = null;
        const numericId = Number(item.productId);
        if (!isNaN(numericId)) {
          product = await db.products.get(numericId);
        }
        if (!product) {
          product = await db.products.get(String(item.productId));
        }

        if (!product) {
          console.warn(`⚠️ [placeOrder] Product not found: ${item.name} (ID: ${item.productId}) – stock update skipped`);
          continue;
        }

        console.log(`✅ [placeOrder] Found ${product.name} (ID: ${product.id}) with stock ${product.stock}`);

        const currentStock = Number(product.stock) || 0;
        const newStock = Math.max(0, currentStock - qty);
        console.log(`📉 [placeOrder] ${product.name}: ${currentStock} → ${newStock}`);

        // Update local stock
        await db.products.update(product.id, { stock: newStock });

        // Update Redux state
        dispatch(updateProductStock({ productId: product.id, stock: newStock }));

        // Sync to server (non‑critical)
        if (navigator.onLine) {
          try {
            const payload = product.barcode
              ? { barcode: product.barcode, stock: newStock }
              : { productId: String(product.id), stock: newStock };
            await api.post('/inventory/update-by-barcode', payload);
            console.log(`📤 [placeOrder] Server stock updated for ${product.name}`);
          } catch (apiErr) {
            console.error(`❌ [placeOrder] Server sync failed for ${product.name}:`, apiErr);
          }
        }
      } catch (err) {
        console.error(`❌ [placeOrder] Error updating stock for "${item.name}":`, err);
        // Continue with next product – order is already saved
      }
    }

    // 3. Recompute low‑stock list
    const allProducts = await db.products.toArray();
    const lowItems = allProducts.filter(p => p.stock !== undefined && p.stock <= 5);
    dispatch(setLowStockProducts(lowItems));

    console.log(`✅ [placeOrder] Order ${order.id} placed successfully.`);
    return order;
  }
);

export const getOrdersByDateRange = async (startDate, endDate) => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).setHours(23, 59, 59, 999);
  const orders = await db.orders
    .where('timestamp')
    .between(start, end, true, true)
    .toArray();

  for (let order of orders) {
    order.items = await db.orderItems.where('orderId').equals(order.id).toArray();
  }
  return orders;
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState: { list: [], status: 'idle' },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(loadOrders.fulfilled, (state, action) => { state.list = action.payload; })
      .addCase(placeOrder.fulfilled, (state, action) => { state.list.push(action.payload); });
  }
});

export default ordersSlice.reducer;