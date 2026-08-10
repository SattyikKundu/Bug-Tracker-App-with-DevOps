// src/PageComponents/AppHeader/AppHeader.jsx

import UserMenu from "../UserMenu/UserMenu.jsx";  // reusable account dropdown
import "./AppHeader.css";                         // header styling


const AppHeader = ({ onOpenSidebar }) => { // Opens mobile sidebar drawer

  return (
    <header className="app-header">
      <div className="app-header-left">
        <button
          className="app-header-menu-button"
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
        >
          ☰
        </button>

        <div className="app-header-brand">
          <span className="app-header-brand-mark">BT</span>
          <span className="app-header-brand-name">BugTrack Workspace</span>
        </div>
      </div>
      <div className="app-header-right">
        {/*
         * Notification bell intentionally remains a visual placeholder.
         * It will become functional in the later client-notifications branch.
         */}
        <button
          className="app-header-notification-placeholder"
          type="button"
          disabled
          aria-label="Notifications will be added later"
          title="Notifications will be added later"
        >
          🔔
        </button>

        {/* Imported User Menu below */}
        <UserMenu />
        
      </div>
    </header>
  );
};

export default AppHeader;