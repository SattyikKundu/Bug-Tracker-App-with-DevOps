// src/ProtectedPages/IssueFormPage/IssueFormPage.jsx

import {
  useEffect, // Executes code outside normal program flow based on conditions/triggers
  useMemo,   // Calculates and store results wtihout unnecessary recalculation
  useState   // Used to store issue-form input values and local validation messages
} from "react";

import {
  Link,        // provides clickable navigation link
  useNavigate, // provides progammatic navigation/redirects (for our successful issue creation)
  useParams    // extracts params from URL (projectId and optional issueId from URL)
} from "react-router";

import {
  useDispatch, // Used to dispatch Redux issue/project thunks
  useSelector  // Used to read/edit slice state information
} from "react-redux";

import { fetchProjectById } from "../../Store/projectSlice.jsx"; // Loads project lead/member/archive information

import {
  clearCurrentIssue,     // Prevents old issue data from leaking into another edit page
  createIssue,           // From backend: (POST /projects/:projectId/issues)
  fetchIssueById,        // From backend: (GET /issues/:issueId)
  updateIssue            // From backend: (PATCH /issues/:issueId)
} from "../../Store/issueSlice.jsx";

import api from "../../api/axios.js"; // Used for the project-specific assignable-user dropdown

import {
  ErrorMessageToast,   // Used to show backend failure toasts
  SuccessMessageToast  // Displays successful issue create/edit results
} from "../../utils/utilityFunctions.jsx";

import "./IssueFormPage.css"; // Shared create/edit issue form styling


// Values exactly match the backend issue-model enums.
const ISSUE_TYPES = [
  { value: "bug",   label: "Bug"   },
  { value: "task",  label: "Task"  },
  { value: "story", label: "Story" }
];

const ISSUE_PRIORITIES = [
  { value: "low",      label: "Low"      },
  { value: "medium",   label: "Medium"   },
  { value: "high",     label: "High"     },
  { value: "critical", label: "Critical" }
];

const ISSUE_SEVERITIES = [
  { value: "minor",    label: "Minor"    },
  { value: "major",    label: "Major"    },
  { value: "critical", label: "Critical" }
];


const IssueFormPage = () => {

  const {
    projectId, // Parent project where the issue lives
    issueId    // Present only when editing an existing issue
  } = useParams();

  const dispatch = useDispatch(); // Redux dispatcher
  const navigate = useNavigate(); // Programmatic route navigation

  /* issueId exists:
   * → edit mode
   *
   * issueId does not exist:
   * → create mode
   */
  const isEditMode = Boolean(issueId);

  const { user } = useSelector((state) => state.auth);  // 'user' Used to determine lead/admin reassignment permissions

  const {
    currentProject: project,
    currentProjectStatus,
    currentProjectError
  } = useSelector((state) => state.projects);

  const {
    currentIssue,
    currentIssueStatus,
    currentIssueError,
    saveStatus
  } = useSelector((state) => state.issues);


  /* Form values.
   *
   * Status is intentionally absent:
   * workflow status belongs to the board transition system.
   */
  const [formData, setFormData] =
    useState({
      title: "",
      description: "",
      type: "bug",
      priority: "medium",
      severity: "major",
      assigneeId: "",
      labelsText: ""
    });

  // Users returned by GET /projects/:id/assignable-users.
  const [assignableUsers,   setAssignableUsers] = useState([]);
  const [assignableStatus, setAssignableStatus] = useState("idle"); // idle | loading | succeeded | failed
  const [assignableError,   setAssignableError] = useState("");     // Error shown beside assignee control
  const [validationError,   setValidationError] = useState("");     // Browser-side form validation message

  /* Load the selected project.
   *
   * Needed for:
   * + archive status;
   * + lead permissions;
   * + project heading;
   * + assignment-edit permissions.
   */
  useEffect(() => {
    dispatch(fetchProjectById(projectId));
  }, [ dispatch, projectId]);

  
  // Edit mode additionally loads the existing issue.
  useEffect(() => {
    if (!isEditMode) {
      dispatch(clearCurrentIssue());
      return;
    }

    dispatch(fetchIssueById(issueId));

    return () => {
      dispatch(clearCurrentIssue());
    };
  }, [dispatch, isEditMode, issueId]);


  /* Load the ONLY users who may be assigned issues in this project.
   *
   * This uses the backend endpoint you already created specifically
   * for issue-assignee dropdowns.
   */
  useEffect(() => {
    let requestStillActive = true;

    const loadAssignableUsers =
      async () => {

        try {
          setAssignableStatus("loading");
          setAssignableError("");

          const response = await api.get(`/projects/${projectId}/assignable-users`);

          if (!requestStillActive) {
            return;
          }

          setAssignableUsers(response.data.users ?? []);

          setAssignableStatus("succeeded");
        }
        catch (error) {
          if (!requestStillActive) {
            return;
          }
          setAssignableStatus("failed");
          setAssignableError(error.response?.data?.error || "Unable to load assignable project users.");
        }
      };

    loadAssignableUsers();

    return () => {
      requestStillActive = false;
    };
  }, [projectId]);


  // Populate edit mode after GET /issues/:issueId succeeds.
  useEffect(() => {
    if (!isEditMode || !currentIssue) {
      return;
    }

    const currentAssigneeId =
      typeof currentIssue.assigneeId === "object"
        ? currentIssue.assigneeId?._id
        : currentIssue.assigneeId;

    setFormData({
      title:          currentIssue.title ?? "",
      description:    currentIssue.description ?? "",
      type:           currentIssue.type ?? "bug",
      priority:       String(currentIssue.priority ?? "medium").trim(),
      severity:       currentIssue.severity ?? "major",
      assigneeId:     currentAssigneeId ? String(currentAssigneeId) : "",

      // Convert stored label array back into an editable comma-separated text field.
      labelsText:
        Array.isArray(currentIssue.labels)
          ? currentIssue.labels.join(", ")
          : ""
    });
  }, [ isEditMode, currentIssue ]);


  // Normalize authenticated user's MongoDB ID.
  const currentUserId = user?._id || user?.id;


  // Normalize populated/plain project lead ID.
  const leadUserId =
    typeof project?.leadUserId === "object"
      ? project.leadUserId?._id
      : project?.leadUserId;


  const isProjectLead = (String(leadUserId) === String(currentUserId));
  const isGlobalAdmin = user?.role === "admin";


  /* IMPORTANT permission distinction:
   *
   * CREATE: any project member may choose an assignee.
   *
   * EDIT: only project lead/global admin may assign/reassign/unassign.
   */
  const canManageAssignee = !isEditMode || isProjectLead || isGlobalAdmin;

  /* Convert comma-separated labels into the normalized array expected
   * by the backend.
   *
   * Example: "Frontend, Login, frontend"
   *
   * becomes: ["frontend", "login"]
   */
  const normalizedLabels =
    useMemo(() => {
      return [
        ...new Set(
          formData.labelsText
            .split(",")
            .map(
              (label) =>
                label
                  .trim()
                  .toLowerCase()
            )
            .filter(Boolean)
        )
      ];
    }, [ formData.labelsText ]);


  /* Resolve the currently selected assignee into readable text.
   *
   * Useful for regular members in Edit mode where assignee changing
   * is intentionally disabled.
   */
  const selectedAssignee =
    useMemo(() => {

      return assignableUsers.find(
        (assignableUser) =>
          String(assignableUser._id) ===
          String(formData.assigneeId)
      );

    }, [ assignableUsers, formData.assigneeId]);


  const selectedAssigneeName =
    selectedAssignee
      ? `${selectedAssignee.firstName ?? ""} ${selectedAssignee.lastName ?? ""}`.trim()
      : "";


  // Update one normal form field.
  const handleInputChange = (event) => {
    const {name, value} = event.target;
    setFormData((current) => ({...current, [name]: value}));
    setValidationError("");
  };


  const handleSubmit =
    async (event) => {
      event.preventDefault();

      // ---------------------------------------------------------------
      // Local validation
      // ---------------------------------------------------------------
      if (!formData.title.trim()) {
        setValidationError("Issue title is required.");
        return;
      }

      if (formData.title.trim().length > 200) {
        setValidationError("Issue title cannot exceed 200 characters.");
        return;
      }


      // These values come from <select> elements, but validating them
      // again prevents unexpected browser/dev-tools input.
      if (
        !ISSUE_TYPES.some(
          (option) =>
            option.value === formData.type
        )
      ) {
        setValidationError("Select a valid issue type.");
        return;
      }


      if (
        !ISSUE_PRIORITIES.some((option) =>
            option.value === formData.priority
        )
      ) {
        setValidationError("Select a valid priority.");
        return;
      }


      if (!ISSUE_SEVERITIES.some((option) => option.value === formData.severity)) {
        setValidationError("Select a valid severity.");
        return;
      }

      // Empty string in the UI becomes backend null = Unassigned.
      const normalizedAssigneeId =
        formData.assigneeId ? formData.assigneeId : null;


      // ---------------------------------------------------------------
      // CREATE
      // ---------------------------------------------------------------
      if (!isEditMode) {
        const resultAction =
          await dispatch(
            createIssue({

              projectId,

              issueData: {
                title:
                  formData.title.trim(),
                description:
                  formData.description.trim(),
                type:
                  formData.type,
                priority:
                  formData.priority,
                severity:
                  formData.severity,
                assigneeId:
                  normalizedAssigneeId,
                labels:
                  normalizedLabels
              }
            })
          );

        if (createIssue.fulfilled.match(resultAction)) {

          SuccessMessageToast(`${resultAction.payload.key} created successfully.`);

          navigate(`/projects/${projectId}/board`);
          return;
        }

        ErrorMessageToast(resultAction.payload || "Unable to create issue.");

        return;
      }


      // ---------------------------------------------------------------
      // EDIT
      // ---------------------------------------------------------------
      const issueUpdates = {};

      // PATCH semantics: send only values that actually changed.
      if (formData.title.trim() !== (currentIssue?.title ?? "").trim()) {
        issueUpdates.title = formData.title.trim();
      }

      if (formData.description.trim() !== (currentIssue?.description ?? "").trim()) {
        issueUpdates.description = formData.description.trim();
      }

      if (formData.type !== currentIssue?.type) {
        issueUpdates.type = formData.type;
      }

      if (formData.priority !== String(currentIssue?.priority ?? "").trim()) {
        issueUpdates.priority = formData.priority;
      }

      if (formData.severity !== currentIssue?.severity) {
        issueUpdates.severity = formData.severity;
      }


      const oldLabels =
        Array.isArray(currentIssue?.labels)
          ? currentIssue.labels
              .map(
                (label) =>
                  String(label)
                    .trim()
                    .toLowerCase()
              )
              .sort()
          : [];

      const newLabels = [...normalizedLabels].sort();

      if (JSON.stringify(oldLabels) !== JSON.stringify(newLabels)) {
        issueUpdates.labels = normalizedLabels;
      }

      /* Only lead/admin may send assigneeId during an EDIT.
       *
       * Regular reporters/assignees can edit their permitted fields,
       * but this field is deliberately omitted from their PATCH body.
       */
      if (canManageAssignee) {
        const currentAssigneeId =
          typeof currentIssue?.assigneeId === "object"
            ? currentIssue.assigneeId?._id
            : currentIssue?.assigneeId;

        const normalizedCurrentAssignee =
          currentAssigneeId ? String(currentAssigneeId): null;

        if (normalizedAssigneeId !== normalizedCurrentAssignee) {
          issueUpdates.assigneeId = normalizedAssigneeId;
        }
      }

      if (Object.keys(issueUpdates).length === 0) {

        // Informational rather than success/error:
        // nothing actually needed to be sent.
        import("../../utils/utilityFunctions.jsx")
          .then(({ NeutralMessageToast }) => {
              NeutralMessageToast("No issue changes to save.");
            }
          );
        return;
      }

      const resultAction = await dispatch(updateIssue({ issueId, issueUpdates}));

      if (updateIssue.fulfilled.match(resultAction)) {
        SuccessMessageToast(`${resultAction.payload.key} updated successfully.`);

        navigate(`/projects/${projectId}/issues/${issueId}`); // Return to issue's normal read-first Details page after editing
        return;
      }

      ErrorMessageToast(resultAction.payload || "Unable to update issue.");
    };

  // Loading project information is mandatory in both modes. 
  const projectLoading =
    currentProjectStatus === "idle" ||
    currentProjectStatus === "loading";


  // Existing issue additionally needs to load in Edit mode.
  const issueLoading =
    isEditMode && (
      currentIssueStatus === "idle" ||
      currentIssueStatus === "loading"
    );

  if (projectLoading || issueLoading) {
    return (
      <main className="issue-form-page">
        <section className="issue-form-state-card">
          <div className="issue-form-spinner" />
          <h2>{isEditMode ? "Loading issue" : "Preparing issue form"}</h2>
        </section>
      </main>
    );
  }


  if (currentProjectStatus === "failed" || (isEditMode && currentIssueStatus === "failed")) {
    return (
      <main className="issue-form-page">
        <section
          className="issue-form-state-card issue-form-state-card--error"
          role="alert"
        >
          <h2>Issue form could not be loaded</h2>
          <p>{currentProjectError || currentIssueError}</p>
          <Link to={`/projects/${projectId}/board`}>Return to Issue Board</Link>
        </section>
      </main>
    );
  }


  // Archived projects may still be viewed, but should never expose create/edit mutation forms.
  if (project?.archived === true) {
    return (
      <main className="issue-form-page">
        <section className="issue-form-state-card">
          <h2>Archived Project</h2>
          <p>
            Issues in archived projects are read-only until
            the project is restored.
          </p>
          <Link
            to={`/projects/${projectId}/board`}
          >
            Return to Issue Board
          </Link>
        </section>
      </main>
    );
  }


  return (
    <main className="issue-form-page">

      {/* Breadcrumb keeps the form connected to its project board. */}
      <div className="issue-form-breadcrumb">
        <Link
          to={`/projects/${projectId}/board`}
        >
          ← {project?.key} Issue Board
        </Link>
      </div>

      <header className="issue-form-heading">

        <p className="issue-form-eyebrow">
          {project?.key} / Issues
        </p>

        <h1>
          {isEditMode ? `Edit ${currentIssue?.key}` : "Create Issue"}
        </h1>

        <p>
          {isEditMode
            ? "Update the issue information below. Workflow status changes remain on the board."
            : "Add a new item to the project. New issues begin in the Open workflow column."
          }
        </p>
      </header>

      <section className="issue-form-card">
        <form className="issue-form" onSubmit={handleSubmit}>

          {/* ------------------------------------------------------------ */}
          {/* Title                                                        */}
          {/* ------------------------------------------------------------ */}
          <div className="issue-form-field">
            <label htmlFor="issueTitle">
              Title
              <span aria-hidden="true">
                *
              </span>
            </label>

            <input
              id="issueTitle"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleInputChange}
              maxLength="200"
              placeholder="Example: Login button becomes unresponsive"
              required
            />
            <small>
              Short description shown directly on the issue board card.
            </small>
          </div>


          {/* ------------------------------------------------------------ */}
          {/* Description                                                  */}
          {/* ------------------------------------------------------------ */}
          <div className="issue-form-field">
            <label htmlFor="issueDescription">
              Description
            </label>
            <textarea
              id="issueDescription"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="7"
              placeholder="Describe the problem, expected behavior, reproduction steps, or implementation details..."
            />
          </div>

          {/* ------------------------------------------------------------ */}
          {/* Fixed-choice metadata                                        */}
          {/* ------------------------------------------------------------ */}
          <div className="issue-form-three-column-grid">
            <div className="issue-form-field">
              <label htmlFor="issueType">
                Type
              </label>
              <select
                id="issueType"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
              >
                {ISSUE_TYPES.map(
                  (option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="issue-form-field">
              <label htmlFor="issuePriority">Priority</label>

              <select
                id="issuePriority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
              >
                {ISSUE_PRIORITIES.map(
                  (option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>


            <div className="issue-form-field">

              <label htmlFor="issueSeverity">
                Severity
              </label>


              <select
                id="issueSeverity"
                name="severity"
                value={formData.severity}
                onChange={handleInputChange}
              >

                {ISSUE_SEVERITIES.map(
                  (option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>


          {/* ------------------------------------------------------------ */}
          {/* Assignee                                                     */}
          {/* ------------------------------------------------------------ */}

          <div className="issue-form-field">
            <label htmlFor="issueAssignee">Assignee</label>

            {canManageAssignee ? (

              <select
                id="issueAssignee"
                name="assigneeId"
                value={formData.assigneeId}
                onChange={handleInputChange}
                disabled={assignableStatus === "loading"}
              >

                <option value="">Unassigned</option>

                {assignableUsers.map(
                  (assignableUser) => {
                    const fullName =
                      `${assignableUser.firstName ?? ""} ${assignableUser.lastName ?? ""}`
                        .trim();

                    return (
                      <option
                        key={assignableUser._id}
                        value={assignableUser._id}
                      >
                        {fullName || assignableUser.username}
                        {" "}
                        (@{assignableUser.username})
                        {assignableUser.projectRole === "lead"
                          ? " — Project Lead"
                          : ""
                        }
                      </option>
                    );
                  }
                )}

              </select>

            ) : (

              /* Regular reporter/assignee users may edit permitted fields,
               * but can't reassign an existing issue.
               */
              <div className="issue-form-readonly-value">
                {formData.assigneeId
                  ? (
                      selectedAssigneeName
                        ? `${selectedAssigneeName} (@${selectedAssignee?.username})`
                        : "Assigned project member"
                    )
                  : "Unassigned"
                }
              </div>
            )}

            {assignableStatus === "loading" && (
              <small>Loading project members...</small>
            )}

            {assignableError && (
              <small className="issue-form-field-error">{assignableError}</small>
            )}

            {isEditMode &&
              !canManageAssignee && (
                <small>
                  Only the project lead or global admin may
                  change an existing issue's assignee.
                </small>
              )}
          </div>


          {/* ------------------------------------------------------------ */}
          {/* Labels                                                       */}
          {/* ------------------------------------------------------------ */}
          <div className="issue-form-field">
            <label htmlFor="issueLabels">Labels</label>
            <input
              id="issueLabels"
              name="labelsText"
              type="text"
              value={formData.labelsText}
              onChange={handleInputChange}
              placeholder="frontend, login, authentication"
            />

            <small>
              Separate labels with commas. Labels are normalized
              to lowercase and duplicates are removed.
            </small>

            {normalizedLabels.length > 0 && (
              <div className="issue-form-label-preview" aria-label="Issue label preview">
                {normalizedLabels.map(
                  (label) => (
                    <span key={label} className="issue-form-label-chip">{label}</span>
                  )
                )}
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------ */}
          {/* Client-side validation                                       */}
          {/* ------------------------------------------------------------ */}
          {validationError && (
            <div className="issue-form-validation-error" role="alert">
              {validationError}
            </div>
          )}


          {/* ------------------------------------------------------------ */}
          {/* Form actions                                                  */}
          {/* ------------------------------------------------------------ */}
          <div className="issue-form-actions">
            <Link className="issue-form-cancel-button" to={`/projects/${projectId}/board`}>
              Cancel
            </Link>

            <button
              className="issue-form-save-button"
              type="submit"
              disabled={saveStatus === "loading"}
            >
              {saveStatus === "loading" 
                ? (isEditMode ? "Saving..." : "Creating...")
                : (isEditMode ? "Save Changes" : "Create Issue")
              }
            </button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default IssueFormPage;