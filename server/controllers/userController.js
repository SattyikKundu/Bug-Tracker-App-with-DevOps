// server/controllers/userController.js

import bcrypt from "bcryptjs";           // Used to verify and securely hash local-account passwords
import User   from "../models/user.js";  // User model used to read and update the logged-in user's account


/* Converts a full MongoDB User document/object into a safe profile object.
 *
 * IMPORTANT:
 * + passwordHash is NEVER returned;
 * + googleId is NEVER returned;
 * + authProvider tells the frontend whether password management is local or Google-based.
 */
const formatUserProfile = (user) => {
  return {
    _id: user._id,                                     // stable MongoDB user ID
    firstName: user.firstName,                         // user's current first name
    lastName: user.lastName,                           // user's current last name
    username: user.username,                           // globally unique application username
    email: user.email,                                 // user's current account/contact email
    role: user.role,                                   // global app role; returned but NOT user-editable
    authProvider: user.googleId ? "google" : "local",  // helps frontend decide whether password controls should appear
    createdAt: user.createdAt,                         // account creation timestamp
    updatedAt: user.updatedAt                          // most recent account update timestamp
  };
};


/* Basic email-format helper:
 * MongoDB uniqueness is still handled separately; this only rejects
 * obviously malformed email addresses before attempting the database update.
 */
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};


/* "GET /users/me":
 * Returns the latest database version of the logged-in user's profile.
 * loadCurrentUser middleware has already placed the DB user on req.authUser.
 */
export const getMyProfile = async (req, res) => {

  return res.status(200).json({
    user: formatUserProfile(req.authUser) // Return only frontend-safe account fields
  });

};


/* "PATCH /users/me":
 *
 * Allows the logged-in user to update normal profile information (like in most similar apps).
 *
 * What's editable:
 * firstName, lastName, username, email
 *
 * What's NOT editable:
 * - _id
 * - role
 * - googleId
 * - passwordHash
 * - timestamps
 * - project memberships/leadership
 */
export const updateMyProfile = async (req, res, next) => {

  try {

    const {
      firstName, 
      lastName,  
      username,  
      email     
    } = req.body || {}; // optional replacement first name, last name, username, and/or email

    const updates = {}; // Only validated fields will be placed here


    // ---------------------------------------------------------------------
    // updating First name
    // ---------------------------------------------------------------------

    if (firstName !== undefined) {
      if (
        typeof firstName !== "string" ||  // Reject arrays, numbers, null, etc.
        !firstName.trim() ||              // Reject empty/whitespace-only names
        firstName.trim().length > 50      // Match User schema maximum length
      ) {
        return res.status(400).json({ error: "firstName must be a non-empty string with at most 50 characters." });
      }
      updates.firstName = firstName.trim(); // Save normalized first name
    }

    // ---------------------------------------------------------------------
    // updating Last name
    // ---------------------------------------------------------------------

    if (lastName !== undefined) {
      if (
        typeof lastName !== "string" || // Reject non-string values
        !lastName.trim() ||             // Reject blank value
        lastName.trim().length > 50     // Match schema length rule
      ) {
        return res.status(400).json({ error: "lastName must be a non-empty string with at most 50 characters." });
      }
      updates.lastName = lastName.trim(); // Save normalized last name
    }

    // ---------------------------------------------------------------------
    // updating Username
    // ---------------------------------------------------------------------

    if (username !== undefined) {
      if (
        typeof username !== "string" ||   // Username must remain textual
        username.trim().length < 3 ||     // Match User schema minimum
        username.trim().length > 30       // Match User schema maximum
      ) {
        return res.status(400).json({ error: "username must contain between 3 and 30 characters." });
      }
      const normalizedUsername = username.trim(); // Remove accidental surrounding spaces


      /* Search and check if another account already using this username.
       *
       * $ne excludes the currently logged-in user's own document,
       * otherwise keeping the same username would incorrectly conflict.
       */
      const usernameAlreadyExists = await User.exists({
        username: normalizedUsername, _id: { $ne: req.authUser._id }
      });

      if (usernameAlreadyExists) {
        return res.status(409).json({ error: "Username already taken." });
      }
      updates.username = normalizedUsername; // Username passed validation + uniqueness checks
    }


    // ---------------------------------------------------------------------
    // updating Email
    // ---------------------------------------------------------------------

    if (email !== undefined) {
      if (
        typeof email !== "string" || // Reject non-string input
        !email.trim()                // Reject empty input
      ) {
        return res.status(400).json({ error: "email must be a non-empty string." });
      }

      const normalizedEmail = email.trim().toLowerCase(); // Match User schema email normalization

      if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ error: "Provide a valid email address." });
      }

      // Ensure another account does not already own this email address.
      const emailAlreadyExists = await User.exists({ email: normalizedEmail, _id: { $ne: req.authUser._id } });

      if (emailAlreadyExists) {
        return res.status(409).json({ error: "Email already registered." });
      }
      updates.email = normalizedEmail; // Email passed format + uniqueness checks
    }

    // ---------------------------------------------------------------------
    // Now pass on the Profile updates to backend
    // ---------------------------------------------------------------------

    // Reject PATCH requests containing none of the supported profile fields.
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Provide at least one profile field to update." });
    }

    // Apply only validated profile fields to the current user.
    const updatedUser = await User.findByIdAndUpdate(
      req.authUser._id,             // Update only the authenticated user
      {
        $set: updates               // Never accept arbitrary request-body properties
      },
      {
        new: true,                  // Return the updated document
        runValidators: true         // Run UserSchema validation
      }
    ).lean();                       // Return a normal JavaScript object

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: formatUserProfile(updatedUser) // Return updated safe profile immediately
    });

  }
  catch (err) {

    //Protect against a race condition where two requests pass the
    // pre-check but MongoDB's unique index rejects one during the update.
    if (err?.code === 11000) {

      if (err?.keyPattern?.username) {
        return res.status(409).json({ error: "Username already taken." });
      }
      if (err?.keyPattern?.email) {
        return res.status(409).json({ error: "Email already registered." });
      }
    }
    next(err); // Delegate unexpected errors to Express error handling
  }
};


/*
 * "PATCH /users/me/password":
 * + Changes the password for a LOCAL account.
 * + Google-only accounts have no passwordHash and therefore cannot use this endpoint.
 */
export const changeMyPassword = async (req, res, next) => {

  try {

    const {
      currentPassword, // Existing password proves account ownership
      newPassword      // New password to securely hash and store
    } = req.body || {}; 


    // Ensure both fields are mandatory.
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword.trim() ||
      !newPassword.trim()
    ) {
      return res.status(400).json({ error: "currentPassword and newPassword are required." });
    }

    // Load the actual Mongoose document because passwordHash is required
    // for bcrypt verification and the subsequent update.
    const user = await User.findById(req.authUser._id);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }


    // Google-only users have no local password. 
    // Their authentication remains tied to Google through googleId.
    if (!user.passwordHash) {
      return res.status(403).json({ error: "Password is managed through Google sign-in." });
    }

    // Verify that the supplied current password matches the stored hash.
    const currentPasswordMatches = await bcrypt.compare( currentPassword, user.passwordHash);

    if (!currentPasswordMatches) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    // Prevent replacing the password with the exact same password.
    const reusesCurrentPassword = await bcrypt.compare(newPassword, user.passwordHash);

    if (reusesCurrentPassword) {
      return res.status(400).json({ error: "New password must be different from the current password." });
    }


    // Hash the new password using the same cost factor currently used during local registration.
    user.passwordHash = await bcrypt.hash(newPassword, 10);

    await user.save(); // Persist only the newly hashed password

    return res.status(200).json({ message: "Password updated successfully." });
  }
  catch (err) {
    next(err); // Forward unexpected bcrypt/database failures
  }
};