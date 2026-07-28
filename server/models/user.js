// server/models/user.js

import mongoose from "mongoose"; // Import Mongoose to define schemas/models

// File ultimately used as supporting file for authModel.js

const UserSchema = new mongoose.Schema(                // Create a new schema for the users collection
  {
    firstName: {                                      // First name field
      type: String,                                   // Store as string
      required: true,                                 // Must be present                  
      trim: true,                                     // Trim whitespace
      minlength: 1,                                   // enforce mix/max length of string
      maxlength: 50
    },
    lastName: {                                       // First name field
      type: String,                                   // Store as string
      required: true,                                 // Must be present                  
      trim: true,                                     // Trim whitespace
      minlength: 1,                                   // enforce mix/max length of string
      maxlength: 50
    },
    email: {                                           // Email field
      type: String,                                    // Store as string
      required: true,                                  // Must be present
      lowercase: true,                                 // Normalize to lowercase
      trim: true,                                      // Trim whitespace
      unique: true                                     // Enforce uniqueness at index level
       // optional: validate: { validator: v => /.+@.+\..+/.test(v), message: 'Invalid email' }
    },
    username: {                                        // Username field
      type: String,                                    // Store as string
      required: true,                                  // Must be present
      trim: true,                                      // Trim whitespace
      unique: true,                                    // Enforce uniqueness at index level
      minlength: 3,
      maxlength: 30
      // optional: lowercase: true,  // enable if you want case-insensitive usernames
    },
    passwordHash: {                                    // Hashed password (nullable for OAuth-only users)
      type: String                                     // String hash from bcrypt
      // optional: select: false  // if you enable this, update login query to .select('+passwordHash')
    },
    googleId: {                                        // Google OAuth account id (optional)
      type: String,                                    // Store Google profile id
      index: true,                                     // Index for faster lookups
      sparse: true                                     // Sparse so unique/indexing ignores nulls
      // no need for index:true; unique creates the index
    },
    role: {                                            // Global authorization role
      type: String,                                    // Stored as string
      enum: ["admin", "user"],                         // Allowed values only
      default: "user"                                  // Default role for new accounts
    }
  },
  { timestamps: true }                                 // Auto-add createdAt/updatedAt
);


export default mongoose.model("User", UserSchema, "users");     // Export compiled Mongoose model

