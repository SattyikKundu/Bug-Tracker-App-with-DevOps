// server/routes/authRoutes.js
import express from "express";                      // Imported framework for defining routes
import passport from "passport";                    // Authentication middleware
import verifyJWT from "../middleware/verifyJWT.js"; // Import verifyJWT auth middleware

import {
  loginUser,            // local login controller
  logoutUser,           // logout controller
  registerUser,         // local registration controller
  handleGoogleCallback  // Google OAuth callback controller
} from "../controllers/authController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and authorization
 */


// -----------------------------------------------------------------------
// Local authentication (including standard register, login, logout)
// -----------------------------------------------------------------------

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     description: Registers a new user. Once a user is (already) registered, the '/auth/login' and '/auth/logout' routes can be used.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or user already exists
 */
router.post("/auth/register", registerUser); // local registration route: registers new user (username, email, password)


/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     description: "Logs in user using username and password input. This route only works when a registered account exists (example:  via '/auth/register')."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/auth/login", loginUser);       // POST Route handles username/passport login via Local Passport Strategy
//router.post("/auth/login", passport.authenticate("local", { session:false }), issueTokenController).

/**
 * @swagger
 * /auth/logout:
 *   get:
 *     summary: Logout the user and clear the auth token cookie
 *     tags: [Auth]
 *     description: Logs out user and clears auth token cookie in browser. Works when user is already logged in via '/auth/login'.
 *     responses:
 *       200:
 *         description: User successfully logged out
 */
router.get("/auth/logout", logoutUser);      // Logout route: clears auth token from cookie




/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Gets current authenticated user
 *     tags: [Auth]
 *     description: Verifies that user is logged in via JWT cookie and return user info. To test this route, user needs to be registered (/auth/register) and logged in (/auth/login) first.
 *     responses:
 *       200:
 *         description: Returns user data
 *       401:
 *         description: Unauthorized
 */
// This 'route' is utilized AFTER login to verify if user is logged in via JWT cookie and return user info
router.get("/auth/me",             // Define GET route at '/auth/me'
  verifyJWT,                       /* Apply JWT middleware(verifyJWT()) to protect this route.
                                    * However, if token is invalid, the next() inside verifyJWT() 
                                    * won't be called. This prevents Express from proceeding to the callback function.
                                    */

  (req, res) => {         // Callback function runs if token is valid  
                          // At this point, verifyJWT has decoded the JWT and attached user data to req.user

    res.set("Cache-Control", "no-store");
    /*  VERY IMPORTANT!!!: 
     *  Prevents cache of this sensitive route. Prevents auth token data from 
     *  a successful '/auth/me' route being stored in bfcache. Essentially, browser is always
     *  forced to re-request '/auth/me' (which fails properly if cookie is missing and 'isAuthenticated' remains false)
     *  This once caused a MAJOR issue where clicking the browser back button 
     *  from "/cart" page to "/login" (or "/register") page, despite being logged out, 
     *  caused a redirect to "/profile" page instead due to auth token being stored in bfcache.     
     */ 

    res.json({ user: req.user }); // Send the user info back to the frontend as JSON
});




// -----------------------------------------------------------------------
// Google OAuth authentication (logging in via Google)
// -----------------------------------------------------------------------


/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Used to Start Google OAuth login process (🔒 NOT testable via Swagger UI)
 *     tags: [Auth]
 *     description:  This route is part of an OAuth login flow and redirects user to Google’s OAuth 2.0 consent screen (🔒 NOT testable via Swagger UI).
 *     responses:
 *       302:
 *         description: Redirect to Google
 */
router.get("/auth/google", // Google OAuth route: initiates login flow via Google and redirects to consent screen
  passport.authenticate("google", { scope: ["profile", "email"] }) // Asks Google for access to email + profile
);



/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth callback endpoint (🔒 NOT testable via Swagger UI)
 *     tags: [Auth]
 *     description: Endpoint called by Google after user consents on Google Account consent screen. Afterwards, user is logged in via Google profile (🔒 NOT testable via Swagger UI).
 *     responses:
 *       200:
 *         description: User authenticated and redirected
 *       401:
 *         description: Authentication failed
 */
router.get("/auth/google/callback", // Google OAuth callback route that Google redirects to after user logs in
  //passport.authenticate("google", { session: true, failureRedirect: `${process.env.CLIENT_HOME_URL}/login?oauth=failed` }),
  passport.authenticate('google', { session: false }),  // Run Google strategy to extract user info and skip sessions
  handleGoogleCallback                                  // Then call our controller function
);

export default router;
