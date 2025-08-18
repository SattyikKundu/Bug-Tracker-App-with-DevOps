// server/middleware/commentLoader.js

import mongoose from "mongoose";                  // import library for interacting with MongoDB
import Comment  from "../models/commentModel.js"; // import Comment model schema
import Issue    from "../models/issueModel.js";   // import Issue Model schema
import Project  from "../models/projectModel.js"; // import Project model schema

const isValidId = (id) => { // id validator
    return mongoose.Types.ObjectId.isValid(String(id)); 
}

export const loadComment = async (req,res,next) => { // Load comment + its issue/project

  try{

    const { id } = req.params; // retrieve comment id from param

    if(!isValidId(id)) { // validate id
        return res.status(400).json({error:"Invalid comment id."}); 
    }

    const comment = await Comment.findById(id).lean(); // retrieve comment by id and return as normal object
    if(!comment){
        return res.status(404).json({error:"Comment not found."}); 
    }
    
    const issue = await Issue.findById(comment.issueId).lean(); // retrieve issue by id and return as normal object
    if(!issue){ 
        return res.status(404).json({error:"Issue not found for comment."}); 
    }
    
    const project = await Project.findById(issue.projectId).lean(); // retrieve project by id and return as normal object
    if(!project){
        return res.status(404).json({error:"Project not found for comment."}); 
    }

    req.comment = comment;  // attach 'comment', 'issue', and 'project' normal objects as part of Express request
    req.issue   = issue; 
    req.project = project; 
    return next(); 

  }
  catch(err){ // handle error
    next(err); 
  }
};
