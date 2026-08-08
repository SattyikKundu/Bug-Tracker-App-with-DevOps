// src/PageComponents/ProjectCard/ProjectCard.jsx

import { useNavigate } from "react-router"; // Allows card to navigate to a project URL.
import "./ProjectCard.css";                 // Styles reusable component.


const ProjectCard = ({
  project,       // Project object returned via GET /projects.
  currentUserId  // Logged-in user ID used to identify role fallback.
}) => {
  const navigate = useNavigate(); // React Router navigation function.


  /* Determine whether leadUserId is:
   * - a plain MongoDB ObjectId string; OR
   * - a populated user object containing _id.
   */
  const leadUserId =
    typeof project.leadUserId === "object"
      ? project.leadUserId?._id
      : project.leadUserId;


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

  // Convert stored role into clean label for project card.
  const roleLabel =
    projectRole === "lead"
      ? "Project Lead"
      : "Member";


  // Navigate to a future project-details page.
  // Full destination page will be implemented in later branch.
  const openProject = () => {
    navigate(`/projects/${project._id}`);
    // console.log("Selected project:", project._id); // Temporary branch-only behavior.
  };

  // Keyboard support makes the clickable card usable without a mouse.
  const handleCardKeyDown = (event) => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault(); // Prevents space from scrolling the page.
      openProject();          // Opens the project like a normal click.
    }
  };


  return (
    <article
      className="project-card"
      role="button"
      tabIndex="0"
      onClick={openProject}
      onKeyDown={handleCardKeyDown}
      aria-label={`Open project ${project.name}`}
    >
      <div className="project-card-top-row">
        <span className="project-key">
          {project.key}
        </span>

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
          {project.description?.trim()
            ? project.description
            : "No project description has been added yet."}
        </p>
      </div>


      <footer className="project-card-footer">
        <span>
          View project
        </span>

        <span
          className="project-card-arrow"
          aria-hidden="true"
        >
          →
        </span>
      </footer>
    </article>
  );
};


export default ProjectCard;