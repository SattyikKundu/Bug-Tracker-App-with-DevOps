// src/Store/issueSlice.jsx

import {
  createAsyncThunk, // creates Redux actions for asynchronous issue API requests
  createSlice       // creates issue state, reducers, and generated Redux actions
} from "@reduxjs/toolkit";

import api from "../api/axios.js"; // shared Axios client that already sends auth cookies


/* GET /projects/:pid/issues
 *
 * Retrieves every issue that logged-in user is permitted to view
 * inside ONE selected project.
 *
 * Filtering is intentionally handled client-side during this first board
 * implementation because full issue collection is already needed to
 * divide issues amongst all four workflow columns.
 */
export const fetchProjectIssues = createAsyncThunk(
  "issues/fetchProjectIssues",
  async (projectId, thunkAPI) => {
    try {
      const response = await api.get(`/projects/${projectId}/issues`);
      return response.data.issues ?? []; // Safely fall back to an empty board
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || "Unable to load this project's issues.");
    }
  }
);


/* GET /issues/my-work
 *
 * Retrieves the logged-in user's active assigned work across
 * every project they are still permitted to access.
 */
export const fetchMyWork = createAsyncThunk(
  "issues/fetchMyWork",
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/issues/my-work");
      return response.data;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || "Unable to load your assigned work.");
    }
  }
);


/* POST /issues/:id/transition
 *
 * Performs one explicit workflow transition.
 * Examples:
 * open             → in_progress
 * in_progress      → ready_for_review
 * ready_for_review → closed
 *
 * Backend remains the final permission/workflow authority.
 */
export const transitionIssueStatus = createAsyncThunk(
  "issues/transitionIssueStatus",
  async (
    {
      issueId, // issue being transitioned
      to       // destination status
    },
    thunkAPI
  ) => {

    try {
      const response = await api.post( 
        `/issues/${issueId}/transition`,
        {
          to // backend's official transition request property
        }
      );
      return response.data.issue; // return updated issue to Redux
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || "Unable to change issue status.");
    }
  }
);


/* POST /projects/:projectId/issues
 *
 * Creates a brand-new issue.
 * Backend automatically:
 * + sets reporterId to logged-in user;
 * + generates the project's issue key;
 * + starts status at "open".
 */
export const createIssue = createAsyncThunk(
  "issues/createIssue",
  async ({projectId, issueData}, thunkAPI) => {
    try {
      const response = await api.post(`/projects/${projectId}/issues`, issueData);
      return response.data.issue;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || "Unable to create issue.");
    }
  }
);


/* GET /issues/:issueId
 * Retrieves one existing issue for the Edit Issue form.
 */
export const fetchIssueById = createAsyncThunk(
  "issues/fetchIssueById",
  async (issueId, thunkAPI) => {
    try {
      const response = await api.get(`/issues/${issueId}`);
      return response.data.issue;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || "Unable to load issue.");
    }
  }
);


/* PATCH /issues/:issueId
 * Partially updates an existing issue. The form sends ONLY changed fields.
 */
export const updateIssue = createAsyncThunk(
  "issues/updateIssue",
  async ({ issueId, issueUpdates}, thunkAPI) => {
    try {
      const response = await api.patch(`/issues/${issueId}`, issueUpdates);
      return response.data.issue;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || "Unable to update issue.");
    }
  }
);


/* POST /issues/:issueId/watch
 * Adds the logged-in user to the issue's watcher list.
 */
export const watchIssue = createAsyncThunk(
  "issues/watchIssue",
  async (issueId, thunkAPI) => {
    try {
      const response =await api.post(`/issues/${issueId}/watch`);
      return response.data.issue;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error ||"Unable to watch issue.");
    }
  }
);


/* DELETE /issues/:issueId/watch
 * Removes the logged-in user from the issue's watcher list.
 */
export const unwatchIssue = createAsyncThunk(
  "issues/unwatchIssue",
  async (issueId, thunkAPI) => {
    try {
      const response = await api.delete(`/issues/${issueId}/watch`);
      return response.data.issue;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || "Unable to stop watching issue.");
    }
  }
);


// Initial Redux state for project issue board.
const initialState = {
  issues: [],                  // all issues belonging to currently opened project
  status: "idle",              // idle | loading | succeeded | failed
  error: null,                 // full-board loading error

  myWork: [],                  // five most recently updated active assigned issues
  myWorkSummary: {
    total: 0,                  // all active issues assigned to logged-in user
    open: 0,
    inProgress: 0,
    readyForReview: 0
  },
  myWorkStatus: "idle",        // idle | loading | succeeded | failed
  myWorkError: null,           // dashboard-specific assigned-work load failure

  transitioningIssueId: null,  // tracks which issue currently shows transition loading state
  currentIssue: null,          // existing issue currently opened for editing
  currentIssueStatus: "idle",  // idle | loading | succeeded | failed
  currentIssueError: null,     // GET /issues/:id failure
  saveStatus: "idle",          // tracks create/edit form submission
  watchStatus: "idle"          // idle | loading | succeeded | failed for Watch/Unwatch
};

const issueSlice = createSlice({
  name: "issues", // redux state becomes available through state.issues
  initialState: initialState,
  reducers: {

    /* Clear issue-board data when leaving cirrent project board.
     *
     * This prevents issues from Project A briefly appearing 
     * while Project B's board is loading!
     */
    clearIssueBoard: (state) => {
      state.issues = [];                 // remove previous project's issues
      state.status = "idle";             // allows new board to fetch normally
      state.error = null;                // remove stale load failures
      state.transitioningIssueId = null; // clear temporary transition state
    },

    // Clears one previously edited issue.
    // ex: Prevents values from Issue A briefly appearing when Issue B is opened for editing.    
    clearCurrentIssue: (state) => {
      state.currentIssue        = null;
      state.currentIssueStatus  = "idle";
      state.currentIssueError   = null;
      state.saveStatus          = "idle";
      state.watchStatus         = "idle";
    },

    // Clears a failed GET /projects/:pid/issues request.
    // Useful when manually retrying board request.
    clearIssueBoardError: (state) => {
      state.error = null;
    },

    // Immediately moves an issue into its target column BEFORE API finishes.
    // This gives drag/drop fast response expected from a Kanban board.
    optimisticMoveIssue: (state, action) => {
      const {issueId, to} = action.payload;
      const issue = state.issues.find(
        (currentIssue) => 
          (String(currentIssue._id) === String(issueId))
      );
      if (issue) {
        issue.status = to;
      }
    },
    // Restore an issue to its previous workflow status when backend rejects an optimistic drag/drop transition.
    revertOptimisticIssueMove: (state, action) => {
      const {issueId, from} = action.payload;
      const issue = state.issues.find(
        (currentIssue) => (String(currentIssue._id) === String(issueId))
      );
      if (issue) {
        issue.status = from;
      }
    },

   /* Adjusts the currently opened Issue Details comment count.
    *
    * Used after local comment "creation/soft-delete" so the Activity heading
    * updates immediately without reloading the full issue.
    */
    adjustCurrentIssueCommentCount: (state, action) => {

      if (!state.currentIssue) {
        return;
      }

      const delta = Number(action.payload) || 0;

      state.currentIssue.commentCount =
        Math.max(0, Number(state.currentIssue.commentCount ?? 0 ) + delta);
    }
  },

  extraReducers: (builder) => {
    builder
      // =====================================================================
      // Dashboard My Work
      // =====================================================================
      .addCase(fetchMyWork.pending, (state) => {
        state.myWorkStatus = "loading";
        state.myWorkError  = null;
      })
      .addCase(fetchMyWork.fulfilled, (state, action) => {
        state.myWorkStatus  = "succeeded";
        state.myWork        = action.payload.issues ?? [];
        state.myWorkSummary =
          action.payload.summary ?? {
            total: 0,
            open: 0,
            inProgress: 0,
            readyForReview: 0
          };
        state.myWorkError  = null;
      })
      .addCase(fetchMyWork.rejected, (state, action) => {
        state.myWorkStatus = "failed";
        state.myWorkError = action.payload || "Unable to load your assigned work.";
      })

      // =====================================================================
      // Fetch project issues
      // =====================================================================
      .addCase(fetchProjectIssues.pending, (state) => {
          state.status = "loading"; // Board is retrieving issue collection
          state.error = null;       // Remove old board-load errors
        }
      )
      .addCase(fetchProjectIssues.fulfilled, (state, action) => {
          state.status = "succeeded"; // Board data successfully loaded
          state.issues = action.payload; // Store complete issue collection
          state.error = null; // Clear any previous error
        }
      )
      .addCase(fetchProjectIssues.rejected, (state, action) => {
          state.status = "failed"; // Allows page-level error state
          state.error = action.payload || "Unable to load this project's issues.";
        }
      )
      
      // =====================================================================
      // Load one issue for editing
      // =====================================================================
      .addCase(
        fetchIssueById.pending,
        (state) => {
          state.currentIssueStatus = "loading";
          state.currentIssueError = null;
        }
      )
      .addCase(
        fetchIssueById.fulfilled,
        (state, action) => {
          state.currentIssueStatus = "succeeded";
          state.currentIssue = action.payload;
          state.currentIssueError = null;
        }
      )
      .addCase(
        fetchIssueById.rejected,
        (state, action) => {
          state.currentIssueStatus = "failed";
          state.currentIssueError = action.payload || "Unable to load issue.";
        }
      )

      // =====================================================================
      // Create issue
      // =====================================================================
      .addCase(
        createIssue.pending,
        (state) => {
          state.saveStatus = "loading";
        }
      )
      .addCase(
        createIssue.fulfilled,
        (state, action) => {
          state.saveStatus = "succeeded";
          // If board data happens to remain loaded, this makes the new issue immediately available there.
          // The Board will still safely refetch when its route opens.
          state.issues.unshift(action.payload);
        }
      )
      .addCase(
        createIssue.rejected,
        (state) => {
          state.saveStatus = "failed";
        }
      )

      // =====================================================================
      // Update existing issue
      // =====================================================================
      .addCase(
        updateIssue.pending,
        (state) => {
          state.saveStatus = "loading";
        }
      )
      .addCase(
        updateIssue.fulfilled,
        (state, action) => {
          state.saveStatus = "succeeded";
          state.currentIssue = action.payload;
          const issueIndex =
            state.issues.findIndex((issue) => (String(issue._id) === String(action.payload._id)));
          if (issueIndex !== -1) {
            state.issues[issueIndex] = action.payload;
          }
        }
      )
      .addCase(
        updateIssue.rejected,
        (state) => { state.saveStatus = "failed"; }
      )

      // =====================================================================
      // Transition one issue from one board to another
      // =====================================================================
      .addCase(transitionIssueStatus.pending, (state, action) => {
          /*
           * action.meta.arg contains the object passed to:
           *
           * transitionIssueStatus({
           *   issueId,
           *   to
           * })
           */
          state.transitioningIssueId = action.meta.arg.issueId;
        }
      )
      .addCase(transitionIssueStatus.fulfilled, (state, action) => {
          state.transitioningIssueId = null; // Re-enable transition controls
          const updatedIssue = action.payload; // Updated issue returned by backend
          const issueIndex = state.issues.findIndex((issue) => (String(issue._id) === String(updatedIssue._id)));

          /* Replace old issue with transitioned issue.
           *
           * Because its status changed, IssueBoardPage automatically
           * moves it into correct column during next render.
           */
          if (issueIndex !== -1) {
            state.issues[issueIndex] = updatedIssue;
          }
        }
      )
      .addCase(transitionIssueStatus.rejected, (state) => {
          /* We intentionally DO NOT store another persistent transition error here.
           *
           * Rejected thunk's payload is read directly by IssueBoardPage
           * and displayed through ErrorMessageToast(). This prevents another
           * stale Redux-error leak like the project-management issue we fixed.
           */
          state.transitioningIssueId = null;
        }
      )

      // =====================================================================
      // Watch issue
      // =====================================================================
      .addCase(
        watchIssue.pending,
        (state) => {
          state.watchStatus = "loading"; // temporarily disables Watch button
        }
      )
      .addCase(
        watchIssue.fulfilled,
        (state, action) => {
          state.watchStatus = "succeeded";

          state.currentIssue = action.payload; // refresh Details page watcher state/count

          const issueIndex =
            state.issues.findIndex((issue) => (String(issue._id) === String(action.payload._id)));
          if (issueIndex !== -1) {
            state.issues[issueIndex] = action.payload; // Keeps board's cached copy synchronized
          }
        }
      )
      .addCase(watchIssue.rejected,
        (state) => {
          state.watchStatus = "failed";
        }
      )

      // =====================================================================
      // Unwatch issue
      // =====================================================================
      .addCase(
        unwatchIssue.pending,
        (state) => {
          state.watchStatus = "loading";
        }
      )
      .addCase(
        unwatchIssue.fulfilled,
        (state, action) => {
          state.watchStatus = "succeeded";
          state.currentIssue = action.payload;
          const issueIndex = state.issues.findIndex((issue) => (String(issue._id) === String(action.payload._id)));
          if (issueIndex !== -1) {
            state.issues[issueIndex] = action.payload;
          }
        }
      )
      .addCase(
        unwatchIssue.rejected, 
        (state) => { state.watchStatus = "failed";}
      );
  }

});

export const { 
  clearIssueBoard,               // clears issue board (esp. to prevent "bleeding" into other projects' issue boards)
  clearIssueBoardError,          // clears the board error (so it doesn't carry over to other issue boards)
  clearCurrentIssue,             // clears existing issue edit-form state
  optimisticMoveIssue,           // immediately moves a dragged card locally
  revertOptimisticIssueMove,     // restores card when backend rejects movement
  adjustCurrentIssueCommentCount // keeps Issue Details comment count locally synchronized
} = issueSlice.actions;

export default issueSlice.reducer;