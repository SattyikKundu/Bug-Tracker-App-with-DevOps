// src/ProtectedPages/IssueDetailsPage/IssueDetailsPage.jsx

import {
  useEffect, // triggers code based on provided conditions
  useMemo    // builds user lookup information and permission state efficiently
} from "react";

import {
  Link,      // provides Board/Edit navigation via URL links
  useParams  // used to read :projectId and :issueId from  route
} from "react-router";

import {
  useDispatch, // sends project/issue Redux actions
  useSelector  // reads authenticated user, project, and issue states from Redux
} from "react-redux";

import { fetchProjectById } from "../../Store/projectSlice.jsx"; // loads project/member/lead information

import {
  clearCurrentIssue, // prevents one issue's details leaking into another route
  fetchIssueById,    // GET /issues/:issueId
  watchIssue,        // POST /issues/:issueId/watch
  unwatchIssue       // DELETE /issues/:issueId/watch
} from "../../Store/issueSlice.jsx";

import {
  ErrorMessageToast,   // Toast for failed     Watch/Unwatch API results
  SuccessMessageToast  // Toast for successful Watch/Unwatch API results
} from "../../utils/utilityFunctions.jsx";

import { STATUS_LABELS } from "../../utils/issueWorkflow.jsx"; // converts internal workflow status into readable UI text

import IssueComments from "../../PageComponents/IssueComments/IssueComments.jsx"; // Threaded Activity/comments section

import "./IssueDetailsPage.css"; // Full Issue Details page styling



// Converts a stored date into a readable issue-tracker timestamp (Example: Aug 19, 2026, 8:42 PM).
const formatIssueDate = (dateValue) => {

  if (!dateValue) {
    return "—";
  }

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleString(
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


/* This makes enum-style values easier to read.
 *
 * ready_for_review → Ready For Review
 * in_progress      → In Progress
 */
const formatEnumLabel = (value) => {
  if (!value) {
    return "—";
  }

  return String(value)
    .trim()
    .replaceAll("_", " ")
    .replace( /\b\w/g, (character) => character.toUpperCase());
};


const IssueDetailsPage = () => {

  const {
    projectId, // Parent project from URL
    issueId    // Selected issue from URL
  } = useParams();


  const dispatch = useDispatch(); // Redux dispatcher

  const { user } = useSelector((state) => state.auth); // Current logged-in user used for edit/watch permissions

  const {
    currentProject: project,
    currentProjectStatus,
    currentProjectError
  } = useSelector((state) => state.projects);

  const {
    currentIssue: issue,
    currentIssueStatus,
    currentIssueError,
    watchStatus
  } = useSelector((state) => state.issues);


  /* Loads both project and selected issue.
   *
   * Project information is needed for:
   * + project lead/member identities;
   * + edit permissions;
   * + archived/read-only behavior.
   */
  useEffect(() => {

    dispatch(fetchProjectById(projectId));

    dispatch(fetchIssueById(issueId));

    return () => {
      dispatch(clearCurrentIssue());
    };
  }, [ dispatch, projectId, issueId ]);

  
  const currentUserId = user?._id || user?.id; // Normalize logged-in user ID.

  // Normalize populated/plain project lead ID.
  const projectLeadId = 
    (typeof project?.leadUserId === "object") ? project.leadUserId?._id : project?.leadUserId;

  const isProjectLead = (String(projectLeadId) === String(currentUserId));
  const isGlobalAdmin = (user?.role === "admin");


  /* Build a reusable user lookup from populated project information.
   *
   * This lets reporter, assignee, and status-history entries show names
   * rather than raw MongoDB ObjectIds whenever user is still part of
   * the project.
   */
  const projectUsersById =
    useMemo(() => {

      const userMap = new Map();

      const addProjectUser = (projectUser) => {

        if (!projectUser || typeof projectUser !== "object" || !projectUser._id) {
          return;
        }

        userMap.set(String(projectUser._id), projectUser);
      };

      addProjectUser(project?.leadUserId);
      (Array.isArray(project?.members) ? project.members : []) .forEach(addProjectUser);
      return userMap;

    },[project]);

  /* Converts either:
   * + a populated User object; OR
   * + a plain MongoDB user ID
   *
   * into a readable identity.
   */
  const resolveUserIdentity = (userReference) => {

    if (!userReference) {
      return "Unassigned";
    }

    const referencedUser =
      typeof userReference === "object"
        ? userReference
        : projectUsersById.get(
            String(userReference)
          );

    /* A reporter/status-history actor might later leave the project.
     * In that case we deliberately avoid pretending we still know
     * their current profile information.
     */
    if (!referencedUser) {
      return "Former / unavailable project user";
    }

    const fullName = (`${referencedUser.firstName ?? ""} ${referencedUser.lastName ?? ""}`).trim();

    if (fullName && referencedUser.username) {
      return `${fullName} (@${referencedUser.username})`;
    }

    if (referencedUser.username) {
      return `@${referencedUser.username}`;
    }

    return fullName || "Project user";
  };


  // Normalize reporter ID for permission checks.
  const reporterId = (typeof issue?.reporterId === "object") ? issue.reporterId?._id : issue?.reporterId;


  // Normalize assignee ID for permission checks.
  const assigneeId = (typeof issue?.assigneeId === "object") ? issue.assigneeId?._id : issue?.assigneeId;


  /* Mirrors the backend's issue-edit policy:
   * + global admin; OR
   * + project lead; OR
   * + project member who is the reporter/assignee.
   *
   * Archived projects disable the Edit action altogether.
   */
  const canEditIssue =
    project?.archived !== true &&
    (
      isGlobalAdmin ||
      isProjectLead ||
      String(reporterId) === String(currentUserId) ||
      String(assigneeId) === String(currentUserId)
    );


  // Check whether the current user already exists in issue.watchers[].
  const isWatching =
    Array.isArray(issue?.watchers) &&
    issue.watchers.some(
      (watcher) => {
        const watcherId = (typeof watcher === "object") ? watcher?._id : watcher;

        return ((String(watcherId) === String(currentUserId)));
      }
    );


  const watcherCount = (Array.isArray(issue?.watchers)) ? issue.watchers.length : 0;


  /* Watch/Unwatch remains unavailable for archived projects because
   * your backend intentionally makes archived projects read-only.
   */
  const handleWatchToggle = async () => {

      if ( project?.archived === true || watchStatus === "loading" ) {
        return;
      }

      const resultAction =
        isWatching
          ? await dispatch(unwatchIssue(issueId))
          : await dispatch(watchIssue(issueId));

      if (
        (isWatching && unwatchIssue.fulfilled.match(resultAction))
        ||
        (!isWatching && watchIssue.fulfilled.match(resultAction)
        )
      ) {
        SuccessMessageToast(
          isWatching
            ? "You are no longer watching this issue."
            : "You are now watching this issue."
        );

        return;
      }
      ErrorMessageToast(resultAction.payload || "Unable to update issue watching.");
    };


  const pageIsLoading =

    currentProjectStatus === "idle" ||
    currentProjectStatus === "loading" ||

    currentIssueStatus === "idle" ||
    currentIssueStatus === "loading";


  if (pageIsLoading) {
    return (
      <main className="issue-details-page">
        <section className="issue-details-state-card">
          <div className="issue-details-spinner" />
          <h2>Loading issue details</h2>
          <p>Retrieving issue information and project context.</p>
        </section>
      </main>
    );
  }


  if (currentProjectStatus === "failed" || currentIssueStatus === "failed") {

    return (
      <main className="issue-details-page">
        <section
          className="issue-details-state-card issue-details-state-card--error"
          role="alert"
        >
          <h2>Issue could not be loaded</h2>
          <p>{currentProjectError || currentIssueError}</p>
          <Link to={`/projects/${projectId}/board`}>Return to Issue Board</Link>
        </section>
      </main>
    );
  }

  const normalizedPriority = String(issue?.priority || "medium").trim().toLowerCase();

  const statusLabel = STATUS_LABELS[issue?.status] || formatEnumLabel(issue?.status);

  return (
    <main className="issue-details-page">

      {/* -------------------------------------------------------------- */}
      {/* Breadcrumb                                                     */}
      {/* -------------------------------------------------------------- */}
      <nav className="issue-details-breadcrumb" aria-label="Issue breadcrumb">
        <Link to="/projects">Projects</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/projects/${projectId}/board`}>{project?.key} Board</Link>
        <span aria-hidden="true">/</span>
        <span>{issue?.key}</span>
      </nav>


      {/* Archived project explanation remains prominent. */}
      {project?.archived && (
        <div className="issue-details-archive-banner" role="status">
          <strong>Archived Project</strong>
          <span>
            This issue is available for historical reference,
            but editing and watching actions are disabled.
          </span>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Issue heading                                                  */}
      {/* -------------------------------------------------------------- */}
      <header className="issue-details-heading">
        <div className="issue-details-heading-main">
          <div className="issue-details-heading-meta">
            <span className="issue-details-key">{issue?.key}</span>
            <span className={`issue-details-status issue-details-status--${issue?.status}`}>
              {statusLabel}
            </span>
          </div>
          <h1>{issue?.title}</h1>
        </div>

        <div className="issue-details-heading-actions">
          {!project?.archived && (
            <button
              type="button"
              className={
                isWatching
                  ? "issue-details-watch-button issue-details-watch-button--active"
                  : "issue-details-watch-button"
              }
              onClick={handleWatchToggle}
              disabled={
                watchStatus === "loading"
              }
            >

              {watchStatus === "loading"
                ? "Updating..."
                : (
                    isWatching
                      ? "Unwatch"
                      : "Watch"
                  )
              }
            </button>
          )}

          {canEditIssue && (
            <Link
              className="issue-details-edit-button"
              to={`/projects/${projectId}/issues/${issueId}/edit`}
            >
              Edit Issue
            </Link>
          )}
        </div>
      </header>

      {/* -------------------------------------------------------------- */}
      {/* Main page layout                                               */}
      {/* -------------------------------------------------------------- */}

      <div className="issue-details-layout">
        {/* ============================================================ */}
        {/* Main content                                                 */}
        {/* ============================================================ */}

        <div className="issue-details-main-column">
          <section className="issue-details-panel">
            <div className="issue-details-section-heading">
              <h2>Description</h2>
            </div>

            {issue?.description?.trim() ? (
              <div className="issue-details-description">{issue.description}</div>
            ) : (
              <p className="issue-details-empty-copy">
                No description has been added to this issue.
              </p>
            )}
          </section>

          {/* ---------------------------------------------------------- */}
          {/* Status History                                             */}
          {/* ---------------------------------------------------------- */}
          <section className="issue-details-panel">
            <div className="issue-details-section-heading">
              <h2>Status History</h2>
              <span>
                {issue?.statusHistory?.length ?? 0}
                {" "}
                transitions
              </span>
            </div>

            {Array.isArray(issue?.statusHistory) &&
             issue.statusHistory.length > 0 ? (

              <ol className="issue-details-history-list">

                {[...issue.statusHistory]
                  .reverse()
                  .map(
                    (
                      historyEntry,
                      index
                    ) => (

                      <li
                        className="issue-details-history-entry"
                        key={`${historyEntry.at}-${index}`}
                      >
                        <div className="issue-details-history-marker" />
                        <div className="issue-details-history-content">
                          <div className="issue-details-history-transition">
                            <span>
                              {STATUS_LABELS[historyEntry.from] ||
                               formatEnumLabel(historyEntry.from)}
                            </span>
                            <span aria-hidden="true">→</span>
                            <strong>{STATUS_LABELS[historyEntry.to] || formatEnumLabel(historyEntry.to)}
                            </strong>
                          </div>

                          <p>
                            by{" "}
                            <strong>
                              {resolveUserIdentity(
                                historyEntry.by
                              )}
                            </strong>
                          </p>

                          <time dateTime={historyEntry.at}>
                            {formatIssueDate(historyEntry.at)}
                          </time>
                        </div>
                      </li>
                    )
                  )}
              </ol>
            ) : (

              <div className="issue-details-history-empty">
                <strong>No status changes recorded yet.</strong>
                <p>This issue is still in its original workflow stage.</p>
              </div>
            )}
          </section>

          {/* Threaded issue discussion lives directly beneath Status History. */}
          <IssueComments
            issueId={issueId}
            projectArchived={project?.archived === true}
          />
        </div>

        {/* ============================================================ */}
        {/* Jira-style compact details sidebar                          */}
        {/* ============================================================ */}
        <aside className="issue-details-sidebar" aria-label="Issue metadata">
          <section className="issue-details-panel">
            <div className="issue-details-section-heading">
              <h2>Details</h2>
            </div>

            <dl className="issue-details-metadata-list">
              <div>
                <dt>Type</dt>
                <dd>{formatEnumLabel(issue?.type)}</dd>
              </div>

              <div>
                <dt>Priority</dt>
                <dd>
                  <span
                    className={`issue-details-priority issue-details-priority--${normalizedPriority}`}
                  >
                    {formatEnumLabel(normalizedPriority)}
                  </span>
                </dd>
              </div>

              <div>
                <dt>Severity</dt>
                <dd>
                  {formatEnumLabel(issue?.severity)}
                </dd>
              </div>

              <div>
                <dt>Assignee</dt>
                <dd>{resolveUserIdentity(issue?.assigneeId)}</dd>
              </div>

              <div>
                <dt>Reporter</dt>
                <dd>{resolveUserIdentity(issue?.reporterId)}
                </dd>
              </div>

              <div>
                <dt>Watching</dt>
                <dd>
                  {watcherCount}
                  {" "}
                  {(watcherCount === 1) ? "watcher" : "watchers"}
                </dd>
              </div>

              <div>
                <dt>Created</dt>
                <dd>
                  <time dateTime={issue?.createdAt}>{formatIssueDate(issue?.createdAt)}</time>
                </dd>
              </div>

              <div>
                <dt>Updated</dt>
                <dd>
                  <time dateTime={issue?.updatedAt}>
                    {formatIssueDate(issue?.updatedAt)}
                  </time>
                </dd>
              </div>

              {issue?.closedAt && (
                <div>
                  <dt>Closed</dt>
                  <dd>
                    <time dateTime={issue.closedAt}>
                      {formatIssueDate(issue.closedAt)}
                    </time>
                  </dd>
                </div>
              )}
            </dl>
          </section>


          {/* ---------------------------------------------------------- */}
          {/* Labels                                                     */}
          {/* ---------------------------------------------------------- */}
          <section className="issue-details-panel">
            <div className="issue-details-section-heading">
              <h2>Labels</h2>
            </div>

            {Array.isArray(issue?.labels) &&
             issue.labels.length > 0 ? (
              <div className="issue-details-label-list">
                {issue.labels.map(
                  (label) => (
                    <span className="issue-details-label" key={label}>
                      {label}
                    </span>
                  )
                )}
              </div>
            ) : (
              <p className="issue-details-empty-copy">No labels</p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
};

export default IssueDetailsPage;