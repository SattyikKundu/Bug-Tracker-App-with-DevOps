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
      }
    },
  },
  apis: ['./routes/*.js'], // Tells swagger-jsdoc which files (routes) to scan for @swagger JSDoc comments
};

const swaggerSpec = swaggerJSDoc(options); // Scans the files listed in apis, finds the Swagger comments, 
                                           // and builds a Swagger JSON specification

export default swaggerSpec; // Makes swaggerSpec available to be used in other files like server.js
