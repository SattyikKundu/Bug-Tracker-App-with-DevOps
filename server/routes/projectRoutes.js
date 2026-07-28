// server/routes/projectRoutes.js                        

import express from "express";                       // Import Express to create a router
import verifyJWT from "../middleware/verifyJWT.js";  // JWT middleware to protect routes

import { loadCurrentUser, 
         loadProject, 
         requireRole,                                          
         requireProjectMemberOrAdmin, 
         requireProjectLeadOrAdmin } from "../middleware/rbac.js"; // RBAC helpers for role & project checks

import { createProject, 
         listProjects, 
         getProject, 
         updateProject, 
         updateMembers, 
         deleteProject } from "../controllers/projectController.js"; // Import functions from project controller


const router = express.Router();  // Create an isolated router instance

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management (create, list, update, membership)
 */

// Create a new project
/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a project
 *     description: Any authenticated user may create a project. The creator automatically becomes the project lead and first member.
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, name]
 *             properties:
 *               key:
 *                 type: string
 *                 example: "BTA"
 *                 description: Unique 2-10 character project key beginning with a letter.
 *               name:
 *                 type: string
 *                 example: "Bug Tracker Application"
 *               description:
 *                 type: string
 *                 example: "A bug-tracking application with DevOps integration."
 *     responses:
 *       201: { description: Project created }
 *       400: { description: Invalid input }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       409: { description: Duplicate project key }
 */
router.post(       // Define POST /projects
  "/projects",     // Route path
  verifyJWT,       // Require a valid JWT (can't use route IF NOT logged in)
  loadCurrentUser, // Load current user document
  createProject    // projectController function
);                                                                                         

// List projects current user can access
/**
 * @swagger
 * /projects:
 *   get:
 *     summary: List projects accessible to the current user
 *     tags: [Projects]
 *     responses:
 *       200: { description: List of projects }
 *       401: { description: Unauthorized }
 */
router.get(     // Define GET /projects
  "/projects",  // Route path to get all projects for current user
  verifyJWT,    // Require JWT to verify loggedin user
  loadCurrentUser, // rbac.js (role-based-access-control) middleware: Loads current user
  listProjects     // controllerProject function: lists projects for user ('admin' sees all)
);                                                                                           

// Get single project
/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Get a project by id
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *     responses:
 *       200: { description: Project object }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
router.get(                    // Define GET /projects/:id
  "/projects/:id",             // Route with :id param
  verifyJWT,                   // Require JWT (user who ARE NOT logged-in can't use route)
  loadCurrentUser,             // rbac.js (role-based-access-control) middleware: load current user
  loadProject,                 // rbac.js (role-based-access-control) middleware: load project by id
  requireProjectMemberOrAdmin, // rbac.js (role-based-access-control) middleware: enforce access (member/lead/admin)
  getProject                   // projectController function: returns project
);                                                                                       

// Update basic project fields
/**
 * @swagger
 * /projects/{id}:
 *   patch:
 *     summary: Update project details or transfer project leadership
 *     description: >
 *       This is a partial update. Only include fields that should be changed.
 *       The new project lead must already be a project member.
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: MongoDB ObjectId of the project
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 description: New project name. Omit when not changing it.
 *               description:
 *                 type: string
 *                 description: New project description. Omit when not changing it.
 *               leadUserId:
 *                 type: string
 *                 description: MongoDB ObjectId of an existing project member.
 *           examples:
 *             transferLeadership:
 *               summary: Transfer project leadership only
 *               value:
 *                 leadUserId: "6a66a6f9bce099059cddc1c4"
 *             updateProjectDetails:
 *               summary: Update name and description
 *               value:
 *                 name: "Updated Bug Tracker Application"
 *                 description: "Updated project description."
 *             updateNameOnly:
 *               summary: Update project name only
 *               value:
 *                 name: "New Project Name"
 *             clearDescription:
 *               summary: Clear the optional description
 *               value:
 *                 description: ""
 *     responses:
 *       200:
 *         description: Project updated successfully
 *       400:
 *         description: Invalid input or no valid update fields provided
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Project lead or administrator access required
 *       404:
 *         description: Project or selected user not found
 */
router.patch(         // Define PATCH /projects/:id
  "/projects/:id",    // Route with :id param
  verifyJWT,          // Require JWT so route can only be used via logged-in users
  loadCurrentUser,    // rbac.js (role-based-access-control) middleware: Load current user
  loadProject,        // rbac.js (role-based-access-control) middleware: Load project
  requireProjectLeadOrAdmin, // rbac.js (role-based-access-control) middleware: only lead/admin can update
  updateProject              // projectController: applies updates
);                                                                                           

// Add/remove members
/**
 * @swagger
 * /projects/{id}/members:
 *   post:
 *     summary: Add or remove project members
 *     tags: [Projects]
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
 *               add:
 *                 type: array
 *                 items: { type: string }
 *               remove:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200: { description: Updated project with new members list }
 *       400: { description: Invalid input }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
router.post(               // Define POST /projects/:id/members
  "/projects/:id/members", // Route path (with member 'id' param)
  verifyJWT,               // Require JWT to verfiy logged-in user
  loadCurrentUser,         // rbac.js (role-based-access-control) middleware: Load current user
  loadProject,             // rbac.js (role-based-access-control) middleware: Load project
  requireProjectLeadOrAdmin, // rbac.js (role-based-access-control) middleware: only lead/admin can update
  updateMembers              // projectController function: add/remove users
);                                                                                          

// Delete project
/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Delete a project (admin only)
 *     tags: [Projects]
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
router.delete(       // Define DELETE /projects/:id
  "/projects/:id",   // Route path (with project id to delete)
  verifyJWT,         // Require JWT to verify logged-in user
  loadCurrentUser,   // rbac.js (role-based-access-control) middleware: load current user
  loadProject,       // rbac.js (role-based-access-control) middleware: load project by id
  requireRole("admin"), // rbac.js (role-based-access-control) middleware: Ensures only admin can delete project
  deleteProject         // projectController method: delete project
);                                                                                            

export default router;  // Export router for mounting in server.js
