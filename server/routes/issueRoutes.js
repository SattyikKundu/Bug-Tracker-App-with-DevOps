// server/routes/issueRoutes.js

import express from "express";                       // import Express router
import verifyJWT from "../middleware/verifyJWT.js";  // middleware for verifying JWT token

import { 
    loadCurrentUser,                // Attaches current user's doc to req.authUser
    loadProject,                    // Middleware to load project by :id param
    requireProjectMemberOrAdmin,    // Checks if user is member of project
    requireProjectActive            // Checks if project is active (= is NOT archived)
    } from "../middleware/rbac.js"; // Role-base-access-controller helper methods

import { loadIssue } from "../middleware/issueLoader.js";// Issue loader helper method

import { 
    createIssue,      // create issue for a project
    listIssues,       // lists existing issues for a project
    getMyWork,        // dashboard's authenticated cross-project assigned work
    getIssue,         // fetch issue for a parent project
    updateIssue,      // update an existing project's issue
    addIssueLabel,    // adding label to an issue
    deleteIssueLabel, // deleting an issue label
    watchIssue,       // assign someone/self to watch an issue
    unwatchIssue,     // remove watcher from an issue
    transitionStatus  // checks transition status of an issue (for logging purposes)
    } from "../controllers/issueController.js"; // issue Controller methods

const router = express.Router(); // New express router

/**
 * @swagger
 * tags:
 *   name: Issues
 *   description: Manage projects' issues via CRUD (Create, Read, Update, Delete) and status transitions
 */

// Create issue in a project
/**
 * @swagger
 * /projects/{pid}/issues:
 *   post:
 *     summary: Create an issue within a project
 *     tags: [Issues]
 *     parameters:
 *       - in: path
 *         name: pid
 *         schema: { type: string }
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string, example: "Login button unresponsive" }
 *               description: { type: string, example: "Steps to reproduce..." }
 *               type: { type: string, example: "bug" }
 *               priority: { type: string, example: "high" }
 *               severity: { type: string, example: "major" }
 *               assigneeId:
 *                  type: string
 *                  nullable: true
 *                  description: >
 *                      Optional ID of the project lead or an existing project member.
 *                      Send null or omit this field to leave the issue unassigned.
 *                  example: "507f1f77bcf86cd799439011"
 *               labels:   
 *                  type: array
 *                  description: >
 *                      Optional issue labels. Labels are trimmed, converted to lowercase,
 *                      and de-duplicated.
 *                  items:
 *                      type: string
 *                  example:
 *                      - frontend
 *                      - login
 *     responses:
 *       201: { description: Issue created }
 *       400: { description: Invalid input }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
router.post(
    "/projects/:pid/issues", // POST method used to create issue in a project 
    verifyJWT, 
    loadCurrentUser, 
    loadProject, 
    requireProjectMemberOrAdmin, 
    requireProjectActive, // rbac.js: requires project to be active (NOT archived) in order to create an issue
    createIssue
);

// List issues in a project
/**
 * @swagger
 * /projects/{pid}/issues:
 *   get:
 *     summary: List issues within a project (filterable)
 *     tags: [Issues]
 *     parameters:
 *       - in: path
 *         name: pid
 *         schema: { type: string }
 *         required: true
 *       - in: query
 *         name: status
 *         description: Filter issues by workflow status
 *         schema:
 *           type: string
 *           enum:
 *             - open
 *             - in_progress
 *             - ready_for_review
 *             - closed
 *       - in: query
 *         name: priority
 *         schema: { type: string }
 *       - in: query
 *         name: assigneeId
 *         schema: { type: string }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200: { description: Array of issues }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */

// Lists for a current project (via project Id)
router.get(
    "/projects/:pid/issues", 
    verifyJWT, 
    loadCurrentUser, 
    loadProject, 
    requireProjectMemberOrAdmin, 
    listIssues
);



/**
 * @swagger
 * /issues/my-work:
 *   get:
 *     summary: Get the authenticated user's active assigned work
 *     description: >
 *       Returns up to five recently updated active issues assigned to the
 *       authenticated user together with Open, In Progress, and Ready for
 *       Review counts across projects the user can access.
 *     tags: [Issues]
 *     responses:
 *       200: { description: Assigned issue summary and recent active work }
 *       401: { description: Unauthorized }
 */
router.get(
    "/issues/my-work",
    verifyJWT,
    loadCurrentUser,
    getMyWork
);

/* Self-NOTE:
 * "/issues/my-work" must be declared BEFORE GET "/issues/:id".
 *
 * Express evaluates matching routes from top to bottom. 
 * If "/issues/:id" comes first, "/issues/my-work" is interpreted as:
 *
 * req.params.id = "my-work"
 *
 * which causes loadIssue to reject it as an invalid MongoDB ObjectId.
 */



// Get a single issue
/**
 * @swagger
 * /issues/{id}:
 *   get:
 *     summary: Get an issue by id
 *     tags: [Issues]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *     responses:
 *       200: { description: Issue object }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */

// Find specific issue via id
router.get(
    "/issues/:id", 
    verifyJWT, 
    loadCurrentUser, 
    loadIssue, 
    requireProjectMemberOrAdmin, 
    getIssue
);



// Update an issue
/**
 * @swagger
 * /issues/{id}:
 *   patch:
 *     summary: Update issue fields
 *     description: >
 *       Updates editable issue fields. Reporters and assignees may update an
 *       issue when permitted by the controller policy, but only the project
 *       lead or global admin may change assigneeId. reporterId cannot be
 *       changed.
 *     tags: [Issues]
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
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               type: { type: string }
 *               priority: { type: string }
 *               severity: { type: string }
 *               assigneeId:
 *                 type: string
 *                 nullable: true
 *                 description: >
 *                   Changes the issue assignee after creation. Only the project lead or
 *                   a global admin may update this field. Send null to make the issue
 *                   unassigned.
 *                   example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200: { description: Updated issue }
 *       400: { description: Invalid input }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
// Update the data of an existing issue
router.patch(
    "/issues/:id",
    verifyJWT, 
    loadCurrentUser, 
    loadIssue, 
    requireProjectMemberOrAdmin, 
    requireProjectActive, // rbac.js: requires project to be active (NOT archived) in order to update an issue
    updateIssue
);


// Add one normalized label to an issue
router.post(
  "/issues/:id/labels",
  verifyJWT,
  loadCurrentUser,
  loadIssue,
  requireProjectMemberOrAdmin,
  requireProjectActive, // rbac.js: requires project to be active (NOT archived) in order to add label to an issue
  addIssueLabel
);

// Delete one label from an issue
router.delete(
  "/issues/:id/labels/:label",
  verifyJWT,
  loadCurrentUser,
  loadIssue,
  requireProjectMemberOrAdmin,
  requireProjectActive, // rbac.js: requires project to be active (NOT archived) in order to delete a label from an issue
  deleteIssueLabel
);


// Add the logged-in user to the issue's watchers
router.post(
  "/issues/:id/watch",
  verifyJWT,
  loadCurrentUser,
  loadIssue,
  requireProjectMemberOrAdmin,
  requireProjectActive, // rbac.js: requires project to be active (NOT archived) in order to watch an issue
  watchIssue
);


// Remove the logged-in user from the issue's watchers
router.delete(
  "/issues/:id/watch",
  verifyJWT,
  loadCurrentUser,
  loadIssue,
  requireProjectMemberOrAdmin,
  requireProjectActive, // rbac.js: requires project to be active (NOT archived) in order to un-watch an issue
  unwatchIssue
);


// Transition status
/**
 * @swagger
 * /issues/{id}/transition:
 *   post:
 *     summary: Transition issue status and append audit trail
 *     tags: [Issues]
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
 *             required: [to]
 *             properties:
 *               to:
 *                 type: string
 *                 enum:
 *                   - open
 *                   - in_progress
 *                   - ready_for_review
 *                   - closed
 *                 example: "ready_for_review"
 *     responses:
 *       200: { description: Updated issue }
 *       400: { description: Invalid input }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
// Track transition of issue's status (for an audit trail)
router.post(
    "/issues/:id/transition", 
    verifyJWT, 
    loadCurrentUser, 
    loadIssue, 
    requireProjectMemberOrAdmin, 
    requireProjectActive, // rbac.js: requires project to be active (NOT archived) in order allow transition status for an issue
    transitionStatus
);

export default router;  // Export router
