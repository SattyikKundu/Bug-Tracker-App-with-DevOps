// src/PageComponents/AppSidebar/AppSidebar.jsx

import { NavLink } from "react-router"; // Used for clickable navigation links in menus/bars

import "./AppSidebar.css"; // Sidebar styling


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

          {/*  Project creation belongs to the next project-management branch,
            * so this control is visible but intentionally disabled for now.
            */}
          <button
            className="app-sidebar-disabled-action"
            type="button"
            disabled
            title="Project creation will be added in the project-management branch"
          >
            <span aria-hidden="true">＋</span>

            Create Project
          </button>
        </nav>
      </aside>
      {sidebarOpen && (
        <button
          className="app-sidebar-overlay"
          type="button"
          onClick={onCloseSidebar}
          aria-label="Close navigation menu"
        />
      )}
    </>
  );
};


export default AppSidebar;