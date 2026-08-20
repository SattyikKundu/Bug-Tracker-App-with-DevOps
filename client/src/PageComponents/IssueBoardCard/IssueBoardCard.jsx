// src/PageComponents/IssueBoardCard/IssueBoardCard.jsx

import "./IssueBoardCard.css"; // Styling for one compact board issue card

import {
  ALLOWED_TRANSITIONS, // Determines which arrow-button transitions are available
  STATUS_LABELS        // Converts internal status values into readable labels
} from "../../utils/issueWorkflow.jsx";



// More descriptive button text for certain workflow movements.
const TRANSITION_LABELS = {
  "open->in_progress":
    "Start Work →",

  "in_progress->open":
    "← Reopen",

  "in_progress->ready_for_review":
    "Send to Review →",

  "ready_for_review->in_progress":
    "← Return to Work",

  "ready_for_review->closed":
    "Close Issue →",

  "closed->ready_for_review":
  "← Return to Review",

  "closed->open":
    "Reopen Issue"
};


const IssueBoardCard = ({
  issue,                // Individual issue document
  assigneeName,         // Human-readable assignee identity
  canTransition,        // Whether current user can modify this issue's status (via arrow-buttons)
  projectArchived,      // Archived projects remain read-only
  isTransitioning,      // Shows temporary loading/disabled state
  onTransition          // Callback supplied by IssueBoardPage
}) => {


  /* Normalize priority before displaying it.
   *
   * trim() also makes client tolerant of accidental surrounding
   * whitespace in existing database/schema values.
   */
  const normalizedPriority = String(issue.priority || "medium").trim().toLowerCase();

  // Normalize issue type for display/CSS.
  const normalizedType = String(issue.type || "bug").trim().toLowerCase();


  // Determine which transitions are available from the current status.
  const availableTransitions = ALLOWED_TRANSITIONS[issue.status] ?? [];

  // Keep cards visually compact by showing at most two label chips.
  const visibleLabels = Array.isArray(issue.labels) ? issue.labels.slice(0, 2) : [];


  // Count labels hidden from the compact board card.
  const hiddenLabelCount =
    Array.isArray(issue.labels)
      ? Math.max(issue.labels.length - visibleLabels.length, 0)
      : 0;


  return (
    <article className="issue-board-card" aria-label={`${issue.key}: ${issue.title}`}>

      {/* Top metadata row: issue key + issue type. */}
      <div className="issue-board-card-top">
        <span className="issue-board-card-key">
          {issue.key}
        </span>
        <span className={ `issue-board-card-type issue-board-card-type--${normalizedType}`}>
          {normalizedType}
        </span>
      </div>

      {/* Primary information users scan when reading a board. */}
      <h3 className="issue-board-card-title">{issue.title}</h3>

      {/* Optional compact label presentation. */}
      {visibleLabels.length > 0 && (

        <div className="issue-board-card-labels" aria-label="Issue labels">
          {visibleLabels.map(
            (label) => (
              <span key={label} className="issue-board-card-label">{label}</span>
            )
          )}
          {hiddenLabelCount > 0 && (
            <span className="issue-board-card-label-more">
              +{hiddenLabelCount}
            </span>
          )}
        </div>
      )}

      {/* Priority and assignee remain visible w/out opening issue details. */}
      <div className="issue-board-card-meta">
        <span className={`issue-board-card-priority issue-board-card-priority--${normalizedPriority}`}>
          {normalizedPriority}
        </span>
        <span className="issue-board-card-assignee" title={assigneeName}>
          {assigneeName}
        </span>
      </div>


      {/*Archived projects are intentionally read-only.
       *
       * For active projects, transition buttons appear only when
       * current user satisfies same general role relationship
       * expected by backend.
       */}
      {!projectArchived && canTransition && availableTransitions.length > 0 && (

          <div className="issue-board-card-transitions">
            {availableTransitions.map(
              (targetStatus) => {
                const transitionKey = `${issue.status}->${targetStatus}`;
                return (
                  <button
                    key={targetStatus}
                    type="button"
                    className="issue-board-card-transition-button"
                    disabled={isTransitioning}
                    onClick={(event) => {
                      event.stopPropagation(); // Prevents status-button click from opening Issue Details
                      onTransition(issue, targetStatus);
                    }}
                  >
                    {isTransitioning
                      ? "Moving..."
                      : ( TRANSITION_LABELS[transitionKey] || `Move to ${STATUS_LABELS[targetStatus]}`)
                    }
                  </button>
                );
              }
            )}
          </div>
        )}

      {/* Explain why an otherwise visible issue can't be transitioned. */}
      {!projectArchived && !canTransition && (
          <div className="issue-board-card-readonly-note">View only</div>
        )}
    </article>
  );
};

export default IssueBoardCard;