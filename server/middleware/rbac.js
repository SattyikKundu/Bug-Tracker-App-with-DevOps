// server/middleware/rbac.js      
// AKA "Role-Based-Access-Control" for access checks 
// (used mainly for verification in project routes)


import mongoose from "mongoose";                 // Import Mongoose for ObjectId validation
import User from "../models/user.js";            // Import User model to read roles
import Project from "../models/projectModel.js"; // Import Project model for access checks

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);  // Helper to validate ObjectId strings

export const loadCurrentUser = async (req, res, next) => {      // Middleware to attach full user doc to req.authUser

  try {        

    const userId = req.user?.id;  // Read user id from JWT payload (set by verifyJWT)

    if (!userId || !isValidId(userId)) {  // If no/invalid id...
      return res.status(401).json({ error: "Invalid user token." });  // Respond as "unauthorized"
    }                                                                                      

    const user = await User.findById(userId).lean(); // Load user document from DB

    if (!user || !user.isActive) {  // If user not found or deactivated..
      return res.status(403).json({ error: "User not active or not found." }); // Respond as "forbidden"
    }                                                                                       

    req.authUser = user; // Attach user doc for downstream checks
    next();              // Continue Express request pipeline
  } 
  catch (err) { // Catch any DB errors
    next(err);  // Delegate to error handler
  }                                                                                          
};                                                                                           

export const requireRole = (roles) => async (req, res, next) => {  // Factory to require one of several global roles

  try {
    const allowed = Array.isArray(roles) ? roles : [roles];  // Normalize to array

    if (!req.authUser) {  // Ensure user is loaded
      return res.status(401).json({ error: "Auth context missing." });  // Respond unauthorized
    }                                                                                     
    if (!allowed.includes(req.authUser.role)) {  // If role not allowed
      return res.status(403).json({ error: "Insufficient permissions." }); // Respond forbidden
    }
    next(); // continue in Express pipeline
  } 
  catch (err) {                                                                         
    next(err);  // Delegate to error handler
  }                                                                                         
};                                                                                           

export const loadProject = async (req, res, next) => {  // Middleware to load project by :id param
  try {                                                                                   
    const { id } = req.params;  // grab project id from route parameter

    if (!isValidId(id)) {  // validate id's format
      return res.status(400).json({ error: "Invalid project id." });  // Respond bad request
    }                                                                                       
    const project = await Project.findById(id).lean(); // Load project doc

    if (!project) { // If not found
      return res.status(404).json({ error: "Project not found." }); // Respond not found
    }

    req.project = project;  // Attach project to request
    next();                 // Continue
  } 
  catch (err) { // Catch errors
    next(err);  // Delegate to error handler
  }                                                                                          
};                                                                                           

export const requireProjectMemberOrAdmin = (req, res, next) => {  // Gate: allow admin OR project member/lead

  try { 
    const user = req.authUser;      // Read attached user in 'request'
    const project = req.project;    // Read attached project in 'request'

    if (!user || !project) {    // Checks is user or project isn't missing
      return res.status(500).json({ error: "Auth or project context missing." }); // Respond with server error
    }                                      

    const isAdmin = user.role === "admin";                          // User role: Admin flag
    const isLead = String(project.leadUserId) === String(user._id); // User role: Lead flag
    const isMember = project.members.some((m) => String(m) === String(user._id)); // User role: project member flag

    if (!(isAdmin || isLead || isMember)) {            // If user is none of these roles..                                           
      return res.status(403).json({ error: "Project access denied." });    // block access
    }                                                 

    next();                                                                                 
  } 
  catch (err) {  // Catch any errors
    next(err);   // Delegate any errors to Express pipeline
  }                                                                                          
};                                                                                           

export const requireProjectLeadOrAdmin = (req, res, next) => {   // Gate: allow admin OR the project lead
    
  try {                                                                                     
    const user = req.authUser;   // Read user from 'req'
    const project = req.project; // Read project name from 'req'

    if (!user || !project) {  // If no user or project provided...
      return res.status(500).json({ error: "Auth or project context missing." });  // Respond with server error
    }                                                                                   

    const isAdmin = user.role === "admin";                          // User role: admin flag
    const isLead = String(project.leadUserId) === String(user._id); // User role: lead flag

    if (!(isAdmin || isLead)) {   // If user is neither admin or lead....
      return res.status(403).json({ error: "Lead or admin role required." }); // Return "forbidden" error
    }                                                                                       

    next();                                                   
  } 
  catch (err) {                                                                         
    next(err);                                                                              
  }                                                                                        
};                                                                                         