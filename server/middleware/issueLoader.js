// server/middleware/issueLoader.js
import mongoose from "mongoose";                 // import functionalities for interacting with MongoDB
import Issue from "../models/issueModel.js";     // import Issue model
import Project from "../models/projectModel.js"; // import Project model

const isValidId = (id) => {  // Validate id helper function
  return mongoose.Types.ObjectId.isValid(id); 
}

export const loadIssue = async (req,res,next)=>{ // Load issue by ':id' and its project
  try{
    const {id} = req.params; // Issue id param

    if(!isValidId(id)) { // If inavlid Id, return 400 (error) response
        return res.status(400).json({error:"Invalid issue id."}); 
    } 

    const issue = await Issue.findById(id).lean(); // Retrieve issue as a noraml object

    if(!issue) { // If no issue, return 404 (error) reponse
        return res.status(404).json({error:"Issue not found."}); 
    }

    const project = await Project.findById(issue.projectId).lean(); // Load parent project

    if(!project) {
        return res.status(404).json({error:"Project not found."}); // 404
    } 

    req.issue = issue;     // Attach issue to request
    req.project = project; // Attach project to request (so RBAC can reuse)
    next();                // Continue express pipeline
  }
  catch(err){ 
    next(err); 
  }
};
