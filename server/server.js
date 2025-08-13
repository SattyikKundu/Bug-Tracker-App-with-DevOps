// server/server.js
import express from 'express'; // imported to help create express app (to use as backend server)

import cors from 'cors';       // CORS middleware allows frontend (HTML/JS) to access server (backend) from a different origin
                               // Example: If HTML page is on localhost:5500 while backend server is on localhost:3000,
                               //          CORS enables these different ports (as well as subdomains) to communicate 

import cookieParser from 'cookie-parser'; // middleware import used to read cookies (for JWT and CSRF)

import session from 'express-session'; // required by passport (even when JWT is used, 
                                       // Google OAuth needs session temporarily)
import passport from 'passport';       // Core authentication framework

import helmet from "helmet"; // Import Helmet for security headers
import morgan from "morgan"; // Import Morgan for request logging

import dotenv from "dotenv"; // loads .env variables into process.env 
                             // so they can be accessed anywhere in server code
dotenv.config();

import connectDB  from "./database/database.js"; // default import from database.js
import './auth/passportConfig.js'; // Side-effect that loads and registers passport strategies globally (MUST come before routes!)
//import passport from 'passport';   // single passport import (Core authentication framework)

import authRoutes from "./routes/authRoutes.js";    // Import auth routes
import projectRoutes from "./routes/projectRoutes.js";            // Import project routes

import swaggerUi from "swagger-ui-express";     // Import Swagger UI middleware
import swaggerSpec from "./swaggerConfig.js";

// ===================================================================================================
// Create Express App
// ===================================================================================================

const app = express();                  // Initialize Express application
const PORT = process.env.PORT || 5000;  // define back-end port

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec)); // Swagger UI setup (must come after 'app' is defined)


// ==============================================================================
// Database Connection Setup
// ==============================================================================
await connectDB(process.env.MONGO_URI);


// Get connection info!

//import mongoose from "mongoose";
//import User from "./models/user.js";
//console.log("[Mongo] DB name:", mongoose.connection.name);
//console.log("[Mongo] User collection:", User.collection.name);

// ==============================================================================
// Middleware
// ==============================================================================
app.use(helmet());
app.use(morgan("dev"));

app.use(cors({                         // mount and enable CORS middleware onto express app
  origin: process.env.CLIENT_HOME_URL, // Allow requests from frontend (defined by CLIENT_HOME_URL)
  credentials: true                    // Allow cookies/credentials to be sent from front-end     
}));

app.use(express.json());     // Tells express to parse ANY JSON data in the body/payload 
                             // of incoming requests and conver that json data into 
                             // javascript object(s) the can be used via route handlers.

app.use(cookieParser());    // Parses and extracts cookies from request headers


app.use(session({ // Session setup (used by Google OAuth during login handshake)
    secret: process.env.SESSION_SECRET || "fallbackSecret",
    resave: false,
    saveUninitialized: false,
     cookie: { secure: false }  // Set to true if using HTTPS in production
    //cookie: { secure: process.env.NODE_ENV === "production", sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"}
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ==============================================================================
// Routes Mounting
// ==============================================================================
//app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/", authRoutes); /* Mount all routes for handling authentication-related 
                           * routes (e.g., '/auth/login', '/auth/google').
                           * '/auth' could be used instead of '/' for grouping and clarity,
                           * However, since all auth routes already have '/auth' in their routes (in authRoutes.js),
                           * Adding '/auth' here would yield routes like ('/auth/auth/login') which is undesired.
                           * IF I wanted, I could get rid of '/auth' from routes in order to add '/auth' here.
                           * This would make it scalable and easier to "swap" routes around if needed.
                           */

app.use("/", projectRoutes); // Mount at root; paths start with /projects

// ==============================================================================
// Start Server
// ==============================================================================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
