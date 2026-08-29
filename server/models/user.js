// server/models/user.js

import mongoose from "mongoose"; // Import Mongoose to define schemas/models

// File ultimately used as supporting file for authModel.js


// -----------------------------------------------------------------------------
// User notification preferences
// -----------------------------------------------------------------------------
// All notification categories default to enabled.
//
// "_id: false" prevents Mongoose from creating an unnecessary ObjectId
// for this embedded preferences object.
// -----------------------------------------------------------------------------
const NotificationPreferencesSchema =
  new mongoose.Schema(
    {
      issueAssignments: {           // Notifications for issue assignments in projects user is part of
        type: Boolean,
        default: true
      },
      issueStatusChanges: {         // Notifications for status changes of issues/bugs in projects user is part of
        type: Boolean,
        default: true
      },
      commentReplies: {             // Notifications for comments replies to an issue in projects user is part of
        type: Boolean,
        default: true
      },
      projectMembershipChanges: {   // Notifications for membership changes to projects user is part of
        type: Boolean,
        default: true
      },
      projectLeadershipChanges: {   // Notifications for leadership changes for projects user is part of
        type: Boolean,
        default: true
      },
      watchedIssueActivity: {       //  Notifications for important activity on issues the user is watching
        type: Boolean,
        default: true
      }
    },
    { _id: false}
  );



const UserSchema = new mongoose.Schema(                // Create a new schema for the users collection
  {
    firstName: {                                      // First name field
      type:      String,                              // Store as string
      required:  true,                                // Must be present                  
      trim:      true,                                // Trim whitespace
      minlength: 1,                                   // enforce mix/max length of string
      maxlength: 50
    },
    lastName: {                                       // First name field
      type:      String,                              // Store as string
      required:  true,                                // Must be present                  
      trim:      true,                                // Trim whitespace
      minlength: 1,                                   // enforce mix/max length of string
      maxlength: 50
    },
    email: {                                           // Email field
      type:      String,                               // Store as string
      required:  true,                                 // Must be present
      lowercase: true,                                 // Normalize to lowercase
      trim:      true,                                 // Trim whitespace
      unique:    true                                  // Enforce uniqueness at index level
       // optional: validate: { validator: v => /.+@.+\..+/.test(v), message: 'Invalid email' }
    },
    username: {                                        // Username field
      type:      String,                               // Store as string
      required:  true,                                 // Must be present
      trim:      true,                                 // Trim whitespace
      unique:    true,                                 // Enforce uniqueness at index level
      minlength: 3,
      maxlength: 30
      // optional: lowercase: true,  // enable if you want case-insensitive usernames
    },
    passwordHash: {                                    // Hashed password (nullable for OAuth-only users)
      type: String                                     // String hash from bcrypt
      // optional: select: false  // if you enable this, update login query to .select('+passwordHash')
    },
    googleId: {                                        // Google OAuth account id (optional)
      type:   String,                                  // Store Google profile id
      index:  true,                                    // Index for faster lookups
      sparse: true                                     // Sparse so unique/indexing ignores nulls
      // no need for index:true; unique creates the index
    },
    role: {                                            // Global authorization role
      type:    String,                                 // Stored as string
      enum:    ["admin", "user"],                      // Allowed values only
      default: "user"                                  // Default role for new accounts
    },    
    notificationPreferences: {              // Current user's category-level notification preferences.
      type: NotificationPreferencesSchema,  // Causes all defaults from embedded schema to be applied whenever new user is created.
      default: () => ({})
    }
  },
  { timestamps: true }                                 // Auto-add createdAt/updatedAt
);


export default mongoose.model( // Create and export the User model connected to the users collection.

  "User",     // Give the Mongoose model the name User.
  UserSchema, // Use the schema defined above.
  "users"     // Explicitly connect the model to the users MongoDB collection.

);     // Export compiled Mongoose model

