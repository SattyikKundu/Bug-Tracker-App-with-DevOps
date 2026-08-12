// src/ProtectedPages/DashboardPage/DashboardPage.jsx

import {
  useEffect, // runs project code outside of normal program flow (depends on conditions)
  useMemo,   // an optimization hook used to cache (memoize) the result of an expensive calculation
} from "react";

import { Link } from "react-router"; // Provides on-click URL navigation 
//import { useNavigate } from "react-router"; // for programmatic navigation

import {
    useDispatch,// Hook returns a reference to Redux dispatch function. Used to send actions to your 
                // store, which triggers your reducers to update the state.
    useSelector // Hook extracts data from Redux store state. It takes a selector function and automatically 
                // subscribes your component to changes, forcing a re-render if that specific data updates.
} from "react-redux";

import { fetchProjects } from "../../Store/projectSlice.jsx"; // Loads accessible projects so dashboard can project summaries

import "./DashboardPage.css"; // for styling



const DashboardPage = () => {

  const dispatch = useDispatch(); // Redux dispatcher used to request projects

  const {user} = useSelector((state) => state.auth); // Tracks/updates current authenticated user (used for welcome message)

  const {
    projects, // All accessible active + archived projects
    status,   // idle | loading | succeeded | failed
    error     // Project-loading failure message
  } = useSelector((state) => state.projects);


  /* Loads projects if they haven't been fetched:
   * Visiting /projects first may mean data already exists,
   * so status="succeeded" avoids another unnecessary API call.
   */
  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchProjects());
    }
  }, [dispatch, status]);


  // Separate active projects for Dashboard summary counts.
  const activeProjects = useMemo(() =>
      projects.filter((project) => project.archived !== true),
    [projects]
  );


  // Separate archived projects for Dashboard summary count.
  const archivedProjects = useMemo(() =>
      projects.filter((project) => project.archived === true),
    [projects]
  );


  
  // Show only the three most recently updated ACTIVE projects.
  // The full project collection now belongs on /projects.
  const recentProjects = useMemo(() => {

    return [ ...activeProjects ]  // Copy array so Redux state is never mutated by sort()
      .sort(
        (projectA, projectB) =>
          new Date(projectB.updatedAt ?? 0) -
          new Date(projectA.updatedAt ?? 0)
      )
      .slice(0, 3 ); // Dashboard intentionally shows only a small project preview

  }, [activeProjects]);


  // Provide a friendly display name when firstName is available.
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
            className="dashboard-state-card dashboard-state-card--error"
            role="alert"
          >
            <h2>Dashboard could not be loaded</h2>
            <p>{error}</p>
          </section>
        )}
        {status === "succeeded" && (
          <>
            {/* Quick numerical project overview. */}
            <section
              className="dashboard-summary-grid"
              aria-label="Project summary"
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
            <section className="dashboard-overview-panel">
              <div className="dashboard-panel-heading">
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
                      key={project._id}
                      className="dashboard-recent-project"
                      to={`/projects/${project._id}`}
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

            {/*
             * These placeholders retain the final Dashboard layout structure.
             * Real issue/activity data will replace them in later branches.
             */}
            <section className="dashboard-placeholder-grid">
              <article className="dashboard-overview-panel">
                <h2>My Work</h2>
                <p>
                  Assigned issue statistics will appear here once
                  the issue-board client is connected.
                </p>
              </article>

              <article className="dashboard-overview-panel">
                <h2>Recent Activity</h2>
                <p>
                  Project and issue activity will appear here as the
                  activity and notification features are implemented.
                </p>
              </article>
            </section>
          </>
        )}
      </section>
    </main>
  );
};


export default DashboardPage;