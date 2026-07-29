// server/models/userSearchModel.js

import User from "./user.js"; // Import the existing User model so we can search the users collection.

/**
 * Escape special regular-expression characters.
 *
 * This helper function prevents characters such as ".", "*", "[" or "(" 
 * from changing how the search expression behaves.
 *
 * @param {string} value - The raw search term entered by the user.
 * @returns {string} A safe string that can be used inside RegExp.
 */
const escapeRegExp = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Escape each special regex character.
};

/**
 * Converts a Mongoose ObjectId or populated user object into a string ID.
 *
 * This helper function supports both:
 *
 * members: [ObjectId, ObjectId]
 *
 * and:
 *
 * members: [{ _id: ObjectId }, { _id: ObjectId }]
 *
 * @param {Object|string} value - An ObjectId, string ID, or populated object.
 * @returns {string} The normalized user ID.
 */
const normalizeUserId = (value) => {
  const userId = value?._id ?? value; // Use the nested _id when the value is populated.

  return String(userId); // Convert the ID into a comparable string.
};

/**
 * Search all registered users and attach their relationship to one project.
 *
 * Existing project members are intentionally included in the search results.
 * The frontend can disable their Add button using isProjectMember.
 *
 * @param {Object} options                      - Search configuration.
 * @param {string} options.searchText           - Text entered into the search field.
 * @param {Array}  options.projectMembers       - Current project-member IDs or objects.
 * @param {Object|string} options.projectLeadId - Current project-lead ID or object.
 * @param {number} options.page                 - Requested result page.
 * @param {number} options.limit                - Maximum results returned per page.
 * @returns {Promise<Object>}                   Search results with pagination information.
 */
export const searchRegisteredProjectUsers = async ({
  searchText,
  projectMembers,
  projectLeadId,
  page,
  limit
}) => {

  const searchTerms = searchText // Start with validated search text.
    .split(/\s+/)                // Split multi-word searches such as "Jacob Willy".
    .map((term) => term.trim())  // Remove extra spaces from each term.
    .filter(Boolean);            // Remove empty terms.

  const searchConditions = searchTerms.map((term) => {
    const escapedTerm = escapeRegExp(term); // Protect term from regex special characters.

    const searchPattern = new RegExp(
      escapedTerm,
      "i"
    ); // Create a case-insensitive partial-match expression.

    return {
      $or: [
        { firstName: searchPattern },  // Allow this term to match user's first name. 
        { lastName:  searchPattern},   // Allow this term to match user's last name.
        { username:  searchPattern}    // Allow this term to match user's username.
      ]
    };
  });

  const databaseFilter = {
    $and: searchConditions // Require every typed term to match at least one searchable field.
  };

  const skip = (page - 1) * limit; // Calculate how many earlier results should be skipped.

  const users = await User.find(databaseFilter) // Search all registered users.
    .select(
      "_id firstName lastName username"
    ) // Return only fields needed by search dropdown.
    .sort({
      firstName: 1,  // Sort primarily by first name.
      lastName:  1,  // Sort users with same first name by last name.
      username:  1   // Use username as final sorting field.
    })
    .skip(skip)       // Skip results from previous pages.
    .limit(limit + 1) // Fetch one extra user to determine whether more results exist.
    .lean();          // Return plain JavaScript objects instead of Mongoose documents.

  const hasMore = users.length > limit; // Determine whether another page exists.

  const visibleUsers = users.slice(0, limit); // Remove extra result before sending data to controller.

  const memberIdSet = new Set( // Normalize every current project-member ID.
    projectMembers.map((member) => { return normalizeUserId(member); })
  );

  const normalizedLeadId = normalizeUserId(projectLeadId); // Normalize project's lead ID.

  const usersWithProjectStatus = visibleUsers.map((user) => {

    const userId = normalizeUserId(user._id); // Normalize current result's user ID.

    const isLead =
      userId === normalizedLeadId; // Determine whether this user is the project lead.

    const isProjectMember =
      memberIdSet.has(userId) ||
      isLead; // A lead is always treated as a project member.

    let projectRole = null; // Use null when user does not belong to the project.


    if (isLead) {  // Give project lead lead relationship.
      projectRole = "lead"; 
    } 
    else if (isProjectMember) {  // Give other existing members the member relationship.
      projectRole = "member"; 
    }

    return {
      ...user,         // Include user's safe public display fields.
      isProjectMember, // Tell frontend whether Add should be disabled.
      projectRole      // Tell frontend whether user is lead, member, or unrelated.
    };
  });

  return {
    users: usersWithProjectStatus, // Return decorated search results.

    pagination: {
      page,                                // Return current result page.
      limit,                               // Return current page size.
      hasMore,                             // Tell frontend whether Show more should be displayed.
      nextPage: hasMore ? page + 1 : null  // Return next page number only when another page exists.
    }
  };
};