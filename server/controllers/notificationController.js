// server/controllers/notificationController.js

import mongoose     from "mongoose"; // Used to validate notification ObjectIds
import Notification from "../models/notificationModel.js";
import User         from "../models/user.js";

import {
  getNotificationPreferences,
  NOTIFICATION_PREFERENCE_DEFAULTS
} from "../utils/notificationService.js";


// -----------------------------------------------------------------------------
// ObjectId validation helper
// -----------------------------------------------------------------------------
const isValidId = (id) =>
    mongoose.Types.ObjectId.isValid(String(id));

// -----------------------------------------------------------------------------
// Positive integer query helper
// -----------------------------------------------------------------------------
// Used for:
//
// ?page=1
// ?limit=20
//
// Invalid/missing values fall back to the supplied default.
// -----------------------------------------------------------------------------
const parsePositiveInteger = (value, fallback) => {

    const parsed = Number.parseInt(value, 10);

    return (Number.isInteger(parsed) && parsed > 0) ? parsed : fallback;
  };


// ============================================================================
// GET /notifications
// ============================================================================
// Returns the logged-in user's paginated notification history.
//
// Query examples:
//
// /notifications?page=1&limit=20
//
// /notifications?page=2&limit=20&filter=unread
//
// Supported filters:
//
// all
// unread
//
// Notifications are newest first.
// ============================================================================
export const listNotifications =
  async (req, res, next) => {

    try {
      const recipientId = req.authUser._id;

      const page = parsePositiveInteger(req.query.page, 1);  // Default page = 1.

      const requestedLimit = parsePositiveInteger(req.query.limit, 20); // Default page size = 20.

      const limit = Math.min(requestedLimit, 50); // Prevent excessive page sizes.

      const filter = req.query.filter ?? "all";  // Default filter displays everything.


      if (!["all", "unread"].includes(filter)) { // Only these two filters are currently supported.
        return res.status(400).json({ error: "filter must be either 'all' or 'unread'."});
      }

      const query = {recipientId}; // Always restrict notifications to logged-in user.

      if (filter === "unread") { // "Unread" tab/filter.
        query.isRead = false;
      }

      const total = await Notification.countDocuments(query); // Determine full result count before pagination.

      const totalPages = (total === 0) ? 0 : Math.ceil(total / limit); // Determine total numbered pages.


     /* Example:
      *
      * totalPages     = 5
      * requested page = 8
      *
      * Reject impossible page requests.
      */
      if (totalPages > 0 && page > totalPages) {
        return res.status(400).json({ error: `page must be between 1 and ${totalPages}.` });
      }

      const skip = (page - 1) * limit;  // MongoDB pagination offset.

      // Retrieve this page.
      const notifications = await Notification.find(query)
          // Newest notification first.
          .sort({ createdAt: -1, _id: -1})
          .skip(skip)
          .limit(limit)
          .lean();


     /* Return notification records PLUS enough metadata for numbered pagination:
      *
      * First
      * Previous
      * 1 2 3 4 5
      * Next
      * Last
      */
      return res.json({
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage:
            totalPages > 0 &&
            page < totalPages,
          hasPreviousPage:
            page > 1 &&
            totalPages > 0
        }
      });

    }
    catch (err) {
      next(err);
    }

  };


// ============================================================================
// GET /notifications/unread-count
// ============================================================================
// Used primarily by future header bell.
//
// Example:
//
// 🔔 4
// ============================================================================
export const getUnreadNotificationCount = async (req, res, next) => {

    try {
      const unreadCount =
        await Notification.countDocuments({
          recipientId: req.authUser._id,
          isRead: false
        });

      return res.json({ unreadCount });

    }
    catch (err) {
      next(err);
    }
  };


// ============================================================================
// PATCH /notifications/:id/read
// ============================================================================
// Marks ONE of the current user's notifications as read.
//
// Ownership is enforced directly inside MongoDB query.
//
// A user can't mark another user's notification as 'read' simply by knowing its ObjectId.
// ============================================================================
export const markNotificationRead =
  async (req, res, next) => {

    try {
      const {id} = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({ error: "Invalid notification id."});
      }


    /* First try to mark the notification as read ONLY if it is currently unread.
     * This preserves the original readAt timestamp if the notification was
     * already read previously.
     */
    let notification = await Notification.findOneAndUpdate(
        {   _id: id, recipientId: req.authUser._id, isRead: false   },
        {   $set: { isRead: true, readAt: new Date() }              },
        {   new: true                                               }
    ).lean();


    // If nothing was updated, the notification may already be read.
    // Look it up again using both notification AND recipient Ids so users still cannot access another user's notification.
    if (!notification) {
        notification = await Notification.findOne({ _id: id, recipientId: req.authUser._id }).lean();
    }


    if (!notification) { // If neither query found it, notification does not belong to this user or doesn't exist.
        return res.status(404).json({ error: "Notification not found." });
    }

    return res.json({ notification });

    }
    catch (err) {
      next(err);
    }
  };


// ============================================================================
// PATCH /notifications/read-all
// ============================================================================
// Marks every unread notification belonging to logged-in user as read.
// ============================================================================
export const markAllNotificationsRead =
  async (req, res, next) => {

    try {
      const result = await Notification.updateMany(
          {
            recipientId: req.authUser._id,
            isRead: false
          },
          {
            $set: {
              isRead: true,
              readAt: new Date()
            }
          }
        );

      return res.json({updatedCount: result.modifiedCount});

    }
    catch (err) {
      next(err);
    }
  };


// ============================================================================
// DELETE /notifications/:id
// ============================================================================
// Permanently deletes ONE notification.
//
// Notifications intentionally use hard deletion.
//
// We DON'T need:
//
// -isDeleted
// -deletedAt
// -notification trash
// -notification recovery
//
// because notifications are temporary records already subject to the 90-day retention policy.
// ============================================================================
export const deleteNotification = async (req, res, next) => {

    try {
      const {id} = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({ error: "Invalid notification id." });
      }


      const deleted =  // recipientId protects notification ownership.
        await Notification.findOneAndDelete({
          _id: id,
          recipientId: req.authUser._id
        });


      if (!deleted) {
        return res.status(404).json({ error: "Notification not found." });
      }
      return res.status(204).send();

    }
    catch (err) {
      next(err);
    }
  };


// ============================================================================
// GET /users/me/notification-preferences
// ============================================================================
// Returns all six notification preference categories.
//
// Missing preferences are automatically merged with defaults.
// ============================================================================
export const getNotificationPreferencesController =
  async (req, res) => {
    return res.json({ notificationPreferences: getNotificationPreferences(req.authUser)});
  };


// ============================================================================
// PATCH /users/me/notification-preferences
// ============================================================================
// Supports partial updates.
//
// Examples:
//
// {
//   "commentReplies": false
// }
//
// OR:
//
// {
//   "notificationPreferences": {
//     "commentReplies": false,
//     "issueStatusChanges": false
//   }
// }
// ============================================================================
export const updateNotificationPreferences = async (req, res, next) => {

    try {

      // Accept either:
      //
      // { commentReplies: false }
      //
      // OR
      //
      // {
      //   notificationPreferences: {
      //     commentReplies: false
      //   }
      // }
      const submittedPreferences =
        req.body ?.notificationPreferences ?? req.body ?? {};


      // Only these 6 keys may be updated.
      const allowedKeys = Object.keys(NOTIFICATION_PREFERENCE_DEFAULTS);

      const updates = {};


      // Validate every submitted preference.
      for (const [key, value] of Object.entries(submittedPreferences)) {
        
        if (!allowedKeys.includes(key)) { // Reject unknown preference names.
          return res.status(400).json({ error: `Unknown notification preference: ${key}.` });
        }

        if (typeof value !== "boolean") { // Notification switches must strictly be booleans.
          return res.status(400).json({ error: `${key} must be true or false.` });
        }

        // Dot notation lets us partially update nested object without replacing user's other preferences.
        updates[`notificationPreferences.${key}`] = value;
      }

     
      if (Object.keys(updates).length === 0) {  // Empty PATCH requests are not useful.
        return res.status(400).json({ error: "Provide at least one notification preference to update." });
      }


      // Apply requested preference changes.
      const updatedUser =
        await User.findByIdAndUpdate(
          req.authUser._id,
          {$set: updates},
          {new: true, runValidators: true}
        )
          .select("notificationPreferences")
          .lean();

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found." });
      }

      return res.json({ notificationPreferences: getNotificationPreferences(updatedUser) });
    }
    catch (err) {
      next(err);
    }

  };