// server/controllers/commentController.js
import mongoose from "mongoose"; 
import Comment  from "../models/commentModel.js"; 
import Issue    from "../models/issueModel.js"; 
import Project  from "../models/projectModel.js"; // imports

const isValidId = (id) =>{ // id validator
  return mongoose.Types.ObjectId.isValid(String(id)); 
}


const MAX_COMMENT_DEPTH = 4; // Allow replies to be nested up to four levels


const populateCommentUsers = (query) => { // Populate the comment author and the author of the parent comment.
  return query
    .populate({
      path: "authorId",
      select: "_id firstName lastName username"
    })
    .populate({
      path: "parentId",
      select: "_id body authorId deleted",
      populate: {
        path: "authorId",
        select: "_id firstName lastName username"
      }
    });
};


const formatCommentResponse = (comment) => { // Format comments for the frontend thread display.
  const depth = comment.ancestors?.length ?? 0;

  return {
    ...comment,

    // Deleted comments appear as tombstones without exposing old text.
    body: comment.deleted ? "[deleted]" : comment.body,

    // The frontend can use this value to indent the reply.
    depth,

    // Visual indentation is capped at four levels.
    displayDepth: Math.min(depth, MAX_COMMENT_DEPTH),

    // Provides the parent author and comment reference for "Replying to..."
    replyingTo: comment.parentId
      ? {
          commentId: comment.parentId._id,
          author: comment.parentId.authorId,
          bodyPreview: comment.parentId.deleted
            ? "[deleted]"
            : String(comment.parentId.body ?? "").slice(0, 120)
        }
      : null
  };
};


const canEditComment = (user, comment) => { // Only the original author may rewrite a non-deleted comment.
  if (!user || !comment) { return false; }
  return String(comment.authorId) === String(user._id);
};

const canDeleteComment = (user, project, comment) => { // The author, project lead, or global admin may soft-delete a comment.

  if (!user || !project || !comment) { return false; }
  if (user.role === "admin") { return true; }

  const userId = String(user._id);

  const isLead =
    String(project.leadUserId) === userId;

  const isAuthor =
    String(comment.authorId) === userId;

  return isLead || isAuthor;
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

      if (!parent) {
        return res.status(404).json({
          error: "Parent comment not found."
        });
      }

      if (String(parent.issueId) !== String(issue._id)) {
        return res.status(400).json({
          error: "Parent belongs to a different issue."
        });
      }

      // Existing replies remain visible, but deleted comments cannot receive new replies.
      if (parent.deleted) {
        return res.status(409).json({
          error: "Cannot reply to a deleted comment."
        });
      }

      const replyDepth = (parent.ancestors?.length ?? 0) + 1; // depth of reply

      // Top-level comments use depth 0; nested replies may reach depth 4.
      if (replyDepth > MAX_COMMENT_DEPTH) {
        return res.status(400).json({
          error: `Comments cannot be nested deeper than ${MAX_COMMENT_DEPTH} reply levels.`
        });
      }

      ancestors = [
        ...(parent.ancestors ?? []),
        parent._id
      ];

    }

    const comment = await Comment.create({ // create comment object
      issueId: issue._id,
      authorId: user._id,
      body: body.trim(),
      parentId: parent?._id ?? null,
      ancestors
    });
    
    await Issue.updateOne( // increase comment count for issue by 1
      {_id:issue._id},
      { $inc:{ commentCount:1 } }
    ); 
    
    // Populate the comment author and the author of the parent comment.
    const populatedComment = await populateCommentUsers( 
      Comment.findById(comment._id)
    ).lean();

    return res.status(201).json({ // return new comment
      comment: formatCommentResponse(populatedComment)
    });
  
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

    /* Example of how limit/skip is used:
     *
     * Tiny example (comments sorted oldest → newest)
     * Comments: [C1, C2, C3, C4, C5, C6, C7, C8]
     * limit=3, skip=0 → returns [C1, C2, C3] (first page)
     * limit=3, skip=3 → returns [C4, C5, C6] (second page)
     * limit=3, skip=6 → returns [C7, C8] (third page)
     */

    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100); // page size (default 20, number base 10, max 100) 
    const skip  = Math.max(parseInt(req.query.skip  || "0",  10), 0);   // how many to skip from start (default 0)


    const hideDeleted = req.query.hideDeleted === "true";  // url flag from query string (?hideDeleted=true)

    const query = {       // MongoDB query
      issueId: issue._id, // only comments for this issue (matched by issue id) 
      parentId: null      // only top-level comments (which have no parent)
    };  
    
    if (hideDeleted) { query.deleted = false; } // exclude soft-deleted comments


    const topLevel = await populateCommentUsers(Comment.find(query))
      .sort({ createdAt: 1, _id: 1 })  // oldest → newest (stable with _id tiebreaker)
      .skip(skip)                      // pagination offset
      .limit(limit)                    // each page size
      .lean();                         // return plain object


    // turn hard-deleted bodies into a clear placeholder (tombstone) using 'formatCommentResponse' method
    const normalized = topLevel.map(formatCommentResponse);

    return res.json({               // sent results
      comments: normalized,         // normalized version of top-level comments
      page: { skip, limit },        // page echo
      includeDeleted: !hideDeleted  // toggle if deleted is included or not.
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


    const hideDeleted = req.query.hideDeleted === "true";  // url flag from query string (?hideDeleted=true)

    const query = {            // MongoDB query
      issueId: parent.issueId, // only comments for this issue (matched by issue id) 
      parentId: parent._id     // only direct reply comments to this parent
    };  
    
    if (hideDeleted) { query.deleted = false; } // exclude soft-deleted comments


    const replies = await populateCommentUsers(Comment.find(query)) // find only direct children of this parent
      .sort({ createdAt: 1, _id: 1 })                               // oldest → newest (stable with _id tiebreaker)
      .skip(skip)                                                   // pagination offset
      .limit(limit)                                                 // each page size
      .lean();                                                      // return plain object


    // With this, deleted comments return "[deleted]", even if old text remains in an older database record.
    const normalized = replies.map(formatCommentResponse);

    return res.json({ 
      replies: normalized, 
      page: { skip, limit },
      includeDeleted: !hideDeleted 
    });
    
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

    if (!canEditComment(user, commentDoc)) { // Validates if user has permission to edit/moderate comment...
      return res.status(403).json({
        error: "Only the comment author may edit this comment."
      });
    }

    if (commentDoc.deleted) { // Validates that a deleted comment can't be edited...
      return res.status(409).json({
        error: "Deleted comments cannot be edited."
      });
    }

    const { body } = req.body || {}; // retrieve comment body text from request

    if(body===undefined) { // validate if body exists
      return res.status(400).json({error:"body is required."}); 
    }
    if(!body?.trim()){ // validate if body is empty
       return res.status(400).json({error:"body cannot be empty."}); 
    }

    commentDoc.body = body.trim(); // set comment's body content
    commentDoc.edited = true;      // set 'edited' flag as true


    await commentDoc.save(); // save/persist commentDoc to MongoDB database

    const populatedComment = await populateCommentUsers(
      Comment.findById(commentDoc._id)
    ).lean();

    return res.json({ // return populated comment object
      comment: formatCommentResponse(populatedComment)
    });

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

    if (!canDeleteComment(user, project, commentDoc)) { // validate is user has editing permissions
      return res.status(403).json({
        error: "Not allowed to delete this comment."
      });
    }

    if(commentDoc.deleted){ // If already deleted → no-op
       return res.status(204).send(); 
    }

    commentDoc.deleted = true; // set comment as [deleted] to preserve document so its replies remain connected
    commentDoc.body = "";     // empty out comment body (do this in front-end) to hide deleted comment's original content

    
    await commentDoc.save(); // save and persist 'deleted' tag change 
                             // for document in MongoDB database

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
