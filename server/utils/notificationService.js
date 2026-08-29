// server/utils/notificationService.js
import Notification from "../models/notificationModel.js"; // Notification model
import User         from "../models/user.js";              // User model for preferences

// -----------------------------------------------------------------------------
// Default notification preferences
// -----------------------------------------------------------------------------
// Every category starts enabled.
//
// Existing users who do not yet have notificationPreferences stored
// ALSO receives these defaults through getNotificationPreferences().
// -----------------------------------------------------------------------------

export const NOTIFICATION_PREFERENCE_DEFAULTS = {
  issueAssignments:         true,
  issueStatusChanges:       true,
  commentReplies:           true,
  projectMembershipChanges: true,
  projectLeadershipChanges: true,
  watchedIssueActivity:     true
};


// -----------------------------------------------------------------------------
// Resolve a user's complete preference object
// -----------------------------------------------------------------------------
// We merge stored preferences ON TOP OF defaults.
//
// Example stored user:
//
// notificationPreferences: {
//   commentReplies: false
// }
//
// Result:
// {
//   issueAssignments: true,
//   issueStatusChanges: true,
//   commentReplies: false,
//   ...
// }
// -----------------------------------------------------------------------------
export const getNotificationPreferences = (user = {}) => ({
    ...NOTIFICATION_PREFERENCE_DEFAULTS,
    ...(user.notificationPreferences ?? {})
  });

// -----------------------------------------------------------------------------
// Human-readable user display name
// -----------------------------------------------------------------------------
// Preference order:
//
// 1. firstName + lastName
// 2. username
// 3. fallback text
// -----------------------------------------------------------------------------
export const getUserDisplayName = (user = {}) => {

    const fullName = [ user.firstName, user.lastName ]
        .filter(Boolean)
        .join(" ")
        .trim();

    return (fullName || user.username || "A user");
  };

// -----------------------------------------------------------------------------
// Internal notification creation helper
// -----------------------------------------------------------------------------
// This function:
//
// 1. removes duplicate recipients
// 2. removes explicitly excluded recipients
// 3. prevents notifying user about their own actions
// 4. loads user notification preferences
// 5. keeps only users who enabled category
// 6. inserts allowed notification documents
// -----------------------------------------------------------------------------
const createNotificationsInternal =
  async (
    {
      recipientIds = [],
      actorId = null,
      preferenceKey,
      type,
      title,
      message,
      projectId = null,
      issueId = null,
      commentId = null,
      excludeRecipientIds = []
    }
  ) => {

    const actorIdString = actorId ? String(actorId) : null;       // Converts actor id to a comparable string.
    const excludedIds = new Set(excludeRecipientIds.map(String)); // Creates a Set so exclusion IDs cannot be duplicated.


    if (actorIdString) { // Prevent users from receiving notifications about actions they performed themselves.
      excludedIds.add(actorIdString);
    }

    // -------------------------------------------------------------------------
    // Normalize and deduplicate recipients
    // -------------------------------------------------------------------------
    const uniqueRecipientIds = [
      ...new Set(recipientIds.filter(Boolean).map(String))
    ]
      .filter((recipientId) => !excludedIds.has(recipientId));


    if (uniqueRecipientIds.length === 0) {  // Nobody remains to notify.
      return [];
    }

    // -------------------------------------------------------------------------
    // Load recipients so we can inspect their notification preferences
    // -------------------------------------------------------------------------
    const users = await User.find({
        _id: { $in: uniqueRecipientIds }
      })
        .select("_id notificationPreferences")
        .lean();


    // -------------------------------------------------------------------------
    // Keep only users who allow this notification category
    // -------------------------------------------------------------------------
    const allowedRecipientIds = users

      .filter(
        (user) => {
          const preferences = getNotificationPreferences(user);
          return (preferences[preferenceKey] !== false);
        }
      )
      .map((user) => user._id);

    if (allowedRecipientIds.length === 0) { // All possible recipients disabled this category.
      return [];
    }

    // -------------------------------------------------------------------------
    // Build notification documents
    // -------------------------------------------------------------------------
    const documents = allowedRecipientIds.map((recipientId) => ({
          recipientId,
          actorId,
          type,
          title,
          message,
          projectId,
          issueId,
          commentId
        })
      );

    return Notification.insertMany(documents);  // Insert all allowed notifications in one operation.
  };


// -----------------------------------------------------------------------------
// Public notification creation helper
// -----------------------------------------------------------------------------
// IMPORTANT:
//
// Notifications are secondary to the main operation.
//
// Example:
//
// 1. Issue assignment succeeds.
// 2. Issue is already saved.
// 3. Notification insert unexpectedly fails.
//
// We DON'T want API to return:
//
// 500 Internal Server Error
//
// because assignment itself actually succeeded.
//
// Therefore any notification delivery is deliberately "best effort."
// -----------------------------------------------------------------------------
export const createNotifications = async (options) => {
    try {
      return await createNotificationsInternal(options);
    }
    catch (err) {
      console.error("[Notifications] Failed to create notification(s):", err);

      return []; // Don't make main mutation fail just because secondary notification couldn't be created.
    }
  };