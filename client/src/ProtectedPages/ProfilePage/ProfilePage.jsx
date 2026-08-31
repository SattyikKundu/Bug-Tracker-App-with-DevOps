// src/ProtectedPages/ProfilePage/ProfilePage.jsx

import {
  useEffect, // used to synchronizes form inputs with Redux user state as Redux receives new user object(s) 
  useState   // used to stores various local form values/messages
} from "react";

import {
  useDispatch, // sends Redux update actions to store
  useSelector  // reads current authenticated user (and to update/mutate fields)
} from "react-redux";

import {
  changePassword, // for password editing
  clearAuthError, // for clearing auth error
  fetchMyProfile, // for fetching entire profile data for profile page
  updateProfile   // for profile updating
} from "../../Store/authSlice.jsx";

import {
  clearNotificationPreferencesError, // clears stale notification-preference failure messages
  fetchNotificationPreferences,      // loads current user's six notification preferences
  updateNotificationPreferences      // saves changed notification preference values
} from "../../Store/notificationSlice.jsx";

import {
  ErrorMessageToast,
  NeutralMessageToast,
  SuccessMessageToast
} from "../../utils/utilityFunctions.jsx"; // message toasts

import "./ProfilePage.css"; // profile-page styling


// notification preference rows displayed INSIDE 'Profile' settings card.
// "key" maps directly to backend's notificationPreferences fields.
const NOTIFICATION_PREFERENCE_OPTIONS = [
  {
    key:         "issueAssignments",
    label:       "Issue assignments",
    description: "Notify me when an issue is assigned or reassigned to me."
  },
  {
    key:         "issueStatusChanges",
    label:       "Issue status changes",
    description: "Notify me when watched issues move through the workflow."
  },
  {
    key:         "commentReplies",
    label:       "Replies to my comments",
    description: "Notify me when another user replies directly to one of my comments."
  },
  {
    key:         "projectMembershipChanges",
    label:       "Project membership changes",
    description: "Notify me when I am added to or removed from a project."
  },
  {
    key:         "projectLeadershipChanges",
    label:       "Project leadership changes",
    description: "Notify me about project leadership transfers that affect me."
  },
  {
    key:         "watchedIssueActivity",
    label:       "Watched issue activity",
    description: "Notify me about important comments and assignment changes on watched issues."
  }
];


const ProfilePage = () => {


  const dispatch = useDispatch(); // redux dispatcher

  const {
    user,                 // latest authenticated user profile
    error,                // current backend/profile error
    profileUpdateStatus,  // idle | loading | succeeded | failed
    passwordChangeStatus, // idle | loading | succeeded | failed
    profileLoadStatus     // idle | loading | succeeded | failed
  } = useSelector( (state) => state.auth);

  const {
  preferences,        // latest six notification preference values from backend
  preferencesStatus,  // idle | loading | succeeded | failed
  preferencesError    // notification-preference request error
  } = useSelector((state) => state.notifications);


  // local profile form state.
  const [profileForm, setProfileForm] = useState({firstName: "", lastName: "", username: "", email: ""});

  // local password form state.
  const [passwordForm, setPasswordForm]       = useState({currentPassword: "", newPassword: "", confirmPassword: ""});

  const [profileMessage, setProfileMessage]   = useState(""); // successful profile update message
  const [passwordMessage, setPasswordMessage] = useState(""); // successful password update message

  const [passwordValidationError, setPasswordValidationError] = useState(""); // client-only password mismatch message

  // local form copy lets users change several switches before pressing Save.
  const [notificationPreferencesForm, setNotificationPreferencesForm] = useState({
    issueAssignments:         true,
    issueStatusChanges:       true,
    commentReplies:           true,
    projectMembershipChanges: true,
    projectLeadershipChanges: true,
    watchedIssueActivity:     true
  });

  // login initially stores only a small identity object containing: id + username.
  // loads complete account profile when this page opens.
  useEffect(() => {
    if (profileLoadStatus === "idle") {
      dispatch(fetchMyProfile());
    }
  }, [dispatch,profileLoadStatus]);


  /* load notification settings once when Profile opens.
   *
   * this is intentionally separate from 'fetchMyProfile' because notification
   * preferences have their own dedicated backend endpoint and Redux state.
   */
  useEffect(() => {
    if (preferencesStatus === "idle") {
      dispatch(fetchNotificationPreferences());
    }
  }, [dispatch, preferencesStatus]);


  // Refreshes local preferences toggle values after backend preferences are loaded or successfully updated.
  useEffect(() => {
    if (!preferences) {
      return;
    }
    setNotificationPreferencesForm({
      issueAssignments:         preferences.issueAssignments         ?? true,
      issueStatusChanges:       preferences.issueStatusChanges       ?? true,
      commentReplies:           preferences.commentReplies           ?? true,
      projectMembershipChanges: preferences.projectMembershipChanges ?? true,
      projectLeadershipChanges: preferences.projectLeadershipChanges ?? true,
      watchedIssueActivity:     preferences.watchedIssueActivity     ?? true
    });

  }, [preferences]);


  // update form fields whenever Redux receives a new user object. This matters after a successful profile update.
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


  const handleNotificationPreferenceChange = (event) => { // use to handle changes in notification preferences

    const { name, checked } = event.target;

    setNotificationPreferencesForm(
      (current) => ({...current, [name]: checked })
    );

    if (preferencesError) {
      dispatch(clearNotificationPreferencesError());
    }
  };


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



  const handleProfileSubmit = async (event) => { // this submission function ensures ONLY updated fields are sent...

    event.preventDefault(); // prevents normal browser form submission.
    const updates = {};     // ONLY changed profile fields will be sent.

    // compare each current form value against the user's existing value.
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
    if (Object.keys(updates).length === 0) { // prevents unnecessary PATCH requests when nothing changed.
        setProfileMessage("No profile changes to save.");
        return;
    }

    const resultAction = await dispatch(updateProfile(updates)); // send only changed fields.

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


  const handleNotificationPreferencesSubmit = async (event) => {

    event.preventDefault();

    const updates = {}; // Only send preference values that actually changed. This matches backend's partial PATCH behavior.

    for (const option of NOTIFICATION_PREFERENCE_OPTIONS) {
      const preferenceKey = option.key;
      if (notificationPreferencesForm[preferenceKey] !== preferences?.[preferenceKey]) {
        updates[preferenceKey] = notificationPreferencesForm[preferenceKey];
      }
    }


    // Avoid an unnecessary PATCH when user presses 'Save' without changing any switches.
    if (Object.keys(updates).length === 0) {
      NeutralMessageToast("No notification preference changes to save.");
      return;
    }

    const resultAction = await dispatch(updateNotificationPreferences(updates));

    if (updateNotificationPreferences.fulfilled.match(resultAction)) {
      SuccessMessageToast("Notification preferences updated.");
      return;
    }
    ErrorMessageToast(resultAction.payload || "Unable to update notification preferences.");

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
                  id       = "firstName"
                  name     = "firstName"
                  value    = {profileForm.firstName}
                  onChange = {handleProfileInputChange}
                  required
                />
              </div>

              <div className="profile-field">
                <label htmlFor="lastName">Last name</label>
                <input
                  id       = "lastName"
                  name     = "lastName"
                  value    = {profileForm.lastName}
                  onChange = {handleProfileInputChange}
                  required
                />
              </div>
            </div>
            <div className="profile-field">
              <label htmlFor="username">Username</label>
              <input
                id        = "username"
                name      = "username"
                value     = {profileForm.username}
                onChange  = {handleProfileInputChange}
                minLength = "3"
                maxLength = "30"
                required
              />
              <small>Usernames must remain unique across BugTrack.</small>
            </div>

            <div className="profile-field">
              <label htmlFor="email">Email</label>
              <input
                id       = "email"
                name     = "email"
                type     = "email"
                value    = {profileForm.email}
                onChange = {handleProfileInputChange}
                required
              />
            </div>

            {error && (
              <div className="profile-alert profile-alert--error" role="alert">
                {error}
              </div>
            )}

            {profileMessage && (
              <div className="profile-alert profile-alert--success" role="status">
                {profileMessage}
              </div>
            )}

            <button
              className = "profile-primary-button"
              type      = "submit"
              disabled  = { profileUpdateStatus === "loading" }
            >
              {profileUpdateStatus === "loading" ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </section>

        <section className = "profile-settings-card">
          <div className   = "profile-settings-card-header">
            <h2>Password</h2>
            <p>Update the credentials used to access your account.</p>
          </div>

          {canChangePassword ? (

            <form className="profile-form" onSubmit={handlePasswordSubmit}>
              <div className="profile-field">
                <label htmlFor="currentPassword">Current password</label>
                <input
                  id           = "currentPassword"
                  name         = "currentPassword"
                  type         = "password"
                  value        = {passwordForm.currentPassword}
                  onChange     = {handlePasswordInputChange}
                  autoComplete = "current-password"
                  required
                />
              </div>

              <div className="profile-field">
                <label htmlFor="newPassword">New password</label>
                <input
                  id           = "newPassword"
                  name         = "newPassword"
                  type         = "password"
                  value        = {passwordForm.newPassword}
                  onChange     = {handlePasswordInputChange}
                  autoComplete = "new-password"
                  required
                />
              </div>

              <div className="profile-field">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                  id           = "confirmPassword"
                  name         = "confirmPassword"
                  type         = "password"
                  value        = {passwordForm.confirmPassword}
                  onChange     = {handlePasswordInputChange}
                  autoComplete = "new-password"
                  required
                />
              </div>

              {passwordValidationError && (
                <div className = "profile-alert profile-alert--error" role="alert">
                  {passwordValidationError}
                </div>
              )}


              {passwordMessage && (
                <div className = "profile-alert profile-alert--success" role="status" >
                  {passwordMessage}
                </div>
              )}

              <button
                className = "profile-primary-button"
                type      = "submit"
                disabled  = { passwordChangeStatus === "loading" }
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

        <section
          id        = "notification-preferences"
          className = "profile-settings-card profile-notification-settings-card"
        >
          <div className="profile-settings-card-header">
            <h2>Notifications</h2>
            <p>
              Choose which in-app project and issue updates
              you want BugTrack to send to your notification inbox.
            </p>
          </div>

          {preferencesStatus === "loading" && !preferences ? (
            <div className="profile-notification-loading">
              Loading notification preferences...
            </div>
          ) : (
            <form
              className = "profile-notification-form"
              onSubmit  = {handleNotificationPreferencesSubmit}
            >
              <div className="profile-notification-preference-list">
                {NOTIFICATION_PREFERENCE_OPTIONS.map(
                  (option) => (
                    <label
                      className = "profile-notification-preference-row"
                      key       = {option.key}
                      htmlFor   = {`notification-preference-${option.key}`}
                    >
                      <span className="profile-notification-preference-copy">
                        <strong>
                          {option.label}
                        </strong>
                        <span>
                          {option.description}
                        </span>
                      </span>

                      <span className="profile-notification-switch">
                        <input
                          id       = {`notification-preference-${option.key}`}
                          name     = {option.key}
                          type     = "checkbox"
                          checked  = {notificationPreferencesForm[option.key]}
                          onChange = {handleNotificationPreferenceChange}
                        />

                        <span
                          className   = "profile-notification-switch-track"
                          aria-hidden = "true"
                        >
                          <span className="profile-notification-switch-thumb" />
                        </span>
                      </span>
                    </label>
                  )
                )}
              </div>
              {preferencesError && (
                <div className="profile-alert profile-alert--error" role="alert">
                  {preferencesError}
                </div>
              )}

              <button
                className = "profile-primary-button"
                type      = "submit"
                disabled={preferencesStatus === "loading" || !preferences}
              >
                {
                  preferencesStatus === "loading" && preferences
                    ? "Saving..."
                    : "Save Notification Preferences"
                }
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
};

export default ProfilePage;