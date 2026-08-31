// src/PageComponents/NotificationItem/NotificationItem.jsx

import { useNavigate } from "react-router"; // used for programmatic navigation of notification clicks to related app pages
import { useDispatch } from "react-redux";  // used for dispatching mark-read action before navigating

import { markNotificationRead } from "../../Store/notificationSlice.jsx";

import "./NotificationItem.css";


// -----------------------------------------------------------------------------
// Helper for formatting timestamp for a notification
// -----------------------------------------------------------------------------
const formatNotificationTime = (createdAt) => {

  if (!createdAt) {
    return "";
  }

  const timestamp     = new Date(createdAt);
  const differenceMs  = Date.now() - timestamp.getTime();
  const minute        = 60 * 1000;
  const hour          = 60 * minute;
  const day           = 24 * hour;

  if (Number.isNaN(timestamp.getTime())) {
    return "";
  }
  if (differenceMs < minute) {
    return "Just now";
  }
  if (differenceMs < hour) {
    return `${Math.floor(differenceMs / minute)}m ago`;
  }
  if (differenceMs < day) {
    return `${Math.floor(differenceMs / hour)}h ago`;
  }
  if (differenceMs < 7 * day) {
    return `${Math.floor(differenceMs / day)}d ago`;
  }

  return timestamp.toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  (timestamp.getFullYear() === new Date().getFullYear()) ? undefined : "numeric"
  });
};


// -----------------------------------------------------------------------------
// Helper to get navigation link related to specific notification
// -----------------------------------------------------------------------------
const getNotificationDestination = (notification) => {
  // Removed users intentionally cannot reopen the project they lost access to.
  if (notification.type === "project_member_removed") {
    return null;
  }

  if (notification.issueId && notification.projectId) {
    return `/projects/${notification.projectId}/issues/${notification.issueId}`;
  }

  if (notification.projectId) {
    return `/projects/${notification.projectId}`;
  }

  return null;
};


const NotificationItem = ({ notification, onDelete, onNavigate, compact = false }) => {

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const destination = getNotificationDestination(notification);

  // Clicking a notification silently marks it read and THEN navigates to 
  // whatever backend supplied destination the user can reasonably access.
  const handleNotificationClick = async () => {
    if (!notification.isRead) {
      await dispatch(markNotificationRead(notification._id));
    }

    if (destination) {
      onNavigate?.();
      navigate(destination);
    }
  };

  const handleDeleteClick = (event) => { // for deleting a notification
    event.stopPropagation(); // prevents row click/navigation while deleting
    onDelete?.(notification);
  };

  const itemClassName = [
    "notification-item",
    notification.isRead ? "notification-item--read" : "notification-item--unread",
    destination         ? "notification-item--clickable" : "",
    compact             ? "notification-item--compact" : ""
  ]
    .filter(Boolean)
    .join(" ");


  return (
    <article
      className = {itemClassName}
      onClick   = {handleNotificationClick}
      tabIndex  = {0}
      role      = "button"
      onKeyDown = {(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleNotificationClick();
        }
      }}
      aria-label={`${notification.isRead ? "Read" : "Unread"} notification: ${notification.title}`}
    >
      <div className="notification-item-status-column" aria-hidden="true">
        {!notification.isRead && <span className="notification-item-unread-dot" />}
      </div>

      <div className="notification-item-content">
        <div className="notification-item-title-row">
          <h3>{notification.title}</h3>

          {onDelete && (
            <button
              className   = "notification-item-delete-button"
              type        = "button"
              onClick     = {handleDeleteClick}
              aria-label  = {`Delete notification: ${notification.title}`}
              title       = "Delete notification"
            >
              ×
            </button>
          )}
        </div>

        <p className="notification-item-message">{notification.message}</p>

        <div className="notification-item-meta">
          <time dateTime={notification.createdAt}>
            {formatNotificationTime(notification.createdAt)}
          </time>

          {!destination && notification.type === "project_member_removed" && (
            <span>Project access removed</span>
          )}
        </div>
      </div>
    </article>
  );
};

export default NotificationItem;
