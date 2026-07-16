import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { db } from '../utils/database';
import { updateProductStock, setLowStockProducts } from './productsSlice';
import api from '../api/axios';   // <-- ensure this import is present

export const loadOrders = createAsyncThunk('orders/load', async () => {
  const orders = await db.orders.toArray();
  for (let order of orders) {
    order.items = await db.orderItems.where('orderId').equals(order.id).toArray();
  }
  return orders;
});

export const placeOrder = createAsyncThunk('orders/place', async (order, { dispatch }) => {
  await db.transaction('rw', db.products, db.orders, db.orderItems, async () => {
    await db.orders.add({ 
      id: order.id, 
      timestamp: order.timestamp, 
      total: order.total 
    });
    
    for (const item of order.items) {
      await db.orderItems.add({ 
        orderId: order.id, 
        productId: item.productId, 
        name: item.name, 
        quantity: item.quantity, 
        price: item.price 
      });
      
      const product = await db.products.get(item.productId);
      if (product && product.stock !== undefined) {
        const newStock = Math.max(0, product.stock - item.quantity);
        if (newStock <= 0) {
          alert(`⚠️ హెచ్చరిక: ${product.name} స్టాక్ అయిపోయింది!`);
        }
        await db.products.update(item.productId, { stock: newStock });

        // Update Redux immediately
        dispatch(updateProductStock({ productId: item.productId, stock: newStock }));

        // ---- Send stock update to backend using the product's barcode ----
        if (navigator.onLine && product.barcode) {
          try {
            await api.post('/inventory/update-by-barcode', {
              barcode: product.barcode,
              stock: newStock
            });
            console.log(`📤 Server stock updated: ${product.name} → ${newStock}`);
          } catch (err) {
            console.error('❌ Server stock update failed:', err);
          }
        }
      }
    }
  });

  // Recalculate low stock for all products (optional, already done in updateProductStock)
  const allProducts = await db.products.toArray();
  const lowThreshold = 5;
  const lowItems = allProducts.filter(p => p.stock !== undefined && p.stock <= lowThreshold);
  dispatch(setLowStockProducts(lowItems));

  return order;
});

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