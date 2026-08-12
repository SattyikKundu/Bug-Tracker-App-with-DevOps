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

//==========================================================================
// Project Creation AND Editing thunks
//==========================================================================
/*  Create a brand-new project.
 * Backend automatically makes the logged-in creator both:
 * - project lead; and
 * - first project member.
 */
export const createProject = createAsyncThunk(
  "projects/createProject",
  async (projectData, thunkAPI) => {
    try {
      const response = await api.post("/projects", projectData);
      return response.data.project;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || "Unable to create project.");
    }
  }
);

// Retrieves one complete project.
// GET /projects/:id returns populated lead/member user information.
export const fetchProjectById = createAsyncThunk(
  "projects/fetchProjectById",
  async (projectId, thunkAPI) => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      return response.data.project;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || "Unable to load project.");
    }
  }
);


/* Partially update project information or leadership.
 * projectUpdates may contain:
 * - name
 * - description
 * - leadUserId
 */
export const updateProject = createAsyncThunk(
  "projects/updateProject",
  async ({projectId, projectUpdates}, thunkAPI) => {
    try {
      const response = await api.patch(`/projects/${projectId}`, projectUpdates);
      return response.data.project;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || "Unable to update project.");
    }
  }
);


/* Add or remove project members.
 * Backend expects:
 * { add: [], remove: [] }
 */
export const updateProjectMembers = createAsyncThunk(
  "projects/updateProjectMembers",
  async ({ projectId, add = [], remove = [] }, thunkAPI) => {
    try {
      const response = await api.post(`/projects/${projectId}/members`, { add, remove });

      /*
       * The membership endpoint currently returns updated project.
       * We later re-fetch full project because endpoint's response
       * is not populated with full member names.
       */
      await thunkAPI.dispatch(fetchProjectById(projectId));
      return response.data.project;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || "Unable to update project members.");
    }
  }
);


/* Archive one active project.
 * Backend permits ONLY the stored project lead to archive it.
 */
export const archiveProject = createAsyncThunk(
  "projects/archiveProject",
  async (projectId, thunkAPI) => {
    try {
      const response = await api.post(`/projects/${projectId}/archive`);
      return response.data.project;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || "Unable to archive project.");
    }
  }
);


/* Permanently delete a project.
 * HOWEVER, the backend allows this ONLY for a GLOBAL ADMIN.
 */
export const deleteProject = createAsyncThunk(
  "projects/deleteProject",
  async (projectId, thunkAPI) => {
    try {
      await api.delete(`/projects/${projectId}`);
      return projectId; // Redux removes the deleted project locally

    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || "Unable to delete project.");
    }
  }
);



// Starting state for project-dashboard data.
const initialState = {
  projects: [],             // Every active + archived project returned by backend.
  status: "idle",           // idle | loading | succeeded | failed.
  error: null,              // GET /projects API error failure message.

  restoreStatus: "idle",    // Tracks restore requests separately from initial loading.
  restoreError: null,       // Stores restore-specific errors.
  restoringProjectId: null, // Identifies which card currently shows "Restoring...".

  currentProject: null,       // Full currently opened project with populated users
  currentProjectStatus: "idle", // Tracks GET /projects/:id
  currentProjectError: null,  // Error loading one project

  mutationStatus: "idle",     // Tracks create/edit/member/archive/delete operations
  mutationError: null         // Stores project-management mutation errors
};


const projectSlice = createSlice({
  name: "projects", // Redux state will be available as state.projects.

  initialState: initialState, // Explicit initial state for the reducer.

  reducers: {
    clearProjectError: (state) => { //Clears a previous API error. Maybe useful later for retry buttons or navigation.
      state.error = null;
    },
    clearRestoreError: (state) => { //Clear archive/restore-specific API errors.
      state.restoreError = null; 
    },
    clearProjectMutationError: (state) => {
      state.mutationError = null; // Clears project-management API errors
    },
    clearCurrentProject: (state) => {
      state.currentProject = null;        // Removes project left from previous route
      state.currentProjectStatus = "idle"; // Allows next project to fetch normally
      state.currentProjectError = null;   // Clears previous project-load error
    }
  },
  
  extraReducers: (builder) => {
    builder
      // =====================================================================
      // #1 - Fetch accessible projects
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
      // #2 - Restore archived project
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
      })
      
      // =====================================================================
      // #3 - Create project
      // =====================================================================
      .addCase(createProject.pending, (state) => {
        state.mutationStatus = "loading"; // Project creation has started
        state.mutationError = null;       // Clear previous project-management error
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";      // Creation completed successfully
        state.mutationError = null;              // Clear error state
        state.projects.unshift(action.payload);  // Add newly created project to project browser
      })
      .addCase(createProject.rejected, (state, action) => {
        state.mutationStatus = "failed"; // Creation failed
        state.mutationError = action.payload || "Unable to create project.";
      })

      // =====================================================================
      // #4 - Load one project
      // =====================================================================
      .addCase(fetchProjectById.pending, (state) => {
        state.currentProjectStatus = "loading";  // Current project is loading
        state.currentProjectError  = null;       // Remove old load errors
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.currentProjectStatus = "succeeded";    // Project loaded
        state.currentProject       = action.payload; // Store populated project
        state.currentProjectError  = null;           // Clear previous errors
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.currentProjectStatus = "failed"; // Project retrieval failed
        state.currentProjectError = action.payload || "Unable to load project.";
      })

      // =====================================================================
      // #5 - Update project details / leadership
      // =====================================================================
      .addCase(updateProject.pending, (state) => {
        state.mutationStatus = "loading"; // Project update underway
        state.mutationError = null;       // Clear previous mutation error
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";    // Update completed
        state.currentProject = action.payload; // Refresh open project immediately
        state.mutationError = null;
        const projectIndex =
          state.projects.findIndex(
            (project) =>
              String(project._id) ===
              String(action.payload._id)
          );
        if (projectIndex !== -1) {
          state.projects[projectIndex] =
            action.payload; // Update project browser's copy too
        }
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError = action.payload || "Unable to update project.";
      })

      // =====================================================================
      // #6 - Add/remove members
      // =====================================================================
      .addCase(updateProjectMembers.pending, (state) => {
        state.mutationStatus = "loading"; // Membership update underway
        state.mutationError = null;       // Clear previous error
      })
      .addCase(updateProjectMembers.fulfilled, (state) => {
        state.mutationStatus = "succeeded";  // Membership request succeeded
        state.mutationError = null;          // Full project is refreshed by thunk
      })
      .addCase(updateProjectMembers.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError = action.payload || "Unable to update project members.";
      })

      // =====================================================================
      // #7 - Archive project
      // =====================================================================
      .addCase(archiveProject.pending, (state) => {
        state.mutationStatus = "loading"; // Archive request underway
        state.mutationError = null;       // Clear previous errors
      })
      .addCase(archiveProject.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        state.currentProject = action.payload; // Current page immediately becomes archived/read-only
        state.mutationError = null;
        const projectIndex =
          state.projects.findIndex(
            (project) =>
              String(project._id) ===
              String(action.payload._id)
          );
        if (projectIndex !== -1) {
          state.projects[projectIndex] = action.payload; // Moves card into Archived tab automatically
        }
      })
      .addCase(archiveProject.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError = action.payload || "Unable to archive project.";
      })

      // =====================================================================
      // #8 - Permanently delete project (Global admin only)
      // =====================================================================
      .addCase(deleteProject.pending, (state) => {
        state.mutationStatus = "loading"; // Delete request underway
        state.mutationError = null;       // Clear previous error
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        state.projects =
          state.projects.filter(
            (project) => String(project._id) !== String(action.payload)
          ); // Remove deleted project from project browser
        state.currentProject = null; // Deleted project can no longer remain open
        state.mutationError = null;
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError = action.payload || "Unable to delete project.";
      });
  }
});


export const { 
  clearProjectError,         // Existing project-load error cleaner.
  clearRestoreError,         // New restore-error cleaner.
  clearProjectMutationError, // Remove stored project mutation (editing/deleting/etc.) from state
  clearCurrentProject        // Clear current project details from state
} = projectSlice.actions; // Exporting slice actions

export default projectSlice.reducer; // Used by configureStore().