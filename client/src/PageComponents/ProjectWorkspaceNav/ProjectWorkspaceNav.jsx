// src/PageComponents/ProjectWorkspaceNav/ProjectWorkspaceNav.jsx

import {
  Link,        // used to create URL links
  useLocation  // used to extract current browser route's information (like current route's URL)
} from "react-router";

import "./ProjectWorkspaceNav.css"; // shared project-level navigation styling


const ProjectWorkspaceNav = ({ projectId }) => {

  const location = useLocation(); // current browser route determines active workspace tab


  const overviewPath   = `/projects/${projectId}`;
  const issueBoardPath = `/projects/${projectId}/board`;

  /* Issue create/details/edit pages conceptually belong to Issue Board area.
   * This keeps Issue Board tab highlighted even though those URLs aren't
   * nested beneath "/board".
   */
  const issueBoardIsActive =
    location.pathname === issueBoardPath ||
    location.pathname.startsWith(`/projects/${projectId}/issues/`);

  const overviewIsActive = location.pathname === overviewPath;


  return (
    <nav
      className="project-workspace-nav"
      aria-label="Current project navigation"
    >
      <Link
        className     = {
          overviewIsActive
            ? "project-workspace-nav-link project-workspace-nav-link--active"
            : "project-workspace-nav-link"
        }
        to            = {overviewPath}
        aria-current  = {overviewIsActive ? "page" : undefined}
      >
        Overview
      </Link>

      <Link
        className     = {
          issueBoardIsActive
            ? "project-workspace-nav-link project-workspace-nav-link--active"
            : "project-workspace-nav-link"
        }
        to            = {issueBoardPath}
        aria-current  = {issueBoardIsActive ? "page" : undefined}
      >
        Issue Board
      </Link>
    </nav>
  );
};


export default ProjectWorkspaceNav;
