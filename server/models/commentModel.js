// server/models/commentModel.js
import mongoose from "mongoose"; 
const { Schema } = mongoose; // Mongoose + Schema helper

const CommentSchema = new Schema( // Comment document schema
  { 
    issueId:{                       // Issue being commented
        type:Schema.Types.ObjectId, // object field type 
        ref:"Issues",               // foreign key that refers to 'issues' collection
        required:true,              // required field
        index:true                  // index required
    }, 
    authorId:{                      // author of the comment
        type:Schema.Types.ObjectId, // object field type
        ref:"Users",                // foreign key that refers to 'users' collection
        required:true,              // required field
        index:true                  // index required
    }, 
    body:{                          // comment text body 
        type:String,                // string field type
        required:true,              // required field
        trim:true,                  // trim and remove white space
        required:function(){        // only require 'body' if this comment is NOT deleted (see boolean 'deleted' field at bottom)
            return !this.deleted; 
        },        
        maxlength:5000              // max comment text length
    }, 
    parentId:{                      // immediate parent comment's id (NULL if no parent and comment is at top-level)
        type:Schema.Types.ObjectId, // object field type
        ref:"Comments",             // foreign key to 'comments' collection (since that's where parent comments lie)
        default:null,               // default value=null since top-level comments don't have parents
        index:true                  // index required
    }, 
    ancestors:[{                    // full chain of parent ids for computing depth/queries
        type:Schema.Types.ObjectId, // object field type
        ref:"Comments"              // foreign key to 'comments' collection (since that's where ancesotor comments lie)
    }], 
    edited:{                        // tracks if commented was edited after its creation
        type:Boolean,
        default:false
    }, 
    deleted:{  // Soft-delete flag (even if true, comment exists, but is HIDDEN, to NOT break comment thread structure)
        type:Boolean,
        default:false,
        index:true
    } 
  },
  { // timestamps + target collection name
    timestamps:true,      // adds createdAt/updatedAt automatically
    versionKey:false,     // omits version (omits Mongoose’s __v field)
    collection:"comments" // ensures documents are part of 'comments' collection
  }
); 

// CommentSchema.index({issueId:1,parentId:1,createdAt:1}); // thread paging
// CommentSchema.index({issueId:1,createdAt:1});            // flat recent
// CommentSchema.index({body:"text"});                      // text search (optional)

export default mongoose.model("Comments", CommentSchema); // Compile model
