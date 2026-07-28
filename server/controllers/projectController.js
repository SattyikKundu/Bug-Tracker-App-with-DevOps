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

export const listProjects = async (req, res, next) => {   // Controller: list projects for current user

  try { 

    const user = req.authUser;    // Read current user from 'req'
    
    if (user.role === "admin") {                // If user's role is admin...
      const projects = await populateProjectLead(
        Project.find().sort({ createdAt: -1 })  // Fetch all projects
      ).lean(); 
      return res.json({ projects });            // Respond with list
    }                                                                               

    const uid = user._id; // Current user's id
    
    const projects = await populateProjectLead(
        Project.find({   // Find projects accessible by user
          $or: [                   // Match any of these:
            { leadUserId: uid },          // Lead
            { members: uid },             // Member
          ],                           // End OR list
        })                             // End find
        .sort({ createdAt: -1 })  // Sort newest first
    ).lean();                     // Return plain objects

    return res.json({ projects }); // Respond with list
  } 
  catch (err) { 
    next(err);
  }                                                                                          
};                                                                                          


// export const getProject = async (req, res) => {   // Controller: get single project (project already loaded)
//   return res.json({ project: req.project });      // Respond with attached project
// };                                                                                           

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

    // const updated = await Project.findByIdAndUpdate(  // Apply updates
    //   req.project._id,                                // Target id
    //   { $set: updates },                              // Fields to set
    //   { new: true, runValidators: true }              // Return updated doc; validate
    // ).lean();                                         // As plain object

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
