// server/models/authModel.js

import User from "./user.js"; // Contains 'users' schema. Imported here for 

export const findUserByUsername = async (username) => { // return user via entered 'username;
  try {
    return User.findOne({ username });
  }
  catch (error) { // If no user, return error message
    console.log(`Unable to find user '${username}': `,error);
    throw Error(`Unable to find user '${username}': `,error);
  }
  
}

export const findUserByEmail = async (email) => { // return user via entered 'email' (optional)
  try {
    return User.findOne({ email: email.toLowerCase() });
  }
  catch (error) { // If no user, return error message
    console.log(`Unable to find user for Email '${email}': `, error);
    throw Error(`Unable to find user for Email '${email}': `, error);
  }
}

export const findUserByGoogleId = async (googleId) => { // find and return user via Google Id
  try {
    return User.findOne({ googleId });
  }
  catch (error) { // If no user for googleId, return error message
    console.log(`Unable to find user for GoogleId '${googleId}': `, error);
    throw Error(`Unable to find user for GoogleId '${googleId}': `, error);
  }
}

// Finally, create new user locally or via Google (logic already mostly used in Google OAuth passportConfig.js)
// NOTE: depending on login/register method, passwordHash OR googleId can have default null value

export const createUser = async ({ // Create a new user
    firstName,            // User's first name
    lastName,             // Last name
    username,             // Username to create
    email,                // Email address
    passwordHash = null,  // Optional password hash (null when using Google OAuth)
    googleId = null       // Optional googleId (null when using local login)
  }) => {
  const doc = await User.create({ // create a 'document' for newly created user 
    firstName: formatString(firstName),// Save first name
    lastName:  formatString(lastName), // Save last name
    username,                          // Save username
    email: email.toLowerCase(),        // Save normalized email
    passwordHash,                      // Save hash if provided
    googleId                           // Save googleId if provided
  });
  return doc; // return newly created user document for query execution
}

function formatString(text) { // formats word/string to "sentence case": only 1st letters is caps
  //return text.charAt(0) + text.slice(1).toLowerCase();

  const trimmedText = text.trim();

  return (
    trimmedText.charAt(0).toUpperCase() +
    trimmedText.slice(1).toLowerCase()
  );

}
