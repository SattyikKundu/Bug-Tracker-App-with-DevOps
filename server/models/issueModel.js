// server/models/issueModel.js

import mongoose from "mongoose";         // Mongoose for MongoDB schema/model
import Project from "./projectModel.js"; // import Project model
const { Schema } = mongoose;             // Extract Schema helper

const TYPES      = ["bug","task","story"];                               // Allowed issues' types
const STATUSES   = ["open","in_progress","blocked","resolved","closed"]; // Allowed issues' statuses
const PRIORITIES = ["low","medium","high","critical"];                   // Allowed issues' priority level
const SEVERITIES = ["minor","major","critical"];                         // Allowed issues' severity-level

const AttachmentSchema = new Schema(  // File metadata subdoc
    { 
        fileId:{  // Storage key/URL
            type:String,
            required:true,
            trim:true
        },    
        filename:{  // Original filename
            type:String,
            required:true,
            trim:true
        },  
        size:{  // Size in bytes
            type:Number,
            required:true,
            min:0
        },          
        contentType:{   // Optional MIME
            type:String,default:""
        }             
    },
    {_id:false} // No id for sub-document
);                                     

const StatusHopSchema = new Schema( // Status audit entry
    {   
        from:{ // previous issue status
            type:String,
            enum:STATUSES,
            required:true
        }, 
        to:{ // updated issue status
            type:String,
            enum:STATUSES,
            required:true
        },    
        by:{ // Who changed the issue status
            type:Schema.Types.ObjectId,
            ref:"Users",
            required:true
        }, 
        at:{ // time stamp of issue
            type:Date,
            default:Date.now}                  
    },
    {_id:false} // No subdoc _id
);                                     

const IssueSchema = new Schema(  // Main Issue schema
    {                  
        projectId:{ // Project (Id) with the issue
            type:Schema.Types.ObjectId,
            ref:"Projects",
            required:true,
            index:true
        }, 
        key:{  // Human key e.g. BT-123
            type:String,
            unique:true,
            index:true
        },       
        title:{ // Short title of issue
            type:String,
            required:true,
            trim:true,
            maxlength:200
        }, 
        description:{ // issue's description (Long text / markdown)
            type:String,default:""
        },            
        type:{  // issue type
            type:String,
            enum:TYPES,
            default:"bug",
            index:true},   
        status:{ // issue workflow status
            type:String,
            enum:STATUSES,
            default:"open",
            index:true
        }, 
        priority:{ // issue priority
            type:String,
            enum:PRIORITIES,
            default:"medium",
            index:true
        }, 
        severity:{  // issue severity
            type:String,
            enum:SEVERITIES,
            default:"major"
        },    
        reporterId:{ // Issue reporter's Id
            type:Schema.Types.ObjectId,
            ref:"Users",
            required:true,
            index:true
        },   
        assigneeId:{ // Issue assigner's Id
            type:Schema.Types.ObjectId,
            ref:"Users",
            default:null,
            index:true
        },     
        labels:{ // Issue tags
            type:[String],
            default:[],
            index:true
        },    
        watchers:[{ // Users notified of issue
            type:Schema.Types.ObjectId,
            ref:"Users",
            index:true
        }],                
        attachments:{ // Attached files
            type:[AttachmentSchema],
            default:[]
        },
        statusHistory:{ // Tracks status history of issue for any audit trail
            type:[StatusHopSchema],
            default:[]
        }, 
        commentCount:{ // Tracks comment 
            type:Number,
            default:0,
            min:0
        },      
        closedAt:{   // When issue is closed (optional)
            type:Date
        }                            
    },
    {
        timestamps:true, // createdAt/updatedAt time;
        versionKey:false, // no version key; 
        collection:"issues" //      collection='issues'
    }  
); 

IssueSchema.index({projectId:1,status:1,priority:1,createdAt:-1});   // Lists/boards
IssueSchema.index({assigneeId:1,status:1});                          // My work
IssueSchema.index({title:"text",description:"text"});                // Search

// Generate key (PROJ-SEQ) atomically per project on first save
IssueSchema.pre( // Registers a Mongoose middleware (hook) on the Issue schema
    "validate",  // Ensures hook runs *before validation* (and before save) on this document
    async function(next){ // Use function() so `this` is the current issue doc; call `next(err?)` to continue/fail
        try{
            if(this.key){  // If a key was already provided (e.g., data import), skip generation 
                return next(); 
            }       

            const project = await Project.findOneAndUpdate(  // Atomically bump the project’s issue counter and read old value                
                {_id:this.projectId},        // Get project's Id
                { $inc:{ nextIssueSeq:1 } }, // Bump counter by +1
                { new:false }                // only return old doc
            );

            if (!project) { // If invalid projectId, fail validation 
                return next(new Error("Project not found for issue key generation."));
            }
            this.key = `${project.key}-${project.nextIssueSeq}`;  // Build human key (e.g., "BT-42") using project.key + old seq value

            return next(); // Continue to validation now that `key` exists (unique/index checks will include it)
        }
        catch(err){ 
            return next(err); 
        }
    }
);

export default mongoose.model("Issues", IssueSchema); // Model compilation
export { TYPES, STATUSES, PRIORITIES, SEVERITIES };   // Export enums
