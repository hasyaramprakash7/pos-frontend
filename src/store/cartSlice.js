import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    addToCart(state, action) {
      const { productId, name, price, quantity, unitType, image } = action.payload;
      const existing = state.items.find(i => i.productId === productId);
      const inputQty = quantity ? parseFloat(quantity) : 1;
      if (existing) {
        existing.quantity += inputQty;
      } else {
        state.items.push({
          productId,
          name,
          price: parseFloat(price),
          quantity: inputQty,
          unitType: unitType || 'unit',
          image: image || '' // include image if passed
        });
      }
    },
    removeFromCart(state, action) {
      state.items = state.items.filter(i => i.productId !== action.payload);
    },
    updateQuantity(state, action) {
      const item = state.items.find(i => i.productId === action.payload.productId);
      if (item) {
        const nextQty = parseFloat(action.payload.quantity);
        if (nextQty <= 0) {
          state.items = state.items.filter(i => i.productId !== action.payload.productId);
        } else {
          item.quantity = nextQty;
        }
      }
    },
    clearCart(state) {
      state.items = [];
    }
  }
});

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;