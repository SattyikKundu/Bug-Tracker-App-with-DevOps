// src/PageComponents/DraggableIssueCard/DraggableIssueCard.jsx

import { useDraggable } from "@dnd-kit/react"; // connects issue card to the board drag/drop provider package
import { useNavigate } from "react-router";    // Programmatic Link Opens Issue Details after a normal non-drag click
import IssueBoardCard from "../IssueBoardCard/IssueBoardCard.jsx";
import "./DraggableIssueCard.css"; // Drag-state styling wrapped around normal issue card


const DraggableIssueCard = ({
  issue,             // Issue represented by this draggable card
  assigneeName,      // Human-readable assignee text
  canTransition,     // Existing issue-edit permission
  projectArchived,   // Prevents dragging archived-project issues
  isTransitioning,   // Prevents another movement while API request is active
  onTransition,      // Existing arrow-button status-change callback
  detailsPath        // Normal card click opens this full Issue Details route
}) => {


  const navigate = useNavigate(); // Routes a normal card click into Issue Details

  /* An issue CAN'T be dragged when:
   *
   * + the user cannot transition it;
   * + the project is archived; or
   * + the issue is currently waiting for another transition request.
   */
  const dragDisabled = !canTransition || projectArchived || isTransitioning;


  /* Each issue is one draggable entity.
   * data travels with the drag operation and lets IssueBoardPage know:
   * + which issue was dragged;
   * + which status it originally belonged to.
   */
  const {
    ref,          // Connects whole issue-card wrapper to dnd-kit
    isDragSource, // True while THIS issue is active drag source
    isDropping    // True while dnd-kit performs its drop animation
  } = useDraggable({

    id: String(issue._id),
    type: "issue-card",
    disabled: dragDisabled,
    data: { issue, issueId: String(issue._id), fromStatus: issue.status }
  });


  return (
    <div
      ref={ref}
      data-issue-card-id={issue._id}
      className={[
        "draggable-issue-card",
        isDragSource ? "draggable-issue-card--dragging" : "",
        isDropping ? "draggable-issue-card--dropping" : ""
      ].filter(Boolean).join(" ")}

      onClick={(event) => {
        // Ignore clicks originating from nested controls/links.
        if (event.target.closest("button, a, input, select, textarea")) {
          return;
        }
        /* Nested workflow buttons remain their own controls.
        *
        * Their handlers stop propagation below, so only a normal click on
        * non-interactive card body opens Issue Details.
        */
        if (isDragSource || isDropping || !detailsPath) {
          return;
        }
        navigate(detailsPath);
      }}
    >

      <IssueBoardCard
        issue={issue}
        assigneeName={assigneeName}
        canTransition={canTransition}
        projectArchived={projectArchived}
        isTransitioning={isTransitioning}
        onTransition={onTransition}
      />
    </div>
  );
};

export default DraggableIssueCard;