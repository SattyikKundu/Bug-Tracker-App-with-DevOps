// server/controllers/projectController.js                        
import   mongoose   from "mongoose";                  // Import Mongoose for ObjectId checks
import { ObjectId } from "mongodb";                   // needed for ObjectId() in updateMembers function 
import   Project    from "../models/projectModel.js"; // Import Project model
import   User       from "../models/user.js";         // Import User model to validate IDs

const isValidId = (id) => { // Helper to validate ObjectId strings
    return mongoose.Types.ObjectId.isValid(id);  
} 

const populateProjectUsers = (query) => { // Helper function to get members' info for a project
  return query
    .populate({
      path: "leadUserId",
      select: "_id firstName lastName username"
    })
    .populate({
      path: "members",
      select: "_id firstName lastName username"
    });
};

const populateProjectLead = (query) => {
  return query.populate({
    path: "leadUserId",
    select: "_id firstName lastName username"
  });
};


export const createProject = async (req, res, next) => {  // Controller: create a new project
  try {                                                                                        
   const { key, name, description = "" } = req.body || {}; // Destructure inputs with defaults
    if (
      typeof key !== "string" ||
      typeof name !== "string" ||
      !key.trim() ||
      !name.trim()
    ) {
      return res.status(400).json({ // checks for null, undefined and empty strings
        error: "key and name are required and must be strings."
      });
    }


    
    const normalizedKey = key.trim().toUpperCase(); // Normalize and validate the key

    if (!/^[A-Z][A-Z0-9]{1,9}$/.test(normalizedKey)) { // Validate key format (project 'key' id)
      return res.status(400).json({  // Respond with bad request
        error:
          "Project key must be 2-10 characters, start with a letter, and contain only A-Z and 0-9."
      });
    }



    const exists = await Project.exists({ key: normalizedKey });  // Check for duplicate key (if project key already exists)
    if (exists) {   // If project key already exists...
      return res.status(409).json({ error: "Project key already exists." });  // Respond conflict
    }                                                                                   

    const creatorId = req.authUser._id; // get id of the user who creates the project
                                                                          

    const project = await Project.create({      // Create project document
      key: normalizedKey,                       // Save key (schema uppercases)
      name: name.trim(),                        // Save name
      description: String(description).trim(),  // Save description
      leadUserId: creatorId,                    // Save creator as project lead
      members: [creatorId],                     // Make creator a member
      nextIssueSeq: 1                           // Initialize coutner
    });

    return res.status(201).json({ project });  // Respond with created resource
  } 
  catch (err) { // Catch errors

    if (
      err?.code === 11000 &&
      err?.keyPattern?.key
    ) {
      return res.status(409).json({ // error id project key already exists
        error: "Project key already exists."
      });
    }

    next(err);  // Delegate to error handler
  }                                                                                          
};                                                                                           

   

/* Returns the projects available to the logged-in user.
 *
 * A global admin can view every project.
 *
 * A non-admin can view projects where they are:
 * - the project lead, or
 * - an existing project member.
 *
 * Each returned project also contains currentUserProjectRole so the
 * frontend can display a Lead, Member, or Admin Access tag.
 */
export const listProjects = async (req, res, next) => {
  try {

    const currentUser = req.authUser; // The full logged-in user document should already 
                                      // have been attached by loadCurrentUser middleware.

    if (!currentUser) {
      return res.status(401).json({
        error: "Authenticated user context is missing."
      });
    }

    // Convert user's ObjectId to string for comparing with project ObjectIds.
    const currentUserId = String(currentUser._id);


    const isGlobalAdmin = currentUser.role === "admin"; // A global admin can retrieve every project.

    /* Global admins receive every project.
     *
     * Other users receive only projects where:
     * - they are the lead, or
     * - their user ID appears in members array.
     */
    const projectFilter = isGlobalAdmin  // filter to determine if current user is admin, or a regular user (lead or member) 
      ? {}
      : { $or: [ { leadUserId: currentUser._id }, { members: currentUser._id } ] };


    // Filter available projects based on if user is admin OR not
    const projects = await Project.find(projectFilter).sort({ createdAt: -1 }).lean();


    // Add a calculated role to every returned project.
    //
    // This value is not saved in MongoDB because it depends
    // on which user is currently making the request.
    const projectsWithCurrentUserRole = projects.map((project) => {

      // The project lead is also normally included in members, 
      // so lead check must happen BEFORE member check.
      const isProjectLead =
        String(project.leadUserId) === currentUserId;

      const isProjectMember =
        project.members?.some((memberId) => {
          return String(memberId) === currentUserId;
        }) ?? false;

      let currentUserProjectRole = null;

      if (isProjectLead) { // Logged-in user leads project.
        currentUserProjectRole = "lead";
      } 
      else if (isProjectMember) { // Logged-in user belongs to project but isn't its lead.
        currentUserProjectRole = "member";
      } 
      else if (isGlobalAdmin) {
        // A global admin can see every project even when 
        // they're not personally assigned to that project.
        currentUserProjectRole = "admin_access";
      }

      return {
        ...project,

        /* Possible values:
         * "lead"
         * "member"
         * "admin_access"
         *
         * A non-admin should NEVER receive null because database
         * filter only returns projects they lead or belong to.
         */
        currentUserProjectRole
      };
    });

    return res.status(200).json({
      projects: projectsWithCurrentUserRole
    });
  } 
  catch (err) {
    next(err);
  }
};



export const getProject = async (req, res, next) => { // Controller: get single project (project already loaded)
  try {                                               // Respond with attached project (with populated users)
    const project = await populateProjectUsers(
      Project.findById(req.project._id)
    ).lean();

    if (!project) {
      return res.status(404).json({
        error: "Project not found."
      });
    }

    return res.json({
      project
    });
  } catch (err) {
    next(err);
  }
};


/* Return users who may be assigned an issue in the selected project.
 *
 * Assignable users are:
 * - the current project lead; and
 * - the project's existing members.
 *
 * This controller does not search unrelated(non-project members) registered users.
 *
 * Required middleware:
 * - verifyJWT
 * - loadCurrentUser
 * - loadProject
 * - requireProjectMemberOrAdmin
 */
export const getAssignableProjectUsers = async (req, res, next) => {
  try {
    const project = req.project;

    if (!project) {
      return res.status(500).json({
        error: "Project context is missing."
      });
    }

    /* Combine the lead and members into one unique list.
     *
     * Your project rules normally require the lead to also be present
     * in members, but explicitly including leadUserId makes the intended
     * behavior clear and protects against inconsistent older records.
     */
    const assignableUserIdSet = new Set([
      String(project.leadUserId),

      ...(project.members ?? []).map((memberId) => {
        return String(memberId);
      })
    ]);

    const assignableUserIds = [...assignableUserIdSet];

    /* Retrieve only existing users whose IDs are already associated with this project.
     *
     * This does not search the entire users collection for unrelated
     * users. MongoDB only returns users whose IDs are in the project's
     * lead/member list.
     */
    const users = await User.find({
      _id: {
        $in: assignableUserIds
      }
    })
      .select("_id firstName lastName username")
      .sort({
        firstName: 1,
        lastName: 1,
        username: 1
      })
      .lean();

    const leadUserId = String(project.leadUserId);

    
    /* Add the user's project role for frontend display.
     *
     * Example dropdown:
     *
     * Alice Smith (@alice) — Lead
     * Bob Jones (@bob) — Member
     */
    const assignableUsers = users.map((user) => {
      return {
        ...user,

        projectRole:
          String(user._id) === leadUserId
            ? "lead"
            : "member"
      };
    });

    return res.status(200).json({
      projectId: project._id,
      users: assignableUsers
    });
  } catch (err) {
    next(err);
  }
};


export const updateProject = async (req, res, next) => {  // Controller: update basic project fields

  try {                          

    const { name, description, leadUserId } = req.body || {};  // Extract updatable fields
    const updates = {};                                        // Prepare updates object
    
    
    if (name !== undefined) { // If name provided
      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        return res.status(400).json({
          error: "name must be a non-empty string." // Validate 'not blank'
        });
      }

      updates.name = name.trim(); // update project name
    }

    
  
    if (description !== undefined) {    // If description provided, but not a string, return error
      if (typeof description !== "string") {
        return res.status(400).json({
          error: "description must be a string."
        });
      }

      updates.description = description.trim(); // Set description to string and set
    }
    
    

    if (leadUserId !== undefined) {     // If lead change requested

      if (!isValidId(leadUserId)) {     // Validate id
        return res.status(400).json({   // Respond bad request
          error: "Invalid leadUserId."
        });
      }

      // Otherwise, get old and new project lead
      const currentLeadId = String(req.project.leadUserId);
      const newLeadId     = String(leadUserId);

      if (newLeadId === currentLeadId) { // Error if new lead is same as old lead
        return res.status(400).json({
          error: "This user is already the project lead."
        });
      }

      const isExistingMember = req.project.members.some( // Checks if new lead is amongst existing members
        (memberId) => String(memberId) === newLeadId
      );

      if (!isExistingMember) { // Error if new lead is NOT in project's members list.
        return res.status(400).json({
          error:
            "Project leadership can only be transferred to an existing project member."
        });
      }

      // Check if new lead user id is different, now check if he exists AND is active
      const exists = await User.exists({ 
        _id: leadUserId,
      });

      if (!exists) { // Error if selected member doesn't exist.
        return res.status(400).json({
          error: "The selected member does not exist."
        });
      }

      updates.leadUserId = leadUserId; // update new lead user
    }
    

    if (Object.keys(updates).length === 0) { // reject empty-field updates 
      return res.status(400).json({
        error: "Provide at least one project field to update."
      });
    }


    const updated = await populateProjectUsers(  // Apply updates WITHIN 'populateProjectUsers' to get project members info
      Project.findByIdAndUpdate(
        req.project._id,                         // Target id
        { $set: updates },                       // Fields to set
        { new: true, runValidators: true }       // Return updated doc; validate 
      )
    ).lean();                                    // As plain object


    if (!updated) { // Error if project not found
      return res.status(404).json({
        error: "Project not found."
      });
    }

    return res.json({ project: updated }); // Respond with updated project

  } 
  catch (err) {                                                                           
    next(err);
  }                                                                                         
};                                                                                           

export const updateMembers = async (req, res, next) => {   // Controller: add/remove members

  try {         
    
    // Normalize inputs to arrays (ignore null/undefined)
    const addRaw    = Array.isArray(req.body?.add)    ? req.body.add    : [];
    const removeRaw = Array.isArray(req.body?.remove) ? req.body.remove : [];

    // Then normalize to string IDs & drop falsy values (defends against "", null)
    const addIds    = addRaw.filter(Boolean).map(String);
    const removeIds = removeRaw.filter(Boolean).map(String);

    // Checks if Ids list is empty
    if (addIds.length === 0 && removeIds.length === 0) {
      return res.status(400).json({
        error: "Provide at least one user id to add or remove."
      });
    }


    // Prevents same user from being added & removed in one request.
    const conflictingId = addIds.find((id) => removeIds.includes(id));
    if (conflictingId) {
      return res.status(400).json({
        error:
          "The same user cannot be added and removed in one request."
      });
    }


    for (const uid of [...addIds, ...removeIds]) {  // Validate all ids
      if (!isValidId(uid)) {                        // If an Id is invalid
        return res.status(400).json({               // Respond with 'bad' request
          error: `Invalid user id: ${uid}` 
        });  
      }
    }                                                                                      



    // Only users being added to project must exist.
    const uniqueAddIds = [...new Set(addIds)];

    if (uniqueAddIds.length > 0) {
      const existingUsersCount = await User.countDocuments({
        _id: { $in: uniqueAddIds }
      });

      if (existingUsersCount !== uniqueAddIds.length) {
        return res.status(400).json({
          error:
            "One or more users being added do not exist."
        });
      }
    }

    
    // Convert the project's lead ObjectId to a string that can safely be compared with                                              
    const leadIdStr = String(req.project.leadUserId);  


    // If any of the requested removals equals the lead's id, block the request
    if (removeIds.includes(leadIdStr)) {
      return res.status(400).json({
        error:
          "The project lead cannot be removed. Transfer project leadership first!" 
      }); 
    }     
    
    
    // Gets all current project members
    const currentMemberIds = new Set(
      req.project.members.map((memberId) =>
        String(memberId)
      )
    );


    // Prevent adding users who are already project members
    const alreadyMember = addIds.find(
      (userId) => currentMemberIds.has(userId)
    );

    if (alreadyMember) {
      return res.status(409).json({
        error: "One or more users being added are already project members."
      });
    }


    // Check if the user is NOT part of the project members list
    const nonMemberRemoval = removeIds.find(
      (userId) => !currentMemberIds.has(userId)
    );

    if (nonMemberRemoval) { // Otherwise, notify that the member isn't in the 
      return res.status(400).json({
        error:
          "One or more users being removed are not project members."
      });
    }


    // Resulting set of project member AFTER removing someone
    const resultingMemberIds = new Set(
      currentMemberIds
    );


    for (const userId of addIds) {  // Adds a new project member(s)
      resultingMemberIds.add(userId);
    }

    for (const userId of removeIds) { // Remove a project member(s) — separate operation from adding members!
      resultingMemberIds.delete(userId);
    }


    if (resultingMemberIds.size < 1) { // Add/Remove project members doesn't work 
      return res.status(400).json({
        error: "A project must have at least ONE member."
      });
    }

    if (!resultingMemberIds.has(leadIdStr)) { // Verifies that project leader is counted as a team member
      return res.status(400).json({
        error: "The project lead MUST remain a project member."
      });
    }

         
    // final members list after the adding/subtracing of members to members list
    const finalMemberIds = [ ...resultingMemberIds].map((id) => ObjectId.createFromHexString(id));


    await Project.updateOne( // update project's membership
      { _id: req.project._id },
      {
        $set: {
          members: finalMemberIds
        }
      },
      {
        runValidators: true
      }
    );


    const refreshed = await Project.findById(req.project._id).lean();    // Reload updated project, as plain object
    return res.json({ project: refreshed });                        // Respond with updated project

  } 
  catch (err) { // Catch and handle any errors
    next(err);                                                                               
  }                                                                                           
};                                                                                            


//Archives a project without deleting its members, issues, or comments.
//Project's route middleware ensures ONLY the project's lead can call this function.
export const archiveProject = async (req, res, next) => {

  try {

    if (req.project.archived === true) { // Error IF project is already archived...
      return res.status(409).json({
        error: "Project is already archived."
      });
    }

    const archivedProject =  // Archives selected project
      await Project.findByIdAndUpdate(
        req.project._id,
        {
          $set: {
            archived: true,
            archivedAt: new Date()
          }
        },
        {
          new: true,
          runValidators: true
        }
      ).lean();

    if (!archivedProject) {   // error IF archived project NOT found.
      return res.status(404).json({
        error: "Project not found."
      });
    }

    return res.status(200).json({ // Success message when project successfully archived.
      message: "Project archived successfully.",
      project: archivedProject
    });
  }
  catch (err) { // If error caught..
    next(err);
  }
};

// Restores an archived project:
// Existing members and the original stored lead automatically regain
// their normal project permissions because those relationships were preserved.
export const restoreProject = async (req, res, next) => {

  try {
    if (req.project.archived !== true) { // Error if "de-archiving" project that wasn't archived
      return res.status(409).json({
        error: "Project is not archived."
      });
    }

    const restoredProject =  // restoring the archived project
      await Project.findByIdAndUpdate(
        req.project._id,
        {
          $set: {
            archived: false,
            archivedAt: null
          }
        },
        {
          new: true,
          runValidators: true
        }
      ).lean();

    if (!restoredProject) { // Error if project from archives not found
      return res.status(404).json({
        error: "Project not found."
      });
    }

    return res.status(200).json({ // Success message when project is successfully restored
      message: "Project restored successfully.",
      project: restoredProject
    });
  }
  catch (err) {
    next(err);
  }
};


export const deleteProject = async (req, res, next) => {// Controller: delete a project (admin only)
  try {                                                                                   
    await Project.deleteOne({ _id: req.project._id });      // Remove project, based on its Id, from DB
    // NOTE: Consider later handling soft-delete or cascade 
    //       behavior when Issues are implemented           
    return res.status(204).send();                          // Respond no content

  } 
  catch (err) {                                                                             
    next(err);                                                                               
  }                                                                                           
};                                                                                           
