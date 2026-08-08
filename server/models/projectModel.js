// server/models/projectModel.js       

/* NOTE: This file will be used as part of the rbac.js (Role-Based-Access-Control)
 *       in the "/middleware" folder where much of the actual "model" functions
 *       are carried out. 
 */

import mongoose from "mongoose";   // Import Mongoose to define schemas and models

const { Schema } = mongoose;  // Extract Schema helper

const ProjectSchema = new Schema( // Define the Project schema
  {                               // Open fields object
    key: {                  // Short unique project key (e.g., "BT")
      type: String,         // Stored as string
      required: true,       // Must be provided
      trim: true,           // Remove surrounding whitespace
      uppercase: true,      // Always store in uppercase
      unique: true,         // Enforce uniqueness across projects
      minlength: 2,         // Minimum length
      maxlength: 10,        // Maximum length
      match: /^[A-Z][A-Z0-9]{1,9}$/, // Only A–Z and digit (starts with capital letter)
    },
    name: {             // Human-friendly project name
      type: String,     // String type
      required: true,   // Required
      trim: true,       // Trim whitespace
      minlength: 3,     // Minimum length
      maxlength: 140,   // Maximum length
    },
    description: {      // Longer description (optional)
      type: String,     // String type
      default: "",      // Default to empty string
      trim: true,       // Trim whitespace
      maxlength: 2000,  // Reasonable cap
    },
    leadUserId: {                   // Project lead (user id)
      type: Schema.Types.ObjectId,  // ObjectId reference
      ref: "User",                  // Reference the User model
      required: true,               // Must exist
      index: true,                  // Index for lead lookups
    },
    members: [{                     // Members allowed to access project
      type: Schema.Types.ObjectId,  // Each is a User ObjectId
      ref: "User",                  // Reference the User model
      index: true,                  // Index for membership queries
    }],
    nextIssueSeq: {                 // Per-project counter for issue numbering
      type: Number,                 // Numeric counter
      default: 1,                   // Start at 1
      min: 1,                       // Safety floor
    },
    archived: {                     // Indicates whether the project is currently archived
      type: Boolean,                // Archived, or NOT archived
      default: false,               // Project is by default NOT archived
      index: true                   // archieved projects are indexed
    },
    archivedAt: {                   // Records when the project was archived
      type: Date,                   // data type is 'date'
      default: null                 // Default value is null ("empty")
    }
  },
  { timestamps: true, versionKey: false }// Add createdAt/updatedAt timestamps; hide version key
);// End schema


export default mongoose.model("Project", ProjectSchema, "projects");// Compile and export the Project model
