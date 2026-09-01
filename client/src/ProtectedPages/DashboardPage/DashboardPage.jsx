// src/ProtectedPages/DashboardPage/DashboardPage.jsx

import {
  useEffect, // runs project code outside of normal program flow (depends on conditions)
  useMemo,   // an optimization hook used to cache (memoize) the result of an expensive calculation
} from "react";

import { Link } from "react-router"; // provides on-click URL navigation 

import {
    useDispatch,// hook returns a reference to Redux dispatch function. Used to send actions to your 
                // store, which triggers your reducers to update the state.

    useSelector // hook extracts data from Redux store state. It takes a selector function and automatically 
                // subscribes your component to changes, forcing a re-render if that specific data updates.
} from "react-redux";

import { fetchProjects } from "../../Store/projectSlice.jsx"; // loads accessible projects so dashboard can project summaries
import { fetchMyWork }   from "../../Store/issueSlice.jsx";   // loads current project (and total issues/stories/etc. active)

import { fetchRecentNotifications } from "../../Store/notificationSlice.jsx"; // return recent notifications for user 
import NotificationItem             from "../../PageComponents/NotificationItem/NotificationItem.jsx"; // component for notification item
import { STATUS_LABELS }            from "../../utils/issueWorkflow.jsx";     // status labels for issues in Issues Board table

import "./DashboardPage.css"; // for styling



const DashboardPage = () => {

  const dispatch = useDispatch(); // redux dispatcher used to request projects

  const {user} = useSelector((state) => state.auth); // tracks/updates current authenticated user (used for welcome message)

  const {
    projects, // all accessible active + archived projects
    status,   // idle | loading | succeeded | failed
    error     // project-loading failure message
  } = useSelector((state) => state.projects);

    const {
    myWork,          // five most recently updated active assigned issues
    myWorkSummary,   // all active issues assigned to logged-in user
    myWorkStatus,    // idle | loading | succeeded | failed
    myWorkError      // dashboard-specific assigned-work load failure
  } = useSelector((state) => state.issues);

  const {
    recentNotifications,  // latest 10 items shown in header notifications drawer
    recentStatus,         // drawer requests status
    recentError           // error if issue/failure of loading notification(s)
  } = useSelector((state) => state.notifications);

  /* Loads projects if they haven't been fetched:
   * visiting /projects first may mean data already exists,
   * so status="succeeded" avoids another unnecessary API call.
   */
  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchProjects());
    }
  }, [dispatch, status]);


  /* Refresh personal Dashboard data whenever Dashboard mounts.
   * Unlike project collection, these values can change frequently
   * whilst the user works elsewhere in application.
   */
  useEffect(() => {

    dispatch(fetchMyWork());
    dispatch(fetchRecentNotifications());

    const refreshDashboardWhenVisible = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      dispatch(fetchMyWork());
      dispatch(fetchRecentNotifications());
    };

    document.addEventListener("visibilitychange", refreshDashboardWhenVisible);

    return () => {
      document.removeEventListener("visibilitychange", refreshDashboardWhenVisible);
    };
  }, [dispatch]);


  // separate active projects for Dashboard summary counts.
  const activeProjects = useMemo(() =>
      projects.filter((project) => project.archived !== true),
    [projects]
  );


  // separate archived projects for Dashboard summary count.
  const archivedProjects = useMemo(() =>
      projects.filter((project) => project.archived === true),
    [projects]
  );


  
  // Show only THREE most recently updated ACTIVE projects.
  // the full project collection now belongs on /projects.
  const recentProjects = useMemo(() => {

    return [ ...activeProjects ]  // copy array so Redux state is never mutated by sort()
      .sort(
        (projectA, projectB) =>
          new Date(projectB.updatedAt ?? 0) -
          new Date(projectA.updatedAt ?? 0)
      )
      .slice(0, 3 ); // dashboard intentionally shows only a small project preview

  }, [activeProjects]);


  // provide a friendly display name when firstName is available.
  const welcomeName = user?.firstName || user?.username || "there";

  return (
    <main className="dashboard-page">
      <section className="dashboard-content">
        <header className="dashboard-overview-heading">
          <p className="dashboard-eyebrow">Workspace overview</p>
          <h1>Welcome back, {welcomeName}</h1>
          <p>
            Review your workspace at a glance and jump back into
            the projects that have been updated most recently.
          </p>
        </header>
        {status === "loading" && (
          <section className="dashboard-state-card" aria-live="polite">
            <div className="dashboard-loading-indicator" />
            <h2>Loading your workspace</h2>
            <p>Retrieving your latest project information.</p>
          </section>
        )}
        {status === "failed" && (
          <section
            className = "dashboard-state-card dashboard-state-card--error"
            role      = "alert"
          >
            <h2>Dashboard could not be loaded</h2>
            <p>{error}</p>
          </section>
        )}
        {status === "succeeded" && (
          <>
            {/* Quick numerical project overview. */}
            <section
              className  = "dashboard-summary-grid"
              aria-label = "Project summary"
            >
              <article className="dashboard-summary-card">
                <span className="dashboard-summary-label">Active Projects</span>
                <strong>{activeProjects.length}</strong>
                <p>Projects currently available for active work.</p>
              </article>
              <article className="dashboard-summary-card">
                <span className="dashboard-summary-label">Archived Projects</span>
                <strong>{archivedProjects.length}</strong>
                <p>Read-only projects retained for historical reference.</p>
              </article>
              <article className="dashboard-summary-card">
                <span className="dashboard-summary-label">Total Projects</span>
                <strong>{projects.length}</strong>
                <p>Every project currently accessible to your account.</p>
              </article>
            </section>


            {/* Only a small recent-project preview remains on Dashboard. */}
            <section className = "dashboard-overview-panel">
              <div className   = "dashboard-panel-heading">
                <div>
                  <h2>Recently Updated Projects</h2>
                  <p>Your three most recently updated active projects.</p>
                </div>
                <Link className="dashboard-view-all-link" to="/projects">
                  View All Projects →
                </Link>
              </div>

              {recentProjects.length === 0 ? (
                <div className="dashboard-inline-empty-state">
                  <strong>No Active Projects</strong>
                  <p>Create a project or join an existing project to begin.</p>
                  <Link to="/projects/new" className="dashboard-primary-link">Create Project</Link>
                </div>
              ) : (
                <div className="dashboard-recent-project-list">
                  {recentProjects.map((project) => (
                    <Link
                      key       = {project._id}
                      className = "dashboard-recent-project"
                      to        = {`/projects/${project._id}`}
                    >
                      <span className="dashboard-recent-project-key">{project.key}</span>
                      <div className="dashboard-recent-project-info">
                        <strong>{project.name}</strong>
                        <span>
                          Updated{" "}
                          {new Date(
                            project.updatedAt
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="dashboard-recent-project-arrow" aria-hidden="true">→</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>


            <section className="dashboard-work-grid">
            {/* ================================================================ */}
            {/* My Work                                                          */}
            {/* ================================================================ */}
            <article className="dashboard-overview-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <h2>My Work</h2>
                  <p>Active issues currently assigned to you.</p>
                </div>
              </div>

              {myWorkStatus === "loading" && (
                <div className="dashboard-widget-state">
                  Loading assigned work...
                </div>
              )}

              {myWorkStatus === "failed" && (
                <div
                  className = "dashboard-widget-state dashboard-widget-state--error"
                  role      = "alert"
                >
                  {myWorkError}
                </div>
              )}

              {myWorkStatus === "succeeded" && (
                <>
                  <div
                    className   = "dashboard-my-work-summary"
                    aria-label  = "Assigned issue summary"
                  >
                    <div>
                      <strong>{myWorkSummary.total}</strong>
                      <span>Active</span>
                    </div>
                    <div>
                      <strong>{myWorkSummary.open}</strong>
                      <span>Open</span>
                    </div>
                    <div>
                      <strong>{myWorkSummary.inProgress}</strong>
                      <span>In Progress</span>
                    </div>
                    <div>
                      <strong>{myWorkSummary.readyForReview}</strong>
                      <span>Ready for Review</span>
                    </div>
                  </div>

                  {myWork.length === 0 ? (
                    <div className="dashboard-widget-empty">
                      <strong>You're all caught up</strong>
                      <p>You currently have no active issues assigned to you.</p>
                    </div>
                  ) : (
                    <div className="dashboard-my-work-list">
                      {myWork.map((issue) => {
                        const issueProject =
                          (typeof issue.projectId === "object")
                            ? issue.projectId
                            : null;
                        const issueProjectId = issueProject?._id ?? issue.projectId;
                        return (
                          <Link
                            key       = {issue._id}
                            className = "dashboard-my-work-item"
                            to        = {`/projects/${issueProjectId}/issues/${issue._id}`}
                          >
                            <div className="dashboard-my-work-item-heading">
                              <span>
                                {issue.key}
                              </span>
                              <small>
                                {STATUS_LABELS[issue.status] || issue.status}
                                </small>
                            </div>

                            <strong>
                              {issue.title}
                            </strong>

                            {issueProject?.name && (
                              <span className="dashboard-my-work-project">
                                {issueProject.name}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </article>


            {/* ================================================================ */}
            {/* Recent Activity                                                  */}
            {/* ================================================================ */}
            <article className="dashboard-overview-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <h2>Recent Activity</h2>
                  <p>Your latest relevant project and issue updates.</p>
                </div>
                <Link className="dashboard-view-all-link" to="/notifications">
                  View All →
                </Link>
              </div>

              {recentStatus === "loading" && (
                <div className="dashboard-widget-state">Loading recent activity...</div>
              )}

              {recentStatus === "failed" && (
                <div className="dashboard-widget-state dashboard-widget-state--error" role="alert">
                  {recentError}
                </div>
              )}

              {recentStatus === "succeeded" &&
                recentNotifications.length === 0 && (
                  <div className="dashboard-widget-empty">
                    <strong>No recent activity</strong>
                    <p>New project and issue updates will appear here.</p>
                  </div>
                )
              }

              {recentNotifications.length > 0 && (
                <div className="dashboard-recent-activity-list">
                  {recentNotifications
                    .slice(0, 5)
                    .map((notification) => (
                      <NotificationItem
                        key          = {notification._id}
                        notification = {notification}
                        compact
                      />
                    ))
                  }
                </div>
              )}
            </article>
          </section>
          </>
        )}
      </section>
    </main>
  );
};

export default DashboardPage;