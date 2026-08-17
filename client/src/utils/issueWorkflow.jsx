// src/utils/issueWorkflow.jsx


/* Human-readable names for four workflow statuses.
 * Keeping them in one file prevents the Board, cards, and drag/drop
 * implementation from defining slightly different names later.
 */
export const STATUS_LABELS = {
  open:             "Open",
  in_progress:      "In Progress",
  ready_for_review: "Ready for Review",
  closed:           "Closed"
};


/* Fixed workflow-column information.
 * Ordering here determines visual left → right order
 * of four-column Issue Board.
 */
export const BOARD_COLUMNS = [
  {
    status: "open",
    title:  "Open",
    description: "Reported work waiting to begin."
  },
  {
    status: "in_progress",
    title:  "In Progress",
    description: "Work currently being investigated or implemented."
  },
  {
    status: "ready_for_review",
    title:  "Ready for Review",
    description: "Completed work awaiting final verification."
  },
  {
    status: "closed",
    title:  "Closed",
    description: "Finished and accepted work."
  }
];


/* Defines the workflow movements exposed by CLIENT.
 * Arrow buttons and drag/drop both use exact map so user
 * can't get different behavior depending on how issue card was moved.
 */
export const ALLOWED_TRANSITIONS = {
  open:             ["in_progress"                          ],
  in_progress:      ["open"             , "ready_for_review"],
  ready_for_review: ["in_progress"      , "closed"          ],
  closed:           [ "ready_for_review", "open"            ]
};


/* Returns true when a requested workflow movement is exposed by the UI.
 *
 * Moving into issue's existing column is also accepted because
 * dropping an issue back into its own column should simply do nothing.
 */
export const canTransitionStatus = (fromStatus, targetStatus) => {

  if (fromStatus === targetStatus) {
    return true;
  }

  return (ALLOWED_TRANSITIONS[fromStatus] ?? []).includes(targetStatus);
};