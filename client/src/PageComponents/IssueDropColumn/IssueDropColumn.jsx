// src/PageComponents/IssueDropColumn/IssueDropColumn.jsx

import { useDroppable }        from "@dnd-kit/react";                // makes one workflow column a drop destination
import { canTransitionStatus } from "../../utils/issueWorkflow.jsx"; // ensures only sensible workflow destinations highlight
import "./IssueDropColumn.css";                                      // visual feedback for valid drop targets


const IssueDropColumn = ({
  column,          // BOARD_COLUMNS entry for this workflow lane
  issueCount,      // number displayed inside column heading
  filtersAreActive,// changes empty-state wording
  children         // issue cards rendered inside the lane
}) => {


  /* The column accepts:
   * + an issue already belonging to this same status; OR
   * + an issue whose current status is allowed to transition here.
   *
   * Invalid workflow lanes therefore never become valid drop targets.
   */
  const { ref, isDropTarget } = useDroppable({
    id: `issue-column:${column.status}`,
    type: "issue-column",
    accept: (source) => {
      if (source.type !== "issue-card") {
        return false;
      }
      return canTransitionStatus(source.data?.fromStatus, column.status);
    },
    data: { status: column.status }
  });

  return (
    <section
      ref={ref}
      className={[
        "issue-board-column",
        `issue-board-column--${column.status}`,
        isDropTarget ? "issue-board-column--drop-target" : ""
      ].filter(Boolean).join(" ")}
      aria-label={`${column.title} issues`}
    >
      <header className="issue-board-column-heading">
        <div>
          <h2>{column.title}</h2>
          <p>{column.description}</p>
        </div>

        <span
          className  = "issue-board-column-count"
          aria-label = {`${issueCount} issues`}
        >
          {issueCount}
        </span>
      </header>

      <div className="issue-board-column-cards">
        {issueCount === 0 ? (
          <div className="issue-board-column-empty">
            { filtersAreActive ? "No matching issues" : "No issues in this stage" }
          </div>

        ) : (
          children
        )}
      </div>
    </section>
  );
};


export default IssueDropColumn;