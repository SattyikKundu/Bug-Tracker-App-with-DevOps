export const setAuthCookie = (res, token) => { 
  const isProduction = process.env.NODE_ENV === 'production'; // Detect environment mode

  //console.log('[COOKIE] Setting token cookie. isProduction:', isProduction);

  res.cookie('token', token, {               // Set cookie named 'token' with the JWT (JSON web token), which is the 2nd arg.
    httpOnly: true,                          // Prevents JavaScript access (protects from XSS).
    secure: isProduction,                    // Only transmit over HTTPS in production (meaning when isProduction = true).  
    sameSite: isProduction ? 'none' : 'lax', // In production environment, use 'none' to ensure cookies are not blocked 
                                             // on cross-site requests (especially between Render and Neon.tech hosting sites).
                                             // For other environments, like localhost, use 'lax'.

    //sameSite: isProduction ? 'strict' : 'lax',  // In product environment, use 'strict' to protect from CSRF across domains.
                                                // For other environments, like localhost, use 'lax'.
    path: '/',  
    maxAge: 1000 * 60 * 60 * 24                 // 24 hour expiration in milliseconds
  });
}