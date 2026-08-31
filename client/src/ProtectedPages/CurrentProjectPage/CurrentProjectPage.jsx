// src/ProtectedPages/CurrentProjectPage/CurrentProjectPage.jsx

import {
  useEffect, // loads project and performs debounced member searches
  useMemo,   // saves the result of calculation between component re-renders
  useState   // used to store/edit states 
} from "react";

import {
  Link,        // provides clickable navigation 
  useNavigate, // programmatic URL navigation
  useParams    // used to read :id from /projects/:id
} from "react-router";

import {
  useDispatch, // sends Redux project actions
  useSelector  // used to read and extract data from global redux store state
} from "react-redux";


import { ErrorMessageToast, SuccessMessageToast, NeutralMessageToast } from "../../utils/utilityFunctions.jsx"

import api from "../../api/axios.js"; // used for api requests to backend

import {
  archiveProject,               // archiving an active project
  clearCurrentProject,          // clear current project data/details from state
  clearProjectMutationError,    // clear stores project editing error
  deleteProject,                // delete project (only for global admin)
  fetchProjectById,             // fetch specific project
  updateProject,                // update project
  updateProjectMembers          // update project's members 
} from "../../Store/projectSlice.jsx";

import "./CurrentProjectPage.css"; // project-management styling


const CurrentProjectPage = () => {

  const {id:projectId} = useParams();       // current project's MongoDB ObjectId from URL
  const dispatch       = useDispatch();     // redux dispatcher
  const navigate       = useNavigate();     // router navigation helper
  const {user}         = useSelector((state) => state.auth); // current logged-in user determines project permissions


  const {
    currentProject: project,      // populated selected project
    currentProjectStatus,         // tracks project retrieval
    currentProjectError,          // project-load error
    mutationStatus,               // tracks edit/member/archive/delete operations
    mutationError                 // mutation-specific API failure
  } = useSelector((state) => state.projects);


 /* Convert shared Redux project-management errors into toast notifications.
  *
  * Once toast.error() receives the message, immediately clear Redux so
  * same failure cannot follow the user to another project or route.
  */
  useEffect(() => {
    if (!mutationError) {
      return;
    }
    ErrorMessageToast(mutationError);
    dispatch(clearProjectMutationError());
  }, [mutationError, dispatch]);


  // local editable project information form.
  const [projectForm, setProjectForm] = useState({ name: "", description: ""});

  // holds selected member ID for leadership transfer.
  const [newLeadId, setNewLeadId] = useState("");

  // member-search textbox value.
  const [memberSearchText, setMemberSearchText] = useState("");

  // search results from /api/projects/:id/member-search.
  const [memberSearchResults, setMemberSearchResults] = useState([]);

  // indicates whether more search results exist.
  const [memberSearchPagination, setMemberSearchPagination] = useState({ page: 1, hasMore: false, nextPage: null });

  
  const [memberSearchStatus, setMemberSearchStatus] = useState("idle"); // idle | loading | succeeded | failed
  const [memberSearchError,  setMemberSearchError]  = useState("");     // search-specific error message


  // load the complete selected project whenever :id changes.
  useEffect(() => {
    dispatch(fetchProjectById(projectId));
    return () => {
      dispatch(clearCurrentProject()); // prevent old project from flashing when navigating to another project
    };
  }, [dispatch, projectId]);


  // populate edit form whenever project data is refreshed.
  useEffect(() => {
    if (!project) {
      return;
    }
    setProjectForm({ name: project.name ?? "", description: project.description ?? ""});
    setNewLeadId("");
  }, [project]);


  // normalize logged-in user's MongoDB ID.
  const currentUserId = user?._id || user?.id;

  // normalize populated or plain leadUserId.
  const leadUserId = (typeof project?.leadUserId === "object") ? project.leadUserId?._id : project?.leadUserId;

  // determine whether logged-in user is the current project lead.
  const isProjectLead = (String(leadUserId) === String(currentUserId));

  // global admins receive management controls allowed by backend RBAC.
  const isGlobalAdmin = (user?.role === "admin");

  // lead or global admin may edit project details/member list.
  const canManageProject = (isProjectLead || isGlobalAdmin) && project?.archived !== true;

  // ONLY the project's stored lead may archive it.
  const canArchiveProject = isProjectLead && project?.archived !== true;

  // only global admins may permanently delete projects.
  const canDeleteProject = isGlobalAdmin;

  // extract populated members safely.
  const members = useMemo(() => (Array.isArray(project?.members) ? project.members : []), [project]);


  /* Database-wide member search.
   * Wait 350ms after typing so every keystroke DOES NOT create an API call.
   */
  useEffect(() => {
    const query = memberSearchText.trim();

    if (!canManageProject || query.length < 2) {
      setMemberSearchResults([]);
      setMemberSearchStatus("idle");
      setMemberSearchError("");
      return;
    }

    const timer = window.setTimeout( async () => {
          try {
            setMemberSearchStatus("loading");
            setMemberSearchError("");

            const response = await api.get(
                `/api/projects/${projectId}/member-search`,
                { params: {q: query, page: 1, limit: 10} }
              );

            setMemberSearchResults(response.data.users ?? []);

            setMemberSearchPagination(
              response.data.pagination ?? { page: 1, hasMore: false, nextPage: null }
            );

            setMemberSearchStatus("succeeded");
          }
          catch (error) {
            setMemberSearchStatus("failed");
            setMemberSearchError(error.response?.data?.error || "Unable to search registered users.");
          }
        },
        350 // debounce delay in milliseconds
      );

    return () => { window.clearTimeout(timer); };

  }, [canManageProject, memberSearchText, projectId]);



  const handleProjectFormChange = (event) => {   // update editable project form.

    const { name, value } = event.target;
    setProjectForm((current) => ({ ...current, [name]: value }));

    if (mutationError) {
      dispatch(clearProjectMutationError());
    }
  };



  const handleProjectUpdate = async (event) => {  // send only fields that actually changed.

    event.preventDefault();
    const projectUpdates = {};

    if (projectForm.name.trim() !== (project?.name ?? "").trim()) {
      projectUpdates.name = projectForm.name.trim();
    }

    if (projectForm.description.trim() !== (project?.description ?? "").trim()) {
      projectUpdates.description = projectForm.description.trim();
    }

    if (Object.keys(projectUpdates).length === 0) {
      //setSuccessMessage("No project changes to save.");
      NeutralMessageToast("No project changes to save."); // informational rather than success/failure
      return;
    }

    const resultAction = await dispatch(updateProject({projectId, projectUpdates}));

    if (updateProject.fulfilled.match(resultAction)) {
      SuccessMessageToast("Project details updated successfully.");
    }

  };


  const handleAddMember = async (userId) => { // add one registered user as a project member.

    const resultAction = await dispatch(updateProjectMembers({ projectId, add: [userId], remove: []}));

    if (updateProjectMembers.fulfilled.match(resultAction)) {

      SuccessMessageToast("Project member added successfully.");
      
      // refresh search so newly-added user becomes greyed out marked as an existing member.
      setMemberSearchText((current) => `${current} `);

      window.setTimeout(() => setMemberSearchText((current) => current.trim()), 0);
    }
  };


  const handleRemoveMember = async (memberId) => { // remove one existing member from project.
    const confirmed = window.confirm("Remove this member from the project?");

    if (!confirmed) {
      return;
    }

    const resultAction = await dispatch(updateProjectMembers({ projectId, add: [], remove: [memberId]}));

    if (updateProjectMembers.fulfilled.match(resultAction)) {
      SuccessMessageToast("Project member removed successfully.");
    }
  };


  const handleTransferLeadership = async (event) => {   // transfer leadership to an existing member.
    event.preventDefault();

    if (!newLeadId) {
      return;
    }

    const confirmed = window.confirm("Transfer project leadership to this member?");
    if (!confirmed) {
      return;
    }

    const resultAction =
      await dispatch(
        updateProject({
          projectId,
          projectUpdates: {
            leadUserId:
              newLeadId
          }
        })
      );

    if (updateProject.fulfilled.match(resultAction)) {
      SuccessMessageToast("Project leadership transferred successfully.");
      setNewLeadId("");
    }
  };


  // archive active project after explicit confirmation.
  const handleArchiveProject = async () => {

    const confirmed = window.confirm("Archive this project? It will become read-only until restored.");
    if (!confirmed) {
      return;
    }

    const resultAction = await dispatch(archiveProject(projectId));
    if (archiveProject.fulfilled.match(resultAction)) {
      SuccessMessageToast("Project archived successfully.");

      navigate("/projects"); // archived project will now appear under Archived tab
    }
  };


  const handleDeleteProject = async () => { // permanently delete project for global admins only.

    const confirmed = window.confirm("Permanently delete this project? This action cannot be undone.");

    if (!confirmed) {
      return;
    }

    const resultAction = await dispatch(deleteProject(projectId));

    if (deleteProject.fulfilled.match(resultAction)) {
      SuccessMessageToast("Project permanently deleted.");
      navigate("/projects", { replace: true});
    }
  };


  if (currentProjectStatus === "idle" || currentProjectStatus === "loading") {
    return (
      <main className="current-project-page">
        <section className="current-project-state-card">
          <div className="current-project-spinner" />
          <h2>Loading project</h2>
        </section>
      </main>
    );
  }

  if (currentProjectStatus === "failed") {
    return (
      <main className="current-project-page">
        <section className="current-project-state-card current-project-state-card--error">
          <h2>Project could not be loaded</h2>
          <p>{currentProjectError}</p>
          <Link to="/projects">Return to Projects</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="current-project-page">
      <div className="current-project-breadcrumb">
        <Link to="/projects">← Projects</Link>
      </div>
      {project.archived && (
        <div className="current-project-archive-banner" role="status">
          <strong>Archived Project</strong>
          <span>This project is read-only until the project lead restores it.</span>
        </div>
      )}

      <header className="current-project-heading">
        <div>
          <div className="current-project-title-row">
            <span className="current-project-key">{project.key}</span>
            {isProjectLead && (
              <span className="current-project-role-badge">Project Lead</span>
            )}
          </div>
          <h1>{project.name}</h1>
          <p>{project.description || "No project description has been added yet."}</p>
        </div>

        {/* Every project member may open and VIEW the project's issue board. */}
        <Link className="current-project-board-button" to={`/projects/${projectId}/board`}>
          View Issue Board →
        </Link>
      </header>

      <section className="current-project-grid">
        <article className="current-project-panel">
          <div className="current-project-panel-heading">
            <h2>Project Details</h2>
            <p>Basic project information visible to every member.</p>
          </div>

          {canManageProject ? (

            <form className="current-project-form" onSubmit={handleProjectUpdate}>
              <label>
                Project Name
                <input name="name" value={projectForm.name} onChange={handleProjectFormChange} required/>
              </label>

              <label>
                Description
                <textarea name="description" rows="5" value={projectForm.description} onChange={handleProjectFormChange}/>
              </label>
              <button
                type      = "submit"
                className = "current-project-primary-button"
                disabled  = { mutationStatus === "loading" }
              >
                Save Project Details
              </button>
            </form>

          ) : (

            <div className="current-project-readonly-details">
              <strong>Project Lead</strong>
              <span>
                {project.leadUserId?.firstName}{" "}
                {project.leadUserId?.lastName}{" "}
                (@{project.leadUserId?.username})
              </span>
            </div>
          )}
        </article>

        <article className="current-project-panel">
          <div className="current-project-panel-heading">
            <h2>Members ({members.length})</h2>
            <p>Users who currently have access to this project.</p>
          </div>

          <div className="current-project-member-list">
            {members.map((member) => {
              const memberIsLead = (String(member._id) === String(leadUserId));
              return (
                <div className="current-project-member-row" key={member._id}>
                  <div>
                    <strong>{member.firstName}{" "}{member.lastName}</strong>
                    <span>@{member.username}</span>
                  </div>

                  <div className="current-project-member-actions">
                    <span
                      className={
                        memberIsLead
                          ? "current-project-member-badge current-project-member-badge--lead"
                          : "current-project-member-badge"
                      }
                    >
                      {memberIsLead ? "Lead" : "Member"}
                    </span>


                    {canManageProject &&
                      !memberIsLead && (
                        <button
                          type="button"
                          className="current-project-remove-button"
                          onClick={() => handleRemoveMember(member._id)}
                        >
                          Remove
                        </button>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      {canManageProject && (
        <section className="current-project-panel current-project-management-panel">
          <div className="current-project-panel-heading">
            <h2>Add Members</h2>
            <p>
              Search registered BugTrack users by first name,
              last name, or username.
            </p>
          </div>

          <div className="current-project-member-search">
            <input
              type="search"
              value={memberSearchText}
              onChange={(event) => setMemberSearchText(event.target.value)
              }
              placeholder="Search users..."
            />

            {memberSearchText.trim().length === 1 && (
              <small>Enter at least 2 characters to search.</small>
            )}

            {memberSearchStatus === "loading" && (
              <p>Searching users...</p>
            )}

            {memberSearchError && (
              <p className="current-project-search-error">{memberSearchError}</p>
            )}


            {memberSearchStatus === "succeeded" &&
              memberSearchResults.length === 0 && (
                <div className="current-project-search-empty">No users found.</div>
              )}


            {memberSearchResults.length > 0 && (
              <div className="current-project-search-results">
                {memberSearchResults.map(
                  (searchUser) => (
                    <div
                      className={
                        searchUser.isProjectMember
                          ? "current-project-search-result current-project-search-result--member"
                          : "current-project-search-result"
                      }
                      key={searchUser._id}
                    >
                      <div>
                        <strong>{searchUser.firstName}{" "}{searchUser.lastName}</strong>
                        <span>@{searchUser.username}</span>
                      </div>

                      <button
                        type     = "button"
                        disabled = {searchUser.isProjectMember || mutationStatus === "loading"}
                        onClick  = {() => handleAddMember(searchUser._id)}
                      >
                        {searchUser.isProjectMember
                          ? ((searchUser.projectRole === "lead") ? "Project Lead" : "Already Added")
                          : "Add"}
                      </button>
                    </div>
                  )
                )}

                {memberSearchPagination.hasMore && (
                  <p className="current-project-search-more">
                    More matching users are available. Refine the
                    search to narrow the results.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {canManageProject && members.length > 1 && (
        <section className="current-project-panel current-project-management-panel">
          <div className="current-project-panel-heading">
            <h2>Transfer Leadership</h2>
            <p>Leadership may be transferred only to an existing project member.</p>
          </div>

          <form className="current-project-transfer-form" onSubmit={handleTransferLeadership}>
            <select
              value    = {newLeadId}
              onChange = {(event) => setNewLeadId(event.target.value)}
              required
            >
              <option value="">Select new project lead</option>

              {members
                .filter((member) => String(member._id) !== String(leadUserId))
                .map(
                  (member) => (
                    <option key={member._id} value={member._id}>
                      {member.firstName}{" "}
                      {member.lastName}{" "}
                      (@{member.username})
                    </option>
                  )
                )}
            </select>

            <button
              type      = "submit"
              className = "current-project-secondary-action-button"
              disabled  = {!newLeadId || mutationStatus === "loading"}
            >
              Transfer Leadership
            </button>
          </form>
        </section>
      )}

      {(canArchiveProject || canDeleteProject) && (
        <section className="current-project-danger-zone">
          <h2>Project Lifecycle</h2>

          {canArchiveProject && (
            <div className="current-project-danger-row">
              <div>
                <strong>Archive Project</strong>
                <p>
                  Makes the project read-only while preserving
                  members, issues, comments, and history.
                </p>
              </div>

              <button
                type      = "button"
                className = "current-project-archive-button"
                onClick   = {handleArchiveProject}
                disabled  = {mutationStatus === "loading"}
              >
                Archive Project
              </button>
            </div>
          )}

          {canDeleteProject && (
            <div className="current-project-danger-row">
              <div>
                <strong>Permanently Delete Project</strong>
                <p>
                  Global administrators only. This removes the
                  project permanently.
                </p>
              </div>

              <button
                type      = "button"
                className = "current-project-delete-button"
                onClick   = {handleDeleteProject}
                disabled  = {mutationStatus === "loading"}
              >
                Delete Project
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
};


export default CurrentProjectPage;