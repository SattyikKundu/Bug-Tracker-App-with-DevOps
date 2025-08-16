// server/routes/issueRoutes.js

import express from "express";                       // import Express router
import verifyJWT from "../middleware/verifyJWT.js";  // middleware for verifying JWT token

import { 
    loadCurrentUser,                // Attaches current user's doc to req.authUser
    loadProject,                    // Middleware to load project by :id param
    requireProjectMemberOrAdmin     // Checks if user is member of project
    } from "../middleware/rbac.js"; // Role-base-access-controller helper methods

import { loadIssue } from "../middleware/issueLoader.js";// Issue loader helper method

import { 
    createIssue,   // create issue for a project
    listIssues,    // lists existing issues for a project
    getIssue,      // fetch issue for a parent project
    updateIssue,   // update an existing project's issue
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
 *               assigneeId: { type: string }
 *               labels: { type: array, items: { type: string } }
 *               watchers: { type: array, items: { type: string } }
 *     responses:
 *       201: { description: Issue created }
 *       400: { description: Invalid input }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
router.post("/projects/:pid/issues", // POST method used to create issue in a project 
            verifyJWT, 
            loadCurrentUser, 
            loadProject, 
            requireProjectMemberOrAdmin, 
            createIssue);

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
 *         schema: { type: string }
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
router.get("/projects/:pid/issues", verifyJWT, loadCurrentUser, loadProject, requireProjectMemberOrAdmin, listIssues);

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
router.get("/issues/:id", verifyJWT, loadCurrentUser, loadIssue, requireProjectMemberOrAdmin, getIssue);

// Update an issue
/**
 * @swagger
 * /issues/{id}:
 *   patch:
 *     summary: Update issue fields
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
 *               assigneeId: { type: string }
 *               labels: { type: array, items: { type: string } }
 *               watchers: { type: array, items: { type: string } }
 *     responses:
 *       200: { description: Updated issue }
 *       400: { description: Invalid input }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
// Update the data of an existing issue
router.patch("/issues/:id", verifyJWT, loadCurrentUser, loadIssue, requireProjectMemberOrAdmin, updateIssue);

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
 *               to: { type: string, example: "in_progress" }
 *     responses:
 *       200: { description: Updated issue }
 *       400: { description: Invalid input }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
// Track transition of issue's status (for an audit trail)
router.post("/issues/:id/transition", verifyJWT, loadCurrentUser, loadIssue, requireProjectMemberOrAdmin, transitionStatus);

export default router;                                          // Export router
