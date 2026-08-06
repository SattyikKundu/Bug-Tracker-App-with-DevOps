// src/ProtectedPages/DashboardPage/DashboardPage.jsx

import { useNavigate } from "react-router"; // for programmatic navigation

import {
    useDispatch,// Hook returns a reference to Redux dispatch function. Used to send actions to your 
                // store, which triggers your reducers to update the state.
    useSelector // Hook extracts data from Redux store state. It takes a selector function and automatically 
                // subscribes your component to changes, forcing a re-render if that specific data updates.
} from "react-redux";

import { logoutUser } from "../../Store/authSlice"; // logoutUser async thunk function from authSlice.jsx 

import "./DashboardPage.css"; // for styling

const DashboardPage = () => {

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, logoutStatus } = useSelector((state) => state.auth); // tracks and responds to changes in these 
                                                                     // fields from the store state

  const handleLogout = async () => { // for handling logging out....
    const resultAction = await dispatch(logoutUser());
    if (logoutUser.fulfilled.match(resultAction)) {
      navigate("/login", { replace: true });
    }
  };

  return ( // returned html containers
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <span className="dashboard-brand-mark">
            BT
          </span>

          <span>BugTrack Workspace</span>
        </div>


        <div className="dashboard-user-actions">
          <span className="dashboard-username">
            {user?.username || "Signed-in user"}
          </span>

          <button
            type="button"
            onClick={handleLogout}
            disabled={logoutStatus === "loading"}
          >
            {logoutStatus === "loading" ? "Logging out..." : "Log out"}
          </button>
        </div>
      </header>


      <section className="dashboard-content">
        <div className="dashboard-heading">
          <p className="dashboard-eyebrow">
            Dashboard
          </p>

          <h1>
            Welcome {user?.username ? `, ${user.username}` : ""}
          </h1>

          <p>
            Your project dashboard will be developed in a
            separate feature branch.
          </p>
        </div>


        <section
          className="dashboard-placeholder"
          aria-label="Future dashboard content"
        >
          <div className="dashboard-placeholder-header">
            <div>
              <h2>Project workspace</h2>

              <p>
                This placeholder confirms that protected routing
                and login session handling are working.
              </p>
            </div>

            <span>Skeleton</span>
          </div>


          <div className="dashboard-placeholder-grid">
            <article>
              <span className="dashboard-placeholder-label">
                Projects
              </span>

              <strong>—</strong>

              <p>
                Project cards will be added later.
              </p>
            </article>


            <article>
              <span className="dashboard-placeholder-label">
                Assigned issues
              </span>

              <strong>—</strong>

              <p>
                Issue summaries will be added later.
              </p>
            </article>


            <article>
              <span className="dashboard-placeholder-label">
                Notifications
              </span>

              <strong>—</strong>

              <p>
                Account notifications will be added later.
              </p>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
};


export default DashboardPage;