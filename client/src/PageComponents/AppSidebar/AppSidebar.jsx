// src/PageComponents/AppSidebar/AppSidebar.jsx

import { 
  NavLink,     // used for clickable navigation links in menus/bars
  useLocation  // used for tracking current route infromation 
               // (i.e. identifies whether user is currently inside one selected project)
} from "react-router"; 

import { useSelector } from "react-redux"; // used for interacting with the state from a store's 'slice'
                                           // (i.e. reads notification count and current project from Redux)

import "./AppSidebar.css";              // sidebar styling

const AppSidebar = ({
  sidebarOpen,   // for controlling mobile sidebar visibility
  onCloseSidebar // for closing mobile drawer after navigation
}) => {


  const location = useLocation(); // used to find current URL to determine contextual project navigation

  const { unreadCount }    = useSelector((state) => state.notifications); // gets same global unread count used by header bell
  const { currentProject } = useSelector((state) => state.projects);      // gets currently loaded project via key/name


  /* Extracts selected project ID from ANY project-specific route:
   *
   * /projects/:id
   * /projects/:id/board
   * /projects/:id/issues/new
   * /projects/:id/issues/:issueId
   * /projects/:id/issues/:issueId/edit
   */
  const projectRouteMatch = location.pathname.match(/^\/projects\/([^/]+)/); // checks if pathname has '/projects/'
  const activeProjectId = projectRouteMatch?.[1] ?? null;                    // checks is and active project Id exists


  // Only inject project in workspace IF active project is not "new"
  const insideProjectWorkspace = Boolean(activeProjectId && activeProjectId !== "new");

  // Only show project-specific sidebar information WHEN Redux's loaded project matches project ID currently present in URL.
  const activeProject =
    insideProjectWorkspace &&
    String(currentProject?._id) === String(activeProjectId)
      ? currentProject
      : null;


  // Issue create/edit/details pages conceptually remain part of Issue Board.
  const issueBoardIsActive =
    Boolean(
      activeProjectId &&
      (
        location.pathname === `/projects/${activeProjectId}/board` ||
        location.pathname.startsWith(`/projects/${activeProjectId}/issues/`)
      )
    );


  // Unread notifications number for notifications page link in left sidebar menu
  const unreadBadgeText = unreadCount > 9 ? "9+" : unreadCount;


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

          <NavLink className={navClassName} to="/notifications" onClick={onCloseSidebar}>
            <span aria-hidden="true">🔔</span>
            <span className="app-sidebar-link-label">Notifications</span>
            {unreadCount > 0 && (
              <span
                className   = "app-sidebar-notification-badge"
                aria-label  = {`${unreadCount} unread notifications`}
              >
                {unreadBadgeText}
              </span>
            )}
          </NavLink>

          <div className="app-sidebar-divider" />

          <p className="app-sidebar-section-label">Projects</p>

          {activeProject && (
            <div className="app-sidebar-current-project">

              <div className="app-sidebar-current-project-heading">
                <span className="app-sidebar-current-project-key">{activeProject.key}</span>
                <strong title={activeProject.name}>{activeProject.name}</strong>
              </div>

              <NavLink
                className={({ isActive }) =>
                  isActive
                    ? "app-sidebar-link app-sidebar-project-link app-sidebar-link--active"
                    : "app-sidebar-link app-sidebar-project-link"
                }
                to      = {`/projects/${activeProjectId}`}
                end      // ensures navigation link is only "active" if current URL link matches path exactly
                onClick = {onCloseSidebar}
              >
                <span aria-hidden="true">◫</span>
                Overview
              </NavLink>

              <NavLink
                className={
                  issueBoardIsActive
                    ? "app-sidebar-link app-sidebar-project-link app-sidebar-link--active"
                    : "app-sidebar-link app-sidebar-project-link"
                }
                to      = {`/projects/${activeProjectId}/board`}
                onClick = {onCloseSidebar}
              >
                <span aria-hidden="true">▤</span>
                Issue Board
              </NavLink>

            </div>
          )}

          {/* Opens the full Active/Archived Projects browser. */}
          <NavLink
            className = {navClassName}
            to        = "/projects"
            end        // ensures navigation link is only "active" if current URL link matches path exactly
            onClick   = {onCloseSidebar}
          >
            <span aria-hidden="true">▣</span>
            Your Projects
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