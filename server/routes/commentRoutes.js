// server/routes/commentRoutes.js

import express   from "express";                    // 
import verifyJWT from "../middleware/verifyJWT.js"; // middleware for verifying JWT tokens for protected routes

import { 
  loadCurrentUser,              // Attaches full user doc to req.authUser
  requireProjectMemberOrAdmin   // Checks if user is project-member/lead/admin and has access rights to project
} from "../middleware/rbac.js"; // Role-based-access-control helper methods

import { loadIssue }   from "../middleware/issueLoader.js";   // Loads issue by project id → stores issue in 'req.issue'
import { loadComment } from "../middleware/commentLoader.js"; // Loads comment (+issue +project) →  then stores in req.comment/req.issue/req.project


import {
  createComment,       // POST /issues/:id/comments (top-level comment or reply comment via parentId)
  listIssueComments,   // GET  /issues/:id/comments  (all top-level comments, paginated)
  listReplies,         // GET  /comments/:id/replies (all children comments for a top-level coment, paginated)
  updateComment,       // PATCH /comments/:id  (update existing comment)
  deleteComment        // DELETE /comments/:id (soft delete)
} from "../controllers/commentController.js";

const router = express.Router(); // New router for Express app

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Issue comments (top-level & threaded replies)
 */

// Create a comment on an issue (top-level or reply via optional parentId)
/**
 * @swagger
 * /issues/{id}/comments:
 *   post:
 *     summary: Add a comment to an issue (use parentId for a reply)
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [body]
 *             properties:
 *               body: { type: string, example: "I can reproduce this on Chrome 126." }
 *               parentId: { type: string, nullable: true, example: "64f1a2b3c4d5e6f7a8b9c0d2" }
 *     responses:
 *       201: { description: Comment created }
 *       400: { description: Invalid input }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
router.post(
  "/issues/:id/comments",
  verifyJWT,                   // must be logged in
  loadCurrentUser,             // attach req.authUser
  loadIssue,                   // attach req.issue & req.project
  requireProjectMemberOrAdmin, // must belong to the project (or admin)
  createComment                // controller
);

// List top-level comments for an issue (paginated)
/**
 * @swagger
 * /issues/{id}/comments:
 *   get:
 *     summary: List top-level comments for an issue (paginated)
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 20 }
 *       - in: query
 *         name: skip
 *         schema: { type: integer, example: 0 }
 *     responses:
 *       200: { description: Array of top-level comments }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
router.get(
  "/issues/:id/comments",
  verifyJWT,
  loadCurrentUser,
  loadIssue,
  requireProjectMemberOrAdmin,
  listIssueComments
);

// List direct replies under a specific parent comment (paginated)
/**
 * @swagger
 * /comments/{id}/replies:
 *   get:
 *     summary: List direct replies for a comment (paginated)
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 50 }
 *       - in: query
 *         name: skip
 *         schema: { type: integer, example: 0 }
 *     responses:
 *       200: { description: Array of replies }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
router.get(
  "/comments/:id/replies",
  verifyJWT,
  loadCurrentUser,
  loadComment,                 // attach req.comment, req.issue, req.project
  requireProjectMemberOrAdmin,
  listReplies
);

// Edit a comment
/**
 * @swagger
 * /comments/{id}:
 *   patch:
 *     summary: Edit a comment's body (author, lead, or admin)
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [body]
 *             properties:
 *               body: { type: string }
 *     responses:
 *       200: { description: Updated comment }
 *       400: { description: Invalid input }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
router.patch(
  "/comments/:id",
  verifyJWT,
  loadCurrentUser,
  loadComment,
  requireProjectMemberOrAdmin, // controller enforces author/lead/admin
  updateComment
);

// Soft-delete a comment
/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: Soft-delete a comment (author, lead, or admin)
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *     responses:
 *       204: { description: Deleted }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
router.delete(
  "/comments/:id",
  verifyJWT,
  loadCurrentUser,
  loadComment,
  requireProjectMemberOrAdmin, // controller enforces author/lead/admin
  deleteComment
);

export default router;
