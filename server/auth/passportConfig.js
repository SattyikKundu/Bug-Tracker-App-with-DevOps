// server/auth/passportConfig.js
import passport from "passport";                                      // import Passport core module for handling auth middleware
import { Strategy as LocalStrategy } from "passport-local";           // Strategy for username/password login
import { Strategy as GoogleStrategy } from "passport-google-oauth20"; // Strategy for Google OAuth login 
import bcrypt from "bcryptjs";                                        // for securly comparing hashed passwords
import User from "../models/user.js";                            // import 'User' MongoDB schema from model file.

/* NOTE: The done() callback in Passport strategies signals result of an
 *       authentication attempt. It's signature typically: 
 *       done(error, user, info)
 * 
 *   Parameter	    Typical Value	      Meaning
 *     error	    null or Error	      If error, pass error object here. Otherwise, pass null.
 *     user	        user or false	      If authentication succeeded, pass authenticated user object. Otherwise, pass false if failure.
 *     info	         { message: ... }	  Optional info object about authentication results. Commonly used to give a message why authentication failed 
 * 
 *  Examples:
 *  #1.) Successful authentication: done (null,user)
 *  #2.) Failure (no user found):   done (null, false)
 *  #3.) Failure w/message:         done (null, false, {message: 'Incorrect password.'}) 
 *  #4.) Error:                     done (error)
*/

// ------------------------- Local (username + password) strategy -------------------------
passport.use( 
  new LocalStrategy(                                                          // Register LocalStrategy
    { usernameField: "username", passwordField: "password", session: false }, // Map fields; no session needed for JWT
    async (username, password, done) => {                                     // Verify callback receives credentials

      try {                                             // Try/catch for errors
        const user = await User.findOne({ username }); // find and return matching user

        if (!user) { // If no user found
            return done(null, false, { message: "Incorrect username." });
        }    
        if (!user.passwordHash){ // If no password found
            return done(null, false, { message: "This account uses OAuth only." });
        }
          
        const isMatch = await bcrypt.compare(password, user.passwordHash); // compares entered password with hash
         
        if (!isMatch) { // Return error if password dosn't match
            return done(null, false, { message: "Incorrect password." });
        }

        if (!user.isActive){ // If user is inactive
            return done(null, false, { message: "User is deactivated." });
        }  

        return done(null, user); // When both matches are successful, pass user to req.user
      } 
      catch (error) { // Otherwise, handle database/logic error
        return done(error);
      }
    }
  )
);

// ----------------------------- Google OAuth 2.0 strategy --------------------------------------------------
passport.use(
  new GoogleStrategy(                                 // Register Google OAuth strategy
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,     // Google OAuth Client ID from .env file
      clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Google OAuth Secret from .env file
      callbackURL:  process.env.GOOGLE_CALLBACK_URL   // Redirect URI/Route, from .env file, that handles 
                                                      // OAuth response after Google authenticates the user
    },
    async (accessToken, refreshToken, profile, done) => {     // Verify callback after Google auth
      try {
        let user = await User.findOne({ googleId: profile.id }); // checks if user already exists

        if (user){ // If user in database, continue on with passport 
            return done(null, user); 
        } 

        // Get 'username' and 'email' from profile
        const username = profile.displayName?.replace(/\s+/g, ""); // || `user${profile.id.slice(-6)}`;
        const email = profile.emails?.[0]?.value?.toLowerCase();   // || `${username}@example.com`;

        user = await User.create({ // create a user 'document' to be passed into 'User' collection in MongoDB
          googleId: profile.id,
          username,
          email
        });

        return done(null, user); // Pass created user object into passport
      } 
      catch (error) { // Handle any database errors
        return done(error);
      }
    }
  )
);

// Sessions (ONLY NEEDED for OAuth handshake)

/* Session Serialization:
 * Controls what user info is stored in the session after login
 * This is called ONCE after a successful login. The data you pass here is stored in the session store.
 * Most apps just store the user ID to keep the session data minimal and secure.
 */
passport.serializeUser((user, done) => 
    // (user object after successful login) user === the whole user object (e.g., { id, username, email, ... })    
    done(null, user.id) // Only store user ID in session store (not full object) for security and performance
);

/* Session Deserialization: 
 * Runs on every request where a session is active.
 * Uses the stored ID to retrieve the full user object from the database.
 * That full user object is attached to 'req.user' and becomes accessible in route handlers.
 * This is how Passport keeps track of the authenticated user across multiple requests,
 * especially during access to protected routes!
 */
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id); // fetch user by Id

    done(null, user || null);// Attach user object to req.user so it can be accessed in protected routes
        // req.user is used by the system to identify current logged-in user
        // Hence, it's ESSENTIAL for controlling access to protected routes and user-specific actions

  } 
  catch (error) { // If error occurs, gracefully pass it to passport for handling
    done(error, null);
  }
});

export default passport;
