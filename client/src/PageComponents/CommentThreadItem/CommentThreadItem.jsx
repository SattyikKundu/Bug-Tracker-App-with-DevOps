// src/PageComponents/CommentThreadItem/CommentThreadItem.jsx

import { useState } from "react"; // Stores inline Reply/Edit UI state for one comment

import {
  useDispatch, // Sends comment actions to Redux
  useSelector  // For reading auth/project/comment state
} from "react-redux";

import {
  createComment,       // creates a direct reply
  deleteComment,       // soft-deletes a comment
  expandCommentThread, // used to recursively load entire descendant branch
  fetchCommentReplies, // load comment's direct children
  updateComment        // Edits author's own comment
} from "../../Store/commentSlice.jsx";

import { adjustCurrentIssueCommentCount } from "../../Store/issueSlice.jsx"; // Used to update Activity comment count immediately

import {
  ErrorMessageToast,
  NeutralMessageToast,
  SuccessMessageToast
} from "../../utils/utilityFunctions.jsx"; // Message toasts


import "./CommentThreadItem.css"; // Styling


const formatCommentDate = (dateValue) => {

  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  return date.toLocaleString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  );
};


// Converts a populated author object into:
// Johnny Smith (@JWilly)
const getCommentAuthorName = (author) => {

  if (!author) {
    return "Unknown user";
  }

  const fullName = `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim();

  if (fullName && author.username) {
    return `${fullName} (@${author.username})`;
  }

  if (author.username) {
    return `@${author.username}`;
  }

  return (fullName || "Unknown user");
};


const scrollToCommentBelowHeader = (element) => { // Simple helper for auto-scrolling

  if (!element) {
    return;
  }

  element.scrollIntoView({
    behavior: "smooth", // Smoothly moves the viewport to the parent comment
    block: "start"      // Places the target near the top of the scroll area
  });
};


const CommentThreadItem = ({
  comment,                  // Current comment/reply being rendered
  issueId,                  // Parent issue ID used when posting replies
  projectArchived,          // Archived projects are fully read-only
  parentDisplayDepth = 0    // Visual depth of this comment's immediate parent
}) => {

  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);

  const { currentProject: project } = useSelector((state) => state.projects);

  const { 
    repliesByParent, mutationStatusById, createStatus
  } = useSelector((state) => state.comments);

  const replyEntry      = repliesByParent[comment._id];
  const replies         = replyEntry?.items ?? [];
  const repliesLoaded   = replyEntry?.loaded === true;
  const hasMoreReplies  = replyEntry?.hasMore === true;
  const replyLoadStatus = replyEntry?.status ?? "idle";
  const replyLoadError  = replyEntry?.error;
  const mutationStatus  = mutationStatusById[ comment._id] ?? "idle";

  const [replyComposerOpen, setReplyComposerOpen] = useState(false); // Inline reply form state.
  const [replyBody,         setReplyBody]         = useState("");

  // Tracks whether recursive "Expand thread" loading is currently running.
  const [expandingThread, setExpandingThread] = useState(false);

  // Controls whether already-loaded descendants are currently hidden.
  const [threadCollapsed, setThreadCollapsed] = useState(false);

  const [editMode, setEditMode]  = useState(false); // Inline editing state.
  const [editBody, setEditBody]  = useState(comment.deleted ? "" : comment.body ?? "");

  const currentUserId = user?._id || user?.id;

  const authorId =
    (typeof comment.authorId === "object")
      ? comment.authorId?._id
      : comment.authorId;

  const leadUserId =
    (typeof project?.leadUserId === "object")
      ? project.leadUserId?._id
      : project?.leadUserId;

  const isAuthor      = (String(authorId) === String(currentUserId));
  const isProjectLead = (String(leadUserId) === String(currentUserId));
  const isGlobalAdmin = (user?.role === "admin");

  // Backend permits editing only by the original author.
  const canEdit = !projectArchived && !comment.deleted && isAuthor;

  // Backend permits soft-delete by author, lead, or global admin.
  const canDelete =
    !projectArchived &&
    !comment.deleted &&
    (isAuthor || isProjectLead || isGlobalAdmin);


  // Deleted comments remain tombstones and cannot receive new replies.
  const canReply = !projectArchived && !comment.deleted;


  /* Each child normally adds one visual indentation step.
   *
   * Once displayDepth reaches four:
   * parentDisplayDepth = 4
   * child displayDepth = 4
   *
   * indentSteps becomes 0, so deeper logical replies stop moving right.
   */
  const visualDepth = Number(
    comment.displayDepth ?? Math.min(comment.depth ?? 0, 4)
    );

  const indentSteps = Math.max(visualDepth - Number(parentDisplayDepth), 0);


  /* Scrolls directly to the exact parent comment referenced by:
   * replyingTo.commentId
   *
   * Then temporarily adds a soft highlight animation.
   */
  const handleScrollToParent = () => {
    const parentCommentId = comment.replyingTo?.commentId;

    if (!parentCommentId) {
      return;
    }

    const parentElement = document.getElementById(`comment-${parentCommentId}`);

    if (!parentElement) {
      NeutralMessageToast("The parent comment is not currently visible.");
      return;
    }

    scrollToCommentBelowHeader(parentElement);
    parentElement.classList.remove("comment-thread-item--highlighted"); // Restart the identification animation.
    void parentElement.offsetWidth;

    // Small delay lets the smooth scroll get underway before the glow begins, making it easier to notice on arrival.
    window.setTimeout(() => { parentElement.classList.add("comment-thread-item--highlighted"); }, 250);
    window.setTimeout(() => { parentElement.classList.remove("comment-thread-item--highlighted"); }, 1750);

  };

  const handleLoadReplies = async () => {
    const resultAction =
      await dispatch(
        fetchCommentReplies({
          parentId: comment._id,
          append: repliesLoaded && hasMoreReplies
        })
      );

    if (fetchCommentReplies.rejected.match(resultAction)) {
      ErrorMessageToast(resultAction.payload?.message || "Unable to load replies.");
    }
  };


 /* Loads the complete descendant conversation beneath this comment.
  *
  * Unlike "Show replies", this recursively follows every loaded child
  * so the reader does not need to open a long chain one level at a time.
  */
  const handleExpandThread = async () => {
    setExpandingThread(true);

    // If this branch was previously collapsed, make it visible again before/while expansion happens.
    setThreadCollapsed(false);

    try {
      await dispatch(expandCommentThread({parentId: comment._id}));
    }
    finally {
      setExpandingThread(false);
    }
  };

  // Hides the loaded descendant branch without removing it from Redux.
  // Expanding again is therefore instant if the thread was already loaded.
  const handleCollapseThread = () => {
    setThreadCollapsed(true);
  };



  const handleReplySubmit = async (event) => {

      event.preventDefault();
      const trimmedBody = replyBody.trim();

      if (!trimmedBody) {
        ErrorMessageToast("Reply cannot be empty.");
        return;
      }

      const resultAction =
        await dispatch(
          createComment({
            issueId,
            body: trimmedBody,
            parentId: comment._id
          })
        );

      if (createComment.fulfilled.match(resultAction)) {

        dispatch(adjustCurrentIssueCommentCount(1));
        setReplyBody("");
        setReplyComposerOpen(false);
        SuccessMessageToast("Reply posted successfully.");
        return;
      }

      ErrorMessageToast(resultAction.payload || "Unable to post reply.");
    };


  const handleEditSubmit = async (event) => {

    event.preventDefault();

    const trimmedBody = editBody.trim();

    if (!trimmedBody) {
      ErrorMessageToast("Comment cannot be empty.");
      return;
    }

    if ((trimmedBody === comment.body)) {
      NeutralMessageToast("No comment changes to save.");
      return;
    }

    const resultAction =
      await dispatch(
        updateComment({
          commentId: comment._id,
          body: trimmedBody
          })
      );

    if (updateComment.fulfilled.match(resultAction)) {
      setEditMode(false);
      SuccessMessageToast("Comment updated successfully.");
      return;
    }
    ErrorMessageToast(resultAction.payload || "Unable to update comment.");
  };


  const handleDelete = async () => {

      const confirmed =
        window.confirm("Delete this comment? Existing replies will remain connected beneath a [deleted] placeholder.");

      if (!confirmed) {
        return;
      }

      const resultAction = await dispatch(deleteComment(comment._id));

      if (deleteComment.fulfilled.match(resultAction)) {
        dispatch(adjustCurrentIssueCommentCount(-1));
        setEditMode(false);
        setReplyComposerOpen(false);
        SuccessMessageToast("Comment deleted.");
        return;
      }

      ErrorMessageToast(resultAction.payload || "Unable to delete comment.");
    };

  return (
    <div
      id={`comment-${comment._id}`}
      className={
        comment.deleted
          ? "comment-thread-item comment-thread-item--deleted"
          : "comment-thread-item"
      }
      style={{"--comment-indent-steps": indentSteps}}
    >

      <article className="comment-thread-card">
        {/* ------------------------------------------------------------ */}
        {/* Author / timestamp                                           */}
        {/* ------------------------------------------------------------ */}
        <header className="comment-thread-heading">
          <div className="comment-thread-author">
            <strong>{getCommentAuthorName(comment.authorId)}</strong>
            {isProjectLead &&
              isAuthor && (
                <span className="comment-thread-role-badge">
                  Project Lead
                </span>
              )}
          </div>

          <div className="comment-thread-time">
            <time dateTime={comment.createdAt}>
              {formatCommentDate(comment.createdAt)}
            </time>

            {comment.edited && !comment.deleted && (
                <span>edited</span>
              )}
          </div>
        </header>

        {/* ------------------------------------------------------------ */}
        {/* Exact parent reference                                       */}
        {/* ------------------------------------------------------------ */}
        {comment.replyingTo && (
          <button
            className="comment-thread-reply-context"
            type="button"
            onClick={handleScrollToParent}
          >
            <span className="comment-thread-reply-context-title">
              ↳ Replying to{" "}
              <strong>
                {getCommentAuthorName(comment.replyingTo.author)}
              </strong>
            </span>

            <span className="comment-thread-reply-preview">
              “
              {comment.replyingTo.bodyPreview}
              ”
            </span>
          </button>
        )}

        {/* ------------------------------------------------------------ */}
        {/* Comment body / inline editor                                 */}
        {/* ------------------------------------------------------------ */}

        {editMode ? (
          <form 
            className = "comment-thread-edit-form"
            onSubmit  = {handleEditSubmit}
          >
            <textarea
              value={editBody}
              onChange={ (event) => setEditBody(event.target.value) }
              rows="4"
              maxLength="5000"
              autoFocus
            />

            <div className="comment-thread-inline-actions">
              <button
                type="button"
                className="comment-thread-secondary-button"
                onClick={() => {
                  setEditMode(false);
                  setEditBody(comment.body ?? "");
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="comment-thread-primary-button"
                disabled={ mutationStatus === "loading"}
              >
                {mutationStatus === "loading" ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        ) : (

          <div
            className={
              comment.deleted
                ? "comment-thread-body comment-thread-body--deleted"
                : "comment-thread-body"
            }
          >
            {comment.deleted ? "[deleted]" : comment.body}
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* Comment controls                                             */}
        {/* ------------------------------------------------------------ */}
        {!editMode && (
          <div className="comment-thread-actions">
            {canReply && (
              <button
                type="button"
                onClick={() => { setReplyComposerOpen((current) => !current); }}
              >
                Reply
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setEditBody(comment.body ?? "");
                  setEditMode(true);
                }}
              >
                Edit
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                className="comment-thread-delete-action"
                onClick={handleDelete}
                disabled={mutationStatus === "loading"}
              >
                Delete
              </button>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* Inline reply composer                                        */}
        {/* ------------------------------------------------------------ */}
        {replyComposerOpen &&
          canReply && (
            <form
              className="comment-thread-reply-form"
              onSubmit={handleReplySubmit}
            >
              <label htmlFor={`reply-${comment._id}`}>
                Reply to{" "}
                {getCommentAuthorName(comment.authorId)}
              </label>

              <textarea
                id={`reply-${comment._id}`}
                value={replyBody}
                onChange={(event) => setReplyBody(event.target.value)}
                rows="3"
                maxLength="5000"
                placeholder="Write a reply..."
                autoFocus
              />

              <div className="comment-thread-inline-actions">
                <button
                  type="button"
                  className="comment-thread-secondary-button"
                  onClick={() => {
                    setReplyComposerOpen(false);
                    setReplyBody("");
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="comment-thread-primary-button"
                  disabled={createStatus === "loading"}
                >
                  {createStatus === "loading" ? "Posting..." : "Reply"}
                </button>
              </div>
            </form>
          )}

        {/* ------------------------------------------------------------ */}
        {/* Replies loading control                                      */}
        {/* ------------------------------------------------------------ */}
        {replyLoadError && (
          <p className="comment-thread-replies-error" role="alert">
            {replyLoadError}
          </p>
        )}

        <div className="comment-thread-expansion-actions">
          {/* -------------------------------------------------------------- */}
          {/* One-level / paginated expansion                                */}
          {/* -------------------------------------------------------------- */}
          {(!repliesLoaded || hasMoreReplies) && (
            <button
              type="button"
              className="comment-thread-load-replies"
              onClick={() => {
                // Make descendants visible again if this comment had previously been collapsed.
                setThreadCollapsed(false);
                handleLoadReplies();
              }}
              disabled={replyLoadStatus === "loading"}
            >
              {replyLoadStatus === "loading"
                ? "Loading replies..."
                : (repliesLoaded ? "Load more replies" : "Show replies")
              }
            </button>

          )}

          {/* -------------------------------------------------------------- */}
          {/* Whole-branch expansion                                         */}
          {/* -------------------------------------------------------------- */}
          {!threadCollapsed && (
            <button
              type="button"
              className="comment-thread-expand-thread"
              onClick={handleExpandThread}
              disabled={expandingThread}
            >
              {expandingThread ? "Expanding..." : "Expand thread"}
            </button>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Collapse already-visible descendants                           */}
          {/* -------------------------------------------------------------- */}
          {!threadCollapsed &&
            replies.length > 0 && (
              <button
                type="button"
                className="comment-thread-collapse-thread"
                onClick={handleCollapseThread}
              >
                Collapse thread
              </button>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Re-open cached collapsed branch                                */}
          {/* -------------------------------------------------------------- */}
          {threadCollapsed &&
            replies.length > 0 && (
              <button
                type="button"
                className="comment-thread-expand-thread"
                onClick={() => {
                  //The replies are still cached in Redux, so reopening does not require another API request.
                  setThreadCollapsed(false);
                }}
              >
                Expand thread
              </button>
            )}
        </div>
      </article>

      {/* -------------------------------------------------------------- */}
      {/* Recursive direct children                                     */}
      {/* -------------------------------------------------------------- */}

      {/* {replies.length > 0 && ( */}
      {!threadCollapsed && replies.length > 0 && (
        <div className="comment-thread-children">
          {replies.map(
            (reply) => (
              <CommentThreadItem
                key={reply._id}
                comment={reply}
                issueId={issueId}
                projectArchived={projectArchived}
                parentDisplayDepth={visualDepth}
              />
            )
          )}
        </div>
      )}
    </div>
  );
};

export default CommentThreadItem;