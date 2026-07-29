import swaggerJSDoc from 'swagger-jsdoc'; // Import the swagger-jsdoc module (generates Swagger spec from JSDoc comments)

const options = { // Define Swagger configuration options

  definition: {  // Describes strucutre of OpenAPI documentation using global info 
                 // like version, title, and base URL of the API

    openapi: '3.0.0', // Specifies OpenAPI version (3.0.0 is standard for Swagger UI)
    info: {
      title: 'Bug Tracker App API', // Title that appears at the top of Swagger UI
      version: '1.0.0',                       // Version of your API documentation
      description: "API documentation for Bug Tracker App API. Some routes are (🔒) NOT testable in Swagger UI and others are only accessible IF (👤) user has registered ('/auth/register') and logged-in ('/auth/login') first using routes under 'Auth' section below.", // Description shown under the title
    },

    servers: [ // Defines one or more environments where the API is hosted (here: localhost)
      {
        url: 'http://localhost:5000', // Defines base URL of your API — all routes will be relative to this
      },
    ],


    // Optionally enable bearer auth so Swagger can call protected endpoints with a token:
    components: {             // Defines reusable components like security schemes
      securitySchemes: {      // 🔐 Sets up security scheme for JWT authentication
        bearerAuth: {         // Name used in `security: [ { bearerAuth: [] } ]` in Swagger docs
          type: 'http',       // Type of security scheme (HTTP-based)
          scheme: 'bearer',   // Defines it as a Bearer Token (used for JWTs)
          bearerFormat: 'JWT' // Optional — helps Swagger indicate this is a JWT, not a random token
        }
      },

      // Reusable schemas referenced by route documentation.
      schemas: {
        ProjectUserSearchResult: { // Sets up sceheme/format for searching for registered users
          type: "object",

          properties: {
            _id: {  // user's account id
              type:        "string",
              description: "MongoDB ObjectId of the registered user",
              example:      "6a10f576236zc8h38bhf3cd6"
            },

            firstName: {  // account user's first name
              type:        "string",
              description: "Registered user's first name",
              example:     "Philly"
            },

            lastName: { // account user's last name
              type:        "string",
              description: "Registered user's last name",
              example:     "Boyle"
            },

            username: { // account user's username
              type:        "string",
              description: "Registered user's username",
              example:     "PhiliBoy"
            },

            isProjectMember: {  // checks if searched user is already a project member
              type:        "boolean",
              description: "Whether the user is already the project lead or a project member",
              example:     true
            },

            projectRole: {  // IF user is project member, it shows role (user/lead), or null
              type:        "string",
              nullable:    true,
              description: "The user's project role, or null when the user is not part of the project",
              enum:        ["lead", "member"],
              example:     "member"
            }
          }
        },

        
        SearchPagination: { // Pagination rules WHEN project lead returns user search results
          type: "object",

          properties: {
            page: {    // defines minimum results per page      
              type:    "integer",
              minimum: 1,
              example: 1
            },

            limit: {  // maximum returned search results per page
              type: "integer",
              minimum: 1,
              maximum: 25,
              example: 3
            },

            hasMore: { // checks if there's more in search results not being shown
              type: "boolean",
              example: false
            },

            nextPage: { // toggles button/link for next page for additional search results
              type: "integer",
              nullable: true,
              minimum: 1,
              example: null
            }
          }
        }
      }
    },
  },
  apis: ['./routes/*.js'], // Tells swagger-jsdoc which files (routes) to scan for @swagger JSDoc comments
};

const swaggerSpec = swaggerJSDoc(options); // Scans the files listed in apis, finds the Swagger comments, 
                                           // and builds a Swagger JSON specification

export default swaggerSpec; // Makes swaggerSpec available to be used in other files like server.js
