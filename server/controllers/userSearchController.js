// server/controllers/userSearchController.js

import { searchRegisteredProjectUsers } from "../models/userSearchModel.js"; // Import the user-search database function.

/**
 * Search registered users for the project-member dropdown.
 *
 * Existing project members remain in the results and are marked with:
 *
 * isProjectMember: true
 * projectRole: "lead" or "member"
 *
 * Required middleware:
 *
 * verifyJWT
 * loadCurrentUser
 * loadProject
 * requireProjectLeadOrAdmin
 *
 * Example request:
 *
 * GET /api/projects/:id/member-search?q=jac&page=1&limit=10
 */
export const searchProjectMembers = async (req, res, next) => {

  try {
    const rawSearchText =
      req.query.q; // Read text supplied through the q query parameter.

    const searchText =
      typeof rawSearchText === "string"
        ? rawSearchText.trim()
        : ""; // Normalize invalid or missing search input into an empty string.

    if (searchText.length < 2) {
      return res.status(400).json({
        error:
          "Search text must contain at least 2 characters."
      }); // This prevents extremely broad empty or single-character searches.
    }

    if (searchText.length > 100) {
      return res.status(400).json({
        error:
          "Search text cannot exceed 100 characters."
      }); // Prevent unusually large search values.
    }

    const requestedPage = Number.parseInt(req.query.page, 10); // Convert optional page parameter into an integer.

    const requestedLimit = Number.parseInt(req.query.limit, 10); // Convert optional limit parameter into an integer.

    const page =  // Use page one when no valid page was supplied.
      Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage: 1;

    const limit = // Allow up to twenty-five results per request.
      Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 25) : 10; 

    const searchResults =
      await searchRegisteredProjectUsers({
        searchText,                                // Pass validated search text.
        projectMembers: req.project.members ?? [], // Pass project's current members.
        projectLeadId: req.project.leadUserId,     // Pass project's current lead.
        page,                                      // Pass  validated page number.
        limit                                      // Pass  validated result limit.
      });

    return res.status(200).json({
      query: searchText,          // Return normalized search text.
      projectId: req.project._id, // Return project associated with this search.
      ...searchResults            // Include users and pagination metadata.
    });
  } 
  catch (err) {
    next(err); // Forward unexpected errors to centralized Express error handler.
  }

};