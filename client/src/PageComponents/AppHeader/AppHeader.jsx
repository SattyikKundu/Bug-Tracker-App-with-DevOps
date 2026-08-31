// src/PageComponents/AppHeader/AppHeader.jsx

import UserMenu         from "../UserMenu/UserMenu.jsx";                  // reusable account dropdown
import NotificationBell from  "../NotificationBell/NotificationBell.jsx"  // notification bell component
import "./AppHeader.css";                                                 // header styling

const AppHeader = ({ onOpenSidebar }) => { // opens mobile sidebar drawer

  return (
    <header className = "app-header">
      <div className = "app-header-left">
        <button
          className  = "app-header-menu-button"
          type       = "button"
          onClick    = {onOpenSidebar}
          aria-label = "Open navigation menu"
        >
          ☰
        </button>

        <div className = "app-header-brand">
          <span className = "app-header-brand-mark">BT</span>
          <span className = "app-header-brand-name">BugTrack Workspace</span>
        </div>
      </div>
      <div className="app-header-right">

        {/* functional notification bell, unread badge, and recent-notification drawer. */}
        <NotificationBell />

        {/* imported User Menu below */}
        <UserMenu />
        
      </div>
    </header>
  );
};

export default AppHeader;