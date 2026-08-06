// src/PublicPages/RegisterPage/RegisterPage.jsx

import {
  useEffect, // triggers "side-effects" (code outside normal code flow)
  useState   // used to store data that can change/mutate over time.
} from "react";

import {
  Link,        // clickable url link inside a component to direct to a new url (similar to <a link="http://www.google.com">)
  useNavigate  // hook to programmatically navigate url links
} from "react-router";

import {
  useDispatch, // References to Redux dispatch function. Used to send actions to store, 
               // which triggers your reducers to update state.
  useSelector  // extracts data from Redux store state so a selector function can track/update 
               // component to changes, forcing a re-render if that specific data updates. 
} from "react-redux";

import {
  clearAuthError,
  registerUser,
  resetRegisterStatus
} from "../../Store/authSlice.jsx"; // imports async thunks function and slice reducers from 'authReducer' in store.

import "./RegisterPage.css"; // import css styling


const RegisterPage = () => {
  const dispatch = useDispatch(); //
  const navigate = useNavigate(); // Used to dispatch navigation

  const { registerStatus, error } = useSelector((state) => state.auth); // variable states to track and update from auth reducer store


  const [formData, setFormData] = useState({ // form state to edit/update
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [validationError, setValidationError] = useState(""); // stores validation error


  useEffect(() => {  // Clear old Redux registration state when the page opens.
    dispatch(clearAuthError());
    dispatch(resetRegisterStatus());
  }, [dispatch]);


  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({ // safely update input state
      ...currentData,
      [name]: value
    }));

    setValidationError("");

    if (error) {
      dispatch(clearAuthError());
    }
  };


  const handleSubmit = async (event) => {
    event.preventDefault();

    const {
      firstName,
      lastName,
      username,
      email,
      password,
      confirmPassword
    } = formData;


    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !username.trim() ||
      !email.trim() ||
      !password
    ) {
      setValidationError(
        "Please complete all required fields."
      );

      return;
    }


    if (password !== confirmPassword) {
      setValidationError(
        "Passwords do not match."
      );

      return;
    }


    const resultAction = await dispatch(
      registerUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        email: email.trim(),
        password
      })
    );


    if (registerUser.fulfilled.match(resultAction)) {
      navigate(
        "/login",
        {
          replace: true,
          state: {
            registrationSuccess:
              "Registration successful. Please log in to continue."
          }
        }
      );
    }
  };


  const displayedError =
    validationError || error;


  return (
    <main className="register-page">
      <section className="register-brand-panel">
        <Link
          className="register-brand"
          to="/login"
        >
          <span className="register-brand-mark">
            BT
          </span>

          <span>BugTrack Workspace</span>
        </Link>

        <div className="register-brand-content">
          <p className="register-eyebrow">
            Create your workspace account
          </p>

          <h1>
            Join projects, report issues, and keep work moving.
          </h1>

          <p>
            Create one account that can participate across
            multiple project teams.
          </p>
        </div>
      </section>


      <section className="register-form-panel">
        <div className="register-card">
          <header className="register-card-header">
            <h2>Create account</h2>

            <p>
              Enter your information to register.
            </p>
          </header>


          <form
            className="register-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="register-name-row">
              <div className="register-field">
                <label htmlFor="firstName">
                  First name
                </label>

                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  autoComplete="given-name"
                  maxLength="50"
                  required
                />
              </div>


              <div className="register-field">
                <label htmlFor="lastName">
                  Last name
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  autoComplete="family-name"
                  maxLength="50"
                  required
                />
              </div>
            </div>


            <div className="register-field">
              <label htmlFor="username">
                Username
              </label>

              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                autoComplete="username"
                minLength="3"
                maxLength="30"
                required
              />
            </div>


            <div className="register-field">
              <label htmlFor="email">
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                autoComplete="email"
                required
              />
            </div>


            <div className="register-field">
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="new-password"
                required
              />
            </div>


            <div className="register-field">
              <label htmlFor="confirmPassword">
                Confirm password
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                autoComplete="new-password"
                required
              />
            </div>


            {displayedError && (
              <div
                className="register-error"
                role="alert"
              >
                {displayedError}
              </div>
            )}


            <button
              className="register-submit-button"
              type="submit"
              disabled={registerStatus === "loading"}
            >
              {registerStatus === "loading"
                ? "Creating account..."
                : "Create account"}
            </button>
          </form>


          <p className="register-login-link">
            Already registered?{" "}

            <Link to="/login">
              Log in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
};


export default RegisterPage;