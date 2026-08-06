// src/AppPageLayouts/ProtectedPageLayout.jsx

import { useEffect } from "react"; // for triggering "side-effects" to trigger code outside standard function flow

import {
  Navigate,    // Use for navigation (change Url location from current one)
  Outlet,      // Placeholder used for nesting routing. Tell parent component(s) where to render child component(s)
  useLocation  // React custom hook that returns an object representing the application's current URL path
} from "react-router";

import {
  useDispatch, // Redux dispatch function. Used to send actions to your store, which triggers your reducers to update state. 
  useSelector  // Hook extracts data from Redux store state. It takes a selector function and automatically 
               // subscribes your component to changes, forcing a re-render if that specific data updates.
} from "react-redux";

import { checkAuth } from "../Store/authSlice"; // checkAuth async thunk function from authSlice.jsx 


const ProtectedPageLayout = () => {

  const dispatch = useDispatch();
  const location = useLocation();

  const { authStatus, isAuthenticated } = useSelector((state) => state.auth); // tracks and responds to changes in these 
                                                                              // fields from the store state


  useEffect(() => {   // Restore the authentication session after page refresh.
    if (authStatus === "idle") {
      dispatch(checkAuth());
    }
  }, [authStatus, dispatch]);


  if (authStatus === "idle" || authStatus === "loading") { // If user logging-in, wait for page.
    return (
      <main className="route-loading-screen">
        <p>Loading your workspace...</p>
      </main>
    );
  }

  if (!isAuthenticated) { // If user's not logged-in/authenticated, redirect to login page
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
};

export default ProtectedPageLayout;