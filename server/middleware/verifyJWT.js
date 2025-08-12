// server/middleware/verifyJWT.js

import jwt from "jsonwebtoken"; // import JWT library for token verification.

const verifyJWT = (req, res, next) => { // middleware to protect 'protected' routes by verifying
                                        // a valid JWT from cookie or header
  const token =
    req.cookies?.token ||                     // Try to get token either from 'token' cookie 
    req.headers.authorization?.split(" ")[1]; // or from the 'Authorization' header

  if (!token) { // If no token found, deny access with 401 (unauthorized)
    return res.status(401).json({ error: "Unauthorized access due to missing token." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => { // Verify and decode token using app's secret key

    if (err) { // If vertification fails (e.g. expired or tampered), return 403 forbidden error
        return res.status(403).json({ error: "Invalid or expired token." });
    } 
    req.user = decoded; // Otherwise, if token is valid, attach decoded user 
                        // data (contains { id, username, email }) to req.user 
                        // so it can be accessed in routes

    next(); // Proceed to next middleware or protected route
  });
};

export default verifyJWT; // Export middleware to be used on protected routes
