// src/Store/notificationSlice.jsx

import {
  createAsyncThunk, // creates redux async actions for backend notification requests
  createSlice       // creates notification reducers/state in one redux slice
} from "@reduxjs/toolkit";

import api from "../api/axios.js"; // shared Axios client with existing auth/cookie configuration


// -----------------------------------------------------------------------------
// Shared backend-error helper:
// -----------------------------------------------------------------------------
// keeps every notification thunk consistent when the backend returns an error.
const getRequestError = (error, fallbackMessage) =>
  error.response?.data?.error || fallbackMessage;


// -----------------------------------------------------------------------------
// GET /notifications?page=&limit=&filter=
// -----------------------------------------------------------------------------
// used by the full /notifications page.
export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async ({ page = 1, limit = 20, filter = "all" } = {}, thunkAPI) => {
    try {
      const response = await api.get(
        "/notifications", 
        { params: { page, limit, filter }}
      );

      return response.data;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(
        getRequestError(error, "Unable to load notifications.")
      );
    }
  }
);


// -----------------------------------------------------------------------------
// GET /notifications?page=1&limit=10&filter=all
// -----------------------------------------------------------------------------
// used only by compact header drawer.
export const fetchRecentNotifications = createAsyncThunk(
  "notifications/fetchRecentNotifications",
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/notifications", {
        params: {
          page:   1,
          limit:  10,
          filter: "all"
        }
      });

      return response.data.notifications ?? [];
    }
    catch (error) {
      return thunkAPI.rejectWithValue(
        getRequestError(error, "Unable to load recent notifications.")
      );
    }
  }
);


// -----------------------------------------------------------------------------
// GET /notifications/unread-count
// -----------------------------------------------------------------------------
// Lightweight request used by the header bell and silent polling.
export const fetchUnreadNotificationCount = createAsyncThunk(
  "notifications/fetchUnreadNotificationCount",
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/notifications/unread-count");
      return response.data.unreadCount ?? 0;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(
        getRequestError(error, "Unable to load unread notification count.")
      );
    }
  }
);


// -----------------------------------------------------------------------------
// PATCH /notifications/:id/read
// -----------------------------------------------------------------------------
export const markNotificationRead = createAsyncThunk(
  "notifications/markNotificationRead",
  async (notificationId, thunkAPI) => {
    try {
      const  response = await api.patch(`/notifications/${notificationId}/read`);
      return response.data.notification;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(
        getRequestError(error, "Unable to mark notification as read.")
      );
    }
  }
);


// -----------------------------------------------------------------------------
// PATCH /notifications/read-all
// -----------------------------------------------------------------------------
export const markAllNotificationsRead = createAsyncThunk(
  "notifications/markAllNotificationsRead",
  async (_, thunkAPI) => {
    try {
      const response = await api.patch("/notifications/read-all");
      return response.data.updatedCount ?? 0;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(
        getRequestError(error, "Unable to mark all notifications as read.")
      );
    }
  }
);


// -----------------------------------------------------------------------------
// DELETE /notifications/:id
// -----------------------------------------------------------------------------
export const deleteNotification = createAsyncThunk(
  "notifications/deleteNotification",
  async (notificationId, thunkAPI) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      return notificationId;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(
        getRequestError(error, "Unable to delete notification.")
      );
    }
  }
);


// -----------------------------------------------------------------------------
// GET /users/me/notification-preferences
// -----------------------------------------------------------------------------
export const fetchNotificationPreferences = createAsyncThunk(
  "notifications/fetchNotificationPreferences",
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/users/me/notification-preferences");
      return response.data.notificationPreferences;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(
        getRequestError(error, "Unable to load notification preferences.")
      );
    }
  }
);


// -----------------------------------------------------------------------------
// PATCH /users/me/notification-preferences
// -----------------------------------------------------------------------------
export const updateNotificationPreferences = createAsyncThunk(
  "notifications/updateNotificationPreferences",
  async (preferenceUpdates, thunkAPI) => {
    try {
      const response = await api.patch(
        "/users/me/notification-preferences",
        { notificationPreferences: preferenceUpdates }
      );

      return response.data.notificationPreferences;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(
        getRequestError(error, "Unable to update notification preferences.")
      );
    }
  }
);


// -----------------------------------------------------------------------------
// initial notification state
const initialState = {
  notifications:       [],     // current 20-item page shown on /notifications
  recentNotifications: [],     // latest 10 items shown in header drawer
  pagination: {
    page:                1,
    limit:               20,
    total:               0,
    totalPages:          0,
    hasNextPage:         false,
    hasPreviousPage:     false
  },

  unreadCount:          0,      // header bell badge count

  listStatus:           "idle", // idle | loading | succeeded | failed
  recentStatus:         "idle", // drawer request status
  unreadStatus:         "idle", // lightweight unread-count status
  mutationStatus:       "idle", // read/delete/read-all status

  listError:            null,
  recentError:          null,
  mutationError:        null,

  preferences:          null,    // six backend notification preference booleans
  preferencesStatus:    "idle",  // preference GET/PATCH status
  preferencesError:     null
};



// returns true when selected notification was unread before a mutation.
const notificationWasUnread = (state, notificationId) => {
  const notification =
    state.notifications.find((item) => item._id === notificationId)
    ?? state.recentNotifications.find((item) => item._id === notificationId);

  return Boolean(notification && !notification.isRead);
};


const notificationSlice = createSlice({
  name: "notifications",
  initialState,

  reducers: {
    clearNotificationMutationError: (state) => { // clears explicit mutation errors after UI has surfaced them.
      state.mutationError = null;
    },

    clearNotificationPreferencesError: (state) => { // clears preference errors when user changes another toggle.
      state.preferencesError = null;
    }
  },

  extraReducers: (builder) => {
    builder
      // -----------------------------------------------------------------------
      // Full notification page
      // -----------------------------------------------------------------------
      .addCase(fetchNotifications.pending, (state) => {
        state.listStatus = "loading";
        state.listError  = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.listStatus    = "succeeded";
        state.notifications = action.payload.notifications ?? [];
        state.pagination    = action.payload.pagination ?? initialState.pagination;
        state.listError     = null;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.listStatus = "failed";
        state.listError  = action.payload || "Unable to load notifications.";
      })

      // -----------------------------------------------------------------------
      // Recent drawer notifications list
      // -----------------------------------------------------------------------
      .addCase(fetchRecentNotifications.pending, (state) => {
        state.recentStatus = "loading";
        state.recentError  = null;
      })
      .addCase(fetchRecentNotifications.fulfilled, (state, action) => {
        state.recentStatus         = "succeeded";
        state.recentNotifications  = action.payload;
        state.recentError          = null;
      })
      .addCase(fetchRecentNotifications.rejected, (state, action) => {
        state.recentStatus = "failed";
        state.recentError  = action.payload || "Unable to load recent notifications.";
      })

      // -----------------------------------------------------------------------
      // Unread notifications count
      // -----------------------------------------------------------------------
      .addCase(fetchUnreadNotificationCount.pending, (state) => {
        state.unreadStatus = "loading";
      })
      .addCase(fetchUnreadNotificationCount.fulfilled, (state, action) => {
        state.unreadStatus = "succeeded";
        state.unreadCount  = action.payload;
      })
      .addCase(fetchUnreadNotificationCount.rejected, (state) => {
        // Polling failures stay silent in the UI by design.
        state.unreadStatus = "failed";
      })

      // -----------------------------------------------------------------------
      // Mark one notification as read
      // -----------------------------------------------------------------------
      .addCase(markNotificationRead.pending, (state) => {
        state.mutationStatus = "loading";
        state.mutationError  = null;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const updatedNotification = action.payload;
        const wasUnread = notificationWasUnread(state, updatedNotification._id);

        state.notifications = state.notifications.map((item) =>
          item._id === updatedNotification._id ? updatedNotification : item
        );

        state.recentNotifications = state.recentNotifications.map((item) =>
          item._id === updatedNotification._id ? updatedNotification : item
        );

        if (wasUnread) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }

        state.mutationStatus = "succeeded";
      })
      .addCase(markNotificationRead.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError  = action.payload || "Unable to mark notification as read.";
      })

      // -----------------------------------------------------------------------
      // Mark all notifications as read
      // -----------------------------------------------------------------------
      .addCase(markAllNotificationsRead.pending, (state) => {
        state.mutationStatus = "loading";
        state.mutationError  = null;
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        const readAt = new Date().toISOString();

        state.notifications = state.notifications.map((item) =>
          item.isRead ? item : { ...item, isRead: true, readAt }
        );

        state.recentNotifications = state.recentNotifications.map((item) =>
          item.isRead ? item : { ...item, isRead: true, readAt }
        );

        state.unreadCount    = 0;
        state.mutationStatus = "succeeded";
      })
      .addCase(markAllNotificationsRead.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError  = action.payload || "Unable to mark all notifications as read.";
      })

      // -----------------------------------------------------------------------
      // Delete one notification
      // -----------------------------------------------------------------------
      .addCase(deleteNotification.pending, (state) => {
        state.mutationStatus = "loading";
        state.mutationError  = null;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const notificationId = action.payload;
        const wasUnread      = notificationWasUnread(state, notificationId);

        state.notifications = state.notifications.filter(
          (item) => item._id !== notificationId
        );

        state.recentNotifications = state.recentNotifications.filter(
          (item) => item._id !== notificationId
        );

        if (wasUnread) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }

        state.pagination.total = Math.max(0, state.pagination.total - 1);
        state.mutationStatus   = "succeeded";
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError  = action.payload || "Unable to delete notification.";
      })

      // -----------------------------------------------------------------------
      // Notification preferences
      // -----------------------------------------------------------------------
      .addCase(fetchNotificationPreferences.pending, (state) => {
        state.preferencesStatus = "loading";
        state.preferencesError  = null;
      })
      .addCase(fetchNotificationPreferences.fulfilled, (state, action) => {
        state.preferencesStatus = "succeeded";
        state.preferences       = action.payload;
        state.preferencesError  = null;
      })
      .addCase(fetchNotificationPreferences.rejected, (state, action) => {
        state.preferencesStatus = "failed";
        state.preferencesError  = action.payload || "Unable to load notification preferences.";
      })
      .addCase(updateNotificationPreferences.pending, (state) => {
        state.preferencesStatus = "loading";
        state.preferencesError  = null;
      })
      .addCase(updateNotificationPreferences.fulfilled, (state, action) => {
        state.preferencesStatus = "succeeded";
        state.preferences       = action.payload;
        state.preferencesError  = null;
      })
      .addCase(updateNotificationPreferences.rejected, (state, action) => {
        state.preferencesStatus = "failed";
        state.preferencesError  = action.payload || "Unable to update notification preferences.";
      });
  }
});


export const {
  clearNotificationMutationError,
  clearNotificationPreferencesError
} = notificationSlice.actions;

export default notificationSlice.reducer;
