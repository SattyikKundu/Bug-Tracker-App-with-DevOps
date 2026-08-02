// server/controllers/issueController.js

import mongoose   from "mongoose";      // For importing functionalities for interacting with MongoDB

import Issue, 
    { STATUSES, 
      TYPES, 
      PRIORITIES, 
      SEVERITIES } from "../models/issueModel.js";    // imports Issue model + created enums

import Project    from "../models/projectModel.js";   // imports Project model
import User       from "../models/user.js";          // imports User model
  

const isValidId = (id) => { // validate id helper function
  return mongoose.Types.ObjectId.isValid(String(id));
}

const normalizeLabel = (label) => { // Normalize one issue label
  if (typeof label !== "string") {   // Reject non-string values
    return "";
  }
  return label.trim().toLowerCase(); // Trim spaces and store lowercase
};


const normalizeLabels = (labels) => { // Normalize and de-duplicate an array of labels
  if (!Array.isArray(labels)) {
    return [];
  }
  return [
    ...new Set(
      labels
        .map(normalizeLabel) // Normalize every label
        .filter(Boolean)     // Remove empty labels
    )
  ];
};


const userCanEditIssue = (user, project, issue)=>{ // Checks if user is allowed to edit issue for project

  if (!user || !project || !issue) { // end function if any inputs missing
    return false;
  }

  if(user.role==="admin") { // If user is Admin, grant full access
    return true;                   
  }

  // Check user's other role(s)
  const uid      = String(user._id);                         // Get current user's id
  const isLead   = String(project.leadUserId)===uid;         // Check's if user is project lead
  const isMember = project.members.some(m=>String(m)===uid); // Check is user is a project team member


  // Check is user is a Reporter (One who reports the issue) OR assignee (one who fixes the issue).
  const isReporterOrAssignee = String(issue.reporterId)===uid ||(issue.assigneeId && String(issue.assigneeId)===uid); 
  return isLead || (isMember && isReporterOrAssignee);   // Allowed if user is a lead OR a (member + reporter/assignee)

};


// Only the project lead or global admin may change an assignee after an issue has been created.
const userCanManageAssignee = (user, project) => {

  if (!user || !project) { // false IF not neither user nor project matches
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  return String(project.leadUserId) === String(user._id);
};



// POST /projects/:pid/issues  (project must be loaded & membership checked in routes)
export const createIssue = async (req,res,next)=>{

  try{

    const { pid } = req.params; // Project id from URL

    console.log('pid: ', pid);

    if (!isValidId(pid)){ // If invalid project Id, return 400 (error) response
        return res.status(400).json({error:"Invalid project id."});
    }

    const project = req.project || await Project.findById(pid).lean(); // Use loaded project or fetch
    
    if (!project) { // If not project found, return 404 (error) response
        return res.status(404).json({error:"Project not found."}); 
    }

    const {
      title, 
      description="", 
      type="bug", 
      priority="medium", 
      severity="major",
      assigneeId=null, 
      labels=[]
    } = req.body||{};  // Destructure values from request body (which also has default values if not provided)

    if(!title?.trim()) { // return error if title is missing
        return res.status(400).json({error:"title is required."}); 
    } 

    // Validate various enum field values
    if(!TYPES.includes(type)){
        return res.status(400).json({error:"Invalid type."});
    }
    if(!PRIORITIES.includes(priority)){ 
        return res.status(400).json({error:"Invalid priority."});
    }
    if(!SEVERITIES.includes(severity)){ 
        return res.status(400).json({error:"Invalid severity."});
    }


   /* Labels are optional during issue creation.
    *
    * Every label must be a string. Labels are:
    * + trimmed;
    * + converted to lowercase;
    * + protected from duplicates;
    * + excluded when empty.
    */
    if (!Array.isArray(labels)) {
      return res.status(400).json({
        error: "labels must be an array."
      });
    }

    if (labels.some((label) => typeof label !== "string")) {
      return res.status(400).json({
        error: "Every label must be a string."
      });
    }

    const normalizedLabels = normalizeLabels(labels);


    // Membership gate already done in routes; reporter is current user
    const reporterId = req.authUser._id;    // Reporter = current user




   /* During creation, any project member may select an assignee.
    *
    * The chosen assignee may be:
    * + the reporter;
    * + another project member;
    * + the project lead; or
    * + unassigned when assigneeId is null or omitted.
    *
    * When an assignee is selected, they must:
    * + have a valid user ID; and
    * + already belong to this project.
    */
    if (assigneeId !== undefined && assigneeId !== null) {
      if (!isValidId(assigneeId)) {
        return res.status(400).json({ error: "Invalid assigneeId." });
      }

      // Only the project lead or an existing project member can be assigned.
      const allowedAssigneeIds = new Set([
        String(project.leadUserId),
        ...(project.members ?? []).map((memberId) => String(memberId))
      ]);

      if (!allowedAssigneeIds.has(String(assigneeId))) {
        return res.status(400).json({ error: "Assignee must be the project lead or an existing project member." });
      }
    }


   /* Automatically add the reporter as a watcher.
    *
    * When the issue has an initial assignee, automatically add that
    * assignee as well. Set prevents duplicates when the reporter
    * assigns the issue to themselves.
    */
    const automaticWatcherIds = new Set([
      String(reporterId)
    ]);

    if (assigneeId !== undefined && assigneeId !== null) {
      automaticWatcherIds.add(String(assigneeId));
    }    



    // Create 'issue' to pass on (key generated by pre('validate') hook)
    const issue = await Issue.create({
      projectId: pid, // parent project where issue lies
      title:  title.trim(), 
      description: String(description).trim(), 
      type, 
      priority, 
      severity,
      reporterId, // current user Id (one who reported)
      assigneeId: assigneeId ?? null, // Null = unassigned (triage-first)
      labels: normalizedLabels,
      watchers: [...automaticWatcherIds]            // Deduped & membership-restricted
                                                    // Mongoose will cast to ObjectId
    });

    return res.status(201).json({issue}); // return success (201) response regarding that 'issue' has passed
  }
  catch(err){ // error handling
    next(err); 
  }
};

// GET /projects/:pid/issues  (project + membership checked in routes)
export const listIssues = async (req,res,next)=>{

  try{
    const { pid } = req.params; // get project id from request params

    if(!isValidId(pid)){  // validate project id
        return res.status(400).json({error:"Invalid project id."});
    }

    const project = req.project || await Project.findById(pid).lean(); // get project object

    if(!project){ // If project is missing...
        return res.status(404).json({error:"Project not found."});
    }

    // Filters (NOTE: 'q' is the free-text search query (i.e. text box search input))
    const { status, priority, assigneeId, q } = req.query; 

    const find = { projectId: pid }; // create Object used to 'find' issues for a specific project

    if(status && STATUSES.includes(status)) { // add 'status' to find
        find.status = status; 
    }
    if(priority && PRIORITIES.includes(priority)){ // add 'priority' to find
        find.priority = priority; 
    }
    if(assigneeId && isValidId(assigneeId)){ // add assigneeId to find
        find.assigneeId = assigneeId; 
    }
    if(q && q.trim()){ // free-text search term
        find.$text = { $search: q.trim() };
    }

    const issues = await Issue.find(find).sort({createdAt:-1}).lean(); // 1st, find issue using 'find' 
    return res.json({issues});                                         // 2nd, .sort({createdAt:-1}) sorts query 
                                                                       // results via 'createdAt' in descending order
                                                                       // 3rd, .lean() returns plain JSONs instead of moongoose objs
  }
  catch(err){ 
    next(err); 
  }
};

// GET /issues/:id  (issue loader sets req.issue + req.project; membership checked in routes)
export const getIssue = async (req,res)=>{ // Retrieve issue
    return res.json({issue:req.issue}); 
}; 

// PATCH /issues/:id  (loader + membership checked, and finer policy enforced here)
export const updateIssue = async (req,res,next)=>{

  try{
    const issue = await Issue.findById(req.issue._id); // Try finding issue via id first

    if(!issue){ // If no issue found....
        return res.status(404).json({error:"Issue not found."});
    }

    const project = req.project;  // get issue's parent project from request
    const user    = req.authUser; // get current user from request

    if(!userCanEditIssue(user,project,issue)){ // Checks is user has permission to edit issue
      return res.status(403).json({error:"Not allowed to edit this issue."});
    }

    const { 
        title, 
        description, 
        type, 
        priority,
        severity, 
        assigneeId//, 
        // labels, 
        // watchers 
    } = req.body||{}; // Destructure inputs from request body

    if(title!==undefined){  // Checks if title is valid
        if(!title?.trim()){
            return res.status(400).json({error:"title cannot be empty."}); 
            
        }  
        issue.title = title;
    }
    if(description!==undefined){ // Checks is description is valid
        issue.description = String(description);
    }
    if(type!==undefined){  // Checks if issue type is valid
        if(!TYPES.includes(type)) { 
            return res.status(400).json({error:"Invalid type."});  
        }
        issue.type = type;
    }

    if(priority!==undefined){  // Checks if priority is valid
        if(!PRIORITIES.includes(priority)){ 
            return res.status(400).json({error:"Invalid priority."}); 
        }
        issue.priority = priority; 
    }
    
    if(severity!==undefined){ // checks if severity is valid 
        if(!SEVERITIES.includes(severity)) {
            return res.status(400).json({error:"Invalid severity."}); 
        }
        issue.severity = severity; 
    }
    

    
    // Changing assigneeId after creation is a management action.
    //
    // Only:
    // + the project lead; or
    // + a global admin
    //
    // may assign, reassign, or unassign an existing issue.
    if (assigneeId !== undefined) {
      if (!userCanManageAssignee(user, project)) {
        return res.status(403).json({
          error: "Only the project lead or a global admin may change the issue assignee."
        });
      }

      // null means the lead/admin is intentionally making the issue unassigned.
      if (assigneeId !== null) {
        if (!isValidId(assigneeId)) {
          return res.status(400).json({ error: "Invalid assigneeId." });
        }

        // The new assignee must already be part of the project.
        const allowedAssigneeIds = new Set([
          String(project.leadUserId),
          ...project.members.map((memberId) => String(memberId))
        ]);

        if (!allowedAssigneeIds.has(String(assigneeId))) {
          return res.status(400).json({ error: "Assignee must be an existing project member." });
        }


        
        // Confirm that the selected project participant still exists.
        const existingAssignee = await User.exists({
          _id: assigneeId
        });

        if (!existingAssignee) {
          return res.status(400).json({
            error: "Assignee must be a registered user."
          });
        }
      }

      // null = Unassigned. Otherwise, Mongoose casts the string ID to ObjectId.
      issue.assigneeId = assigneeId === null
        ? null
        : String(assigneeId);
    }


    const saved = await issue.save();          // Saves created 'issue' to MongoDB database to 'issues' collection 
    return res.json({issue:saved.toObject()}); // Return updated object sent to database
  }
  catch(err){ 
    next(err); 
  }
};



// POST /issues/:id/labels
export const addIssueLabel = async (req, res, next) => {
  try {
    const label = normalizeLabel(req.body?.label);

    if (!label) {
      return res.status(400).json({
        error: "label is required and must be a non-empty string."
      });
    }

    const updatedIssue = await Issue.findByIdAndUpdate(
      req.issue._id,
      {
        $addToSet: {
          labels: label
        }
      },
      {
        new: true,
        runValidators: true
      }
    ).lean();

    return res.status(200).json({
      issue: updatedIssue
    });
  }
  catch (err) {
    next(err);
  }
};


// DELETE /issues/:id/labels/:label
export const deleteIssueLabel = async (req, res, next) => {
  try {
    const label = normalizeLabel(req.params.label);

    if (!label) {
      return res.status(400).json({
        error: "A valid label is required."
      });
    }

    const labelExists = (req.issue.labels ?? []).some(
      (existingLabel) => normalizeLabel(existingLabel) === label
    );

    if (!labelExists) {
      return res.status(404).json({
        error: "Label not found on this issue."
      });
    }

    const updatedIssue = await Issue.findByIdAndUpdate(
      req.issue._id,
      {
        $pull: {
          labels: label
        }
      },
      {
        new: true,
        runValidators: true
      }
    ).lean();

    return res.status(200).json({
      issue: updatedIssue
    });
  }
  catch (err) {
    next(err);
  }
};


// POST /issues/:id/watch
export const watchIssue = async (req, res, next) => {
  try {
    const updatedIssue = await Issue.findByIdAndUpdate(
      req.issue._id,
      {
        $addToSet: {
          watchers: req.authUser._id
        }
      },
      {
        new: true,
        runValidators: true
      }
    ).lean();

    return res.status(200).json({
      message: "You are now watching this issue.",
      issue: updatedIssue
    });
  }
  catch (err) {
    next(err);
  }
};


// DELETE /issues/:id/watch
export const unwatchIssue = async (req, res, next) => {
  try {
    const updatedIssue = await Issue.findByIdAndUpdate(
      req.issue._id,
      {
        $pull: {
          watchers: req.authUser._id
        }
      },
      {
        new: true,
        runValidators: true
      }
    ).lean();

    return res.status(200).json({
      message: "You are no longer watching this issue.",
      issue: updatedIssue
    });
  }
  catch (err) {
    next(err);
  }
};



// POST /issues/:id/transition (loader + membership checked first, then editing permission policy enforced)
export const transitionStatus = async (req,res,next)=>{

  try{
    const issue = await Issue.findById(req.issue._id); // Return issue document via issue id
    
    if(!issue){ // If no issue found
        return res.status(404).json({error:"Issue not found."}); 
    }
    
    const project = req.project; // extract project and authUser from request body
    const user = req.authUser;      
    
    if(!userCanEditIssue(user,project,issue)){ // Checks if user has editing permission
      return res.status(403).json({error:"Not allowed to transition this issue."});
    }
    
    // Accept both 'to' (official) and 'targetStatus' (alias) from the client
    const { to, targetStatus } = req.body || {};
    const nextStatus = targetStatus ?? to;   // clearer and less ambiguous local name
    
    if(!nextStatus || !STATUSES.includes(nextStatus)){
        return res.status(400).json({error:"Invalid target status."});
    }
    
    if(issue.status===nextStatus){ // No-op
        return res.json({issue:issue.toObject()});
    } 

    const from = issue.status;  // fetch previous status
    issue.status = nextStatus;  // set new status
    issue.statusHistory.push({from, to: nextStatus, by:user._id, at:new Date()}); // save status history for auditing
    issue.closedAt = nextStatus==="closed" ? new Date() : undefined;  // Maintain 'closedAt' (date when issue is closed)

    const saved = await issue.save(); // saved updated 'issue' to 'issues' collection in MongoDB
    return res.json({issue:saved.toObject()}); // Return sent updated 'issue'
  }
  catch(err){  // catch, handle, and pass error in Express pipeline
    next(err); 
  }
};
