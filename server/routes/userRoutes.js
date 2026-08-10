// server/routes/userRoutes.js

import express from "express";                       // Express Router
import verifyJWT from "../middleware/verifyJWT.js"; // Confirms a valid JWT cookie exists

import { loadCurrentUser } from "../middleware/rbac.js"; // Loads the latest MongoDB User document into req.authUser

import {
  getMyProfile,     // GET current profile
  updateMyProfile,  // PATCH normal profile fields
  changeMyPassword  // PATCH local password
} from "../controllers/userController.js";

const router = express.Router(); // Create isolated user/profile router


/**
 * @swagger
 * tags:
 *   name: User Profile
 *   description: Manage the authenticated user's account profile
 */


/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get the authenticated user's profile
 *     tags: [User Profile]
 *     description: >
 *       Returns the latest profile information stored in MongoDB for
 *       the currently authenticated user.
 *     responses:
 *       200:
 *         description: Current user profile returned
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User no longer exists
 */
router.get(
  "/users/me",      // profile belongs only to the currently logged-in user
  verifyJWT,        // verifies JWT and expose req.user.id
  loadCurrentUser,  // retrieves latest user document from MongoDB
  getMyProfile      // returns safe profile information
);


/**
 * @swagger
 * /users/me:
 *   patch:
 *     summary: Update the authenticated user's profile
 *     tags: [User Profile]
 *     description: >
 *       Allows firstName, lastName, username, and email to be updated.
 *       User role, MongoDB ID, Google ID, passwords, timestamps, and
 *       project memberships cannot be changed through this endpoint.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "Johnny"
 *               lastName:
 *                 type: string
 *                 example: "Smith"
 *               username:
 *                 type: string
 *                 example: "JWilly"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "johnny@example.com"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid or empty profile update
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       409:
 *         description: Username or email already belongs to another account
 */
router.patch(
  "/users/me",      // current-user profile update route
  verifyJWT,        // requires valid login cookie
  loadCurrentUser,  // loads current DB account
  updateMyProfile   // validates and update permitted fields
);


/**
 * @swagger
 * /users/me/password:
 *   patch:
 *     summary: Change the authenticated local user's password
 *     tags: [User Profile]
 *     description: >
 *       Requires the current password before replacing it. Google-only
 *       accounts cannot use this endpoint because their password is
 *       managed through Google authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: "CurrentPassword123!"
 *               newPassword:
 *                 type: string
 *                 example: "NewPassword456!"
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Invalid password request
 *       401:
 *         description: Current password is incorrect or authentication is missing
 *       403:
 *         description: Password is managed through Google authentication
 *       404:
 *         description: User not found
 */
router.patch(
  "/users/me/password", // dedicated credential-change endpoint
  verifyJWT,            // requires valid JWT
  loadCurrentUser,      // resolves current user from MongoDB
  changeMyPassword      // verifies old password and hash new password
);

export default router; // exports router for server.js