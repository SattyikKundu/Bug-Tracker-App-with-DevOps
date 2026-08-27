// src/Store/commentSlice.jsx

import {
  createAsyncThunk, // creates async Redux actions for comment API requests
  createSlice       // creates comment reducers/state/actions
} from "@reduxjs/toolkit";

import api from "../api/axios.js"; // Shared Axios client with JWT cookie support


const TOP_LEVEL_PAGE_SIZE = 20; // Number of top-level comments loaded at a time
const REPLY_PAGE_SIZE     = 10; // Number of direct    replies loaded at a time


const createReplyEntry = () => ({ // Creates default replies-state entry for one parent comment.

  items: [],             // Direct child comments currently loaded
  status: "idle",        // idle | loading | succeeded | failed
  error: null,           // Reply-list loading error
  loaded: false,         // True once this parent has actually been queried
  hasMore: false         // True when another reply page is available
});


// Removes duplicate comments whilst preserving chronological order.
const mergeUniqueComments = ( existingComments, incomingComments) => {

  const commentsById = new Map();

  [...existingComments, ...incomingComments].forEach((comment) => {
      commentsById.set(String(comment._id), comment);
    }
  );

  return [...commentsById.values()].sort(
    (commentA, commentB) => new Date(commentA.createdAt) - new Date(commentB.createdAt));

};


// Replaces one comment anywhere inside the currently loaded comment state.
const replaceLoadedComment = (state, updatedComment) => {

  const topLevelIndex =
    state.topLevelComments.findIndex(
      (comment) => (String(comment._id) === String(updatedComment._id)));


  if (topLevelIndex !== -1) {
    state.topLevelComments[topLevelIndex] = updatedComment;
    return;
  }


  for (const replyEntry of Object.values(state.repliesByParent)) {

    const replyIndex =
      replyEntry.items.findIndex(
        (comment) => (String(comment._id) === String(updatedComment._id)));


    if (replyIndex !== -1) {
      replyEntry.items[replyIndex] = updatedComment;
      return;
    }

  }

};


// Soft-deletes one already-loaded comment locally.
const markLoadedCommentDeleted = (state, commentId) => {

  const markDeleted = (comment) => {
    comment.deleted = true;
    comment.body = "[deleted]";
    comment.edited = false;
  };


  const topLevelComment =
    state.topLevelComments.find(
      (comment) => (String(comment._id) === String(commentId))
    );


  if (topLevelComment) {
    markDeleted(topLevelComment);
    return;
  }


  for (const replyEntry of Object.values(state.repliesByParent)) {

    const reply =
      replyEntry.items.find(
        (comment) => (String(comment._id) === String(commentId)));

    if (reply) {
      markDeleted(reply);
      return;
    }
  }
};


/* GET /issues/:id/comments
 *
 * Loads top-level comments.
 *
 * append=false:
 * → initial page / silent refresh
 *
 * append=true:
 * → next page via "Load more comments"
 */
export const fetchIssueComments = createAsyncThunk(
  "comments/fetchIssueComments",

  async (
    {
      issueId,
      append = false,
      silent = false,
      refresh = false
    },
    thunkAPI
  ) => {

    try {

      const state = thunkAPI.getState().comments;
      const currentLength = state.topLevelComments.length;
      const skip = append ? currentLength : 0;


      /* Normal page:
       * fetch 20 + 1.
       *
       * The extra row lets us know whether another page exists
       * without requiring a separate total-count endpoint.
       */
      let requestedVisibleCount = TOP_LEVEL_PAGE_SIZE;


      /* Background polling refreshes everything currently visible,
       * plus room for another page of newly arrived comments.
       */
      if (refresh) {

        requestedVisibleCount =
          Math.min(
            Math.max( currentLength + TOP_LEVEL_PAGE_SIZE, TOP_LEVEL_PAGE_SIZE), 99
          );
      }


      const apiLimit = requestedVisibleCount + 1;


      const response =
        await api.get(
          `/issues/${issueId}/comments`,
          {
            params: { skip, limit: apiLimit }
          }
        );


      const receivedComments = response.data.comments ?? [];


      return {
        comments: receivedComments.slice(0,requestedVisibleCount),
        hasMore:  receivedComments.length > requestedVisibleCount,
        append,
        silent
      };

    }
    catch (error) {
      return thunkAPI.rejectWithValue({
        message: error.response?.data?.error || "Unable to load issue comments.",
        silent
      });
    }
  }
);


/* GET /comments/:id/replies
 *
 * Loads only DIRECT children of one parent comment.
 */
export const fetchCommentReplies = createAsyncThunk(
  "comments/fetchCommentReplies",

  async (
    {
      parentId,
      append = false,
      silent = false,
      refresh = false
    },
    thunkAPI
  ) => {

    try {

      const state         = thunkAPI.getState().comments;
      const replyEntry    = state.repliesByParent[parentId] ?? createReplyEntry();
      const currentLength = replyEntry.items.length;
      const skip          = append ? currentLength : 0;

      let requestedVisibleCount = REPLY_PAGE_SIZE;


      if (refresh) {
        requestedVisibleCount =
          Math.min(Math.max(currentLength + REPLY_PAGE_SIZE, REPLY_PAGE_SIZE), 99);
      }

      const apiLimit        = requestedVisibleCount + 1;
      const response        = await api.get(`/comments/${parentId}/replies`, { params: { skip, limit: apiLimit } });
      const receivedReplies = response.data.replies ?? [];

      return {
        parentId,
        replies: receivedReplies.slice(0, requestedVisibleCount),
        hasMore: receivedReplies.length > requestedVisibleCount,
        append,
        silent
      };

    }
    catch (error) {
      return thunkAPI.rejectWithValue({
        parentId,
        message: error.response?.data?.error || "Unable to load comment replies.",
        silent
      });
    }
  }
);


/* POST /issues/:id/comments
 *
 * parentId=null:
 * → top-level comment
 *
 * parentId=<comment id>:
 * → reply to that exact comment
 */
export const createComment = createAsyncThunk(
  "comments/createComment",

  async ({ issueId, body, parentId = null }, thunkAPI) => {

    try {
      const response = await api.post(`/issues/${issueId}/comments`, { body, parentId });
      return response.data.comment;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || "Unable to post comment.");
    }
  }
);


/* PATCH /comments/:id
 *
 * Backend permits only the original author to edit
 * a non-deleted comment.
 */
export const updateComment = createAsyncThunk(
  "comments/updateComment",
  async ({ commentId, body }, thunkAPI) => {

    try {
      const response = await api.patch(`/comments/${commentId}`, { body });
      return response.data.comment;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || "Unable to update comment.");
    }
  }
);


/* DELETE /comments/:id
 *
 * Backend soft-deletes the comment and returns 204.
 */
export const deleteComment = createAsyncThunk(
  "comments/deleteComment",
  async (commentId,  thunkAPI) => {

    try {
      await api.delete(`/comments/${commentId}`);
      return commentId;
    }
    catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error ||"Unable to delete comment.");
    }
  }
);


/* Silent ~30-second refresh.
 *
 * Refreshes:
 * + top-level comments;
 * + every replies branch the user has already opened.
 *
 * Collapsed/unopened reply branches are intentionally not queried.
 */
export const refreshVisibleCommentThread = ({ issueId }) => async (dispatch, getState) => {

  await dispatch(
    fetchIssueComments({
      issueId,
      refresh: true,
      silent: true
    })
  );

  const currentReplies = getState().comments.repliesByParent;

  const loadedParentIds =
    Object.entries(currentReplies)
      .filter(([, replyEntry]) => replyEntry.loaded)
      .map(([parentId]) => parentId);

  await Promise.all(
    loadedParentIds.map(
      (parentId) =>
        dispatch(
          fetchCommentReplies({
            parentId,
            refresh: true,
            silent: true
          })
        )
    )
  );
};


/* Recursively loads complete descendant branch underneath one comment.
 *
 * Purpose:
 * "Expand thread" should save reader from clicking:
 *
 * Show replies
 *   → Show replies
 *       → Show replies
 *           → ...
 *
 * Each backend request still uses existing direct-replies endpoint.
 */
export const expandCommentThread =
  ({
    parentId // Comment whose entire descendant branch should be expanded
  }) =>
  async (
    dispatch, // Used to dispatch reply-loading actions recursively
    getState  // Used to inspect already-loaded reply state
  ) => {

  let replyEntry = getState().comments.repliesByParent[parentId];

  // If comment's direct replies have never been loaded, retrieve first page now.
  if (!replyEntry?.loaded) {
    const firstPageResult = await dispatch(fetchCommentReplies({parentId}));

    if (fetchCommentReplies.rejected.match(firstPageResult)) { // Stop recursion if branch itself failed to load.
      return;
    }

    replyEntry = getState().comments.repliesByParent[parentId];
  }

  // If this parent has more than one page of direct replies, continue loading until every direct child is available.
  while (replyEntry?.hasMore) {

    const nextPageResult = await dispatch(fetchCommentReplies({ parentId, append: true }));

    if (fetchCommentReplies.rejected.match(nextPageResult)) {
      return;
    }
    replyEntry = getState().comments.repliesByParent[parentId];
  }

  const childComments = replyEntry?.items ?? [];

  // Repeat the same operation for every direct child.
  // This recursively reveals the full selected discussion branch.
  for (const childComment of childComments) {
    await dispatch(expandCommentThread({ parentId: childComment._id}));
  }
};


const initialState = {
  topLevelComments: [],   // Root comments currently loaded
  topLevelStatus: "idle", // idle | loading | succeeded | failed
  topLevelError: null,    // Initial/top-level load error
  topLevelHasMore: false, // More root comments available
  repliesByParent: {},    // Direct replies indexed by parent comment ID
  createStatus: "idle",   // Tracks top-level/reply creation
  mutationStatusById: {}  // Tracks edit/delete operations per comment
};


const commentSlice = createSlice({
  name: "comments",
  initialState,
  reducers: {
    clearCommentThread: (state) => { // Clears one Issue Details page's entire comment thread.
      state.topLevelComments   = [];
      state.topLevelStatus     = "idle";
      state.topLevelError      = null;
      state.topLevelHasMore    = false;
      state.repliesByParent    = {};
      state.createStatus       = "idle";
      state.mutationStatusById = {};
    }
  },

  extraReducers: (builder) => {
    builder
      // =====================================================================
      // Top-level comments
      // =====================================================================
      .addCase(fetchIssueComments.pending, (state, action) => {
          if (!action.meta.arg.silent) {
            state.topLevelStatus = "loading";
            state.topLevelError = null;
          }
        }
      )
      .addCase(fetchIssueComments.fulfilled, (state, action) => {

          const { comments, hasMore, append } = action.payload;
          state.topLevelStatus = "succeeded";
          state.topLevelComments =
            append
              ? mergeUniqueComments(state.topLevelComments, comments)
              : comments;

          state.topLevelHasMore = hasMore;
          state.topLevelError = null;
        }
      )

      .addCase(fetchIssueComments.rejected, (state, action) => {
          const isSilent = action.payload?.silent;

          if (!isSilent) {
            state.topLevelStatus = "failed";
            state.topLevelError = action.payload?.message || "Unable to load issue comments.";
          }
        }
      )

      // =====================================================================
      // Replies
      // =====================================================================
      .addCase(fetchCommentReplies.pending, (state, action) => {
          const {parentId, silent} = action.meta.arg;
          state.repliesByParent[parentId] ??= createReplyEntry();

          if (!silent) {
            state.repliesByParent[parentId].status ="loading";
            state.repliesByParent[parentId].error = null;
          }

        }
      )

      .addCase(fetchCommentReplies.fulfilled, (state, action) => {
          const {parentId, replies, hasMore, append} = action.payload;

          state.repliesByParent[parentId] ??= createReplyEntry();
          const replyEntry = state.repliesByParent[parentId];

          replyEntry.status = "succeeded";
          replyEntry.loaded = true;
          replyEntry.items =
            append
              ? mergeUniqueComments(replyEntry.items, replies)
              : replies;

          replyEntry.hasMore = hasMore;
          replyEntry.error = null;
        }
      )
      .addCase(fetchCommentReplies.rejected, (state, action) => {

          const parentId = action.payload?.parentId ?? action.meta.arg.parentId;
          const silent = action.payload?.silent;
          state.repliesByParent[parentId] ??= createReplyEntry();

          if (!silent) {
            state.repliesByParent[parentId].status = "failed";

            state.repliesByParent[parentId].error =
              action.payload?.message ||
              "Unable to load replies.";
          }
        }
      )

      // =====================================================================
      // Create comment/reply
      // =====================================================================
      .addCase(createComment.pending, (state) => {
          state.createStatus = "loading";
        }
      )
      .addCase(
        createComment.fulfilled, (state, action) => {
          state.createStatus = "succeeded";
          const createdComment = action.payload;

          const parentId =
            createdComment.parentId?._id ??
            createdComment.parentId ??
            null;

          if (!parentId) {
            state.topLevelComments =
              mergeUniqueComments(state.topLevelComments, [createdComment]);
            return;
          }
          state.repliesByParent[parentId] ??= createReplyEntry();
          const replyEntry = state.repliesByParent[parentId];
          replyEntry.items = mergeUniqueComments( replyEntry.items, [createdComment]);
        }
      )
      .addCase(createComment.rejected, (state) => {
          state.createStatus = "failed";
        }
      )

      // =====================================================================
      // Edit comment
      // =====================================================================
      .addCase(updateComment.pending, (state, action) => {
          state.mutationStatusById[ action.meta.arg.commentId ] = "loading";
        }
      )
      .addCase(updateComment.fulfilled, (state, action) => {
          const updatedComment =action.payload;
          state.mutationStatusById[ updatedComment._id ] = "succeeded";
          replaceLoadedComment(state, updatedComment);
        }
      )
      .addCase(updateComment.rejected, (state, action) => {
          state.mutationStatusById[action.meta.arg.commentId] = "failed";
        }
      )

      // =====================================================================
      // Delete / soft-delete comment
      // =====================================================================
      .addCase(deleteComment.pending, (state, action) => {
          state.mutationStatusById[action.meta.arg] = "loading";
        }
      )
      .addCase(deleteComment.fulfilled, (state, action) => {
          const deletedCommentId = action.payload;
          state.mutationStatusById[ deletedCommentId ] = "succeeded";
          markLoadedCommentDeleted(state, deletedCommentId);
        }
      )
      .addCase(deleteComment.rejected, (state, action) => {
          state.mutationStatusById[action.meta.arg] = "failed";
        }
      );
  }
});

export const { clearCommentThread } = commentSlice.actions;
export default commentSlice.reducer;