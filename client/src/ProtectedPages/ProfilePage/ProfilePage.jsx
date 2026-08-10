// src/ProtectedPages/ProfilePage/ProfilePage.jsx

import {
  useEffect, // used to synchronizes form inputs with Redux user state as Redux receives new user object(s) 
  useState   // used to stores various local form values/messages
} from "react";

import {
  useDispatch, // Sends Redux update actions to store
  useSelector  // Reads current authenticated user (and to update/mutate fields)
} from "react-redux";

import {
  changePassword, // for password editing
  clearAuthError, // for clearing auth error
  fetchMyProfile, // for fetching entire profile data for profile page
  updateProfile   // for profile updating
} from "../../Store/authSlice.jsx";

import "./ProfilePage.css"; // Profile-page styling


const ProfilePage = () => {

  const dispatch = useDispatch(); // Redux dispatcher

  const {
    user,                 // Latest authenticated user profile
    error,                // Current backend/profile error
    profileUpdateStatus,  // idle | loading | succeeded | failed
    passwordChangeStatus, // idle | loading | succeeded | failed
    profileLoadStatus     // idle | loading | succeeded | failed
  } = useSelector( (state) => state.auth);


  //Local profile form state.
  const [profileForm, setProfileForm] = useState({firstName: "", lastName: "", username: "", email: ""});

  // Local password form state.
  const [passwordForm, setPasswordForm]       = useState({currentPassword: "", newPassword: "", confirmPassword: ""});

  const [profileMessage, setProfileMessage]   = useState(""); // Successful profile update message
  const [passwordMessage, setPasswordMessage] = useState(""); // Successful password update message

  const [passwordValidationError, setPasswordValidationError] = useState(""); // Client-only password mismatch message


  // Login initially stores only a small identity object containing: id + username.
  // Loads complete account profile when this page opens.
  useEffect(() => {
    if (profileLoadStatus === "idle") {
      dispatch(fetchMyProfile());
    }
  }, [dispatch,profileLoadStatus]);


  // Update form fields whenever Redux receives a new user object. This matters after a successful profile update.
  useEffect(() => {
    if (!user) { 
        return; 
    }
    setProfileForm({
      firstName: user.firstName ?? "",
      lastName:  user.lastName ?? "",
      username:  user.username ?? "",
      email:     user.email ?? ""
    });
  }, [user]);


  // Local accounts contain authProvider="local".
  // Google-only accounts display informational password text instead.
  const canChangePassword = user?.authProvider !== "google";

  const handleProfileInputChange = (event) => {

    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
    setProfileMessage("");

    if (error) {
      dispatch(clearAuthError());
    }
  };


  const handlePasswordInputChange = (event) => {

    const {name, value} = event.target;

    setPasswordForm((current) => ({...current,[name]: value}));
    setPasswordMessage("");
    setPasswordValidationError("");

    if (error) {
      dispatch(clearAuthError());
    }
  };



  const handleProfileSubmit = async (event) => { // This submission function ensures ONLY updated fields are sent...

    event.preventDefault(); // Prevents normal browser form submission.
    const updates = {};     // ONLY changed profile fields will be sent.

    // Compare each current form value against the user's existing value.
    // If it changed, add it to the PATCH request.
    if (profileForm.firstName.trim() !== (user?.firstName ?? "")) {
        updates.firstName = profileForm.firstName.trim();
    }
    if (profileForm.lastName.trim() !== (user?.lastName ?? "")) {
        updates.lastName = profileForm.lastName.trim();
    }
    if (profileForm.username.trim() !== (user?.username ?? "")) {
        updates.username = profileForm.username.trim();
    }
    if (profileForm.email.trim().toLowerCase() !== (user?.email ?? "").toLowerCase()) {
        updates.email    = profileForm.email.trim();
    }
    if (Object.keys(updates).length === 0) { // Prevents unnecessary PATCH requests when nothing changed.
        setProfileMessage("No profile changes to save.");
        return;
    }

    const resultAction = await dispatch(updateProfile(updates)); // Send only changed fields.

    if (updateProfile.fulfilled.match(resultAction)) {
        setProfileMessage("Profile updated successfully.");
    }
  };



  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordValidationError("New passwords do not match.");
      return;
    }

    const resultAction =
      await dispatch(
        changePassword({
          currentPassword: passwordForm.currentPassword,
          newPassword:     passwordForm.newPassword
        })
      );

    if (
      changePassword.fulfilled.match(resultAction)) {
      setPasswordForm({
        currentPassword: "",
        newPassword:     "",
        confirmPassword: ""
      });

      setPasswordMessage("Password updated successfully.");
    }
  };


  return (
    <main className="profile-page">
      <header className="profile-page-heading">
        <p className="profile-page-eyebrow">Account settings</p>
        <h1>Profile</h1>
        <p>Manage your BugTrack identity and account credentials.</p>
      </header>

      <div className="profile-settings-grid">
        <section className="profile-settings-card">
          <div className="profile-settings-card-header">
            <h2>Profile information</h2>
            <p>
              These details are displayed throughout projects,
              issues, assignments, and comments.
            </p>
          </div>

          <form className="profile-form" onSubmit={handleProfileSubmit}>
            <div className="profile-name-grid">
              <div className="profile-field">
                <label htmlFor="firstName">First name</label>
                <input
                  id="firstName"
                  name="firstName"
                  value={profileForm.firstName}
                  onChange={handleProfileInputChange}
                  required
                />
              </div>

              <div className="profile-field">
                <label htmlFor="lastName">Last name</label>
                <input
                  id="lastName"
                  name="lastName"
                  value={profileForm.lastName}
                  onChange={handleProfileInputChange}
                  required
                />
              </div>
            </div>
            <div className="profile-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                value={profileForm.username}
                onChange={handleProfileInputChange}
                minLength="3"
                maxLength="30"
                required
              />
              <small>Usernames must remain unique across BugTrack.</small>
            </div>

            <div className="profile-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={profileForm.email}
                onChange={handleProfileInputChange}
                required
              />
            </div>

            {error && (
              <div className="profile-alert profile-alert--error" role="alert">
                {error}
              </div>
            )}

            {profileMessage && (
              <div
                className="profile-alert profile-alert--success"
                role="status"
              >
                {profileMessage}
              </div>
            )}

            <button
              className="profile-primary-button"
              type="submit"
              disabled={ profileUpdateStatus === "loading" }
            >
              {profileUpdateStatus === "loading" ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </section>

        <section className="profile-settings-card">
          <div className="profile-settings-card-header">
            <h2>Password</h2>
            <p>Update the credentials used to access your account.</p>
          </div>

          {canChangePassword ? (

            <form className="profile-form" onSubmit={handlePasswordSubmit}>
              <div className="profile-field">
                <label htmlFor="currentPassword">Current password</label>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordInputChange}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="profile-field">
                <label htmlFor="newPassword">New password</label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordInputChange}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="profile-field">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordInputChange}
                  autoComplete="new-password"
                  required
                />
              </div>

              {passwordValidationError && (
                <div className="profile-alert profile-alert--error" role="alert">
                  {passwordValidationError}
                </div>
              )}


              {passwordMessage && (
                <div className="profile-alert profile-alert--success" role="status" >
                  {passwordMessage}
                </div>
              )}

              <button
                className="profile-primary-button"
                type="submit"
                disabled={ passwordChangeStatus === "loading" }
              >
                {passwordChangeStatus === "loading" ? "Updating..." : "Change Password"}
              </button>
            </form>

          ) : (

            <div className="profile-google-password-info">
              <strong>Password managed by Google</strong>
              <p>
                This account uses Google authentication, so no
                local BugTrack password is currently stored.
              </p>
            </div>
          )}

        </section>
      </div>
    </main>
  );
};

export default ProfilePage;