// src/PageComponents/NotificationDrawer/NotificationDrawer.jsx

import { useNavigate } from "react-router"; // used for programmatic navigation to full notification inbox page
import NotificationItem from "../NotificationItem/NotificationItem.jsx";
import "./NotificationDrawer.css";

const NotificationDrawer = ({
  notifications,
  status,
  error,
  unreadCount,
  onMarkAllRead,
  onDelete,
  onClose
}) => {
  const navigate = useNavigate();


  const handleViewAll = () => { // navigates to '/notifications' full page
    onClose();
    navigate("/notifications");
  };


  return (
    <section
      className  = "notification-drawer"
      role       = "dialog"
      aria-label = "Recent notifications"
    >
      <header className="notification-drawer-header">
        <div>
          <p className="notification-drawer-eyebrow">Inbox</p>
          <h2>Notifications</h2>
        </div>

        <button
          className  = "notification-drawer-close-button"
          type       = "button"
          onClick    = {onClose}
          aria-label = "Close notifications"
        >
          ×
        </button>
      </header>

      <div className="notification-drawer-action-row">
        <span>
          {unreadCount === 0
            ? "You're all caught up"
            : `${unreadCount} unread`}
        </span>

        <button
          type     = "button"
          onClick  = {onMarkAllRead}
          disabled = {unreadCount === 0}
        >
          Mark all as read
        </button>
      </div>

      <div className="notification-drawer-list">
        {status === "loading" && notifications.length === 0 && (
          <div className="notification-drawer-state">Loading notifications...</div>
        )}

        {status === "failed" && notifications.length === 0 && (
          <div className="notification-drawer-state notification-drawer-state--error" role="alert">
            {error || "Unable to load recent notifications."}
          </div>
        )}

        {status !== "loading" && notifications.length === 0 && !error && (
          <div className="notification-drawer-state">
            <strong>No notifications yet.</strong>
            <span>Project and issue updates will appear here.</span>
          </div>
        )}

        {notifications.map((notification) => (
          <NotificationItem
            key={notification._id}
            notification={notification}
            onDelete={onDelete}
            onNavigate={onClose}
            compact
          />
        ))}
      </div>

      <footer className ="notification-drawer-footer">
        <button type    ="button" onClick={handleViewAll}>
          View all notifications
        </button>
      </footer>
    </section>
  );
};

export default NotificationDrawer;
