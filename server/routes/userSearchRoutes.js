// server/routes/userSearchRoutes.js
import express from "express"; // Import Express so we can create a modular router.

import verifyJWT from "../middleware/verifyJWT.js";  // Import existing JWT middleware to protect routes

import {
  loadCurrentUser,
  loadProject,
  requireProjectLeadOrAdmin
} from "../middleware/rbac.js"; // Import middleware that loads authorization context.

import { searchProjectMembers } from "../controllers/userSearchController.js"; // Import the user-search controller.

const router = express.Router(); // Create a router dedicated to project-member searches.

/**
 * @swagger
 * /api/projects/{id}/member-search:
 *   get:
 *     summary: Search registered users for project membership
 *     description: >
 *       Searches all registered users by first name, last name, or username.
 *       Existing members of the selected project remain in the results and
 *       include isProjectMember and projectRole values. Only the project's
 *       lead or a global administrator can use this endpoint.
 *     tags:
 *       - Project Member Search
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB ObjectId of the selected project
 *         schema:
 *           type: string
 *           example: 6a66966b2356fadc7c37e0ec
 *       - in: query
 *         name: q
 *         required: true
 *         description: Text matched against first name, last name, or username
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           example: jac
 *       - in: query
 *         name: page
 *         required: false
 *         description: Requested result page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *           example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Number of results returned per page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 25
 *           default: 10
 *           example: 10
 *     responses:
 *       200:
 *         description: Registered users matching the search were returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                   example: jac
 *                 projectId:
 *                   type: string
 *                   example: 6a66966b2356fadc7c37e0ec
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProjectUserSearchResult'
 *                 pagination:
 *                   $ref: '#/components/schemas/SearchPagination'
 *       400:
 *         description: Invalid project ID or search parameters
 *       401:
 *         description: Authentication is missing or invalid
 *       403:
 *         description: Project lead or administrator access is required
 *       404:
 *         description: Project not found
 *       500:
 *         description: Unexpected server error
 */
router.get(
  "/:id/member-search", // Match project-member search requests.
  verifyJWT,                     // Verify user's JWT before allowing access.
  loadCurrentUser,               // Load  authenticated user's complete database record.
  loadProject,                   // Load project identified by id route parameter.
  requireProjectLeadOrAdmin,     // Allow only project lead or global admin.
  searchProjectMembers           // Run validated project-user search.
);

export default router;           // Export  router so server.js can mount it.