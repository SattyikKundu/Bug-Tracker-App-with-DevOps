// server/models/notificationModel.js

import mongoose from "mongoose"; // Import mongoose for schema/model creation

const { Schema } = mongoose; // Short alias for mongoose.Schema


// -----------------------------------------------------------------------------
// Allowed notification event types
// -----------------------------------------------------------------------------
// These values describe WHAT happened.
//
// The frontend can later use "type" to:
// - choose an icon
// - determine styling
// - decide where notification should navigate
// -----------------------------------------------------------------------------
export const NOTIFICATION_TYPES = [
  "issue_assigned",
  "issue_status_changed",
  "comment_reply",
  "project_member_added",
  "project_member_removed",
  "project_leadership_changed",
  "watched_issue_activity"
];


// -----------------------------------------------------------------------------
// Notification schema
// -----------------------------------------------------------------------------
const NotificationSchema = new Schema(
  {
    // User who RECEIVES the notification.
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    // User who CAUSED the notification event.
    //
    // Example:
    // Sarah assigns BT-12 to Mike.
    //
    // actorId     = Sarah
    // recipientId = Mike
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // Machine-readable notification type.
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
      index: true
    },

    // Short heading displayed in the notification UI.
    //
    // Example:
    // "Issue assigned to you"
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },

    // Short human-readable explanation.
    //
    // Example:
    // "Sarah Jones assigned BT-42 to you."
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },


    // Related project when applicable.
    //
    // Allows the frontend to navigate to:
    // /projects/:projectId
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true
    },

    // Related issue when applicable.
    //
    // Allows navigation to:
    // "/projects/:projectId/issues/:issueId"
    issueId: {
      type: Schema.Types.ObjectId,
      ref: "Issues",
      default: null,
      index: true
    },

    // Related comment when applicable.
    //
    // This will later allow reply notifications to navigate
    // to an issue and potentially scroll/highlight the comment.
    commentId: {
      type: Schema.Types.ObjectId,
      ref: "Comments",
      default: null
    },


    isRead: {  // Determines whether the recipient has already read the notification.
      type: Boolean,
      default: false,
      index: true
    },

    // Exact time the notification became read:
    //  null = still unread
    readAt: { type: Date, default: null}
  },

  {
    // Automatically adds:
    //  -createdAt
    //  -updatedAt
    timestamps: true,

    versionKey: false, // avoids exposing MongoDB's __v field.

    collection: "notifications" // collection name.
  }
);


// -----------------------------------------------------------------------------
// Notification indexes
// -----------------------------------------------------------------------------

// Optimizes:
// GET /notifications
//
// Most common query:
// notifications belonging to one user, newest first.
NotificationSchema.index({

  recipientId: 1,

  createdAt: -1

});


// Optimizes:
// unread notification listing
// unread notification count
NotificationSchema.index({

  recipientId: 1,

  isRead: 1,

  createdAt: -1

});


// -----------------------------------------------------------------------------
// Automatic 90-day retention
// -----------------------------------------------------------------------------
// MongoDB's TTL index automatically removes old notification documents.
//
// 60 seconds
// × 60 minutes
// × 24 hours
// × 90 days
//
// Notifications are temporary awareness records.
// They are NOT intended to replace permanent issue/activity history.
// -----------------------------------------------------------------------------
NotificationSchema.index(

  {
    createdAt: 1
  },

  {
    expireAfterSeconds:
      60 * 60 * 24 * 90
  }

);


// -----------------------------------------------------------------------------
// Export model
// -----------------------------------------------------------------------------
export default mongoose.model(

  "Notification",

  NotificationSchema,

  "notifications"

);