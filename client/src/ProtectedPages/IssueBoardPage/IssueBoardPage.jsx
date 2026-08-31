// src/ProtectedPages/IssueBoardPage/IssueBoardPage.jsx

import {
  useEffect, // loads project/issue data and performs route cleanup
  useMemo,   // calculates filtered/grouped issues efficiently
  useState   // stores local board filter selections
} from "react";

import {
  Link,      // provides link navigation back to  selected project
  useParams  // used to read project {:id} from /projects/:id/board
} from "react-router";

import {
  useDispatch, // sends project/issue Redux actions
  useSelector  // reads project, issue, and auth states
} from "react-redux";

import { DragDropProvider } from "@dnd-kit/react"; // used for coordinating draggable cards and workflow-column targets

import {
  PointerActivationConstraints,  // controls how far/long pointer must move before drag begins
  PointerSensor                  // handles mouse, pen, and touch dragging
} from "@dnd-kit/dom";

import {
  clearCurrentProject, // removes stale project after leaving board
  fetchProjectById     // loads selected project's name, members, archive state
} from "../../Store/projectSlice.jsx";

import {
  clearIssueBoard,          // clears old project issues 4-column board state when leaving board
  fetchProjectIssues,       // loads current project issues via "GET /projects/:pid/issues"
  optimisticMoveIssue,      // moves drag/drop issue immediately in Redux
  revertOptimisticIssueMove,// restores issue after rejected backend request
  transitionIssueStatus,    // persists workflow movement through existing backend endpoint via "POST /issues/:id/transition"
} from "../../Store/issueSlice.jsx";

import {
  ErrorMessageToast,   // failure/error toast notification
} from "../../utils/utilityFunctions.jsx";

import DraggableIssueCard   from "../../PageComponents/DraggableIssueCard/DraggableIssueCard.jsx";
import IssueDropColumn      from "../../PageComponents/IssueDropColumn/IssueDropColumn.jsx";
import "./IssueBoardPage.css";  // Four-column board styling

import {
  BOARD_COLUMNS,       // defines four board lanes and their order
  canTransitionStatus  // validates drag/drop workflow destinations
} from "../../utils/issueWorkflow.jsx";


/* Animates a backend-rejected optimistic move back to its ORIGINAL column.
 *
 * Technique:
 * 1. Measure where optimistic card currently appears.
 * 2. Redux restores old status, which moves the DOM card back.
 * 3. Measure the card's restored location.
 * 4. Temporarily translate restored card back over its rejected location.
 * 5. Animate that translation to zero.
 *
 * Result:
 *
 * target column
 *      ↓
 *   [CARD]
 *      ╲
 *       ╲ smoothly floats backward
 *        ╲
 *        original column
 */
const animateRejectedIssueBack = (issueId, rejectedPosition) => {
  if (!rejectedPosition) {
    return;
  }

  window.requestAnimationFrame(
    () => {
      const restoredCard = document.querySelector(`[data-issue-card-id="${issueId}"]`);

      if (!restoredCard) {
        return;
      }

      const restoredPosition = restoredCard.getBoundingClientRect();

      // calculates how far  DOM card moved when Redux restored its original workflow status.
      const translateX = rejectedPosition.left - restoredPosition.left;
      const translateY = rejectedPosition.top - restoredPosition.top;

      // web Animations API draws the card from its rejected location back toward its now-restored DOM position.
      restoredCard.animate(
        [
          {
            transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
            zIndex:    200,
            boxShadow: "0 14px 30px rgba(9, 30, 66, 0.22)"
          },
          {
            transform: "translate3d(0, 0, 0)",
            zIndex:    1,
            boxShadow: "0 2px 7px rgba(9, 30, 66, 0.08)"
          }
        ],
        {
          duration: 300, // short enough to feel responsive but visibly floats home
          easing:   "cubic-bezier(0.22, 0.8, 0.3, 1)"
        }
      );
    }
  );
};


/* Customize pointer dragging w/out removing dnd-kit's default KeyboardSensor.
 *
 * Mouse/pen: pointer must move 8px before a drag begins.
 * Touch:     hold briefly before dragging, while allowing a little finger movement.
 *
 * this makes normal clicks and scrolling less likely to accidentally turn into drag operations.
 */
const issueBoardSensors = (defaultSensors) => [

  // removes default immediately-activating PointerSensor.
  // KeyboardSensor and any other defaults remain untouched.
  ...defaultSensors.filter((sensor) => sensor !== PointerSensor),

  // add our customized pointer behavior back.
  PointerSensor.configure({ activationConstraints: (event) => {

      // Touchscreens need a different compromise since 
      // users commonly press/move slightly while intending to scroll.       
      if (event.pointerType === "touch") {
        return [
          new PointerActivationConstraints.Delay({
            value:     220,  // finger must remain down for ~0.22 sec before drag starts
            tolerance: 8     // small natural finger movement is tolerated
          })
        ];
      }

      // Mouse and pen:
      // A simple click causes virtually zero travel and therefore does NOT start dragging.
      return [
        new PointerActivationConstraints.Distance({value: 8})  // Pointer must travel at least 8 pixels
      ];
    }
  })
];


//=================================================================================================
//=================================================================================================
//    Below is ACTUAL Issue Board Page component
//=================================================================================================
//=================================================================================================
const IssueBoardPage = () => {

  const { id: projectId } = useParams();          // current project's MongoDB ID from /projects/:id/board.
  const dispatch          = useDispatch();        // redux dispatcher
  const {user}            = useSelector((state) => state.auth); // logged-in user determines board transition permissions.


  // selected project provides project name, members, lead, and archive state.
  const {
    currentProject: project,
    currentProjectStatus,
    currentProjectError
  } = useSelector((state) => state.projects);

  // issue-board redux state.
  const {
    issues,
    status: issueStatus,
    error: issueError,
    transitioningIssueId
  } = useSelector((state) => state.issues);


  const [searchText     , setSearchText     ] = useState("");    // free-text board search.
  const [priorityFilter , setPriorityFilter ] = useState("all"); // priority quick filter.
  const [typeFilter     , setTypeFilter     ] = useState("all"); // issue-type quick filter.

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

  const currentUserId = user?._id || user?.id;   // normalize authenticated user ID.

  const projectLeadId =   // normalize populated or plain project lead ID.
    (typeof project?.leadUserId === "object")
      ? project.leadUserId?._id
      : project?.leadUserId;


  const isGlobalAdmin = (user?.role === "admin");  // determine global application role.


  // determine selected-project leadership.
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


    // register lead separately in case lead is not duplicated in members array.
    registerUser(project?.leadUserId);

    // register every populated project member.
    (Array.isArray(project?.members) ? project.members : []).forEach(registerUser);

    return userMap;
  }, [project]);


  const getAssigneeName = (issue) => { // resolve one issue's assignee into readable UI text.
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
   * backend still makes final decision.
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


  const issuesByStatus = useMemo(() => {   // group filtered collection into four workflow columns.

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
   * Drag-and-drop will later call this same Redux thunk rather than inventing a second transition system.
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
      return;
    }

    ErrorMessageToast(resultAction.payload || "Unable to change issue status.");
  };


 /* Handles mouse/touch/keyboard drag/drop workflow movement.
  *
  * Existing arrow controls remain available, so drag/drop is a
  * progressive enhancement rather than only way to move an issue.
  */
  const handleDragEnd = async (event) => {
    const { operation, canceled } = event;

    if (canceled) {   // escape/cancelled drag naturally returns card home.
      return;
    }

    const { source, target } = operation;

   /* No valid drop target means the issue was released:
    * + outside the board; OR
    * + over an invalid workflow column.
    *
    * We DON'T change Redux.
    * dnd-kit therefore performs its normal drop-back animation and the
    * card visually floats back into its original location.
    */
    if (!source || !target) {
      return;
    }

    const draggedIssue = source.data?.issue;

    if (!draggedIssue) {
      return;
    }

    const issueId      = String(draggedIssue._id);
    const fromStatus   = source.data?.fromStatus || draggedIssue.status;
    const targetStatus = target.data?.status || String(target.id).replace("issue-column:", "");


    if (fromStatus === targetStatus) {  // dropping back into same column is simply a no-op.
      return;
    }

   /* Defense-in-depth check:
    * IssueDropColumn already rejects invalid destinations, but checking
    * again here prevents accidental future UI changes from bypassing
    * client workflow map.
    */
    if (!canTransitionStatus(fromStatus, targetStatus)) {
      NeutralMessageToast("That workflow transition is not available.");
      return;
    }

    // Don't trust drag/drop alone for permissions:
    // Backend will check again, but avoiding an unnecessary request gives users faster feedback.
    if (!userCanTransitionIssue(draggedIssue)) {
      ErrorMessageToast("You do not have permission to move this issue.");
      return;
    }

    // OPTIMISTIC UPDATE:
    // move the card immediately so the board feels responsive.
    dispatch(optimisticMoveIssue({ issueId, to: targetStatus }));

    // persist the SAME transition through backend endpoint already used by your arrow buttons.
    const resultAction = await dispatch(transitionIssueStatus({ issueId, to: targetStatus }));

    // -------------------------------------------------------------------
    // Backend accepted the drag/drop
    // -------------------------------------------------------------------
    if (transitionIssueStatus.fulfilled.match(resultAction)) {
      return;
    }


    // -------------------------------------------------------------------
    // Backend rejected the optimistic move
    // -------------------------------------------------------------------
    
    // At this point, optimistic card is visually sitting inside target column.
    // measure THAT position before Redux restores the original status.
    const rejectedCard     = document.querySelector(`[data-issue-card-id="${issueId}"]`);
    const rejectedPosition = rejectedCard ? rejectedCard.getBoundingClientRect() : null;

    // Restore the original status.
    // This immediately places the issue back into its original column.
    dispatch(revertOptimisticIssueMove({ issueId, from: fromStatus }));

    // Animate from rejected visual position towards restored
    // source position so card appears to "magically float back."
    animateRejectedIssueBack(issueId, rejectedPosition);

    ErrorMessageToast(resultAction.payload || "The issue could not be moved and was returned to its previous column.");
  };

  const handleClearFilters = () => {  // reset every board filter to default state.
    setSearchText("");
    setPriorityFilter("all");
    setTypeFilter("all");
    setAssigneeFilter("all");
  };

  const filtersAreActive =          // determine whether any filter is currently active.
    searchText.trim() !== "" ||
    priorityFilter !== "all" ||
    typeFilter !== "all" ||
    assigneeFilter !== "all";


  // loading project and issues together prevents board from showing incomplete header/permission information.
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
              dispatch(fetchProjectById(projectId));
              dispatch(fetchProjectIssues(projectId));
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
            <span className="issue-board-project-key">{project?.key}</span>
            <h1>{project?.name}</h1>
          </div>
          <p>Track issues through the project's four-stage workflow.</p>
        </div>

        <div className="issue-board-heading-actions">
          <div className="issue-board-heading-summary">
            <strong>{filteredIssues.length}</strong>
            <span>of {issues.length} issues shown</span>
          </div>

          {/*  Any member who can access an ACTIVE project may create an issue.
            *  Archived projects deliberately do not expose the mutation action.
            */}
          {!project?.archived && (
            <Link className="issue-board-create-button" to={`/projects/${projectId}/issues/new`}>
              + Create Issue
            </Link>
          )}
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
            <option value = "all">All priorities</option>
            <option value = "critical">Critical</option>
            <option value = "high">High</option>
            <option value = "medium">Medium</option>
            <option value = "low">Low</option>
          </select>
        </div>

        <div className="issue-board-filter">
          <label htmlFor="issue-type-filter">Type</label>
          <select
            id       = "issue-type-filter"
            value    = {typeFilter}
            onChange = {(event) => setTypeFilter(event.target.value)}
          >
            <option value = "all"  >All types</option>
            <option value = "bug"  >Bugs</option>
            <option value = "task" >Tasks</option>
            <option value = "story">Stories</option>
          </select>
        </div>

        <div className="issue-board-filter">
          <label htmlFor="issue-assignee-filter">Assignment</label>
          <select
            id="issue-assignee-filter"
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
          >
            <option value = "all"       >All issues</option>
            <option value = "mine"      >Only my issues</option>
            <option value = "unassigned">Unassigned</option>
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

      {/* horizontal Kanban-style workflow board. */}
      <DragDropProvider
        sensors   = {issueBoardSensors} // adds click-vs-drag activation thresholds
        onDragEnd = {handleDragEnd}   // persists or reverts the completed movement
      >
        <section
          className  = "issue-board-scroll-container"
          aria-label = "Issue workflow board"
        >
          <div className="issue-board-columns">
            {BOARD_COLUMNS.map(
              (column) => {
                const columnIssues = issuesByStatus[column.status] ?? [];

                return (
                  <IssueDropColumn
                    key={column.status}
                    column={column}
                    issueCount={columnIssues.length}
                    filtersAreActive={filtersAreActive}
                  >
                    {columnIssues.map((issue) => {
                        const canTransition   = userCanTransitionIssue(issue);
                        const isTransitioning = (String(transitioningIssueId) === String(issue._id));

                        return (
                          <DraggableIssueCard
                            key             = {issue._id}
                            issue           = {issue}
                            assigneeName    = {getAssigneeName(issue)}
                            canTransition   = {canTransition}
                            projectArchived = {project?.archived === true}
                            isTransitioning = {isTransitioning}
                            onTransition    = {handleTransition}
                            detailsPath     = {`/projects/${projectId}/issues/${issue._id}`}
                          />
                        );
                      }
                    )}
                  </IssueDropColumn>
                );
              }
            )}
          </div>
        </section>
      </DragDropProvider>
    </main>
  );
};

export default IssueBoardPage;