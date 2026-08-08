// src/ProtectedPages/DashboardPage/DashboardPage.jsx

import { useEffect } from "react"; // runs project code outside of normal program flow (depends on conditions)
import { useNavigate } from "react-router"; // for programmatic navigation

import {
    useDispatch,// Hook returns a reference to Redux dispatch function. Used to send actions to your 
                // store, which triggers your reducers to update the state.
    useSelector // Hook extracts data from Redux store state. It takes a selector function and automatically 
                // subscribes your component to changes, forcing a re-render if that specific data updates.
} from "react-redux";

import { logoutUser } from "../../Store/authSlice.jsx"; // logs out user; clears backend cookie and Redux authentication state.
import { fetchProjects } from "../../Store/projectSlice.jsx"; // used to retrieves the user's accessible project list.

import ProjectCard from "../../PageComponents/ProjectCard/ProjectCard.jsx";

import "./DashboardPage.css"; // for styling

const DashboardPage = () => {

  const dispatch = useDispatch(); // Redux action dispatcher.
  const navigate = useNavigate(); // React Router navigation helper.

  const { 
    user,         // current authenticated/logged-in user
    logoutStatus  // controls logout-button loading behavior
  } = useSelector((state) => state.auth); // tracks and responds to changes in fields in authSlice from store state

  const {
    projects, // Projects returned via backend.
    status,   // Current GET /projects request state.
    error     // Project request failure message.
  } = useSelector((state) => state.projects);  // tracks and responds to changes in fields in projectSlice from store state


  /* Fetch projects once when this dashboard first opens.
   * Checking for "idle" prevents unnecessary repeated requests when the component re-renders.
   */
  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchProjects());
    }
  }, [dispatch, status]);


  // Log out from backend and return to public login page.
  const handleLogout = async () => { 
    const resultAction = await dispatch(logoutUser());
    if (logoutUser.fulfilled.match(resultAction)) {
      navigate("/login", 
        { replace: true } // Prevents browser 'Back' from reopening the dashboard.
      );
    }
  };

  // Re-run GET /projects after an API failure.
  const handleRetryProjects = () => {
    dispatch(fetchProjects());
  };

  // Supports auth responses that may use either "id" or "_id".
  const currentUserId = user?._id || user?.id;



  return ( // full dashboard page component
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <span className="dashboard-brand-mark">BT</span>
          <span>BugTrack Workspace</span>
        </div>

        <div className="dashboard-user-actions">
          <span className="dashboard-username">{user?.username || "Signed-in user"}</span>
          <button type="button" onClick={handleLogout} disabled={logoutStatus === "loading"} >
            {logoutStatus === "loading" ? "Logging out..." : "Log out"}
          </button>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="dashboard-heading-row">
          <div className="dashboard-heading">
            <p className="dashboard-eyebrow">Project dashboard</p>
            <h1>Your projects</h1>
            <p>
              Open a project to review its issues, members,
              assignments, and activity.
            </p>
          </div>

          {status === "succeeded" && (
            <div className="dashboard-project-count">
              <strong>{projects.length}</strong>
              <span>
                {projects.length === 1 ? "accessible project" : "accessible projects"}
              </span>
            </div>
          )}
        </div>

        {status === "loading" && (
          <section className="dashboard-state-card" aria-live="polite">
            <div className="dashboard-loading-indicator" />
            <h2>Loading your projects</h2>
            <p> Retrieving the projects available to your account.</p>
          </section>
        )}

        {status === "failed" && (
          <section className="dashboard-state-card dashboard-state-card--error" role="alert">
            <h2>Projects could not be loaded</h2>
            <p>{error}</p>
            <button type="button" onClick={handleRetryProjects}>Try again</button>
          </section>
        )}

        {status === "succeeded" && projects.length === 0 && (
          <section className="dashboard-state-card">
            <span className="dashboard-empty-icon" aria-hidden="true">◫</span>
            <h2>No projects available yet</h2>
            <p>
              You have not created a project and have not been
              added to another project.
            </p>
          </section>
        )}

        {status === "succeeded" && projects.length > 0 && (
          <section className="project-card-grid" aria-label="Accessible projects">
            {projects.map((project) => (
              <ProjectCard key={project._id} project={project} currentUserId={currentUserId}/>
            ))}
          </section>
        )}
      </section>
    </main>
  );
};

export default DashboardPage;