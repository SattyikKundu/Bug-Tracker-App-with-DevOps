// src/PageComponents/AppSidebar/AppSidebar.jsx

import { NavLink } from "react-router"; // used for clickable navigation links in menus/bars
import "./AppSidebar.css";              // sidebar styling

const AppSidebar = ({
  sidebarOpen,   // for controlling mobile sidebar visibility
  onCloseSidebar // for closing mobile drawer after navigation
}) => {

   // React Router supplies 'isActive' to NavLink.
   // 'isActive' used to visually highlight the current destination.
  const navClassName = ({ isActive }) => isActive ? "app-sidebar-link app-sidebar-link--active" : "app-sidebar-link";

  return (
    <>
      <aside className={sidebarOpen ? "app-sidebar app-sidebar--open" : "app-sidebar"}>
        <nav className="app-sidebar-navigation" aria-label="Application navigation">
          <p className="app-sidebar-section-label">Workspace</p>
          <NavLink className={navClassName} to="/dashboard" onClick={onCloseSidebar}>
            <span aria-hidden="true">▦</span>Dashboard
        </NavLink>

          <NavLink className={navClassName} to="/profile" onClick={onCloseSidebar}>
            <span aria-hidden="true">◉</span>Profile
          </NavLink>

          <div className="app-sidebar-divider" />

          <p className="app-sidebar-section-label">Projects</p>

          {/* Opens the full Active/Archived Projects browser. */}
          <NavLink className={navClassName} to="/projects" onClick={onCloseSidebar}>
            <span aria-hidden="true">▣</span>
            Browse Projects
          </NavLink>

          {/* Direct shortcut to the dedicated project-creation form. */}
          <NavLink
            className={({ isActive }) =>
              isActive
                ? "app-sidebar-link app-sidebar-link--nested app-sidebar-link--active"
                : "app-sidebar-link app-sidebar-link--nested"
            }
            to="/projects/new"
            onClick={onCloseSidebar}
          >
            <span aria-hidden="true">＋</span>
            Create Project
          </NavLink>

        </nav>
      </aside>
      {sidebarOpen && (
        <button
          className  = "app-sidebar-overlay"
          type       = "button"
          onClick    = {onCloseSidebar}
          aria-label = "Close navigation menu"
        />
      )}
    </>
  );
};


export default AppSidebar;