// src/Store/store.jsx
import { configureStore } from "@reduxjs/toolkit"; // used to create application's central Redux store.

import authReducer from "./authSlice.jsx"; // imports 'authSlice.reducer' from authSlice.jsx as 'authReducer'
                                           // used to manage login/session state

import projectReducer from "./projectSlice.jsx"; // imports 'projectSlice.reducer' from projectSlice.jsx 
                                                 // as 'projectReducerReducer'. Used to manage dashboard project state.

import issueReducer from "./issueSlice.jsx"; // imports 'issueSlice.reducer' from issueSlice.jsx
                                             // as 'issueReducer'. Used to manage issue-board loading and status transitions

import commentReducer from "./commentSlice.jsx"; // manages issue comments, replies, pagination, and comment mutations

import notificationReducer from "./notificationSlice.jsx"; // manages notification inbox, unread count, and preferences

const store = configureStore({
  reducer: {
    auth:           authReducer,          // available through state.auth.
    projects:       projectReducer,       // available through state.projects.
    issues:         issueReducer,         // available through state.issues       (Issue board + workflow transition state)
    comments:       commentReducer,       // available though  states.comments     (for Threaded issue-comment state)
    notifications:  notificationReducer   // available through state.notifications (notification inbox/preferences)
  }
});

export default store; // provided to React through <Provider> in main.jsx.