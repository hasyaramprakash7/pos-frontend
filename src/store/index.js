import { configureStore } from '@reduxjs/toolkit';
import productsReducer from './productsSlice';
import cartReducer from './cartSlice';
import ordersReducer from './ordersSlice';
import settingsReducer from './settingsSlice';
import authReducer from './authSlice';

export default configureStore({
  reducer: {
    products: productsReducer,
    cart: cartReducer,
    orders: ordersReducer,
    settings: settingsReducer,
    auth: authReducer
  }
});