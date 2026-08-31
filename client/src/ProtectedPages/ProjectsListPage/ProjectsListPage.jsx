// src/ProtectedPages/ProjectListPage/ProjectListPage.jsx

import {
  useEffect, // runs project code outside of normal program flow (depends on conditions)
  useMemo,   // an optimization hook used to cache (memoize) the result of an expensive calculation
  useState   // store and update data that changes over time and triggers UI re-renders
} from "react";

import {
    useDispatch,// hook returns a reference to Redux dispatch function. Used to send actions to your 
                // store, which triggers your reducers to update the state.

    useSelector // hook extracts data from Redux store state. It takes a selector function and automatically 
                // subscribes your component to changes, forcing a re-render if that specific data updates.
} from "react-redux";

import {
  clearRestoreError, // clears restore-related API messages.
  fetchProjects,     // loads accessible projects.
  restoreProject     // restores an archived project.
} from "../../Store/projectSlice.jsx";

import ProjectCard from "../../PageComponents/ProjectCard/ProjectCard.jsx";

import { ErrorMessageToast, SuccessMessageToast } from "../../utils/utilityFunctions.jsx"


import "./ProjectsListPage.css"; // for styling


// Dashboard sorting choices:
// storing labels and values together avoids scattering option text throughout JSX.
const SORT_OPTIONS = [
  { value: "updated-desc", label: "Recently Updated"   },
  { value: "created-desc", label: "Recently Created"   },
  { value: "name-asc",     label: "Project Name: A-Z"  },
  { value: "name-desc",    label: "Project Name: Z-A"  },
  { value: "key-asc",      label: "Project Key: A-Z"   },
  { value: "key-desc",     label: "Project Key: Z-A"   },
  { value: "lead-first",   label: "Role: Lead First"   },
  { value: "member-first", label: "Role: Member First" }
];

const ProjectListPage = () => {

  const dispatch = useDispatch(); // redux action dispatcher.


  // Used to determine whether 'active' or 'archived' projects are selected:
  // active is default tab because active work should be presented before historical/archived work.
  const [selectedTab, setSelectedTab] = useState("active");


  // Used to determine sorting options for projects in tab
  // Recently Updated is default sort so users see current work first.
  const [sortOption, setSortOption]   = useState("updated-desc");

  const {user} = useSelector((state) => state.auth); // tracks/responds to changes in cuurent authenticated-user state

  const {
    projects,           // projects returned via backend.
    status,             // current GET /projects request state.
    error,              // project request failure message.
    restoreError,       // error message IF error when restoring an archived project
    restoringProjectId  // ID of the project being restored
  } = useSelector((state) => state.projects);  // tracks and responds to changes in project-dashboard state


  // Display restore failures globally and immediately remove error
  // from Redux so it can't reappear after tab/page navigation.
  useEffect(() => {
    if (!restoreError) { 
      return; 
    }
    ErrorMessageToast(restoreError);
    dispatch(clearRestoreError());
  }, [restoreError, dispatch]);


  // Fetch projects once when this dashboard first opens.
  // Checking for "idle" prevents unnecessary repeated requests when the component re-renders.
  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchProjects());
    }
  }, [dispatch, status]);


  // support auth responses containing either "_id" or "id".
  const currentUserId = user?._id || user?.id;


   // Full projects collection split into active and archived arrays.
   // useMemo recalculates only when projects changes.
  const activeProjects   = useMemo(() => projects.filter((project) => project.archived !== true),[projects]);
  const archivedProjects = useMemo(() => projects.filter((project) => project.archived === true),[projects]);


  // Select whichever project group belongs to the currently active tab.
  const projectsForSelectedTab = (selectedTab === "active") ? activeProjects : archivedProjects;


  /* Sort a copied array rather than mutating Redux state directly:
   * Array.sort() mutates its array, so [...projectsForSelectedTab] safely creates a copy first.
   */
  const sortedProjects = useMemo(() => {
    const sorted = [
      ...projectsForSelectedTab
    ];

    // nested helper used for role-based sorting.
    const userIsLead = (project) => {
      const leadId =
        typeof project.leadUserId === "object"
          ? project.leadUserId?._id
          : project.leadUserId;

      return (
        String(leadId) ===
        String(currentUserId)
      );
    };


    switch (sortOption) { // use SWITCH to toggle between various sort cases

      case "name-asc": // sort by project name in Ascending order
        return sorted.sort((a, b) => String(a.name ?? "").localeCompare( String(b.name ?? "")));

      case "name-desc": // sort by project name in Descending order
        return sorted.sort((a, b) => String(b.name ?? "").localeCompare( String(a.name ?? "")));

      case "key-asc": // sort by project key in Ascending order
        return sorted.sort((a, b) => String(a.key ?? "").localeCompare( String(b.key ?? "")));

      case "key-desc": // sort by project key in Descending order
        return sorted.sort((a, b) => String(b.key ?? "").localeCompare( String(a.key ?? "")));

      case "created-desc": // sort by project creation date in Descending order
        return sorted.sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));

      case "lead-first": // sort projects by where user is a "project lead" first
        return sorted.sort((a, b) => Number(userIsLead(b)) - Number(userIsLead(a)));

      case "member-first": // sort projects by where user is a "member" first
        return sorted.sort((a, b) => Number(userIsLead(a)) - Number(userIsLead(b)));

      case "updated-desc": // sort by projects with most recent updates first (also Default!)
      default:
        return sorted.sort((a, b) => new Date(b.updatedAt ?? 0) - new Date(a.updatedAt ?? 0));
    }
  }, [ projectsForSelectedTab, sortOption, currentUserId ]);


  // retry project loading after GET /projects fails.
  const handleRetryProjects = () => {
    dispatch(fetchProjects());
  };


  // switch dashboard tabs.
  const handleTabChange = (tabName) => {
    setSelectedTab(tabName);
    dispatch(clearRestoreError()); // remove stale Restore errors when changing tabs.
  };

  // update the user's current client-side project sort choice.
  const handleSortChange = (event) => {
    setSortOption(event.target.value);
  };

  /* Restore an archived project:
   * the backend remains responsible for confirming user is actually stored project lead.
   */
  const handleRestoreProject = async (projectId) => { 

    const resultAction = await dispatch(restoreProject(projectId));

    if (restoreProject.fulfilled.match(resultAction)) {
      SuccessMessageToast("Project restored successfully.");
    }
  };


  // choose the correct centered message when a tab contains no projects.
  const emptyStateTitle = (selectedTab === "active") ? "No Active Projects" : "No Archived Projects";

  const emptyStateMessage =
    (selectedTab === "active")
      ? "You currently have no active projects to display."
      : "You currently have no archived projects to display.";


 return ( // Full dashboard component(s) page
    <main className="projects-page">
      <section className="projects-content">
        <div className="projects-heading-row">
          <div className="projects-heading">
            <p className="projects-eyebrow">Project workspace</p>
            <h1>Projects</h1>
            <p>
              Browse your active and archived projects, sort your workspace,
              and open a project to manage its details, members, and issues.
            </p>
          </div>
        </div>

        {status === "loading" && (
          <section className="projects-state-card" aria-live="polite">
            <div className="projects-loading-indicator" />
            <h2>Loading your projects</h2>
            <p>
              Retrieving the projects available to your account.
            </p>
          </section>
        )}

        {status === "failed" && (
          <section
            className = "projects-state-card projects-state-card--error"
            role      = "alert"
          >
            <h2>Projects could not be loaded</h2>
            <p>{error}</p>
            <button type="button" onClick={handleRetryProjects}>Try again</button>
          </section>
        )}


        {status === "succeeded" && (
          <>
            <section className="projects-project-controls">
              <div
                className  = "projects-project-tabs"
                role       = "tablist"
                aria-label = "Project status"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected = { selectedTab === "active" }
                  className     = { (selectedTab === "active") ? "projects-tab projects-tab--active" : "projects-tab"}
                  onClick       = {() => handleTabChange("active") }
                >
                  Active
                  <span>{activeProjects.length}</span>
                </button>

                <button
                  type          = "button"
                  role          = "tab"
                  aria-selected = { selectedTab === "archived"}
                  className     = {(selectedTab === "archived") ? "projects-tab projects-tab--active" : "projects-tab" }
                  onClick       = {() => handleTabChange("archived")}
                >
                  Archived
                  <span>{archivedProjects.length}</span>
                </button>
              </div>

              <div className="projects-sort-control">
                <label htmlFor="project-sort">Sort by</label>
                <select id="project-sort" value={sortOption} onChange={handleSortChange}>
                  {SORT_OPTIONS.map(
                    (option) => (
                      <option
                        key   = {option.value}
                        value = {option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </div>
            </section>

            {sortedProjects.length === 0 ? (
              <section className="projects-state-card projects-empty-projects">
                <span className="projects-empty-icon" aria-hidden="true">◫</span>
                <h2>{emptyStateTitle}</h2>
                <p>{emptyStateMessage}</p>
              </section>
            ) : (
              <section
                className="project-card-grid"
                aria-label={(selectedTab === "active") ? "Active projects" : "Archived projects"}
              >
                {sortedProjects.map(
                  (project) => (
                    <ProjectCard
                      key              = {project._id}
                      project          = {project}
                      currentUserId    = {currentUserId}
                      onRestoreProject = {handleRestoreProject}
                      isRestoring={
                        String(restoringProjectId) ===
                        String(project._id)
                      }
                    />
                  )
                )}
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default ProjectListPage;