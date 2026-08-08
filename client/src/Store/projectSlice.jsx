// src/Store/projectSlice.js

import {
  createAsyncThunk, // Creates Redux actions for asynchronous API requests.
  createSlice       // Creates the project's state, actions, and reducer.
} from "@reduxjs/toolkit";

import api from "../api/axios.js"; // Uses the shared Axios instance with cookies enabled.


/* Fetch all projects available to the currently authenticated user.
 *
 * The backend GET /projects controller determines whether the user:
 * - can see every project as a global admin; or
 * - can see only projects where they are the lead/member.
 */
export const fetchProjects = createAsyncThunk(
  "projects/fetchProjects", // Unique Redux action name.

  async (_, thunkAPI) => { // No function argument is currently required.
    try {
      const response = await api.get("/projects"); // Request accessible projects.
      return response.data.projects ?? [];         // Return the array, or an empty array.
    }
    catch (error) {
      // Prefer gettign the backend's specific error message when one exists.
      // Otherwise, return a readable fallback message.
      return thunkAPI.rejectWithValue( error.response?.data?.error || "Unable to load your projects." );
    }
  }
);


// Starting state for the project-dashboard feature.
const initialState = {
  projects: [],       // Projects returned by GET /projects.
  status: "idle",     // idle | loading | succeeded | failed.
  error: null         // API error shown on the dashboard.
};


const projectSlice = createSlice({
  name: "projects", // Redux state will be available as state.projects.

  initialState: initialState, // Explicit initial state for the reducer.

  reducers: {
    //Clears a previous API error. This may be useful later for retry buttons or navigation.
    clearProjectError: (state) => {
      state.error = null;
    }
  },
  
  extraReducers: (builder) => {
    builder
       //Runs immediately after fetchProjects() is dispatched.
      .addCase(fetchProjects.pending, (state) => {
        state.status = "loading"; // Enables a dashboard loading state.
        state.error = null;       // Removes an older error before retrying.
      })
       // Runs when GET /projects succeeds.       
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.status = "succeeded"; // Marks the request as complete.
        state.projects = action.payload; // Stores the returned projects.
        state.error = null; // Ensures old errors are no longer displayed.
      })
       // Runs when GET /projects fails.
      .addCase(fetchProjects.rejected, (state, action) => {
        state.status = "failed"; // Enables the dashboard error state.
        state.error =
          action.payload || // Usually contains the backend error message.
          "Unable to load your projects.";
      });
  }
});


export const { clearProjectError } = projectSlice.actions; // Exported for future retry/navigation behavior.

export default projectSlice.reducer; // Used by configureStore().