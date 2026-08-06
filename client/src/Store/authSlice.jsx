// src/Store/authSlice.js

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../api/axios.js";

export const registerUser = createAsyncThunk( // Register a new local account. (Registration does not automatically log the user in.)
  "auth/registerUser",
  async (formData, thunkAPI) => {
    try {
      const response = await api.post("/auth/register", formData);
      return response.data;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.error ||
        "Registration failed. Please try again."
      );
    }
  }
);

export const loginUser = createAsyncThunk( // Log in with username and password.
  "auth/loginUser",
  async (credentials, thunkAPI) => {
    try {
      const response = await api.post("/auth/login", credentials);
      return response.data;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.error ||
        "Login failed. Please try again."
      );
    }
  }
);

export const checkAuth = createAsyncThunk( // Restore the session using the server's HTTP-only cookie.
  "auth/checkAuth",
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/auth/me");
      return response.data;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || "No active session.");
    }
  }
);

export const logoutUser = createAsyncThunk( // Log out and clear the server-side authentication cookie.
  "auth/logoutUser",
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/auth/logout");
      return response.data;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || "Logout failed.");
    }
  }
);


const initialState = {    // Initial Slice State
  user:            null,  // user state/id
  isAuthenticated: false, // Is user authenticated?

  // Various statuses of user ("idle" means the initial session check has not run yet.)
  authStatus:     "idle", // user's authenticating state ('loading', 'succeeded', or 'failed')
  loginStatus:    "idle", // Is user logged in?
  registerStatus: "idle", // Is user registered with an account?
  logoutStatus:   "idle", // Is user logged out?
  error:           null
};


const authSlice = createSlice({ // Authentication Slice
  name:         "auth",         // slice name
  initialState: initialState,   // slice's initial state
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    resetRegisterStatus: (state) => {
      state.registerStatus = "idle";
    }
  },

  extraReducers: (builder) => {
    builder
       // SESSION RESTORATION
      .addCase(checkAuth.pending, (state) => { 
        state.authStatus = "loading";
      })

      .addCase(checkAuth.fulfilled, (state, action) => {
        state.authStatus = "succeeded";
        state.isAuthenticated = true;

        // Supports either { user: {...} } or a direct user response.
        state.user = action.payload.user || action.payload;
      })

      .addCase(checkAuth.rejected, (state) => {
        state.authStatus = "failed";
        state.isAuthenticated = false;
        state.user = null;
      })


      // REGISTRATION
      .addCase(registerUser.pending, (state) => {
        state.registerStatus = "loading";
        state.error = null;
      })

      .addCase(registerUser.fulfilled, (state) => {
        state.registerStatus = "succeeded";
        state.error = null;

        // Registration DOES NOT authenticate the user.
        state.isAuthenticated = false;
        state.user = null;
      })

      .addCase(registerUser.rejected, (state, action) => {
        state.registerStatus = "failed";
        state.error = action.payload;
      })


      // Login
      .addCase(loginUser.pending, (state) => {
        state.loginStatus = "loading";
        state.error = null;
      })

      .addCase(loginUser.fulfilled, (state, action) => {
        state.loginStatus = "succeeded";
        state.authStatus = "succeeded";
        state.isAuthenticated = true;
        state.error = null;

        state.user = action.payload.user || null;
      })

      .addCase(loginUser.rejected, (state, action) => {
        state.loginStatus = "failed";
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload;
      })


      // Logout
      .addCase(logoutUser.pending, (state) => {
        state.logoutStatus = "loading";
      })

      .addCase(logoutUser.fulfilled, (state) => {
        state.logoutStatus = "succeeded";
        state.authStatus = "failed";
        state.loginStatus = "idle";
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
      })

      .addCase(logoutUser.rejected, (state, action) => {
        state.logoutStatus = "failed";
        state.error = action.payload;
      });
  }
});


export const { clearAuthError, resetRegisterStatus } = authSlice.actions;
export default authSlice.reducer;