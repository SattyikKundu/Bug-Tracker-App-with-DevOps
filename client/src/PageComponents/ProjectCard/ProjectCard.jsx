// src/PageComponents/ProjectCard/ProjectCard.jsx

import { useNavigate } from "react-router"; // allows card to navigate to project-specific URLs.
import "./ProjectCard.css";                 // styles reusable component.


const ProjectCard = ({
  project,              // project object returned via GET /projects.
  currentUserId,        // logged-in user ID used to identify role fallback.
  onRestoreProject,     // dashboard callback for restoring a project.
  isRestoring = false   // controls the button's temporary loading state.
}) => {

  const navigate = useNavigate(); // react router navigation helper.

  /* Determine whether leadUserId is:
   * - a plain MongoDB ObjectId string; OR
   * - a populated user object containing _id.
   */
  const leadUserId =
    typeof project.leadUserId === "object"
      ? project.leadUserId?._id
      : project.leadUserId;


  /* Determines whether current user is this project's stored lead.
   * This controls role badge and whether archived project "restore" is visible.
   */
  const isProjectLead =
    String(leadUserId) === String(currentUserId);


  /* Obtain role supplied directly by your backend.
   * The fallback comparison ensures badge still works 
   * even when backend returns only leadUserId and members.
   */
  const projectRole =
    project.currentUserRole ||
    project.projectRole ||
    (
      String(leadUserId) === String(currentUserId)
        ? "lead"
        : "member"
    );


  // convert stored role into clean label for project card.
  const roleLabel =
    projectRole === "lead"
      ? "Project Lead"
      : "Member";


  // navigate to a future project-details page.
  // full destination page will be implemented in later branch.
  const openProject = () => {
    navigate(`/projects/${project._id}`);
  };



  // allows keyboard users to open the project card with Enter or Space.
  const handleCardKeyDown = (event) => {
    if ( event.key === "Enter" || event.key === " ") {
      event.preventDefault(); // prevent space from scrolling the document.
      openProject();          // perform the same behavior as a mouse click.
    }
  };


  // restores an archived project without triggering parent card's click handler.
  const handleRestoreClick = (event) => {
    event.stopPropagation();         // prevent ProjectCard from navigating.
    onRestoreProject?.(project._id); // request restore from the dashboard.
  };


  return (
    <article
      className  = { project.archived ? "project-card project-card--archived" : "project-card" }
      role       = "button"
      tabIndex   = "0"
      onClick    = {openProject}
      onKeyDown  = {handleCardKeyDown}
      aria-label = {`Open project ${project.name}`}
    >
      <div className="project-card-top-row">
        <div className="project-card-badge-group">
          <span className="project-key">
            {project.key}
          </span>

          {project.archived && (
            <span className="project-archive-badge">
              Archived
            </span>
          )}
        </div>

        <span
          className={
            projectRole === "lead"
              ? "project-role-badge project-role-badge--lead"
              : "project-role-badge project-role-badge--member"
          }
        >
          {roleLabel}
        </span>
      </div>

      <div className="project-card-content">
        <h2>{project.name}</h2>
        <p>
          {project.description?.trim() ? project.description : "No project description has been added yet."}
        </p>
      </div>

      {project.archived && project.archivedAt && (
        <p className="project-archived-date">
          Archived{" "}
          {new Date(project.archivedAt).toLocaleDateString()}
        </p>
      )}


      <footer className="project-card-footer">
        <span>
          {project.archived ? "View archived project" : "View project"}
        </span>

        <div className="project-card-footer-actions">
          {project.archived && isProjectLead && (
            <button
              className = "project-restore-button"
              type      = "button"
              onClick   = {handleRestoreClick}
              disabled  = {isRestoring}
            >
              {isRestoring ? "Restoring..." : "Restore Project"}
            </button>
          )}

          <span className="project-card-arrow" aria-hidden="true">
            →
          </span>
        </div>
      </footer>
    </article>
  );
};

export default ProjectCard;