// src/AppPageLayouts/ProtectedPageLayout.jsx

import { 
  useEffect,  // for triggering "side-effects" to trigger code outside standard function flow
  useState    // controls the responsive mobile sidebar drawer
} from "react"; 


// Imported navigation components
import AppHeader from "../../PageComponents/AppHeader/AppHeader.jsx";
import AppSidebar from "../../PageComponents/AppSidebar/AppSidebar.jsx";

import {
  Navigate,    // use for navigation (change Url location from current one)
  Outlet,      // placeholder used for nesting routing. Tell parent component(s) where to render child component(s)
  useLocation  // react custom hook that returns an object representing the application's current URL path
} from "react-router";

import {
  useDispatch, // redux dispatch function. Used to send actions to your store, which triggers your reducers to update state. 
  useSelector  // hook extracts data from Redux store state. It takes a selector function and automatically 
               // subscribes your component to changes, forcing a re-render if that specific data updates.
} from "react-redux";

import { checkAuth } from "../../Store/authSlice.jsx"; // checkAuth async thunk function from authSlice.jsx 

import "./ProtectedPageLayout.css";

const ProtectedPageLayout = () => {

  const dispatch = useDispatch();
  const location = useLocation();

  const { authStatus, isAuthenticated } = useSelector((state) => state.auth); // tracks and responds to changes in these 
                                                                              // fields from the store state

  const [sidebarOpen, setSidebarOpen] = useState(false); // tracks whether mobile navigation drawer is open

  useEffect(() => {   // restore the authentication session after page refresh.
    if (authStatus === "idle") {
      dispatch(checkAuth());
    }
  }, [authStatus, dispatch]);


  if (authStatus === "idle" || authStatus === "loading") { // if user logging-in, wait for page.
    return (
      <main className="route-loading-screen">
        <p>Loading your workspace...</p>
      </main>
    );
  }

  if (!isAuthenticated) { // if user's not logged-in/authenticated, redirect to login page
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  return (
  <div className="protected-app-shell">
    <AppHeader onOpenSidebar={() => setSidebarOpen(true)}/>
    <AppSidebar sidebarOpen={sidebarOpen} onCloseSidebar={() => setSidebarOpen(false)}/>
    <div className="protected-app-content">
      <Outlet />
    </div>
  </div>
);
};

export default ProtectedPageLayout;