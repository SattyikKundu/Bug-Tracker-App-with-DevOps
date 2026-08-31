// src/AppPageLayouts/PublicPageLayout.jsx

import { useEffect } from "react"; // built-in React Hook used for handling "side effects." 
                      // used to run code outside normal component rendering flow, such as fetching API data, etc.
import { 
        Navigate, // component that changes current URL location when it renders. 
                  // commonly used to redirect unauthorized users away from a page.

        Outlet // placeholder component used in nested routing. Tells React Router where to render 
               // child component(s) inside parent layout component.
        } from "react-router";

import { 
         useDispatch, // hook returns a reference to Redux dispatch function. Used to send actions to your 
                      // store, which triggers your reducers to update the state.

         useSelector  // hook extracts data from Redux store state. It takes a selector function and automatically 
                      // subscribes your component to changes, forcing a re-render if that specific data updates.
        } from "react-redux";

import { checkAuth } from "../../Store/authSlice"; // checkAuth async thunk function from authSlice.jsx file


const PublicPageLayout = () => {

  const dispatch = useDispatch();
  const { authStatus, isAuthenticated } = useSelector((state) => state.auth); // subscribes component to changes & forces re-render
                                                                              // if that specific slice's data fields updates.


  useEffect(() => {   // checks whether a valid login cookie already exists.
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

  if (isAuthenticated) { // once successfully authenticated, navigate to dashboard
    return (
      <Navigate to="/dashboard" replace/>
    );
  }

  return <Outlet />;
};


export default PublicPageLayout;