// server/controllers/projectController.js                        
import mongoose from "mongoose";                  // Import Mongoose for ObjectId checks
import { ObjectId } from "mongodb";               // needed for ObjectId() in updateMembers function 

import Project from "../models/projectModel.js";  // Import Project model
import User from "../models/user.js";             // Import User model to validate IDs

const isValidId = (id) => { // Helper to validate ObjectId strings
    return mongoose.Types.ObjectId.isValid(id);  
} 

export const createProject = async (req, res, next) => {  // Controller: create a new project
  
  try {             
                                                                           
    const { key, name, description = "", leadUserId, members = [] } = req.body || {};  // Destructure inputs with defaults

    if (!key?.trim() || !name?.trim() || !leadUserId?.trim()) {   // Checks if required fields are missing
      return res.status(400).json({ error: "key, name, and leadUserId are required." });  // Respond with bad request
    }                                                                                        

    if (!/^[A-Z0-9]{2,10}$/.test(key)) {    // Validate key format (project 'key' id)
      return res.status(400).json({ error: "key must be 2-10 chars (A-Z, 0-9)." });  // Respond with bad request
    }                                                                                      

    if (!isValidId(leadUserId)) {                                       // Validate lead id format
      return res.status(400).json({ error: "Invalid leadUserId." });    // Respond with bad request
    }                                                                                     

    const uniqueUserIds = Array.from(new Set([leadUserId, ...members]));  // Ensures lead is included and de-duplicate members

    for (const uid of uniqueUserIds) {  // Loop to validate each id

      if (!isValidId(uid)) {  // If userID invalid...
        return res.status(400).json({ error: `Invalid user id in members: ${uid}` }); // Respond with "bad" request
      }                                                                                     
    }                                                                                     

    // Count how many of the provided user IDs (_id = primary key) actually exist in the users collection
    const usersCount = await User.countDocuments({ _id: { $in: uniqueUserIds } });  

    if (usersCount !== uniqueUserIds.length) { // If any IDs missing (proven by count mismatch)...
      return res.status(400).json({ error: "One or more member ids do not exist." });  // Respond with "bad" request
    }                                                                                        

    const exists = await Project.exists({ key });  // Check for duplicate key (if project key already exists)

    if (exists) {   // If project key already exists...
      return res.status(409).json({ error: "Project key already exists." });  // Respond conflict
    }                                                                                   

    const project = await Project.create({   // Create project document
      key,                       // Save key (schema uppercases)
      name,                      // Save name
      description,               // Save description
      leadUserId,                // Save lead
      members: uniqueUserIds,    // Save deduped members
      nextIssueSeq: 1,           // Initialize counter
    });                                                                                     

    return res.status(201).json({ project });  // Respond with created resource
  } 
  catch (err) { // Catch errors
    next(err);  // Delegate to error handler
  }                                                                                          
};                                                                                           

export const listProjects = async (req, res, next) => {   // Controller: list projects for current user

  try { 

    const user = req.authUser;    // Read current user from 'req'
    
    if (user.role === "admin") {  // If user's role is admin...
      const projects = await Project.find().sort({ createdAt: -1 }).lean();  // Fetch all projects
      return res.json({ projects });                                         // Respond with list
    }                                                                               

    const uid = user._id; // Current user's id
    
    const projects = await Project.find({   // Find projects accessible by user
      $or: [                       // Match any of these:
        { leadUserId: uid },          // Lead
        { members: uid },             // Member
      ],                           // End OR list
    })                             // End find
      .sort({ createdAt: -1 })     // Sort newest first
      .lean();                     // Return plain objects

    return res.json({ projects }); // Respond with list
  } 
  catch (err) { 
    next(err);
  }                                                                                          
};                                                                                          

export const getProject = async (req, res) => {   // Controller: get single project (project already loaded)
  return res.json({ project: req.project });      // Respond with attached project
};                                                                                           


export const updateProject = async (req, res, next) => {  // Controller: update basic project fields

  try {                          

    const { name, description, leadUserId } = req.body || {};  // Extract updatable fields
    const updates = {};                                        // Prepare updates object
    
    if (name !== undefined) {  // If name provided
      if (!name?.trim()) {
        return res.status(400).json({ error: "name cannot be empty." });    // Validate 'not blank'
      } 
      updates.name = name;   // update project name
    }                                                                                       
    
    if (description !== undefined) {              // If description provided
      updates.description = String(description);  // Set description to string and set
    }                                                                                      
    
    if (leadUserId !== undefined) {   // If lead change requested

      if (!isValidId(leadUserId)) { // Validate id
        return res.status(400).json({ error: "Invalid leadUserId." }); // Respond bad request
      } 
    
      const exists = await User.exists({ _id: leadUserId });  // Ensure user exists

      if (!exists) { // Respond with 'bad' request if lead doesn't exist
        return res.status(400).json({ error: "Lead user does not exist." }); 
      }    
      updates.leadUserId = leadUserId;  // Otheriwse, update lead user Id
    }                                                                                        

    const updated = await Project.findByIdAndUpdate(  // Apply updates
      req.project._id,                                // Target id
      { $set: updates },                              // Fields to set
      { new: true, runValidators: true }              // Return updated doc; validate
    ).lean();                                         // As plain object

    // Ensures lead is a member if lead is changed                                               
    if (leadUserId !== undefined) {// After lead changed...
      await Project.updateOne(                 // Update membership if needed
        { _id: req.project._id },              // Target project
        { $addToSet: { members: leadUserId } } // Ensure lead is in project's members
      );                                                                                     
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
    const addRaw = Array.isArray(req.body?.add) ? req.body.add : [];
    const removeRaw = Array.isArray(req.body?.remove) ? req.body.remove : [];

    // Then normalize to string IDs & drop falsy values (defends against "", null)
    const addIds = addRaw.filter(Boolean).map(String);
    const removeIds = removeRaw.filter(Boolean).map(String);


    for (const uid of [...addIds, ...removeIds]) {  // Validate all ids

      if (!isValidId(uid)) {   // If an Id is invalid
        return res.status(400).json({ error: `Invalid user id: ${uid}` });  // Respond with 'bad' request
      }
    }                                                                                      

    const allIds = [...new Set([...addIds, ...removeIds].map(String))]; // 1st: [...] merges all elements/arrays into one 
                                                                        // 2nd: .map() converts all elements into String
                                                                        // 3rd: "...new Set()" removes all duplicates as property of Set
    
    // Unique set of ids to verify existence
    const count = await User.countDocuments({ _id: { $in: allIds } }); // .countDocuments() built into 'mongoose'
                                                                       // count each "_id" in($in) "allIds".

    if (count !== allIds.length) {  // If any IDs missing
      return res.status(400).json({ error: "One or more user ids do not exist." }); // Respond as "bad" request
    }

    // Convert the project's lead ObjectId to a string that can safely be compared with                                              
    const leadIdStr = String(req.project.leadUserId);  

    // If any of the requested removals equals the lead's id, block the request
    if (removeIds.some((id) => String(id) === leadIdStr)) { // condition removeIds.some() returns boolean
      return res.status(400).json({ error: "Cannot remove the project lead from members." }); 
    }                                                                                   

    // Cast ids to ObjectId for reliable array ops (avoids casting quirks)
    const addObjIds = addIds.map((id) => ObjectId.createFromHexString(id));
    const removeObjIds = removeIds.map((id) => ObjectId.createFromHexString(id));

    // Apply atomic updates                                                                   
    await Project.updateOne(     // update project's membership
      { _id: req.project._id },  // target project via project Id
      {                                                         
        ...(addIds.length ? { $addToSet: { members: { $each: addObjIds } } } : {}), // Add new members (de-duplicated); $addToSet adds 
                                                                                    // new members/values to array if NOT already present 
        ...(removeIds.length ? { $pull: { members: { $in: removeObjIds } } } : {}), // Remove old members ($pull removes 
                                                                                    // any element in($in) 'removeIds')
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
