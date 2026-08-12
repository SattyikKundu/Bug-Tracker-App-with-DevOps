// src/Store/store.jsx
import { configureStore } from "@reduxjs/toolkit"; // used to create application's central Redux store.
import authReducer from "./authSlice.jsx"; // imports 'authSlice.reducer' from authSlice.jsx as 'authReducer'
                                           // used to manage login/session state

import projectReducer from "./projectSlice.jsx"; // imports 'projectSlice.reducer' from projectSlice.jsx 
                                                 // as 'projectReducerReducer'. Used to manage dashboard project state.

import issueReducer from "./issueSlice.jsx"; // imports 'issueSlice.reducer' from issueSlice.jsx
                                             // as 'issueReducer'. Used to manage issue-board loading and status transitions

const store = configureStore({
  reducer: {
    auth: authReducer,         // Available through state.auth.
    projects: projectReducer,  // Available through state.projects.
    issues: issueReducer       // Available through state.issues (Issue board + workflow transition state)
  }
});

export default store; // Provided to React through <Provider> in main.jsx.