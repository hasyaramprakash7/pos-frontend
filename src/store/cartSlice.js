import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    addToCart(state, action) {
      const { productId, name, price, quantity, unitType, image } = action.payload;
      // Ensure productId is a number (local ID)
      const numericId = Number(productId);
      if (isNaN(numericId)) {
        console.warn('Invalid productId passed to addToCart:', productId);
        return;
      }
      const existing = state.items.find(i => String(i.productId) === String(numericId));
      const inputQty = quantity ? parseFloat(quantity) : 1;
      if (existing) {
        existing.quantity += inputQty;
      } else {
        state.items.push({
          productId: numericId,
          name,
          price: parseFloat(price),
          quantity: inputQty,
          unitType: unitType || 'unit',
          image: image || '',
        });
      }
    },
    removeFromCart(state, action) {
      state.items = state.items.filter(i => String(i.productId) !== String(action.payload));
    },
    updateQuantity(state, action) {
      const item = state.items.find(i => String(i.productId) === String(action.payload.productId));
      if (item) {
        const nextQty = parseFloat(action.payload.quantity);
        if (nextQty <= 0) {
          state.items = state.items.filter(i => String(i.productId) !== String(action.payload.productId));
        } else {
          item.quantity = nextQty;
        }
      }
    },
    updateItemPrice(state, action) {
      const { productId, price } = action.payload;
      const item = state.items.find(i => String(i.productId) === String(productId));
      if (item) {
        item.price = parseFloat(price);
      }
    },
    clearCart(state) {
      state.items = [];
    }
  }
});

export const { addToCart, removeFromCart, updateQuantity, updateItemPrice, clearCart } = cartSlice.actions;
export default cartSlice.reducer;