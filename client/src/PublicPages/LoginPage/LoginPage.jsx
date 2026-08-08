// src/PublicPages/LoginPage/LoginPage.jsx

import {
  useEffect,   // for creating "side-effects" that run outside normal flow
  useState     // for creating state fields to track and mutate
} from "react";

import {
  Link,         // React equivalent of url links in html tags (similar to <a href="/..."></a>)
  useLocation,  // hook that returns an object containing information about current URL path (re-renders when Url changes)
  useNavigate   // for programmatic navigation
} from "react-router";

import {
  useDispatch, // Redux dispatch function. Used to send actions to your store, which triggers your reducers to update state. 
  useSelector  // Hook extracts data from Redux store state. It takes a selector function and automatically 
               // subscribes your component to changes, forcing a re-render if that specific data updates.
} from "react-redux";

import {
  clearAuthError,
  loginUser
} from "../../Store/authSlice"; // use clearAuthError, loginUser async functions from authSlice.jsx

import "./LoginPage.css"; // styling sheets

const LoginPage = () => {

  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const { loginStatus, error } = useSelector((state) => state.auth); // extracted fields from store

  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [successToast, setSuccessToast] = useState(location.state?.registrationSuccess || "");


    useEffect(() => { // Toast Message showing registration success! 
                    // Remove the registration message after a few seconds.
    if (!successToast) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => { setSuccessToast("");}, 4000);

    return () => { window.clearTimeout(timeoutId);};
  }, [successToast]);


  useEffect(() => { // Clears route state so refreshing doesn't show toast again.
    if (location.state?.registrationSuccess) {
      window.history.replaceState(
        {},
        document.title
      );
    }
  }, [location.state]);


  useEffect(() => { // clears any auth Error at start of page/component(s) mount..
    dispatch(clearAuthError());
  }, [dispatch]);


  const handleInputChange = (event) => {
    const { name, value } = event.target;

    // Used to safely update the credentials state
    setCredentials((currentCredentials) => ({ ...currentCredentials, [name]: value }));

    if (error) {
      dispatch(clearAuthError());
    }
  };


  const handleSubmit = async (event) => {
    event.preventDefault();

    const resultAction = await dispatch(
      loginUser({
        username: credentials.username.trim(),
        password: credentials.password
      })
    );

    if (loginUser.fulfilled.match(resultAction)) {
      navigate("/dashboard",{replace: true});
    }
  };


  const handleGoogleLogin = () => {
    const apiUrl =
      import.meta.env.VITE_API_URL ||
      "http://localhost:5000";

    window.location.href =
      `${apiUrl}/auth/google`;
  };


  return (
    <main className="login-page">
      {successToast && (
        // successToast message WHEN user logs in
        <div className="login-success-toast" role="status" aria-live="polite">
          <span className="login-success-icon">
            ✓
          </span>
          <span>{successToast}</span>
          <button
            type="button"
            aria-label="Close registration message"
            onClick={() => setSuccessToast("")}
          >
            ×
          </button>
        </div>
      )}


      <section className="login-brand-panel">
        <Link className="login-brand" to="/login">
          <span className="login-brand-mark">BT</span>
          <span>BugTrack Workspace</span>
        </Link>

        <div className="login-brand-content">
          <p className="login-eyebrow">Project issue tracking</p>
          <h1>Keep every issue visible and every project moving.</h1>
          <p>
            A focused workspace for project members to report,
            assign, discuss, and resolve work.
          </p>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-card">
          <header className="login-card-header">
            <h2>Log in</h2>
            <p>Continue to your project workspace.</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                value={credentials.username}
                onChange={handleInputChange}
                autoComplete="username"
                required
              />
            </div>
            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={credentials.password}
                onChange={handleInputChange}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="login-error" role="alert">{error}</div>
            )}

            <button className="login-submit-button" type="submit" disabled={loginStatus === "loading"}>
              {loginStatus === "loading" ? "Logging in..." : "Log in"}
            </button>
          </form>


          <div className="login-divider">
            <span>or</span>
          </div>

          <button
            className="google-login-button"
            type="button"
            onClick={handleGoogleLogin}
          >
            <span className="google-letter">
              G
            </span>
            Continue with Google
          </button>


          <p className="login-register-link">
            Need an account?{" "}

            <Link to="/register">
              Register
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
};


export default LoginPage;