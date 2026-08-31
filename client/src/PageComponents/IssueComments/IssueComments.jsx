// src/PageComponents/IssueComments/IssueComments.jsx

import {
  useEffect, // used to loads/refresh comment discussion whilst Issue Details is open
  useState   // used to store new top-level comment composer
} from "react";

import {useDispatch, useSelector} from "react-redux";

import {
  clearCommentThread,          // clears old issue comments when route changes
  createComment,               // creates top-level issue comments
  fetchIssueComments,          // initial/load-more top-level retrieval
  refreshVisibleCommentThread  // silent 30-second discussion refresh
} from "../../Store/commentSlice.jsx";

import {adjustCurrentIssueCommentCount} from "../../Store/issueSlice.jsx";
import {ErrorMessageToast, SuccessMessageToast} from "../../utils/utilityFunctions.jsx";

import CommentThreadItem from "../CommentThreadItem/CommentThreadItem.jsx";
import "./IssueComments.css";


const IssueComments = ({
  issueId,          // issue whose Activity discussion is displayed
  projectArchived   // archived issue comments become completely read-only
}) => {

  const dispatch = useDispatch();

  const { currentIssue: issue } = useSelector((state) => state.issues);

  const {
    topLevelComments,
    topLevelStatus,
    topLevelError,
    topLevelHasMore,
    createStatus
  } = useSelector((state) => state.comments);

  const [newCommentBody, setNewCommentBody] = useState("");

  /* Initial comment load.
   * Clearing first prevents comments from previously visited issue briefly appearing inside new Issue Details page.
   */
  useEffect(() => {

    dispatch(clearCommentThread());
    dispatch(fetchIssueComments({issueId}));

    return () => {
      dispatch(clearCommentThread());
    };

  }, [dispatch, issueId]);


  /* Collaborative polling.
   *
   * Every ~30 seconds while this Issue Details page remains open:
   *
   * + silently refresh top-level comments;
   * + silently refresh reply branches the reader already expanded.
   *
   * No spinner/toast is shown during background refresh.
   */
  useEffect(() => {

    const intervalId = window.setInterval(() => {

          // avoid background API traffic while this browser tab is hidden.
          if (document.visibilityState !== "visible") {
            return;
          }
          dispatch(refreshVisibleCommentThread({issueId}));
        },
        30000
      );

    return () => {
      window.clearInterval(intervalId);
    };

  }, [dispatch, issueId]);


  // when user returns to a previously hidden tab, refresh immediately rather than waiting another full 30 seconds.
  useEffect(() => {

    const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          dispatch(refreshVisibleCommentThread({issueId}));
        }
      };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };

  }, [dispatch, issueId]);


  const handleCreateTopLevelComment = async (event) => {

      event.preventDefault();
      const trimmedBody = newCommentBody.trim();

      if (!trimmedBody) {
        ErrorMessageToast("Comment cannot be empty.");
        return;
      }

      const resultAction =
        await dispatch(
          createComment({
            issueId,
            body: trimmedBody,
            parentId:null
          })
        );

      if (createComment.fulfilled.match(resultAction)) {
        dispatch(adjustCurrentIssueCommentCount(1));
        setNewCommentBody("");
        //SuccessMessageToast("Comment posted successfully.");
        return;
      }

      ErrorMessageToast(resultAction.payload || "Unable to post comment.");
    };


  const handleLoadMoreComments = async () => {

      const resultAction =
        await dispatch(
          fetchIssueComments({
            issueId,
            append: true
          })
        );

      if (fetchIssueComments.rejected.match(resultAction)) {
        ErrorMessageToast(resultAction.payload?.message || "Unable to load more comments.");
      }
    };

  return (
    <section className="issue-details-panel issue-comments-panel">

      {/* -------------------------------------------------------------- */}
      {/* Activity header                                                */}
      {/* -------------------------------------------------------------- */}
      <div className="issue-details-section-heading">
        <h2>Activity</h2>
        <span>
          {issue?.commentCount ?? 0}
          {" "}
          {(issue?.commentCount ?? 0) === 1 ? "comment" : "comments"}
        </span>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* New top-level comment composer                                 */}
      {/* -------------------------------------------------------------- */}
      {!projectArchived ? (
        <form
          className="issue-comments-composer"
          onSubmit={handleCreateTopLevelComment}
        >
          <label htmlFor="newIssueComment">
            Add comment
          </label>

          <textarea
            id          = "newIssueComment"
            value       = {newCommentBody}
            onChange    = {(event) => setNewCommentBody(event.target.value)}
            rows        = "4"
            maxLength   = "5000"
            placeholder = "Share an update, question, test result, or implementation note..."
          />

          <div className="issue-comments-composer-footer">
            <small>
              Project members can reply directly to individual comments below.
            </small>
            <button
              type="submit"
              disabled={ createStatus === "loading"}
            >
              {createStatus === "loading" ? "Posting..." : "Comment"}
            </button>
          </div>
        </form>
      ) : (
        <div className="issue-comments-readonly-notice">
          Comments are read-only while this project is archived.
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Comment loading/error                                          */}
      {/* -------------------------------------------------------------- */}
      {topLevelStatus === "loading" &&
       topLevelComments.length === 0 && (
        <div className="issue-comments-loading">
          <div className="issue-comments-spinner" />
          <span>
            Loading comments...
          </span>
        </div>
      )}

      {topLevelStatus === "failed" && (
        <div
          className="issue-comments-error"
          role="alert"
        >
          <strong>
            Comments could not be loaded.
          </strong>
          <p>{topLevelError}</p>
          <button
            type="button"
            onClick={() => dispatch(fetchIssueComments({issueId}))}
          >
            Try Again
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Threaded discussion                                            */}
      {/* -------------------------------------------------------------- */}
      {topLevelStatus          !== "failed"  &&
       topLevelComments.length === 0         &&
       topLevelStatus          !== "loading" && (

        <div className="issue-comments-empty">
          <strong>No comments yet</strong>
          <p>Start the discussion by posting the first project update.</p>
        </div>
      )}

      {topLevelComments.length > 0 && (
        <div className="issue-comments-thread">
          {topLevelComments.map(
            (comment) => (
              <CommentThreadItem
                key                = {comment._id}
                comment            = {comment}
                issueId            = {issueId}
                projectArchived    = {projectArchived}
                parentDisplayDepth = {0}
              />
            )
          )}
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Top-level pagination                                          */}
      {/* -------------------------------------------------------------- */}
      {topLevelHasMore && (
        <button
          className = "issue-comments-load-more"
          type      = "button"
          onClick   = {handleLoadMoreComments}
          disabled  = {topLevelStatus === "loading"}
        >
          {topLevelStatus === "loading" ? "Loading..." : "Load more comments"}
        </button>
      )}

      <p className="issue-comments-refresh-note">
        Open comment threads refresh automatically about every 30 seconds.
      </p>
    </section>
  );
};

export default IssueComments;