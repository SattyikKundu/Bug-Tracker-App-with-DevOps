// server/database/database.js

import mongoose from "mongoose"; // Import mongoose libary to manage database
                                 // connection with MongoDB database

import dotenv from 'dotenv'; // loads .env variables into process.env 
                             // so they can be accessed anywhere in server code
dotenv.config();
                                 

const connectDB = async (uri) => { // Export async function to connect using a URI

  try {                            // Try/catch for clean error handling
    await mongoose.connect(uri, {  // Connect to Mongo with options
      dbName: process.env.MONGO_DB_NAME || "bugtracker" // Choose DB name (env or use fallback)
    });

    console.log("[MongoDB] connected"); // Log success
  } 
  catch (err) {                                              // If connection fails
    console.error("[MongoDB] connection error:", err.message); // Log error message
    process.exit(1);          // Exit process so container/orchestrator can restart
  }
}

export default connectDB;
