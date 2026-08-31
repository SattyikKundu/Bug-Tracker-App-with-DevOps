// src/Store/authSlice.js

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../api/axios.js";

export const registerUser = createAsyncThunk( // register a new local account. 
                                              // (registration does not automatically log the user in.)
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

export const loginUser = createAsyncThunk( // log in with username and password.
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

export const checkAuth = createAsyncThunk( // restore the session using the server's HTTP-only cookie.
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

export const logoutUser = createAsyncThunk( // log out and clear the server-side authentication cookie.
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


/*
 * Fetch complete and current profile for the logged-in user:
 * Login ONLY returns a minimal identity object, SO THIS request retrieves
 * firstName, lastName, username, email, role, and authProvider as needed
 * by the profile page and account menu!
 */
export const fetchMyProfile = createAsyncThunk(
  "auth/fetchMyProfile",
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/users/me"); // dedicated complete-profile endpoint
      return response.data.user;                   // return safe full profile object
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || "Unable to load profile.");
    }
  }
);


export const updateProfile = createAsyncThunk( // Update the authenticated user's editable profile fields.
                                               // The backend validates uniqueness and returns the updated user object.
  "auth/updateProfile",
  async (profileData, thunkAPI) => {
    try {
      const response = await api.patch("/users/me", profileData);
      return response.data.user;
    }
    catch (error) {
      return thunkAPI.rejectWithValue( error.response?.data?.error || "Unable to update profile." );
    }
  }
);


export const changePassword = createAsyncThunk( // change current LOCAL user's password; Google-only users 
                                                // are rejected by backend
  "auth/changePassword",
  async (passwordData, thunkAPI) => {
    try {
      const response = await api.patch("/users/me/password", passwordData);
      return response.data;
    }
    catch (error) {
      return thunkAPI.rejectWithValue( error.response?.data?.error || "Unable to update password.");
    }
  }
);


const initialState = {    // initial Slice State
  user:            null,  // user state/id
  isAuthenticated: false, // is user authenticated?

  // Various statuses of user ("idle" means the initial session check has not run yet.)
  authStatus:           "idle",   // user's authenticating state ('loading', 'succeeded', or 'failed')
  loginStatus:          "idle",   // is user logged in?
  registerStatus:       "idle",   // is user registered with an account?
  logoutStatus:         "idle",   // is user logged out?
  profileUpdateStatus:  "idle",   // what is user's profile update status?
  passwordChangeStatus: "idle",   // what is user's password update status?
  profileLoadStatus:    "idle",   // status of user profile's loading state
  error:                 null
};


const authSlice = createSlice({ // authentication Slice
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
        state.user = action.payload.user || action.payload; // supports either { user: {...} } or a direct user response.
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
        state.isAuthenticated = false; // registration DOES NOT authenticate the user.
        state.user = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.registerStatus = "failed";
        state.error = action.payload;
      })

      // LOGIN
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

      // LOGOUT
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
      })

      // FULL PROFILE RETRIEVAL
      .addCase(fetchMyProfile.pending, (state) => {
        state.profileLoadStatus = "loading"; // full profile is being retrieved
      })
      .addCase(fetchMyProfile.fulfilled, (state, action) => {
        state.profileLoadStatus = "succeeded"; // profile request succeeded

        /* Replace the minimal login object with the complete MongoDB profile.
         * Example: { id, username }
         * becomes: { _id, firstName, lastName, username, email, role, authProvider, ... }
         */
        state.user = action.payload;
        state.error = null;
      })
      .addCase(fetchMyProfile.rejected, (state, action) => {
        state.profileLoadStatus = "failed";
        state.error = action.payload || "Unable to load profile.";
      })

      // PROFILE UPDATE
      .addCase(updateProfile.pending, (state) => {
        state.profileUpdateStatus = "loading"; // profile save is underway
        state.error = null;                    // clear previous profile errors
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.profileUpdateStatus = "succeeded";  // profile update success status
        state.user = action.payload;              // immediately update header/sidebar identity
        state.error = null;                       // remove older errors
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.profileUpdateStatus = "failed";                         // profile update failure status
        state.error = action.payload || "Unable to update profile.";  // profile update error msg
      })

      // PASSWORD UPDATE
      .addCase(changePassword.pending, (state) => {
        state.passwordChangeStatus = "loading"; // password request is underway
        state.error = null;                     // remove previous account errors
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.passwordChangeStatus = "succeeded"; // password update completed
        state.error = null;                       // clear stale errors
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.passwordChangeStatus = "failed";                        // password update failed
        state.error = action.payload || "Unable to update password."; // password update failure message
      });
  }
});


export const { clearAuthError, resetRegisterStatus } = authSlice.actions;
export default authSlice.reducer;