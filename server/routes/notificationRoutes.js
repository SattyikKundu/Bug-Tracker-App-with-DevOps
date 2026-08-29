// server/routes/notificationRoutes.js

import express              from "express";
import verifyJWT            from "../middleware/verifyJWT.js";
import { loadCurrentUser }  from "../middleware/rbac.js";

import {
  listNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getNotificationPreferencesController,
  updateNotificationPreferences
} from "../controllers/notificationController.js";


const router = express.Router();

// ============================================================================
// SWAGGER TAG
// ============================================================================
/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: In-app notification history, unread state, deletion, and notification preferences
 */

// ============================================================================
// GET /notifications
// ============================================================================
/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get the current user's notifications
 *     description: >
 *       Returns the authenticated user's notification history using numbered
 *       pagination. Notifications are returned newest first. The optional
 *       filter query can return either all notifications or unread notifications
 *       only.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Numbered notification page to retrieve.
 *
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of notifications returned per page.
 *
 *       - in: query
 *         name: filter
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - all
 *             - unread
 *           default: all
 *         description: >
 *           Use "all" for complete notification history or "unread"
 *           for unread notifications only.
 *
 *     responses:
 *       200: 
 *         description: Paginated notification history returned successfully. 
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "68b1234567890abcdef12345"
 *                       recipientId:
 *                         type: string
 *                         example: "68a1234567890abcdef12345"
 *                       actorId:
 *                         type: string
 *                         nullable: true
 *                         example: "68a9876543210abcdef98765"
 *                       type:
 *                         type: string
 *                         enum:
 *                           - issue_assigned
 *                           - issue_status_changed
 *                           - comment_reply
 *                           - project_member_added
 *                           - project_member_removed
 *                           - project_leadership_changed
 *                           - watched_issue_activity
 *                         example: "issue_assigned"
 *                       title:
 *                         type: string
 *                         example: "Issue assigned to you"
 *                       message:
 *                         type: string
 *                         example: "Sarah Jones assigned BT-42 to you."
 *                       projectId:
 *                         type: string
 *                         nullable: true
 *                         example: "68c1234567890abcdef12345"
 *                       issueId:
 *                         type: string
 *                         nullable: true
 *                         example: "68d1234567890abcdef12345"
 *                       commentId:
 *                         type: string
 *                         nullable: true
 *                         example: null
 *                       isRead:
 *                         type: boolean
 *                         example: false
 *                       readAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         example: null
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 87
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *                     hasNextPage:
 *                       type: boolean
 *                       example: true
 *                     hasPreviousPage:
 *                       type: boolean
 *                       example: false
 *
 *       400: { description: Invalid pagination page or filter value. }
 *       401: { description: Authentication required. }
 */
router.get(
  "/notifications",
  verifyJWT,
  loadCurrentUser,
  listNotifications
);


// ============================================================================
// GET /notifications/unread-count
// ============================================================================
/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     description: >
 *       Returns the total number of unread notifications belonging to
 *       the authenticated user. Intended for the notification bell badge
 *       in the client application.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: 
 *         description: Unread notification count returned successfully. 
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unreadCount:
 *                   type: integer
 *                   example: 4
 *
 *       401: { description: Authentication required. }
 */
router.get(
  "/notifications/unread-count",
  verifyJWT,
  loadCurrentUser,
  getUnreadNotificationCount
);


// ============================================================================
// PATCH /notifications/read-all
// ============================================================================
/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: >
 *       Marks every unread notification belonging to the authenticated
 *       user as read and records the current time in readAt.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200: 
 *         description: All unread notifications were marked as read. 
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updatedCount:
 *                   type: integer
 *                   example: 6
 *
 *       401: { description: Authentication required. }
 */
router.patch(
  "/notifications/read-all",
  verifyJWT,
  loadCurrentUser,
  markAllNotificationsRead
);


// ============================================================================
// PATCH /notifications/:id/read
// ============================================================================
/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark one notification as read
 *     description: >
 *       Marks one notification belonging to the authenticated user as read.
 *       Users cannot modify notifications belonging to another account.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the notification.
 *
 *     responses:
 *       200: 
 *         description: Notification marked as read successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notification:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     type:
 *                       type: string
 *                     title:
 *                       type: string
 *                     message:
 *                       type: string
 *                     isRead:
 *                       type: boolean
 *                       example: true
 *                     readAt:
 *                       type: string
 *                       format: date-time
 *
 *       400: { description: Invalid notification id. }
 *       401: { description: Authentication required. }
 *       404: { description: Notification not found for the current user. }
 */
router.patch(
  "/notifications/:id/read",
  verifyJWT,
  loadCurrentUser,
  markNotificationRead
);


// ============================================================================
// DELETE /notifications/:id
// ============================================================================
/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete one notification
 *     description: >
 *       Permanently deletes one notification belonging to the authenticated
 *       user. Notification deletion is a hard delete because notifications
 *       are temporary records and are also automatically removed after
 *       approximately 90 days.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the notification.
 *     responses:
 *       204: { description: Notification deleted successfully. }
 *       400: { description: Invalid notification id. }
 *       401: { description: Authentication required. }
 *       404: { description: Notification not found for the current user. }
 */
router.delete(
  "/notifications/:id",
  verifyJWT,
  loadCurrentUser,
  deleteNotification
);


// ============================================================================
// GET /users/me/notification-preferences
// ============================================================================
/**
 * @swagger
 * /users/me/notification-preferences:
 *   get:
 *     summary: Get notification preferences
 *     description: >
 *       Returns the authenticated user's category-level notification
 *       preferences. Missing preference values are automatically resolved
 *       to their default enabled state.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: 
 *         description: Notification preferences returned successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notificationPreferences:
 *                   type: object
 *                   properties:
 *                     issueAssignments:
 *                       type: boolean
 *                       example: true
 *                     issueStatusChanges:
 *                       type: boolean
 *                       example: true
 *                     commentReplies:
 *                       type: boolean
 *                       example: true
 *                     projectMembershipChanges:
 *                       type: boolean
 *                       example: true
 *                     projectLeadershipChanges:
 *                       type: boolean
 *                       example: true
 *                     watchedIssueActivity:
 *                       type: boolean
 *                       example: true
 *
 *       401: { description: Authentication required. }
 */
router.get(
  "/users/me/notification-preferences",
  verifyJWT,
  loadCurrentUser,
  getNotificationPreferencesController
);


// ============================================================================
// PATCH /users/me/notification-preferences
// ============================================================================
/**
 * @swagger
 * /users/me/notification-preferences:
 *   patch:
 *     summary: Update notification preferences
 *     description: >
 *       Partially updates one or more notification preference categories
 *       for the authenticated user. Only recognized boolean preference
 *       fields are accepted.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificationPreferences:
 *                 type: object
 *                 properties:
 *                   issueAssignments:
 *                     type: boolean
 *                   issueStatusChanges:
 *                     type: boolean
 *                   commentReplies:
 *                     type: boolean
 *                   projectMembershipChanges:
 *                     type: boolean
 *                   projectLeadershipChanges:
 *                     type: boolean
 *                   watchedIssueActivity:
 *                     type: boolean
 *
 *           examples:
 *             disableReplies:
 *               summary: Disable direct reply notifications
 *               value:
 *                 notificationPreferences:
 *                   commentReplies: false
 *
 *             updateMultiple:
 *               summary: Update multiple categories
 *               value:
 *                 notificationPreferences:
 *                   issueStatusChanges: false
 *                   watchedIssueActivity: false
 *                   commentReplies: true
 *
 *     responses:
 *       200: 
 *         description: Notification preferences updated successfully. 
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notificationPreferences:
 *                   type: object
 *                   properties:
 *                     issueAssignments:
 *                       type: boolean
 *                     issueStatusChanges:
 *                       type: boolean
 *                     commentReplies:
 *                       type: boolean
 *                     projectMembershipChanges:
 *                       type: boolean
 *                     projectLeadershipChanges:
 *                       type: boolean
 *                     watchedIssueActivity:
 *                       type: boolean
 *
 *       400: { description: Invalid preference name, invalid non-boolean preference value, or no preference values were supplied. }
 *       401: { description: Authentication required. }
 *       404: { description: Current user could not be found. }
 */
router.patch(
  "/users/me/notification-preferences",
  verifyJWT,
  loadCurrentUser,
  updateNotificationPreferences
);

export default router;