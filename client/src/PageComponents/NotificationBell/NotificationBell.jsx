// src/PageComponents/NotificationBell/NotificationBell.jsx

import {
  useEffect, // starts/stops notification polling and keyboard/outside-click listeners
  useRef,    // holds bell+drawer wrapper for outside-click detection
  useState   // controls whether the recent notification drawer is open
} from "react";

import { useDispatch, useSelector } from "react-redux";

import {
  deleteNotification,
  fetchRecentNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead
} from "../../Store/notificationSlice.jsx";

import { ErrorMessageToast, SuccessMessageToast } from "../../utils/utilityFunctions.jsx";

import NotificationDrawer from "../NotificationDrawer/NotificationDrawer.jsx";

import "./NotificationBell.css";

const NOTIFICATION_POLL_INTERVAL_MS = 30 * 1000; // silent unread-count refresh every ~30 seconds


const NotificationBell = () => {
  const dispatch = useDispatch();
  const wrapperRef = useRef(null);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    unreadCount,
    recentNotifications,
    recentStatus,
    recentError
  } = useSelector((state) => state.notifications);


  // ---------------------------------------------------------------------------
  // Silent unread-count polling
  // ---------------------------------------------------------------------------
  useEffect(() => {
    dispatch(fetchUnreadNotificationCount());

    const pollUnreadCount = () => {
      if (document.visibilityState === "visible") {
        dispatch(fetchUnreadNotificationCount());
      }
    };

    const intervalId = window.setInterval(
      pollUnreadCount,
      NOTIFICATION_POLL_INTERVAL_MS
    );

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        dispatch(fetchUnreadNotificationCount());

        if (drawerOpen) {  // If drawer is already open, refresh its visible recent items too.
          dispatch(fetchRecentNotifications());
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dispatch, drawerOpen]);


  // ---------------------------------------------------------------------------
  // Close drawer via outside click or Escape
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!drawerOpen) {
      return undefined;
    }

    const handleDocumentPointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setDrawerOpen(false);
      }
    };

    const handleDocumentKeyDown = (event) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [drawerOpen]);


  const handleBellClick = () => {
    const nextOpenState = !drawerOpen;
    setDrawerOpen(nextOpenState);

    if (nextOpenState) {
      dispatch(fetchRecentNotifications());
      dispatch(fetchUnreadNotificationCount());
    }
  };


  const handleMarkAllRead = async () => {
    const resultAction = await dispatch(markAllNotificationsRead());

    if (markAllNotificationsRead.fulfilled.match(resultAction)) {
      SuccessMessageToast("All notifications marked as read.");
      return;
    }

    ErrorMessageToast(resultAction.payload || "Unable to mark all notifications as read.");
  };


  const handleDelete = async (notification) => {
    const resultAction = await dispatch(deleteNotification(notification._id));

    if (deleteNotification.fulfilled.match(resultAction)) {
      SuccessMessageToast("Notification deleted.");
      dispatch(fetchRecentNotifications());
      return;
    }

    ErrorMessageToast(resultAction.payload || "Unable to delete notification.");
  };


  const badgeText = unreadCount > 9 ? "9+" : String(unreadCount);


  return (
    <div className="notification-bell-wrapper" ref={wrapperRef}>
      <button
        className     = {`notification-bell-button ${drawerOpen ? "notification-bell-button--open" : ""}`}
        type          = "button"
        onClick       = {handleBellClick}
        aria-label    = {unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded = {drawerOpen}
        aria-haspopup = "dialog"
        title         = "Notifications"
      >
        <span className="notification-bell-icon" aria-hidden="true">🔔</span>

        {unreadCount > 0 && (
          <span className="notification-bell-badge" aria-hidden="true">
            {badgeText}
          </span>
        )}
      </button>

      {drawerOpen && (
        <NotificationDrawer
          notifications = {recentNotifications}
          status        = {recentStatus}
          error         = {recentError}
          unreadCount   = {unreadCount}
          onMarkAllRead = {handleMarkAllRead}
          onDelete      = {handleDelete}
          onClose       = {() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell;
