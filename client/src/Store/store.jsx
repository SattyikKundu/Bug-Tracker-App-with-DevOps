// src/Store/store.jsx
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice.jsx"; // imports 'authSlice.reducer' from authSlice.jsx as 'authReducer'

const store = configureStore({
  reducer: {
    auth: authReducer
  }
});

export default store;