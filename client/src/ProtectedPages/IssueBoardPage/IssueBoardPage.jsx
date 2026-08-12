// src/ProtectedPages/IssueBoardPage/IssueBoardPage.jsx

import {
  useEffect, // Loads project/issue data and performs route cleanup
  useMemo,   // Calculates filtered/grouped issues efficiently
  useState   // Stores local board filter selections
} from "react";

import {
  Link,      // Provides link navigation back to  selected project
  useParams  // Used to read project {:id} from /projects/:id/board
} from "react-router";

import {
  useDispatch, // Sends project/issue Redux actions
  useSelector  // Reads project, issue, and auth states
} from "react-redux";

import {
  clearCurrentProject, // Removes stale project after leaving board
  fetchProjectById     // Loads selected project's name, members, archive state
} from "../../Store/projectSlice.jsx";

import {
  clearIssueBoard,        // Clears issue collection when leaving board
  fetchProjectIssues,     // GET /projects/:pid/issues
  transitionIssueStatus   // POST /issues/:id/transition
} from "../../Store/issueSlice.jsx";

import {
  ErrorMessageToast,   // failure/error toast notification
  SuccessMessageToast  // successful toast notification
} from "../../utils/utilityFunctions.jsx";

import IssueBoardCard from "../../PageComponents/IssueBoardCard/IssueBoardCard.jsx";
import "./IssueBoardPage.css"; // Four-column board styling


// Fixed workflow columns for this simplified tracker.
// Their order is deliberate and matches the normal issue lifecycle.
const BOARD_COLUMNS = [
  {
    status: "open",
    title: "Open",
    description: "Reported work waiting to begin."
  },
  {
    status: "in_progress",
    title: "In Progress",
    description: "Work currently being investigated or implemented."
  },
  {
    status: "ready_for_review",
    title: "Ready for Review",
    description: "Completed work awaiting final verification."
  },
  {
    status: "closed",
    title: "Closed",
    description: "Finished and accepted work."
  }
];


const IssueBoardPage = () => {

  const { id: projectId } = useParams(); // Current project's MongoDB ID from /projects/:id/board.

  const dispatch =useDispatch(); // Redux dispatcher

  const {user} = useSelector((state) => state.auth); // Logged-in user determines board transition permissions.


  // Selected project provides project name, members, lead, and archive state.
  const {
    currentProject: project,
    currentProjectStatus,
    currentProjectError
  } = useSelector((state) => state.projects);

  // Issue-board Redux state.
  const {
    issues,
    status: issueStatus,
    error: issueError,
    transitioningIssueId
  } = useSelector((state) => state.issues);

  
  const [searchText, setSearchText] = useState(""); // Free-text board search.

  const [priorityFilter, setPriorityFilter] = useState("all"); // Priority quick filter.

  const [typeFilter, setTypeFilter] = useState("all");   // Issue-type quick filter.


  /* Assignment filter:
   * all        → every issue
   * mine       → issues assigned to logged-in user
   * unassigned → issues without an assignee
   */
  const [assigneeFilter, setAssigneeFilter] = useState("all");


  /* Load both:
   * 1. selected project details; and
   * 2. selected project's issue collection.
   */
  useEffect(() => {

    dispatch(fetchProjectById(projectId));
    dispatch(fetchProjectIssues(projectId));

    return () => {
      /* Clear route-specific state when leaving board.
       *
       * This prevents old project/issues flashing when another
       * project's board is opened later.
       */
      dispatch(clearIssueBoard());
      dispatch(clearCurrentProject());
    };
  }, [dispatch, projectId]);


  const currentUserId = user?._id || user?.id;   // Normalize authenticated user ID.


  // Normalize populated or plain project lead ID.
  const projectLeadId =
    (typeof project?.leadUserId === "object")
      ? project.leadUserId?._id
      : project?.leadUserId;


  const isGlobalAdmin = (user?.role === "admin");   // Determine global application role.


  // Determine selected-project leadership.
  const isProjectLead = (String(projectLeadId) === String(currentUserId));


  /* Building a lookup map:
   * userId → "Johnny Smith (@JWilly)"
   *
   * Project endpoint already provides populated project members.
   * Hence, board cards can show actual identities rather than ObjectIds.
   */
  const projectUserMap = useMemo(() => {

    const userMap = new Map();

    const registerUser = (projectUser) => {

      if (
        !projectUser ||
        typeof projectUser !== "object" ||
        !projectUser._id
      ) {
        return;
      }

      const fullName =
        `${projectUser.firstName ?? ""} ${projectUser.lastName ?? ""}`
          .trim();

      const displayName =
        fullName
          ? `${fullName} (@${projectUser.username})`
          : `@${projectUser.username}`;


      userMap.set(String(projectUser._id), displayName);
    };


    // Register lead separately in case lead is not duplicated in members array.
    registerUser(project?.leadUserId);

    // Register every populated project member.
    (Array.isArray(project?.members) ? project.members : []).forEach(registerUser);

    return userMap;
  }, [project]);


  // Resolve one issue's assignee into readable UI text.
  const getAssigneeName = (issue) => {
    if (!issue.assigneeId) {
      return "Unassigned";
    }

    /* Support either:
     * assigneeId: "ObjectId"
     *
     * or a future populated assignee object.
     */
    if (typeof issue.assigneeId === "object") {
      const fullName =
        `${issue.assigneeId.firstName ?? ""} ${issue.assigneeId.lastName ?? ""}`
          .trim();

      return fullName
        ? `${fullName} (@${issue.assigneeId.username})`
        : `@${issue.assigneeId.username}`;
    }

    return (projectUserMap.get(String(issue.assigneeId)) || "Assigned member");
  };


  /* Determine whether current user should SEE status controls.
   *
   * Mirrors your backend's general issue editing rule:
   * + global admin; OR
   * + project lead; OR
   * + member who is reporter/assignee.
   *
   * The backend still makes final decision.
   */
  const userCanTransitionIssue = (issue) => {
    if (project?.archived === true) {
      return false; // Archived projects remain read-only
    }

    if (isGlobalAdmin || isProjectLead) {
      return true;
    }

    const reporterId =
      (typeof issue.reporterId === "object")
        ? issue.reporterId?._id
        : issue.reporterId;

    const assigneeId =
      (typeof issue.assigneeId === "object")
        ? issue.assigneeId?._id
        : issue.assigneeId;

    return (
      (String(reporterId) === String(currentUserId))
      ||
      (String(assigneeId) === String(currentUserId))
    );
  };


  /* Apply board-wide quick filters locally.
   *
   * Filtering one already-loaded issue collection lets all four
   * columns update immediately without making repeated network requests.
   */
  const filteredIssues = useMemo(() => {

    const normalizedSearch = searchText.trim().toLowerCase();

    return issues.filter((issue) => {

        // ---------------------------------------------------------------
        // Search filter
        // ---------------------------------------------------------------
        if (normalizedSearch) {

          const searchableText = [
            issue.key,
            issue.title,
            ...(Array.isArray(issue.labels)
              ? issue.labels
              : [])
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();


          if (!searchableText.includes(normalizedSearch)) {
            return false;
          }
        }


        // ---------------------------------------------------------------
        // Priority filter
        // ---------------------------------------------------------------

        const normalizedPriority = String(issue.priority ?? "").trim().toLowerCase();

        if (priorityFilter !== "all" && normalizedPriority !== priorityFilter) {
          return false;
        }

        // ---------------------------------------------------------------
        // Type filter
        // ---------------------------------------------------------------
        if (typeFilter !== "all" && issue.type !== typeFilter) {
          return false;
        }

        // ---------------------------------------------------------------
        // Assignee quick filter
        // ---------------------------------------------------------------
        const assigneeId =
          (typeof issue.assigneeId === "object")
            ? issue.assigneeId?._id
            : issue.assigneeId;

        if (
          assigneeFilter === "mine" &&
          String(assigneeId) !==
            String(currentUserId)
        ) {
          return false;
        }

        if (assigneeFilter === "unassigned" && issue.assigneeId) {
          return false;
        }

        return true;
      }
    );

  }, [
    issues,
    searchText,
    priorityFilter,
    typeFilter,
    assigneeFilter,
    currentUserId
  ]);


  // Group the filtered collection into the four workflow columns.
  const issuesByStatus = useMemo(() => {

    const grouped = {
      open: [],
      in_progress: [],
      ready_for_review: [],
      closed: []
    };


    filteredIssues.forEach((issue) => {
        if (grouped[issue.status]) {
          grouped[issue.status].push(issue);
        }
      }
    );

    return grouped;

  }, [filteredIssues]);


  /* Explicit status-change handler.
   *
   * Drag-and-drop will later call this same Redux thunk 
   * rather than inventing a second transition system.
   */
  const handleTransition = async (issue, targetStatus) => {

    const resultAction =
      await dispatch(
        transitionIssueStatus({
          issueId: issue._id,
          to: targetStatus
        })
      );


    if (transitionIssueStatus.fulfilled.match(resultAction)) {
      const targetColumn = BOARD_COLUMNS.find((column) => column.status === targetStatus);
      SuccessMessageToast(`${issue.key} moved to ${targetColumn?.title ?? targetStatus}.`);
      return;
    }

    ErrorMessageToast(resultAction.payload || "Unable to change issue status.");
  };


 
  const handleClearFilters = () => {  // Reset every board filter to default state.
    setSearchText("");
    setPriorityFilter("all");
    setTypeFilter("all");
    setAssigneeFilter("all");
  };


  
  const filtersAreActive =          // Determine whether any filter is currently active.
    searchText.trim() !== "" ||
    priorityFilter !== "all" ||
    typeFilter !== "all" ||
    assigneeFilter !== "all";


  /* Loading project and issues together prevents board 
   * from showing incomplete header/permission information.
   */
  if (
    currentProjectStatus === "idle" ||
    currentProjectStatus === "loading" ||
    issueStatus === "idle" ||
    issueStatus === "loading"
  ) {
    return (
      <main className="issue-board-page">
        <section className="issue-board-state-card">
          <div className="issue-board-spinner" />
          <h2>Loading issue board</h2>
          <p>Retrieving the project's current workflow.</p>
        </section>
      </main>
    );
  }

  // Full-page failure is more useful than a temporary toast here.
  if (currentProjectStatus === "failed" || issueStatus === "failed") {
    return (
      <main className="issue-board-page">
        <section className="issue-board-state-card issue-board-state-card--error" role="alert">
          <h2>Issue board could not be loaded</h2>
          <p>{currentProjectError || issueError}</p>

          <button
            type="button"
            onClick={() => {
              dispatch(
                fetchProjectById(
                  projectId
                )
              );
              dispatch(
                fetchProjectIssues(
                  projectId
                )
              );
            }}
          >
            Try Again
          </button>

          <Link to={`/projects/${projectId}`}>Return to Project</Link>
        </section>
      </main>
    );
  }


  return (
    <main className="issue-board-page">

      {/* Breadcrumb back to project management/details. */}
      <div className="issue-board-breadcrumb">
        <Link to={`/projects/${projectId}`}>
          ← {project?.key} Project
        </Link>
      </div>

      {/* Project/board heading. */}
      <header className="issue-board-heading">
        <div>
          <p className="issue-board-eyebrow">Project Board</p>
          <div className="issue-board-title-row">
            <span className="issue-board-project-key">
              {project?.key}
            </span>
            <h1>{project?.name}</h1>
          </div>
          <p>Track issues through the project's four-stage workflow.</p>
        </div>

        <div className="issue-board-heading-summary">
          <strong>{filteredIssues.length}</strong>
          <span>of {issues.length} issues shown</span>
        </div>
      </header>

      {/* Archived projects retain their board but prohibit mutation. */}
      {project?.archived && (
        <div className="issue-board-archive-banner" role="status">
          <strong>Archived project</strong>
          <span>Issues remain visible, but workflow transitions are disabled.</span>
        </div>
      )}

      {/* Board-level quick filters. */}
      <section className="issue-board-toolbar" aria-label="Issue board filters">
        <div className="issue-board-search">
          <label htmlFor="issue-board-search">Search</label>
          <input
            id="issue-board-search"
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)
            }
            placeholder="Search key, title, or label..."
          />
        </div>

        <div className="issue-board-filter">
          <label htmlFor="issue-priority-filter">Priority</label>
          <select
            id="issue-priority-filter"
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
          >
            <option value="all">
              All priorities
            </option>
            <option value="critical">
              Critical
            </option>
            <option value="high">
              High
            </option>
            <option value="medium">
              Medium
            </option>
            <option value="low">
              Low
            </option>
          </select>
        </div>

        <div className="issue-board-filter">
          <label htmlFor="issue-type-filter">
            Type
          </label>
          <select
            id="issue-type-filter"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">
              All types
            </option>
            <option value="bug">
              Bugs
            </option>
            <option value="task">
              Tasks
            </option>
            <option value="story">
              Stories
            </option>
          </select>
        </div>

        <div className="issue-board-filter">
          <label htmlFor="issue-assignee-filter">
            Assignment
          </label>
          <select
            id="issue-assignee-filter"
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
          >
            <option value="all">
              All issues
            </option>
            <option value="mine">
              Only my issues
            </option>
            <option value="unassigned">
              Unassigned
            </option>
          </select>
        </div>

        {filtersAreActive && (
          <button
            className="issue-board-clear-filters"
            type="button"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>
        )}
      </section>

      {/* Horizontal Kanban-style workflow board. */}
      <section
        className="issue-board-scroll-container"
        aria-label="Issue workflow board"
      >
        <div className="issue-board-columns">
          {BOARD_COLUMNS.map(
            (column) => {
              const columnIssues = issuesByStatus[column.status] ?? [];

              return (
                <section
                  className={`issue-board-column issue-board-column--${column.status}`}
                  key={column.status}
                  aria-label={`${column.title} issues`}
                >

                  {/* Column heading remains visible above issue cards. */}
                  <header className="issue-board-column-heading">
                    <div>
                      <h2>{column.title}</h2>
                      <p>{column.description}</p>
                    </div>
                    <span
                      className="issue-board-column-count"
                      aria-label={`${columnIssues.length} issues`}
                    >
                      {columnIssues.length}
                    </span>
                  </header>

                  <div className="issue-board-column-cards">
                    {columnIssues.length === 0 ? (
                      <div className="issue-board-column-empty">
                        {filtersAreActive ? "No matching issues" : "No issues in this stage"}
                      </div>
                    ) : (
                      columnIssues.map((issue) => (
                          <IssueBoardCard
                            key={issue._id}
                            issue={issue}
                            assigneeName={getAssigneeName(issue)}
                            canTransition={userCanTransitionIssue(issue)}
                            projectArchived={project?.archived === true}
                            isTransitioning={(String(transitioningIssueId) === String(issue._id))}
                            onTransition={handleTransition}
                          />
                        )
                      )
                    )}
                  </div>
                </section>
              );
            }
          )}
        </div>
      </section>
    </main>
  );
};

export default IssueBoardPage;