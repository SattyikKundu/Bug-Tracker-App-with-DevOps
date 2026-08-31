// src/PageComponents/UserMenu/UserMenu.jsx

import {
  useEffect,      // used to create a "side-effect" that closes menu when clicking outside of it
  useRef,         // used to store a reference to dropdown container
  useState        // used to track whether dropdown is open
} from "react";

import {
  Link,           // used to create navigation links to profile/settings w/out reloading page
  useNavigate     // used to programmatically redirect to login after logout
} from "react-router";

import {
  useDispatch,    // sends Redux actions to store
  useSelector     // used to read authenticated user state (and to mutate/modify fields)
} from "react-redux";

import { logoutUser } from "../../Store/authSlice.jsx";  // import existing logout async action

import "./UserMenu.css"; // styling for user dropdown


const UserMenu = () => {

  const dispatch = useDispatch(); // redux dispatcher
  const navigate = useNavigate(); // router navigation helper
  const menuRef = useRef(null);   // reference used for outside-click detection

  const [menuOpen, setMenuOpen] = useState(false); // state controls dropdown visibility

  const {
    user,         // current authenticated user
    logoutStatus  // allows Logout button loading state
  } = useSelector((state) => state.auth);


  // Builds the initials shown inside the account-avatar circle.
  // Example: Johnny Smith → JS
  const userInitials = (
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`
  ).toUpperCase() || "?";


  useEffect(() => {  // closes account menu if user clicks anywhere outside of it.
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);


 
  const handleLogout = async () => {  // logs user out through existing Redux/auth backend flow.
    const resultAction = await dispatch(logoutUser());

    if (logoutUser.fulfilled.match(resultAction)) {
      navigate( "/login", { replace: true });
    }
  };


  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className     = "user-menu-trigger"
        type          = "button"
        onClick       = {() => setMenuOpen((current) => !current)}
        aria-expanded = {menuOpen}
        aria-haspopup = "menu"
      >
        <span className = "user-menu-avatar">{userInitials}</span>
        <span className = "user-menu-trigger-text">{user?.username || "Account"}</span>
        <span className = "user-menu-chevron" aria-hidden="true">▾</span>
      </button>

      {menuOpen && (
        <div className="user-menu-dropdown" role="menu">
          <div className="user-menu-profile-summary">
            <span className="user-menu-large-avatar">{userInitials}</span>
            <div>
              <strong>{user?.firstName} {user?.lastName}</strong>
              <span>@{user?.username}</span>
              <small>{user?.email}</small>
            </div>
          </div>

          <div className="user-menu-divider" />

          <Link
            className = "user-menu-link"
            to        = "/profile"
            role      = "menuitem"
            onClick   = {() => setMenuOpen(false)}
          >
            Profile & Account Settings
          </Link>

          <div className="user-menu-divider" />

          <button
            className = "user-menu-logout"
            type      = "button"
            role      = "menuitem"
            onClick   = {handleLogout}
            disabled  = {logoutStatus === "loading"}
          >
            {logoutStatus === "loading" ? "Logging out..." : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;