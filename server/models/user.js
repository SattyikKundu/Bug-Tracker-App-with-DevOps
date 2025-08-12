// server/models/user.js

import mongoose from "mongoose"; // Import Mongoose to define schemas/models

// File ultimately used as supporting file for authModel.js

const UserSchema = new mongoose.Schema(                // Create a new schema for the users collection
  {
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
      enum: ["admin", "manager", "developer"],         // Allowed values only
      default: "developer"                             // Default role for new accounts
    },
    isActive: {                                        // Soft-disable account flag
      type: Boolean,                                   // Boolean value
      default: true                                    // Enabled by default
    }
  },
  { timestamps: true }                                 // Auto-add createdAt/updatedAt
);

//UserSchema.index({ email: 1 }, { unique: true });      // Unique index on email
//UserSchema.index({ username: 1 }, { unique: true });   // Unique index on username
//UserSchema.index({ googleId: 1 }, { sparse: true });   // Index googleId when present

// UserSchema.set("toJSON", { // Ensure sensitive field isn't serialized
//   transform: (_doc, ret) => {
//     delete ret.passwordHash;
//     return ret;
//   }
// });

export default mongoose.model("Users", UserSchema);     // Export compiled Mongoose model

