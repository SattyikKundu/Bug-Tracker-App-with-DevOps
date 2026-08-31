// src/ProtectedPages/NotificationsPage/NotificationsPage.jsx

import {
  useEffect, // used to trigger notifications loading AND current page refreshes when tab becomes visible
  useState   // used to stores All/Unread filter and current numbered page variables
} from "react";

import {
  useDispatch,   // used to utilize methods that interact with the notifications slice of Store
  useSelector    // used to interact with store variables of notifications slice
} from "react-redux"; 

import { useNavigate } from "react-router"; // programmatic URL/link navigation

import {
  deleteNotification,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead
} from "../../Store/notificationSlice.jsx"; // notification handling methods from notification slice

import {
  ErrorMessageToast,
  SuccessMessageToast
} from "../../utils/utilityFunctions.jsx"; // message toasts

import NotificationItem from "../../PageComponents/NotificationItem/NotificationItem.jsx";

import "./NotificationsPage.css";


const PAGE_SIZE = 20;

const NotificationsPage = () => {

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [filter, setFilter] = useState("all");
  const [page  , setPage  ] = useState(1);

  const {
    notifications,
    pagination,
    listStatus,
    listError,
    unreadCount
  } = useSelector((state) => state.notifications);


 
  useEffect(() => {  // loads requested numbered page whenever page/filter changes.
    dispatch(fetchNotifications({ page, limit: PAGE_SIZE, filter }));
    dispatch(fetchUnreadNotificationCount());
  }, [dispatch, page, filter]);


  
  useEffect(() => { // refreshes visible page once a backgrounded browser tab becomes active again.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        dispatch(fetchNotifications({ page, limit: PAGE_SIZE, filter }));
        dispatch(fetchUnreadNotificationCount());
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dispatch, page, filter]);


  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter);
    setPage(1); // filtering can change total page count, so safely return to page 1.
  };


  const handleMarkAllRead = async () => {
    const resultAction = await dispatch(markAllNotificationsRead());

    if (!markAllNotificationsRead.fulfilled.match(resultAction)) {
      ErrorMessageToast(resultAction.payload || "Unable to mark all notifications as read.");
      return;
    }

    SuccessMessageToast("All notifications marked as read.");

    // unread filter may now be empty; reload from page 1 to avoid an invalid page.
    const nextPage = filter === "unread" ? 1 : page;
    setPage(nextPage);
    dispatch(fetchNotifications({ page: nextPage, limit: PAGE_SIZE, filter }));
  };


  const handleDelete = async (notification) => {
    const resultAction = await dispatch(deleteNotification(notification._id));

    if (!deleteNotification.fulfilled.match(resultAction)) {
      ErrorMessageToast(resultAction.payload || "Unable to delete notification.");
      return;
    }

    SuccessMessageToast("Notification deleted.");

    // IF final row on a later page was deleted, move to previous valid page.
    const deletingLastVisibleRow = notifications.length === 1 && page > 1;
    const nextPage = deletingLastVisibleRow ? page - 1 : page;

    if (nextPage !== page) {
      setPage(nextPage);
    }
    else {
      dispatch(fetchNotifications({ page: nextPage, limit: PAGE_SIZE, filter }));
    }
  };


  // shows at most five page-number buttons around current page.
  const getVisiblePageNumbers = () => {
    const totalPages = pagination.totalPages;

    if (totalPages <= 0) {
      return [];
    }

    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - 2);
    let endPage   = Math.min(totalPages, startPage + maxVisiblePages - 1);

    startPage     = Math.max(1, endPage - maxVisiblePages + 1);

    return Array.from(
      { length: endPage - startPage + 1 },
      (_, index) => startPage + index
    );
  };


  const firstVisibleNumber = (pagination.total === 0)
    ? 0
    : ((pagination.page - 1) * pagination.limit) + 1;

  const lastVisibleNumber = (pagination.total === 0)
    ? 0
    : Math.min(pagination.page * pagination.limit, pagination.total);


  return (
    <main className="notifications-page">
      <header className="notifications-page-heading">
        <div>
          <p className="notifications-page-eyebrow">Activity inbox</p>
          <h1>Notifications</h1>
          <p>Review recent project, issue, assignment, and comment activity.</p>
        </div>

        <button
          className = "notifications-settings-link"
          type      = "button"
          onClick   = {() => navigate("/profile#notification-preferences")}
        >
          Notification settings
        </button>
      </header>

      <section className="notifications-panel">
        <div className="notifications-toolbar">
          <div className="notifications-filter-tabs" aria-label="Notification filters">
            <button
              className={
                filter === "all" 
                  ? "notifications-filter-tab notifications-filter-tab--active" 
                  : "notifications-filter-tab"
              }
              type="button"
              onClick={() => handleFilterChange("all")}
            >
              All
            </button>

            <button
              className={
                filter === "unread" 
                  ? "notifications-filter-tab notifications-filter-tab--active" 
                  : "notifications-filter-tab"
              }
              type="button"
              onClick={() => handleFilterChange("unread")}
            >
              Unread
              {unreadCount > 0 && <span>{unreadCount}</span>}
            </button>
          </div>

          <button
            className = "notifications-mark-all-button"
            type      = "button"
            onClick   = {handleMarkAllRead}
            disabled  = {unreadCount === 0}
          >
            Mark all as read
          </button>
        </div>

        {listStatus === "loading" && notifications.length === 0 && (
          <div className="notifications-page-state">Loading notifications...</div>
        )}

        {listStatus === "failed" && notifications.length === 0 && (
          <div className="notifications-page-state notifications-page-state--error" role="alert">
            {listError || "Unable to load notifications."}
          </div>
        )}

        {listStatus !== "loading" && notifications.length === 0 && !listError && (
          <div className="notifications-page-state">
            <strong>{filter === "unread" ? "No unread notifications." : "No notifications yet."}</strong>
            <span>
              {filter === "unread"
                ? "You're caught up with your current notification inbox."
                : "Project and issue activity will appear here as it happens."}
            </span>
          </div>
        )}

        {notifications.length > 0 && (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <NotificationItem
                key          = {notification._id}
                notification = {notification}
                onDelete     = {handleDelete}
              />
            ))}
          </div>
        )}

        {pagination.total > 0 && (
          <footer className="notifications-pagination-footer">
            <p>
              Showing {firstVisibleNumber}–{lastVisibleNumber} of {pagination.total} notifications
            </p>

            <nav className="notifications-pagination" aria-label="Notification pages">
              <button
                type     = "button"
                onClick  = {() => setPage(1)}
                disabled = {!pagination.hasPreviousPage}
              >
                First
              </button>

              <button
                type     = "button"
                onClick  = {() => setPage((current) => Math.max(1, current - 1))}
                disabled = {!pagination.hasPreviousPage}
              >
                Prev
              </button>

              {getVisiblePageNumbers().map((pageNumber) => (
                <button
                  key={pageNumber}
                  className={pageNumber === page 
                    ? "notifications-page-number notifications-page-number--active" 
                    : "notifications-page-number"
                  }
                  type         = "button"
                  onClick      = {() => setPage(pageNumber)}
                  aria-current = {pageNumber === page ? "page" : undefined}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                type     = "button"
                onClick  = {() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                disabled = {!pagination.hasNextPage}
              >
                Next
              </button>

              <button
                type     = "button"
                onClick  = {() => setPage(pagination.totalPages)}
                disabled = {!pagination.hasNextPage}
              >
                Last
              </button>
            </nav>
          </footer>
        )}
      </section>
    </main>
  );
};

export default NotificationsPage;
