// server/controllers/commentController.js
import mongoose from "mongoose"; 
import Comment  from "../models/commentModel.js"; 
import Issue    from "../models/issueModel.js"; 
import Project  from "../models/projectModel.js"; // imports

const isValidId = (id) =>{ // id validator
  return mongoose.Types.ObjectId.isValid(String(id)); 
}

const canEditOrModerate = (user,project,comment)=>{ // Checks if user is author, lead, or admin. 
                                                    // (they have comment editing permissions)

  if(!user||!project||!comment) { // guard against missing inputs
    return false;
  }

  if(user.role==="admin") { // If admin, user has permission
    return true;
  }
  
  const uid=String(user._id); 
  const isLead=String(project.leadUserId)===uid; 
  if(isLead) { // If user is lead, permission granted
    return true; 
  }
  
  return String(comment.authorId)===uid; //return true if userId matches authorId
};

export const createComment = async (req,res,next)=>{ // POST /issues/:id/comments

  try{
    const { id } = req.params; // extract issues id from param
    
    if(!isValidId(id)) { // validate issue id
        return res.status(400).json({error:"Invalid issue id."}); 
    }
    
    const issue = req.issue || await Issue.findById(id).lean(); // retrieve 'issue' from request
    if(!issue){ // error if no issue
        return res.status(404).json({error:"Issue not found."}); 
    }
    
    const project = req.project || await Project.findById(issue.projectId).lean(); // retrieve 'project' from request
    if(!project){ // error if no project
        return res.status(404).json({error:"Project not found."}); 
    }
    
    const user = req.authUser; // get authenticated user from request
    if(!user){ // error if no user
        return res.status(401).json({error:"Auth required."}); 
    }

    const { body, parentId=null } = req.body||{}; // get request body (if no parentId, null by default)
    if(!body?.trim()){ // validate body
        return res.status(400).json({error:"body is required."}); 
    }
    
    let ancestors=[]; // default values
    let parent=null;  
    
    if(parentId!==null){ // if parentId is not null...

      if(!isValidId(parentId)){ // validate parent id
         return res.status(400).json({error:"Invalid parentId."}); 
      }
      
      parent = await Comment.findById(parentId).lean(); // get parent Id from comment as normalized object

      if(!parent){
         return res.status(404).json({error:"Parent comment not found."}); // load parent
      }
      if(String(parent.issueId)!==String(issue._id)){
         return res.status(400).json({error:"Parent belongs to a different issue."}); // same issue
      }

      ancestors=[...(parent.ancestors||[]), parent._id]; // build ancestors chain
    }

    const comment = await Comment.create({  // create comment object
      issueId:issue._id, 
      authorId:user._id, body, 
      parentId:parentId||null, 
      ancestors 
    }); 
    
    await Issue.updateOne( // increase comment count for issue by 1
      {_id:issue._id},
      { $inc:{ commentCount:1 } }
    ); 
    
    return res.status(201).json({comment}); // return new comment
  
  }
  catch(err){ // catch and handle error
    next(err); 
  }
};

export const listIssueComments = async (req,res,next) => { // GET /issues/:id/comments (requires: loadIssue → req.issue)

  try{
    const { id } = req.params;  // get Issue id from param

    if(!isValidId(id)){ // validate issue id
      return res.status(400).json({error:"Invalid issue id."});
    }

    const issue = req.issue || await Issue.findById(id).lean(); // retrieve issue from param 
    
    if(!issue){ // check if issue is missing or not..
      return res.status(404).json({error:"Issue not found."}); 
    }

    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100); // page size (default 20, number base 10, max 100) 
    const skip  = Math.max(parseInt(req.query.skip  || "0",  10), 0);   // how many to skip from start (default 0)

    const topLevel = await Comment
      .find({issueId:issue._id,parentId:null,deleted:false}) // only thread starters (not replies)
      .sort({createdAt:1, _id: 1})             // oldest → newest (stable with _id tiebreaker)
      .skip(skip)                              // pagination offset
      .limit(limit)                            // each page size
      .lean();                                 // return plain object

    return res.json({       // sent results
      comments: topLevel,   // top-level comments
      page: { skip, limit } // page echo
    }); 

  }
  catch(err){  // handle caught errors
    next(err); 
  }
};

export const listReplies = async (req,res,next)=>{ // GET /comments/:id/replies (requires: commentLoader → req.comment, req.issue)

  try{

    const { id } = req.params; // get comment id

    if(!isValidId(id)){ // validate comment id
      return res.status(400).json({error:"Invalid comment id."}); 
    }

    const parent = req.comment || await Comment.findById(id).lean();  // get parent comment
    if(!parent){ // If no parent comment loaded...
      return res.status(404).json({error:"Comment not found."}); 
    }

    const limit = Math.min(parseInt(req.query.limit||"50",10),200); // page size (default 50, number base 10, max 100) 
    const skip  = Math.max(parseInt(req.query.skip||"0",10),0);     // how many to skip from start (default 0)

    const replies = await Comment
      .find({issueId:parent.issueId,parentId:parent._id,deleted:false})  // find only direct children of this parent
      .sort({createdAt:1, _id: 1})             // oldest → newest (stable with _id tiebreaker)
      .skip(skip)                              // pagination offset
      .limit(limit)                            // each page size
      .lean();                                 // return plain object

    return res.json({replies}); // return replies
  }
  catch(err){  // handle errors
    next(err); 
  }
};

export const updateComment = async (req,res,next)=>{ // PATCH /comments/:id

  try{

    const commentDoc = await Comment.findById(req.comment._id); // retrieve comment document 
                                                                // via comment id within request
    
    if(!commentDoc){  // Validate comment document
       return res.status(404).json({error:"Comment not found."}); 
    }

    const issue   = req.issue;    // request items 
    const project = req.project;  
    const user    = req.authUser; 

    if(!canEditOrModerate(user,project,commentDoc)){ // Validates if user has permission to edit/moderate comment...
      return res.status(403).json({error:"Not allowed to edit this comment."}); 
    }

    const { body } = req.body || {}; // retrieve comment body text from request

    if(body===undefined) { // validate if body exists
      return res.status(400).json({error:"body is required."}); 
    }
    if(!body?.trim()){ // validate if body is empty
       return res.status(400).json({error:"body cannot be empty."}); 
    }

    commentDoc.body = body;   // set comment's body content
    commentDoc.edited = true; // set 'edited' flag as true

    const saved = await commentDoc.save();       // save/persist commentDoc to MongoDB database
    return res.json({comment:saved.toObject()}); // return comment object
  }
  catch(err){ 
    next(err); 
  }
};

export const deleteComment = async (req,res,next)=>{ // DELETE /comments/:id (soft)

  try{

    const commentDoc = await Comment.findById(req.comment._id); // get comment doc via comment Id
    
    if(!commentDoc){ // validate if comment (doc) exists...
       return res.status(404).json({error:"Comment not found."}); 
    }

    const issue   = req.issue;    // retrieve request attachments
    const project = req.project; 
    const user    = req.authUser; 

    if(!canEditOrModerate(user,project,commentDoc)){ // validate is user has editing permissions
       return res.status(403).json({error:"Not allowed to delete this comment."}); 
    }

    if(commentDoc.deleted){ // If already deleted → no-op
       return res.status(204).send(); 
    }

    commentDoc.deleted = true; // set comment as deleted 
    commentDoc.body = "";      // empty out comment body

    await commentDoc.save(); // save and persist document in MongoDB database
    
    await Issue.updateOne(   // reduce comment count by 1 after deleting 
      {_id:issue._id},
      { $inc:{ commentCount:-1 } }
    ); 

    return res.status(204).send(); // no content
 
  }
  catch(err){ // catch and handle error
    next(err); 
  }
};
