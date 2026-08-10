import { BrowserRouter as Router,  // provides routing functionality via browser's history API
         Routes,    // wrapper component used to group defined routes
         Route,     // component used to define a route via specifying url path and component to render when path matches
         Navigate   // used to handle redirection between routes
        } from 'react-router'; // router library for creating and managing routes

import BasePageLayout      from '../AppPageLayouts/BasePageLayout/BasePageLayout.jsx'; // Base Page Layout with common features for ALL pages
import PublicPageLayout    from '../AppPageLayouts/PublicPageLayout.jsx';              // page layout for public pages
import ProtectedPageLayout from '../AppPageLayouts/ProtectedPageLayout.jsx';           // page layout for protected pages

// All Public pages
import LoginPage           from '../PublicPages/LoginPage/LoginPage.jsx';           // login page for users to access protected pages
import RegisterPage        from '../PublicPages/RegisterPage/RegisterPage.jsx';     // registration page for new users

// All Private Pages
import DashboardPage       from "../ProtectedPages/DashboardPage/DashboardPage.jsx"; // issues dashboard after logging in 
import ProfilePage         from "../ProtectedPages/ProfilePage/ProfilePage.jsx";     // user account settings page

const App = () => {

  return (
    <Router>
    <Routes>
      {/* Basepage layout that wraps ALL pages (both public and protected) except Checkout page. '/' is start (and index) of all routes */}
      <Route path='/'   element={<BasePageLayout/>} >

        {/* All routes that are part of Public Page Layout */}
        <Route element={<PublicPageLayout/>}>

          {/* Redirect '/' and '/products' to '/products/all' */}
          {/* <Route index            element={<Navigate to='/products/all'/>} /> */}


          {/* Route for "About" page, which explains the MERN-Bug-Tracker site's features and services */}
          {/* <Route path='/about' element={<AboutPage />} /> */}


          {/* Dedicated User Login page */}
          <Route index element={<Navigate to="/login" replace/>} />

            <Route path="login" element={<LoginPage />}/>
            <Route path="register" element={<RegisterPage />} />


             {/* Preserve support for backend-style auth URLs. */}
            <Route path="auth/login" element={<Navigate to="/login" replace/>} />
            <Route path="auth/register" element={<Navigate to="/register" replace />}/>
          </Route>

          {/* <Route path='/auth/login' element={<Navigate to='/login'/>} />
          <Route path='/login' element={<LoginPage/>} /> */}

          {/* Dedicated User account Registration page */}
          {/* <Route path='/auth/register' element={<Navigate to='/register'/>} />
          <Route path='/register' element={<RegisterPage/>} /> */}

        {/* Protected Routes Layout */}
        <Route element={<ProtectedPageLayout />}>
          {/* Page shows user's profile information AND allows user to edit his/her profile information */}
          {/* <Route path='/profile' element={<ProfilePage />} /> */}

          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="profile"   element={<ProfilePage />}   />
        </Route>

      </Route>

      {/* Keep unknown URLs inside this branch's auth flow. */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </Router>
  );
}

export default App;