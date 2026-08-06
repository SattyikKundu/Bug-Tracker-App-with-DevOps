// src/AppPageLayouts/PublicPageLayout.jsx

import { useEffect } from "react"; // built-in React Hook used for handling "side effects." Used to run code outside 
                                   // the normal component rendering flow, such as fetching API data,

import { 
        Navigate, // Component that changes current URL location when it renders. 
                  // Commonly used to redirect unauthorized users away from a page.

        Outlet // Placeholder component used in nested routing. Tells React Router where to render 
               // child component(s) inside parent layout component.
        } from "react-router";

import { 
         useDispatch, // Hook returns a reference to Redux dispatch function. Used to send actions to your 
                      // store, which triggers your reducers to update the state.
         useSelector  // Hook extracts data from Redux store state. It takes a selector function and automatically 
                      // subscribes your component to changes, forcing a re-render if that specific data updates.
        } from "react-redux";

import { checkAuth } from "../Store/authSlice"; // checkAuth async thunk function from authSlice.jsx file


const PublicPageLayout = () => {

  const dispatch = useDispatch();
  const { authStatus, isAuthenticated } = useSelector((state) => state.auth); // subscribes component to changes & forces re-render
                                                                              // if that specific slice's data fields updates.


  useEffect(() => {   // Checks whether a valid login cookie already exists.
    if (authStatus === "idle") {
      dispatch(checkAuth()); // dispatch checkAuth method from authSlice
    }
  }, [authStatus, dispatch]);


  if (authStatus === "idle" || authStatus === "loading") { // If authentication is ongoing....
    return (
      <main className="route-loading-screen">
        <p>Checking session...</p>
      </main>
    );
  }

  if (isAuthenticated) { // Once successfully authenticated, navigate to dashboard
    return (
      <Navigate to="/dashboard" replace/>
    );
  }

  return <Outlet />;
};


export default PublicPageLayout;