// src/Store/projectSlice.js

import {
  createAsyncThunk, // Creates Redux actions for asynchronous API requests.
  createSlice       // Creates the project's state, actions, and reducer.
} from "@reduxjs/toolkit";

import api from "../api/axios.js"; // Uses the shared Axios instance with cookies enabled.


/* Fetch all projects logged-in user can access:
 * The backend returns both active and archived projects.
 * The dashboard will separate those projects client-side.
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


/* Restore one archived project:
 * ONLY the project's stored lead should be allowed by the backend
 * to successfully call POST /projects/:id/restore.
 */
export const restoreProject = createAsyncThunk(
  "projects/restoreProject", // Unique Redux action name.

  async (projectId, thunkAPI) => { // Receives the project MongoDB ID.
    try {
      const response = await api.post(`/projects/${projectId}/restore` ); // Backend archived project restore endpoint.
      return response.data.project; // Return the newly restored project object.
    }
    catch (error) { // Show backend permission/state errors.
      return thunkAPI.rejectWithValue(error.response?.data?.error ||  "Unable to restore this project.");
    }
  }
);


// Starting state for project-dashboard data.
const initialState = {
  projects: [],            // Every active + archived project returned by backend.
  status: "idle",          // idle | loading | succeeded | failed.
  error: null,             // GET /projects API error failure message.
  restoreStatus: "idle",   // Tracks restore requests separately from initial loading.
  restoreError: null,      // Stores restore-specific errors.
  restoringProjectId: null // Identifies which card currently shows "Restoring...".
};


const projectSlice = createSlice({
  name: "projects", // Redux state will be available as state.projects.

  initialState: initialState, // Explicit initial state for the reducer.

  reducers: {
    //Clears a previous API error. This may be useful later for retry buttons or navigation.
    clearProjectError: (state) => {
      state.error = null;
    },
    //Clear archive/restore-specific API errors.
    clearRestoreError: (state) => {
      state.restoreError = null; 
    }
  },
  
  extraReducers: (builder) => {
    builder
      // =====================================================================
      // Fetch accessible projects
      // =====================================================================

      .addCase(fetchProjects.pending, (state) => { // Runs immediately after fetchProjects() is dispatched.
        state.status = "loading";                  // Enables a dashboard loading state.
        state.error = null;                        // Removes an older error before retrying.
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {  // Runs when GET /projects succeeds.    
        state.status = "succeeded";                           // Marks the request as complete.
        state.projects = action.payload;                      // Stores the returned projects.
        state.error = null;                                   // Ensures old errors are no longer displayed.
      })
      .addCase(fetchProjects.rejected, (state, action) => {              // Runs when GET /projects fails.
        state.status = "failed";                                         // Enables the dashboard error state.
        state.error = action.payload || "Unable to load your projects."; // Usually contains the backend error message.
      })

      // =====================================================================
      // Restore archived project
      // =====================================================================

      .addCase(restoreProject.pending, (state, action) => {
        state.restoreStatus = "loading";            // Restore request is ongoing.
        state.restoringProjectId = action.meta.arg; // Save ID supplied to restoreProject(projectId).
        state.restoreError = null;                  // Clear older restore errors.
      })
      .addCase(restoreProject.fulfilled, (state, action) => {
        state.restoreStatus = "succeeded";  // Restore completed/succeeded.
        state.restoringProjectId = null;    // No project is currently restoring.
        state.restoreError = null;          // Remove previous failure message.

        /* Replace "archived" project object with "restored" project returned by backend.
         *
         * Because archived becomes false, dashboard automatically
         * moves this card from Archived → Active without another GET request.
         */
        const restoredProject = action.payload;

        const projectIndex = state.projects.findIndex(
          (project) =>
            String(project._id) === String(restoredProject._id)
        );

        if (projectIndex !== -1) {
          state.projects[projectIndex] = restoredProject;
        }
      })
      .addCase(restoreProject.rejected, (state, action) => {
        state.restoreStatus = "failed";  // Restore attempt failed.
        state.restoringProjectId = null; // Re-enable the affected card button.
        state.restoreError = action.payload || "Unable to restore this project.";  // Prefer backend error message (or move to backup)
      });
  }
});


export const { 
  clearProjectError, // Existing project-load error cleaner.
  clearRestoreError  // New restore-error cleaner.
} = projectSlice.actions; // Exported for future retry/navigation behavior.

export default projectSlice.reducer; // Used by configureStore().